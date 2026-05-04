create extension if not exists pgcrypto;

create table if not exists public.rifa_settings (
  id text primary key default 'active',
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rifa_tickets (
  number text primary key check (number ~ '^[0-9]{1,6}$'),
  status text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  purchase_id uuid,
  buyer_name text,
  buyer_whatsapp text,
  buyer_email text,
  sold_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.rifa_purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  buyer_whatsapp text not null,
  buyer_email text,
  package_id text not null,
  package_name text not null,
  ticket_count integer not null check (ticket_count > 0),
  amount_cop integer not null check (amount_cop >= 0),
  payment_method text not null check (payment_method in ('whatsapp', 'nequi', 'daviplata', 'mercado_pago')),
  status text not null default 'sold' check (status in ('pending', 'sold', 'cancelled')),
  ticket_numbers text[] not null,
  mercado_pago_payment_id text unique,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.rifa_purchases
  add column if not exists mercado_pago_payment_id text unique;

alter table public.rifa_purchases
  drop constraint if exists rifa_purchases_payment_method_check;

alter table public.rifa_purchases
  add constraint rifa_purchases_payment_method_check
  check (payment_method in ('whatsapp', 'nequi', 'daviplata', 'mercado_pago'));

create table if not exists public.rifa_winners (
  id uuid primary key default gen_random_uuid(),
  draw_date date not null,
  lottery_name text not null default 'Loteria del Quindio',
  major_number text check (major_number ~ '^[0-9]{1,6}$'),
  minor_numbers text[] not null default '{}',
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.mercado_pago_payments (
  id uuid primary key default gen_random_uuid(),
  mp_payment_id text not null unique,
  external_reference text,
  package_id text,
  buyer_name text,
  buyer_email text,
  buyer_whatsapp text,
  amount_cop integer,
  payment_method_id text,
  status text,
  status_detail text,
  approved_at timestamptz,
  last_seen_at timestamptz not null default now(),
  rifa_purchase_id uuid references public.rifa_purchases(id),
  raw_payment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mercado_pago_payments_status on public.mercado_pago_payments(status);
create index if not exists idx_mercado_pago_payments_created_at on public.mercado_pago_payments(created_at desc);

create table if not exists public.mercado_pago_payment_events (
  id uuid primary key default gen_random_uuid(),
  mp_payment_id text,
  event_source text not null check (event_source in ('payment_api', 'webhook', 'sync', 'system')),
  topic text,
  action text,
  status text,
  status_detail text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_mercado_pago_payment_events_payment on public.mercado_pago_payment_events(mp_payment_id, created_at desc);
create index if not exists idx_mercado_pago_payment_events_source on public.mercado_pago_payment_events(event_source, created_at desc);

insert into public.rifa_tickets (number)
select lpad(generate_series(0, 9999)::text, 4, '0')
on conflict (number) do nothing;

create or replace function public.regenerate_rifa_tickets_for_digits(
  p_total_cifras integer
)
returns void
language plpgsql
security definer
as $$
declare
  v_total integer;
begin
  if p_total_cifras < 1 or p_total_cifras > 6 then
    raise exception 'totalCifras must be between 1 and 6';
  end if;

  if exists(select 1 from public.rifa_tickets where status = 'sold') then
    raise exception 'cannot regenerate tickets while there are sold tickets';
  end if;

  v_total := power(10, p_total_cifras)::integer;

  delete from public.rifa_tickets;

  insert into public.rifa_tickets (number)
  select lpad(gs::text, p_total_cifras, '0')
  from generate_series(0, v_total - 1) as gs;
end;
$$;

create or replace function public.sell_random_rifa_tickets(
  p_buyer_name text,
  p_buyer_whatsapp text,
  p_buyer_email text,
  p_package_id text,
  p_package_name text,
  p_ticket_count integer,
  p_amount_cop integer,
  p_payment_method text,
  p_mercado_pago_payment_id text default null
)
returns table (purchase_id uuid, ticket_numbers text[])
language plpgsql
security definer
as $$
declare
  v_purchase_id uuid;
  v_numbers text[];
begin
  if p_mercado_pago_payment_id is not null then
    select rp.id, rp.ticket_numbers
    into v_purchase_id, v_numbers
    from public.rifa_purchases rp
    where rp.mercado_pago_payment_id = p_mercado_pago_payment_id;

    if v_purchase_id is not null then
      return query select v_purchase_id as purchase_id, v_numbers as ticket_numbers;
      return;
    end if;
  end if;

  if p_ticket_count < 5 or p_ticket_count > 500 then
    raise exception 'ticket_count must be between 5 and 500';
  end if;

  select array_agg(selected.number)
  into v_numbers
  from (
    select rt.number
    from public.rifa_tickets rt
    where rt.status = 'available'
    order by random()
    limit p_ticket_count
    for update skip locked
  ) selected;

  if coalesce(array_length(v_numbers, 1), 0) <> p_ticket_count then
    raise exception 'not enough available tickets';
  end if;

  insert into public.rifa_purchases (
    buyer_name,
    buyer_whatsapp,
    buyer_email,
    package_id,
    package_name,
    ticket_count,
    amount_cop,
    payment_method,
    status,
    ticket_numbers,
    mercado_pago_payment_id
  )
  values (
    p_buyer_name,
    p_buyer_whatsapp,
    nullif(p_buyer_email, ''),
    p_package_id,
    p_package_name,
    p_ticket_count,
    p_amount_cop,
    p_payment_method,
    'sold',
    v_numbers,
    p_mercado_pago_payment_id
  )
  returning id into v_purchase_id;

  update public.rifa_tickets
  set
    status = 'sold',
    purchase_id = v_purchase_id,
    buyer_name = p_buyer_name,
    buyer_whatsapp = p_buyer_whatsapp,
    buyer_email = nullif(p_buyer_email, ''),
    sold_at = now()
  where number = any(v_numbers);

  return query select v_purchase_id as purchase_id, v_numbers as ticket_numbers;
end;
$$;

create or replace function public.pick_minor_prize_numbers(
  p_count integer default 10,
  p_exclude_number text default null
)
returns text[]
language sql
security definer
as $$
  select coalesce(array_agg(number), '{}')
  from (
    select number
    from public.rifa_tickets
    where status = 'sold'
      and (p_exclude_number is null or number <> p_exclude_number)
    order by random()
    limit p_count
  ) selected;
$$;
