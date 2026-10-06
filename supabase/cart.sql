create table if not exists public.cart_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 10),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.cart_items enable row level security;

drop policy if exists "read own cart" on public.cart_items;
create policy "read own cart"
  on public.cart_items
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "insert own cart" on public.cart_items;
create policy "insert own cart"
  on public.cart_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "update own cart" on public.cart_items;
create policy "update own cart"
  on public.cart_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own cart" on public.cart_items;
create policy "delete own cart"
  on public.cart_items
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.cart_items to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.cart_items;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
