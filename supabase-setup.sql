-- ແລ່ນໂຄ້ດນີ້ໃນ Supabase Dashboard → SQL Editor → Run
-- ສ້າງ 2 ຕາຕະລາງ: orders (ອໍເດີຈາກລູກຄ້າ) ແລະ menu_config (ເມນູ)
-- (ລຶບຕາຕະລາງເກົ່າອອກກ່ອນ ເຜື່ອກໍລະນີເຄີຍຮັນມາກ່ອນ)

drop table if exists orders cascade;
drop table if exists menu_config cascade;

create table orders (
  id uuid default gen_random_uuid() primary key,
  table_number text,
  items jsonb not null,
  total numeric not null,
  status text default 'pending',
  note text,
  created_at timestamp with time zone default now()
);

alter table orders enable row level security;

create policy "Allow public insert" on orders
  for insert to anon with check (true);

create policy "Allow public read" on orders
  for select to anon using (true);

create policy "Allow public update" on orders
  for update to anon using (true);

-- ຕາຕະລາງເກັບເມນູ (ແຖວດຽວ, ເກັບເປັນ JSON) ໃຫ້ທັງລູກຄ້າ ແລະ ພະນັກງານໃຊ້ຮ່ວມກັນ
create table menu_config (
  id int primary key default 1,
  menu jsonb not null,
  updated_at timestamp with time zone default now(),
  constraint single_row check (id = 1)
);

alter table menu_config enable row level security;

create policy "Allow public read menu" on menu_config
  for select to anon using (true);

create policy "Allow public update menu" on menu_config
  for all to anon using (true) with check (true);

-- ໃສ່ເມນູເລີ່ມຕົ້ນ (ຄືອັນທີ່ໃຊ້ຢູ່ໃນແອັບ)
insert into menu_config (id, menu) values (1, '[
  {"id":"coffee","label":"ກາເຟ","items":[
    {"id":"esp","name":"ເອສເປຣັດໂຊ","price":15000,"stock":null},
    {"id":"ame","name":"ອາເມຣິກາໂນ","price":18000,"stock":null},
    {"id":"lat","name":"ລາເຕ້","price":22000,"stock":null},
    {"id":"cap","name":"ຄາປູຊິໂນ","price":22000,"stock":null},
    {"id":"moc","name":"ໂມກາ","price":25000,"stock":null}
  ]},
  {"id":"cold","label":"ເຄື່ອງດື່ມເຢັນ","items":[
    {"id":"ice","name":"ກາເຟເຢັນ","price":20000,"stock":null},
    {"id":"tha","name":"ຊາໄທ","price":18000,"stock":null},
    {"id":"lem","name":"ນ້ຳໝາກນາວ","price":15000,"stock":null}
  ]},
  {"id":"bakery","label":"ເບເກີຣີ","items":[
    {"id":"cro","name":"ຄຣົວຊອງ","price":15000,"stock":10},
    {"id":"cak","name":"ເຄັກຊັອກໂກແລັດ","price":20000,"stock":8},
    {"id":"san","name":"ແຊນວິດ","price":25000,"stock":6}
  ]}
]'::jsonb);

-- ເປີດ realtime ໃຫ້ຕາຕະລາງ orders (ໃຫ້ພະນັກງານເຫັນອໍເດີໃໝ່ທັນທີ)
-- ຫໍ່ໄວ້ໃນ DO block ເພື່ອບໍ່ໃຫ້ script ລົ້ມທັງໝົດ ຖ້າ publication ນີ້ບໍ່ມີ ຫຼື ເພີ່ມໄປແລ້ວ
do $$
begin
  alter publication supabase_realtime add table orders;
exception
  when others then
    null; -- ຂ້າມໄປ, ບໍ່ເປັນຫຍັງ — ແອັບຍັງເຮັດວຽກໄດ້ຜ່ານການ poll ຢູ່ໃນໂຄ້ດ
end $$;

-- ==========================================================
-- ເພີ່ມ: ປະຫວັດການຂາຍ + ການປິດຍອດ (ຍ້າຍຈາກ browser ໄປເກັບໄວ້ໃນຄລາວ)
-- ==========================================================

drop table if exists sales_history cascade;
drop table if exists day_closures cascade;

create table sales_history (
  id uuid default gen_random_uuid() primary key,
  order_no int,
  sale_date timestamp with time zone default now(),
  items jsonb not null,
  total numeric not null,
  paid numeric,
  change numeric,
  note text
);

alter table sales_history enable row level security;

create policy "Allow public all sales_history" on sales_history
  for all to anon using (true) with check (true);

create table day_closures (
  date_str text primary key,
  closure_date timestamp with time zone default now(),
  total numeric not null,
  order_count int,
  items_sold jsonb,
  note text
);

alter table day_closures enable row level security;

create policy "Allow public all day_closures" on day_closures
  for all to anon using (true) with check (true);

-- ==========================================================
-- ເພີ່ມ: Storage bucket ສຳລັບອັບໂຫລດຮູບເມນູໂດຍກົງ
-- ==========================================================

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

do $$
begin
  create policy "Public read menu images" on storage.objects
    for select to anon using (bucket_id = 'menu-images');
exception
  when others then null;
end $$;

do $$
begin
  create policy "Public upload menu images" on storage.objects
    for insert to anon with check (bucket_id = 'menu-images');
exception
  when others then null;
end $$;

do $$
begin
  create policy "Public update menu images" on storage.objects
    for update to anon using (bucket_id = 'menu-images');
exception
  when others then null;
end $$;
