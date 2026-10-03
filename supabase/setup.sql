create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  description text not null,
  price_cents integer not null check (price_cents > 0),
  image_path text not null,
  specs jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null default '',
  status text not null default 'confirmed',
  total_cents integer not null check (total_cents > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id),
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents > 0),
  quantity integer not null check (quantity between 1 and 10)
);

create index if not exists orders_user_id_idx on public.orders (user_id, created_at desc);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "public read products" on public.products;
create policy "public read products"
  on public.products
  for select
  to anon, authenticated
  using (true);

drop policy if exists "read own orders" on public.orders;
create policy "read own orders"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "insert own orders" on public.orders;
create policy "insert own orders"
  on public.orders
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "read own order items" on public.order_items;
create policy "read own order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
    )
  );

drop policy if exists "insert own order items" on public.order_items;
create policy "insert own order items"
  on public.order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
    )
  );

grant select on public.products to anon, authenticated;
grant select, insert on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;

create or replace function public.place_order(items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $func$
declare
  uid uuid := auth.uid();
  user_email text := coalesce(auth.jwt() ->> 'email', '');
  new_id uuid;
  total integer := 0;
  requested integer;
  matched integer;
begin
  if uid is null then
    raise exception 'Sign in required';
  end if;

  if items is null or jsonb_typeof(items) <> 'array' then
    raise exception 'Cart is empty';
  end if;

  requested := jsonb_array_length(items);
  if requested = 0 or requested > 20 then
    raise exception 'Cart is empty';
  end if;

  select count(*) into matched
  from jsonb_array_elements(items) as item
  join public.products p on p.id = (item->>'productId')::uuid
  where (item->>'quantity')::int between 1 and 10;

  if matched <> requested then
    raise exception 'Cart contains an unknown product or quantity';
  end if;

  select coalesce(sum(p.price_cents * (item->>'quantity')::int), 0) into total
  from jsonb_array_elements(items) as item
  join public.products p on p.id = (item->>'productId')::uuid;

  insert into public.orders (user_id, email, total_cents)
  values (uid, user_email, total)
  returning id into new_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
  select new_id, p.id, p.name, p.price_cents, (item->>'quantity')::int
  from jsonb_array_elements(items) as item
  join public.products p on p.id = (item->>'productId')::uuid;

  return new_id;
end;
$func$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to authenticated;


insert into public.products (slug, name, category, description, price_cents, image_path, specs, sort_order)
values
('ps5-slim', 'PlayStation 5 Slim', 'Consoles', 'The current PlayStation console in the smaller chassis, with a disc drive, room for a large library, and a DualSense controller in the box.', 49900, '/products/ps5-slim.jpg', '["Disc edition","1TB storage","4K output up to 120Hz","DualSense controller included"]'::jsonb, 1),
('xbox-series-x', 'Xbox Series X', 'Consoles', 'Microsoft''s flagship console for players who want quick loads, native 4K, and access to Game Pass on the living-room screen.', 49900, '/products/xbox-series-x.jpg', '["1TB storage","4K / 120Hz capable","Disc drive","Quick Resume"]'::jsonb, 2),
('switch-oled', 'Nintendo Switch OLED', 'Consoles', 'A hybrid console with a sharper OLED screen for handheld play and a dock for the television. Built for nights that move between the couch and the desk.', 34900, '/products/switch-oled.jpg', '["7-inch OLED screen","Handheld and docked play","64GB storage","Wired LAN on the dock"]'::jsonb, 3),
('pulse-27', 'Pulse 27 Display', 'Displays', 'A 27-inch 1440p panel aimed at fast console and PC play. High refresh, a simple stand, and enough desk presence without taking the whole room.', 32900, '/products/pulse-27.jpg', '["27-inch 1440p","165Hz refresh","1ms response class","HDMI and DisplayPort"]'::jsonb, 4),
('span-34', 'Span 34 Ultrawide', 'Displays', 'A 34-inch ultrawide for players who keep a map, a chat, and the match on one screen. Curved just enough to fill the peripheral view.', 54900, '/products/span-34.jpg', '["34-inch ultrawide","144Hz refresh","Curved panel","HDR support"]'::jsonb, 5),
('field-controller', 'Field Wireless Controller', 'Controls', 'A wireless pad with a mature grip, trigger locks for shallow presses, and a charging cable in the box. Works on console and PC.', 6900, '/products/field-controller.jpg', '["Wireless","Trigger locks","Rechargeable","Console and PC"]'::jsonb, 6),
('hall-headset', 'Hall Over-ear Headset', 'Audio', 'A closed headset for long sessions. The mic mutes with a flip, and the earcups stay comfortable past the first hour.', 12900, '/products/hall-headset.jpg', '["Over-ear","Flip-to-mute mic","3.5mm and USB","Memory-foam cups"]'::jsonb, 7),
('tact-keyboard', 'Tact Mechanical Keyboard', 'Controls', 'A compact mechanical board with hot-swap switches and per-key lighting you can actually turn off. Built for desk setups that stay up late.', 14900, '/products/tact-keyboard.jpg', '["Hot-swap switches","Compact layout","USB-C","Lighting can be switched off"]'::jsonb, 8),
('glide-mouse', 'Glide Lightweight Mouse', 'Controls', 'A light wireless mouse for low-sensitivity players. The shape stays neutral, and the battery lasts through a season of nightly play.', 7900, '/products/glide-mouse.jpg', '["Wireless","Lightweight shell","USB-C charging","Optical sensor"]'::jsonb, 9),
('arcade-controller', 'Arcade Wireless Controller', 'Controls', 'A second pad for the couch, with a low-profile face and a cable for wired play when the battery runs out.', 6400, '/products/arcade-controller.jpg', '["Wireless","Wired fallback","Standard layout","Console and PC"]'::jsonb, 10)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  price_cents = excluded.price_cents,
  image_path = excluded.image_path,
  specs = excluded.specs,
  sort_order = excluded.sort_order;

notify pgrst, 'reload schema';
