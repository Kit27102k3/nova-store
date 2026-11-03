alter table public.store_orders
  add column if not exists payment_method text not null default 'cod',
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_reference text,
  add column if not exists payment_transaction_number text,
  add column if not exists payment_response_code text,
  add column if not exists paid_at timestamptz;

alter table public.store_orders
  drop constraint if exists store_orders_payment_method_check,
  drop constraint if exists store_orders_payment_status_check;

alter table public.store_orders
  add constraint store_orders_payment_method_check
    check (payment_method in ('cod', 'vnpay')),
  add constraint store_orders_payment_status_check
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'cancelled'));

update public.store_orders
set payment_status = 'paid',
    paid_at = coalesce(paid_at, updated_at)
where payment_method = 'cod'
  and status = 'completed'
  and payment_status = 'unpaid';

create unique index if not exists store_orders_payment_reference_idx
  on public.store_orders (payment_reference)
  where payment_reference is not null;

alter table public.store_order_events
  drop constraint if exists store_order_events_event_type_check;
alter table public.store_order_events
  add constraint store_order_events_event_type_check
    check (event_type in ('order', 'status', 'tracking', 'shipping', 'payment'));

create or replace function public.place_store_order_with_payment(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_address text,
  p_district text,
  p_city text,
  p_items jsonb,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_code text;
  order_id bigint;
  order_total integer;
  payment_ref text;
begin
  if p_payment_method is null or p_payment_method not in ('cod', 'vnpay') then
    raise exception 'Phương thức thanh toán không hợp lệ.';
  end if;

  order_code := public.place_store_order(
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_address,
    p_district,
    p_city,
    p_items
  );

  select id, total into order_id, order_total
  from public.store_orders
  where order_number = order_code
  for update;

  if p_payment_method = 'vnpay'
    and (order_total < 1 or order_total > 1000000000) then
    raise exception 'Đơn hàng phải từ 1 đến 1 tỷ đồng để thanh toán VNPay.';
  end if;

  payment_ref := case
    when p_payment_method = 'vnpay' then 'NV' || order_id::text
    else null
  end;

  update public.store_orders
  set payment_method = p_payment_method,
      payment_status = case
        when p_payment_method = 'vnpay' then 'pending'
        else 'unpaid'
      end,
      payment_reference = payment_ref,
      updated_at = now()
  where id = order_id;

  return jsonb_build_object(
    'orderNumber', order_code,
    'total', order_total,
    'paymentReference', payment_ref
  );
end;
$$;

revoke all on function public.place_store_order_with_payment(
  text, text, text, text, text, text, jsonb, text
) from public;
grant execute on function public.place_store_order_with_payment(
  text, text, text, text, text, text, jsonb, text
) to anon, authenticated;

create or replace function public.record_store_order_payment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_title text;
  event_description text;
begin
  if new.payment_method = 'vnpay' and new.payment_status is distinct from old.payment_status then
    event_title := case new.payment_status
      when 'pending' then 'Đang chờ thanh toán VNPay'
      when 'paid' then 'Thanh toán VNPay thành công'
      when 'failed' then 'Thanh toán VNPay thất bại'
      when 'cancelled' then 'Đã hủy thanh toán VNPay'
      else 'Trạng thái thanh toán đã cập nhật'
    end;
    event_description := case new.payment_status
      when 'pending' then 'Vui lòng hoàn tất thanh toán để cửa hàng xử lý đơn hàng.'
      when 'paid' then 'Cửa hàng đã nhận được thanh toán cho đơn hàng.'
      when 'failed' then 'Giao dịch không thành công. Tồn kho đã được hoàn lại.'
      when 'cancelled' then 'Đơn hàng đã hủy trước khi thanh toán hoàn tất.'
      else ''
    end;
    insert into public.store_order_events (
      order_id, event_type, title, description, source
    ) values (
      new.id, 'payment', event_title, event_description, 'system'
    );
  end if;
  if new.payment_status is not distinct from old.payment_status then
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists store_orders_record_payment_event on public.store_orders;
create trigger store_orders_record_payment_event
  after update of payment_status on public.store_orders
  for each row execute function public.record_store_order_payment_event();

create or replace function public.guard_vnpay_order_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.payment_method = 'cod'
    and new.status = 'completed'
    and old.status is distinct from new.status
    and new.payment_status = 'unpaid' then
    new.payment_status := 'paid';
    new.paid_at := coalesce(new.paid_at, now());
  end if;

  if old.payment_method = 'vnpay' and old.status is distinct from new.status then
    if old.payment_status = 'pending' and new.status = 'cancelled' then
      raise exception 'Đang chờ kết quả VNPay; không thể hủy giao dịch đang hoạt động.';
    end if;
    if old.payment_status = 'paid' and new.status = 'cancelled' then
      raise exception 'Đơn đã thanh toán VNPay; cần xử lý hoàn tiền trước khi hủy.';
    end if;
    if old.payment_status <> 'paid'
      and new.status in ('confirmed', 'shipping', 'completed') then
      raise exception 'Chỉ được xử lý đơn VNPay sau khi thanh toán thành công.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists store_orders_guard_vnpay_status on public.store_orders;
create trigger store_orders_guard_vnpay_status
  before update of status on public.store_orders
  for each row execute function public.guard_vnpay_order_status();

create or replace function public.set_cancelled_vnpay_payment_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled'
    and old.status is distinct from new.status
    and new.payment_method = 'vnpay'
    and new.payment_status = 'pending' then
    update public.store_orders
      set payment_status = 'cancelled'
      where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists store_orders_cancel_vnpay_payment on public.store_orders;
create trigger store_orders_cancel_vnpay_payment
  after update of status on public.store_orders
  for each row execute function public.set_cancelled_vnpay_payment_status();

create or replace function public.record_vnpay_payment_result(
  p_payment_reference text,
  p_amount_minor bigint,
  p_succeeded boolean,
  p_response_code text,
  p_transaction_number text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.store_orders%rowtype;
  result_state text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Không có quyền cập nhật kết quả thanh toán.';
  end if;
  if p_payment_reference is null
    or p_payment_reference !~ '^[A-Za-z0-9]{1,100}$'
    or p_amount_minor is null
    or p_amount_minor < 1
    or p_response_code is null
    or p_response_code !~ '^[A-Za-z0-9]{2,3}$'
    or char_length(coalesce(p_transaction_number, '')) > 64 then
    raise exception 'Kết quả thanh toán VNPay không hợp lệ.';
  end if;

  select * into order_row
  from public.store_orders
  where payment_reference = p_payment_reference
  for update;
  if not found then
    return jsonb_build_object('state', 'not_found', 'order_number', null);
  end if;
  if order_row.payment_method <> 'vnpay' then
    return jsonb_build_object('state', 'invalid_order', 'order_number', null);
  end if;
  if p_amount_minor <> order_row.total::bigint * 100 then
    return jsonb_build_object('state', 'amount_mismatch', 'order_number', order_row.order_number);
  end if;
  if order_row.payment_status = 'paid' then
    return jsonb_build_object('state', 'already_paid', 'order_number', order_row.order_number);
  end if;
  if order_row.payment_status <> 'pending'
    or order_row.status = 'cancelled' then
    return jsonb_build_object('state', 'already_processed', 'order_number', order_row.order_number);
  end if;

  if p_succeeded then
    update public.store_orders
      set payment_status = 'paid',
          payment_transaction_number = nullif(p_transaction_number, ''),
          payment_response_code = p_response_code,
          paid_at = now(),
          updated_at = now()
      where id = order_row.id;
    result_state := 'paid';
  else
    update public.store_orders
      set payment_status = 'failed',
          payment_transaction_number = nullif(p_transaction_number, ''),
          payment_response_code = p_response_code,
          updated_at = now()
      where id = order_row.id;
    if order_row.status not in ('cancelled', 'completed') then
      perform public.admin_set_order_status(order_row.id, 'cancelled');
    end if;
    result_state := 'failed';
  end if;

  return jsonb_build_object(
    'state', result_state,
    'order_number', order_row.order_number
  );
end;
$$;

revoke all on function public.record_vnpay_payment_result(
  text, bigint, boolean, text, text
) from public, anon, authenticated;
grant execute on function public.record_vnpay_payment_result(
  text, bigint, boolean, text, text
) to service_role;

create or replace function public.expire_pending_vnpay_orders(
  p_before timestamptz,
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending_order record;
  expired_count integer := 0;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Không có quyền xử lý đơn thanh toán hết hạn.';
  end if;
  if p_before is null or p_limit not between 1 and 500 then
    raise exception 'Tham số dọn đơn VNPay hết hạn không hợp lệ.';
  end if;

  for pending_order in
    select id
    from public.store_orders
    where payment_method = 'vnpay'
      and payment_status = 'pending'
      and status not in ('cancelled', 'completed')
      and created_at < p_before
    order by created_at
    limit p_limit
    for update skip locked
  loop
    update public.store_orders
      set payment_status = 'cancelled', updated_at = now()
      where id = pending_order.id and payment_status = 'pending';
    perform public.admin_set_order_status(pending_order.id, 'cancelled');
    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

revoke all on function public.expire_pending_vnpay_orders(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.expire_pending_vnpay_orders(timestamptz, integer)
  to service_role;
