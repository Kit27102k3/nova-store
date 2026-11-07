update public.store_products product
set variants = jsonb_set(
  product.variants,
  '{stock}',
  (
    select jsonb_object_agg(
      option.value,
      to_jsonb(
        (product.inventory / option_count.count) +
        case when option.ordinality <= product.inventory % option_count.count
          then 1 else 0 end
      )
    )
    from jsonb_array_elements_text(product.variants -> 'options')
      with ordinality as option(value, ordinality)
    cross join lateral (
      select count(*)::integer as count
      from jsonb_array_elements_text(product.variants -> 'options')
    ) option_count
  ),
  true
)
where product.variants is not null
  and jsonb_typeof(product.variants -> 'options') = 'array'
  and product.variants -> 'stock' is null
  and jsonb_array_length(product.variants -> 'options') > 0;

grant select (inventory)
  on public.store_products to anon, authenticated;

create table if not exists public.store_guest_order_access (
  order_id bigint primary key references public.store_orders (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

alter table public.store_guest_order_access enable row level security;
revoke all on public.store_guest_order_access from public, anon, authenticated;
grant all on public.store_guest_order_access to service_role;

create or replace function public.place_store_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_address text,
  p_district text,
  p_city text,
  p_items jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  order_id bigint;
  order_code text;
  subtotal_value bigint := 0;
  shipping_value integer;
  threshold_value integer;
  item_count integer;
  available_inventory integer;
  variant_inventory integer;
  product_variants jsonb;
begin
  if p_customer_name is null
    or p_customer_email is null
    or p_customer_phone is null
    or p_address is null
    or p_district is null
    or p_city is null
    or char_length(btrim(p_customer_name)) not between 2 and 120
    or char_length(btrim(p_customer_email)) not between 5 and 254
    or position('@' in p_customer_email) < 2
    or char_length(btrim(p_customer_phone)) not between 6 and 32
    or char_length(btrim(p_address)) not between 3 and 240
    or char_length(btrim(p_district)) not between 2 and 120
    or char_length(btrim(p_city)) not between 2 and 120 then
    raise exception 'Thông tin đặt hàng không hợp lệ.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Danh sách sản phẩm không hợp lệ.';
  end if;

  select count(*) into item_count
  from jsonb_to_recordset(p_items)
    as requested(product_id bigint, quantity integer, variant text);
  if item_count <> jsonb_array_length(p_items) then
    raise exception 'Danh sách sản phẩm không hợp lệ.';
  end if;

  if (
    select count(*)
    from jsonb_to_recordset(p_items)
      as requested(product_id bigint, quantity integer, variant text)
    join public.store_products product
      on product.id = requested.product_id and product.is_active
    where requested.quantity between 1 and 99
      and char_length(coalesce(requested.variant, '')) <= 120
      and (
        (product.variants is null and coalesce(requested.variant, '') = '')
        or (
          product.variants is not null
          and exists (
            select 1
            from jsonb_array_elements_text(product.variants -> 'options') as option(value)
            where option.value = requested.variant
          )
        )
      )
  ) <> item_count then
    raise exception 'Sản phẩm trong giỏ không còn khả dụng.';
  end if;

  for item in
    select requested.product_id, nullif(btrim(requested.variant), '') as variant,
      sum(requested.quantity)::integer as quantity, product.name
    from jsonb_to_recordset(p_items)
      as requested(product_id bigint, quantity integer, variant text)
    join public.store_products product
      on product.id = requested.product_id and product.is_active
    group by requested.product_id, nullif(btrim(requested.variant), ''), product.name
    order by requested.product_id, nullif(btrim(requested.variant), '')
  loop
    select variants, inventory into product_variants, available_inventory
    from public.store_products
    where id = item.product_id
    for update;

    if item.variant is null then
      if available_inventory < item.quantity then
        raise exception 'Sản phẩm % không đủ tồn kho.', item.name;
      end if;
      update public.store_products
      set inventory = inventory - item.quantity, updated_at = now()
      where id = item.product_id;
    else
      variant_inventory := coalesce(
        (product_variants -> 'stock' ->> item.variant)::integer,
        0
      );
      if variant_inventory < item.quantity then
        raise exception 'Lựa chọn % của sản phẩm % không đủ tồn kho.',
          item.variant, item.name;
      end if;
      update public.store_products
      set inventory = inventory - item.quantity,
          variants = jsonb_set(
            variants,
            array['stock', item.variant],
            to_jsonb(variant_inventory - item.quantity),
            true
          ),
          updated_at = now()
      where id = item.product_id;
    end if;
  end loop;

  select sum(product.price::bigint * requested.quantity) into subtotal_value
  from jsonb_to_recordset(p_items)
    as requested(product_id bigint, quantity integer, variant text)
  join public.store_products product
    on product.id = requested.product_id and product.is_active;
  if auth.uid() is not null
    and lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(btrim(p_customer_email)) then
    raise exception 'Hãy sử dụng email đã đăng nhập để đặt hàng.';
  end if;

  select shipping_threshold, shipping_fee into threshold_value, shipping_value
  from public.store_settings where id = 'store';
  threshold_value := coalesce(threshold_value, 499000);
  shipping_value := case
    when subtotal_value >= threshold_value then 0
    else coalesce(shipping_value, 30000)
  end;
  if subtotal_value > 2147483647 - shipping_value then
    raise exception 'Tổng tiền đơn hàng vượt quá giới hạn.';
  end if;

  insert into public.store_orders (
    customer_id, customer_name, customer_email, customer_phone, address, district, city,
    subtotal, shipping_fee, total
  ) values (
    auth.uid(), btrim(p_customer_name), lower(btrim(p_customer_email)),
    btrim(p_customer_phone), btrim(p_address), btrim(p_district), btrim(p_city),
    subtotal_value, shipping_value, subtotal_value + shipping_value
  ) returning id into order_id;

  order_code := 'NV-' || to_char(now(), 'YYYY') || '-' || lpad(order_id::text, 6, '0');
  update public.store_orders set order_number = order_code where id = order_id;

  for item in
    select requested.product_id, requested.quantity, requested.variant,
      product.name, product.slug, product.images[1] as image, product.price
    from jsonb_to_recordset(p_items)
      as requested(product_id bigint, quantity integer, variant text)
    join public.store_products product
      on product.id = requested.product_id and product.is_active
  loop
    insert into public.store_order_items (
      order_id, product_id, product_name, product_slug, image, variant, unit_price, quantity
    ) values (
      order_id, item.product_id, item.name, item.slug, coalesce(item.image, ''),
      nullif(btrim(item.variant), ''), item.price, item.quantity
    );
  end loop;

  return order_code;
end;
$$;

revoke all on function public.place_store_order(
  text, text, text, text, text, text, jsonb
) from public, anon, authenticated;

create or replace function public.admin_set_order_status(p_order_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_status text;
  item record;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Không có quyền cập nhật đơn hàng.';
  end if;
  if p_status not in ('pending', 'confirmed', 'shipping', 'completed', 'cancelled') then
    raise exception 'Trạng thái đơn hàng không hợp lệ.';
  end if;

  select status into old_status
  from public.store_orders where id = p_order_id for update;
  if old_status is null then
    raise exception 'Không tìm thấy đơn hàng.';
  end if;
  if old_status in ('completed', 'cancelled') and p_status <> old_status then
    raise exception 'Không thể thay đổi trạng thái cuối cùng của đơn hàng.';
  end if;

  if p_status = 'cancelled' and old_status <> 'cancelled' then
    for item in
      select product_id, nullif(btrim(variant), '') as variant,
        sum(quantity)::integer as quantity
      from public.store_order_items
      where order_id = p_order_id and product_id is not null
      group by product_id, nullif(btrim(variant), '')
      order by product_id, nullif(btrim(variant), '')
    loop
      if item.variant is null then
        update public.store_products
        set inventory = inventory + item.quantity, updated_at = now()
        where id = item.product_id;
      else
        update public.store_products
        set inventory = inventory + item.quantity,
            variants = jsonb_set(
              variants,
              array['stock', item.variant],
              to_jsonb(coalesce((variants -> 'stock' ->> item.variant)::integer, 0) + item.quantity),
              true
            ),
            updated_at = now()
        where id = item.product_id;
      end if;
    end loop;
  end if;

  update public.store_orders
  set status = p_status, updated_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.cancel_customer_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer uuid := auth.uid();
  current_status text;
  item record;
begin
  if customer is null then
    raise exception 'Vui lòng đăng nhập để hủy đơn hàng.';
  end if;

  select status into current_status
  from public.store_orders
  where id = p_order_id and customer_id = customer
  for update;
  if current_status is null then
    raise exception 'Không tìm thấy đơn hàng của tài khoản.';
  end if;
  if current_status <> 'pending' then
    raise exception 'Chỉ có thể hủy đơn hàng đang chờ xác nhận.';
  end if;

  for item in
    select product_id, nullif(btrim(variant), '') as variant,
      sum(quantity)::integer as quantity
    from public.store_order_items
    where order_id = p_order_id and product_id is not null
    group by product_id, nullif(btrim(variant), '')
    order by product_id, nullif(btrim(variant), '')
  loop
    if item.variant is null then
      update public.store_products
      set inventory = inventory + item.quantity, updated_at = now()
      where id = item.product_id;
    else
      update public.store_products
      set inventory = inventory + item.quantity,
          variants = jsonb_set(
            variants,
            array['stock', item.variant],
            to_jsonb(coalesce((variants -> 'stock' ->> item.variant)::integer, 0) + item.quantity),
            true
          ),
          updated_at = now()
      where id = item.product_id;
    end if;
  end loop;

  update public.store_orders
  set status = 'cancelled', updated_at = now()
  where id = p_order_id and customer_id = customer and status = 'pending';
end;
$$;

drop function if exists public.place_store_order_with_voucher(
  text, text, text, text, text, text, jsonb, text, text
);

create function public.place_store_order_with_voucher(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_address text,
  p_district text,
  p_city text,
  p_items jsonb,
  p_payment_method text,
  p_voucher_code text,
  p_guest_access_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  voucher public.store_vouchers%rowtype;
  quote jsonb;
  order_result jsonb;
  order_id bigint;
  order_subtotal integer;
  order_total integer;
  normalized_code text := upper(btrim(coalesce(p_voucher_code, '')));
begin
  if (auth.uid() is null and (
      p_guest_access_hash is null or p_guest_access_hash !~ '^[a-f0-9]{64}$'
    )) or (auth.uid() is not null and p_guest_access_hash is not null) then
    raise exception 'Mã tra cứu đơn hàng không hợp lệ.';
  end if;

  if normalized_code <> '' then
    if normalized_code !~ '^[A-Z0-9_-]{3,40}$' then
      raise exception 'Mã voucher không hợp lệ.';
    end if;
    select * into voucher
    from public.store_vouchers
    where code = normalized_code
    for update;
    if not found then
      raise exception 'Voucher không tồn tại hoặc đã ngừng hoạt động.';
    end if;
    quote := public.quote_store_voucher(normalized_code, p_items);
  end if;

  order_result := public.place_store_order_with_payment(
    p_customer_name, p_customer_email, p_customer_phone, p_address,
    p_district, p_city, p_items, p_payment_method
  );

  select id, subtotal into order_id, order_subtotal
  from public.store_orders
  where order_number = order_result ->> 'orderNumber'
  for update;

  if normalized_code <> '' then
    if order_subtotal <> (quote ->> 'subtotal')::integer then
      raise exception 'Giỏ hàng đã thay đổi. Vui lòng kiểm tra lại voucher.';
    end if;

    update public.store_orders
    set voucher_code = normalized_code,
        discount_amount = (quote ->> 'discount')::integer,
        total = subtotal + shipping_fee - (quote ->> 'discount')::integer,
        updated_at = now()
    where id = order_id
    returning total into order_total;

    update public.store_vouchers
    set used_count = used_count + 1
    where id = voucher.id;
    order_result := jsonb_set(order_result, '{total}', to_jsonb(order_total), true);
  end if;

  if auth.uid() is null then
    insert into public.store_guest_order_access (order_id, token_hash)
    values (order_id, p_guest_access_hash);
  end if;

  return order_result;
end;
$$;

revoke all on function public.place_store_order_with_payment(
  text, text, text, text, text, text, jsonb, text
) from public, anon, authenticated;
revoke all on function public.place_store_order_with_voucher(
  text, text, text, text, text, text, jsonb, text, text, text
) from public, anon, authenticated;
grant execute on function public.place_store_order_with_voucher(
  text, text, text, text, text, text, jsonb, text, text, text
) to anon, authenticated;

create or replace function public.lookup_guest_store_order(
  p_order_number text,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_order_number is null
    or p_order_number !~ '^NV-[0-9]{4}-[0-9]{6,}$'
    or p_token_hash is null
    or p_token_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  select jsonb_build_object(
    'order_number', order_row.order_number,
    'status', order_row.status,
    'payment_method', order_row.payment_method,
    'payment_status', order_row.payment_status,
    'created_at', order_row.created_at,
    'total', order_row.total,
    'tracking_url', order_row.shipping_tracking_url,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', order_item.product_name,
        'variant', order_item.variant,
        'quantity', order_item.quantity
      ) order by order_item.id)
      from public.store_order_items order_item
      where order_item.order_id = order_row.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', event.title,
        'created_at', event.created_at
      ) order by event.created_at desc)
      from (
        select title, created_at
        from public.store_order_events
        where order_id = order_row.id
        order by created_at desc
        limit 50
      ) event
    ), '[]'::jsonb)
  ) into result
  from public.store_orders order_row
  join public.store_guest_order_access access
    on access.order_id = order_row.id
  where order_row.order_number = p_order_number
    and order_row.customer_id is null
    and access.token_hash = p_token_hash;

  return result;
end;
$$;

revoke all on function public.lookup_guest_store_order(text, text)
  from public;
grant execute on function public.lookup_guest_store_order(text, text)
  to anon, authenticated;

create table if not exists public.store_product_reviews (
  id bigint generated by default as identity primary key,
  product_id bigint not null references public.store_products (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  order_id bigint not null references public.store_orders (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  body text not null check (char_length(btrim(body)) between 10 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index if not exists store_product_reviews_product_created_idx
  on public.store_product_reviews (product_id, created_at desc);
alter table public.store_product_reviews enable row level security;
revoke all on public.store_product_reviews from public, anon, authenticated;
grant select (
  id, product_id, rating, title, body, created_at, updated_at
) on public.store_product_reviews to anon, authenticated;
grant all on public.store_product_reviews to service_role;
grant usage, select on sequence public.store_product_reviews_id_seq to service_role;

drop policy if exists "Anyone can read product reviews"
  on public.store_product_reviews;
create policy "Anyone can read product reviews"
  on public.store_product_reviews for select to anon, authenticated
  using (true);

alter table public.store_products
  add column if not exists imported_rating numeric(2, 1),
  add column if not exists imported_reviews integer;
update public.store_products
set imported_rating = rating, imported_reviews = reviews
where imported_rating is null or imported_reviews is null;
alter table public.store_products
  alter column imported_rating set default 0,
  alter column imported_rating set not null,
  alter column imported_reviews set default 0,
  alter column imported_reviews set not null;

create or replace function public.refresh_store_product_rating(p_product_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_count integer;
  rating_total integer;
  baseline public.store_products%rowtype;
begin
  select imported_rating, imported_reviews
    into baseline.imported_rating, baseline.imported_reviews
  from public.store_products
  where id = p_product_id;
  if not found then return; end if;

  select count(*)::integer, coalesce(sum(rating), 0)::integer
    into review_count, rating_total
  from public.store_product_reviews
  where product_id = p_product_id;

  update public.store_products
  set reviews = baseline.imported_reviews + review_count,
      rating = case
        when baseline.imported_reviews + review_count = 0 then 0
        else round(
          (baseline.imported_rating * baseline.imported_reviews + rating_total)::numeric
          / (baseline.imported_reviews + review_count),
          1
        )
      end,
      updated_at = now()
  where id = p_product_id;
end;
$$;
revoke all on function public.refresh_store_product_rating(bigint)
  from public, anon, authenticated;

create or replace function public.refresh_store_product_review_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_store_product_rating(new.product_id);
    return null;
  elsif tg_op = 'DELETE' then
    perform public.refresh_store_product_rating(old.product_id);
    return null;
  else
    if new.product_id is distinct from old.product_id then
      perform public.refresh_store_product_rating(old.product_id);
    end if;
    perform public.refresh_store_product_rating(new.product_id);
  end if;
  return null;
end;
$$;
revoke all on function public.refresh_store_product_review_rating()
  from public, anon, authenticated;

drop trigger if exists store_product_reviews_refresh_rating
  on public.store_product_reviews;
create trigger store_product_reviews_refresh_rating
  after insert or update or delete on public.store_product_reviews
  for each row execute function public.refresh_store_product_review_rating();

create or replace function public.submit_store_product_review(
  p_product_id bigint,
  p_order_number text,
  p_rating integer,
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer uuid := auth.uid();
  purchased_order_id bigint;
begin
  if customer is null then
    raise exception 'Vui lòng đăng nhập để đánh giá sản phẩm.';
  end if;
  if p_product_id is null or p_product_id < 1
    or p_rating not between 1 and 5
    or p_order_number is null
    or p_order_number !~ '^NV-[0-9]{4}-[0-9]{6,}$'
    or p_title is null or char_length(btrim(p_title)) not between 2 and 120
    or p_body is null or char_length(btrim(p_body)) not between 10 and 2000 then
    raise exception 'Thông tin đánh giá không hợp lệ.';
  end if;

  select order_row.id into purchased_order_id
  from public.store_orders order_row
  join public.store_order_items item on item.order_id = order_row.id
  where order_row.order_number = p_order_number
    and order_row.customer_id = customer
    and order_row.status = 'completed'
    and item.product_id = p_product_id
  limit 1;
  if purchased_order_id is null then
    raise exception 'Chỉ có thể đánh giá sản phẩm trong đơn hàng đã hoàn thành của bạn.';
  end if;

  insert into public.store_product_reviews (
    product_id, customer_id, order_id, rating, title, body
  ) values (
    p_product_id, customer, purchased_order_id, p_rating, btrim(p_title), btrim(p_body)
  )
  on conflict (customer_id, product_id) do update
  set order_id = excluded.order_id,
      rating = excluded.rating,
      title = excluded.title,
      body = excluded.body,
      updated_at = now();
end;
$$;

revoke all on function public.submit_store_product_review(
  bigint, text, integer, text, text
) from public, anon;
grant execute on function public.submit_store_product_review(
  bigint, text, integer, text, text
) to authenticated;

notify pgrst, 'reload schema';
