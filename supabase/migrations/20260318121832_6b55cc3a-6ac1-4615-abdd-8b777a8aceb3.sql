create type public.order_responsible_type as enum ('vendedor', 'orcamentista', 'projetista', 'montador');

create table public.order_responsibles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.order_responsible_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index order_responsibles_type_name_unique_idx
  on public.order_responsibles (type, lower(name));

alter table public.order_responsibles enable row level security;

create policy "Authenticated users can view order responsibles"
on public.order_responsibles
for select
to authenticated
using (true);

create policy "Authenticated users can insert order responsibles"
on public.order_responsibles
for insert
to authenticated
with check (true);

create policy "Authenticated users can update order responsibles"
on public.order_responsibles
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete order responsibles"
on public.order_responsibles
for delete
to authenticated
using (true);

alter table public.orders
  add column if not exists seller_responsible_id uuid,
  add column if not exists seller_responsible_name text,
  add column if not exists comissao_vendedor_responsible_id uuid,
  add column if not exists comissao_orcamentista_responsible_id uuid,
  add column if not exists comissao_projetista_responsible_id uuid,
  add column if not exists comissao_montador_responsible_id uuid;

alter table public.orders
  add constraint orders_seller_responsible_id_fkey
  foreign key (seller_responsible_id)
  references public.order_responsibles(id)
  on delete set null;

alter table public.orders
  add constraint orders_comissao_vendedor_responsible_id_fkey
  foreign key (comissao_vendedor_responsible_id)
  references public.order_responsibles(id)
  on delete set null;

alter table public.orders
  add constraint orders_comissao_orcamentista_responsible_id_fkey
  foreign key (comissao_orcamentista_responsible_id)
  references public.order_responsibles(id)
  on delete set null;

alter table public.orders
  add constraint orders_comissao_projetista_responsible_id_fkey
  foreign key (comissao_projetista_responsible_id)
  references public.order_responsibles(id)
  on delete set null;

alter table public.orders
  add constraint orders_comissao_montador_responsible_id_fkey
  foreign key (comissao_montador_responsible_id)
  references public.order_responsibles(id)
  on delete set null;

insert into public.order_responsibles (name, type)
select distinct p.full_name, 'vendedor'::public.order_responsible_type
from public.orders o
join public.profiles p on p.id = o.comissao_vendedor_responsavel_id
where o.comissao_vendedor_responsavel_id is not null
  and coalesce(nullif(trim(p.full_name), ''), '') <> ''
on conflict (type, lower(name)) do nothing;

insert into public.order_responsibles (name, type)
select distinct p.full_name, 'orcamentista'::public.order_responsible_type
from public.orders o
join public.profiles p on p.id = o.comissao_orcamentista_responsavel_id
where o.comissao_orcamentista_responsavel_id is not null
  and coalesce(nullif(trim(p.full_name), ''), '') <> ''
on conflict (type, lower(name)) do nothing;

insert into public.order_responsibles (name, type)
select distinct p.full_name, 'projetista'::public.order_responsible_type
from public.orders o
join public.profiles p on p.id = o.comissao_projetista_responsavel_id
where o.comissao_projetista_responsavel_id is not null
  and coalesce(nullif(trim(p.full_name), ''), '') <> ''
on conflict (type, lower(name)) do nothing;

insert into public.order_responsibles (name, type)
select distinct p.full_name, 'montador'::public.order_responsible_type
from public.orders o
join public.profiles p on p.id = o.comissao_montador_responsavel_id
where o.comissao_montador_responsavel_id is not null
  and coalesce(nullif(trim(p.full_name), ''), '') <> ''
on conflict (type, lower(name)) do nothing;

insert into public.order_responsibles (name, type)
select distinct p.full_name, 'vendedor'::public.order_responsible_type
from public.orders o
join public.profiles p on p.id = o.vendedor_id
where o.vendedor_id is not null
  and coalesce(nullif(trim(p.full_name), ''), '') <> ''
on conflict (type, lower(name)) do nothing;

update public.orders o
set seller_responsible_id = r.id,
    seller_responsible_name = r.name
from public.profiles p
join public.order_responsibles r
  on r.type = 'vendedor'::public.order_responsible_type
 and lower(r.name) = lower(p.full_name)
where o.vendedor_id = p.id;

update public.orders o
set comissao_vendedor_responsible_id = r.id
from public.profiles p
join public.order_responsibles r
  on r.type = 'vendedor'::public.order_responsible_type
 and lower(r.name) = lower(p.full_name)
where o.comissao_vendedor_responsavel_id = p.id;

update public.orders o
set comissao_orcamentista_responsible_id = r.id
from public.profiles p
join public.order_responsibles r
  on r.type = 'orcamentista'::public.order_responsible_type
 and lower(r.name) = lower(p.full_name)
where o.comissao_orcamentista_responsavel_id = p.id;

update public.orders o
set comissao_projetista_responsible_id = r.id
from public.profiles p
join public.order_responsibles r
  on r.type = 'projetista'::public.order_responsible_type
 and lower(r.name) = lower(p.full_name)
where o.comissao_projetista_responsavel_id = p.id;

update public.orders o
set comissao_montador_responsible_id = r.id
from public.profiles p
join public.order_responsibles r
  on r.type = 'montador'::public.order_responsible_type
 and lower(r.name) = lower(p.full_name)
where o.comissao_montador_responsavel_id = p.id;

update public.orders o
set seller_responsible_name = r.name
from public.order_responsibles r
where o.seller_responsible_id = r.id
  and (o.seller_responsible_name is null or btrim(o.seller_responsible_name) = '');