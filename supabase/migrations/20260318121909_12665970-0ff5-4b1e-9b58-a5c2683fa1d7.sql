drop policy if exists "Authenticated users can insert order responsibles" on public.order_responsibles;
drop policy if exists "Authenticated users can update order responsibles" on public.order_responsibles;
drop policy if exists "Authenticated users can delete order responsibles" on public.order_responsibles;

create policy "Authenticated users can insert order responsibles"
on public.order_responsibles
for insert
to authenticated
with check (auth.uid() is not null);

create policy "Authenticated users can update order responsibles"
on public.order_responsibles
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Authenticated users can delete order responsibles"
on public.order_responsibles
for delete
to authenticated
using (auth.uid() is not null);