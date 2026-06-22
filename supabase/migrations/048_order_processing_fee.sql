-- Add order processing fee column to bookings
alter table bookings add column if not exists order_processing_fee_pence integer not null default 0;

-- Add platform setting (default 49p)
insert into platform_settings (key, value)
values ('order_processing_fee_pence', '49')
on conflict (key) do nothing;
