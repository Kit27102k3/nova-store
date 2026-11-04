create table if not exists public.store_vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code ~ '^[A-Z0-9_-]{3,40}$'),
  discount_type text not null
    check (discount_type in ('percent', 'fixed')),
  discount_value integer not null
    check (discount_value > 0 and (discount_type <> 'percent' or discount_value <= 100)),
  min_subtotal integer not null default 0 check (min_subtotal >= 0),
  max_discount integer check (max_discount is null or max_discount > 0),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (starts_at is null or expires_at is null or expires_at > starts_at)
);

alter table public.store_vouchers enable row level security;
revoke all on public.store_vouchers from anon, authenticated;
grant all on public.store_vouchers to service_role;

alter table public.store_orders
  add column if not exists voucher_code text,
  add column if not exists discount_amount integer not null default 0
    check (discount_amount >= 0 and discount_amount <= subtotal);

alter table public.store_orders
  drop constraint if exists store_orders_check,
  drop constraint if exists store_orders_total_check;

alter table public.store_orders
  add constraint store_orders_discounted_total_check
    check (total = subtotal + shipping_fee - discount_amount);

insert into public.store_vouchers (
  code, discount_type, discount_value, min_subtotal, max_discount
)
values
  ('WELCOME10', 'percent', 10, 300000, 50000),
  ('NOVA50K', 'fixed', 50000, 500000, null),
  ('VIP100K', 'fixed', 100000, 1000000, null)
on conflict (code) do nothing;

create or replace function public.quote_store_voucher(
  p_code text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  voucher public.store_vouchers%rowtype;
  subtotal_value bigint;
  discount_value bigint;
  valid_item_count integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Giỏ hàng không hợp lệ.';
  end if;
  if jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Giỏ hàng không hợp lệ.';
  end if;
  if p_code is null or btrim(p_code) !~ '^[A-Za-z0-9_-]{3,40}$' then
    raise exception 'Mã voucher không hợp lệ.';
  end if;

  select count(*), coalesce(sum(product.price::bigint * requested.quantity), 0)
    into valid_item_count, subtotal_value
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
    );

  if valid_item_count <> jsonb_array_length(p_items) then
    raise exception 'Sản phẩm trong giỏ không còn khả dụng.';
  end if;
  if subtotal_value > 2147483647 then
    raise exception 'Tổng tiền đơn hàng vượt quá giới hạn.';
  end if;

  select * into voucher
  from public.store_vouchers
  where code = upper(btrim(p_code));

  if not found or not voucher.is_active then
    raise exception 'Voucher không tồn tại hoặc đã ngừng hoạt động.';
  end if;
  if voucher.starts_at is not null and voucher.starts_at > now() then
    raise exception 'Voucher chưa đến thời gian sử dụng.';
  end if;
  if voucher.expires_at is not null and voucher.expires_at <= now() then
    raise exception 'Voucher đã hết hạn.';
  end if;
  if voucher.usage_limit is not null and voucher.used_count >= voucher.usage_limit then
    raise exception 'Voucher đã hết lượt sử dụng.';
  end if;
  if subtotal_value < voucher.min_subtotal then
    raise exception 'Voucher yêu cầu giá trị sản phẩm tối thiểu % đ.', voucher.min_subtotal;
  end if;

  discount_value := case
    when voucher.discount_type = 'percent'
      then floor(subtotal_value * voucher.discount_value / 100.0)
    else voucher.discount_value
  end;
  if voucher.max_discount is not null then
    discount_value := least(discount_value, voucher.max_discount);
  end if;
  discount_value := least(discount_value, subtotal_value);

  return jsonb_build_object(
    'code', voucher.code,
    'discount', discount_value,
    'subtotal', subtotal_value
  );
end;
$$;

revoke all on function public.quote_store_voucher(text, jsonb) from public;
grant execute on function public.quote_store_voucher(text, jsonb) to anon, authenticated;

create or replace function public.list_available_store_vouchers()
returns table (
  code text,
  discount_type text,
  discount_value integer,
  min_subtotal integer,
  max_discount integer,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select voucher.code, voucher.discount_type, voucher.discount_value,
    voucher.min_subtotal, voucher.max_discount, voucher.expires_at
  from public.store_vouchers voucher
  where voucher.is_active
    and (voucher.starts_at is null or voucher.starts_at <= now())
    and (voucher.expires_at is null or voucher.expires_at > now())
    and (voucher.usage_limit is null or voucher.used_count < voucher.usage_limit)
  order by voucher.min_subtotal asc, voucher.discount_value desc
  limit 50;
$$;

revoke all on function public.list_available_store_vouchers() from public;
grant execute on function public.list_available_store_vouchers()
  to anon, authenticated, service_role;

create or replace function public.place_store_order_with_voucher(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_address text,
  p_district text,
  p_city text,
  p_items jsonb,
  p_payment_method text,
  p_voucher_code text
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

  if normalized_code <> '' then
    select id, subtotal into order_id, order_subtotal
    from public.store_orders
    where order_number = order_result ->> 'orderNumber'
    for update;

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

  return order_result;
end;
$$;

revoke all on function public.place_store_order_with_voucher(
  text, text, text, text, text, text, jsonb, text, text
) from public;
grant execute on function public.place_store_order_with_voucher(
  text, text, text, text, text, text, jsonb, text, text
) to anon, authenticated;

notify pgrst, 'reload schema';
