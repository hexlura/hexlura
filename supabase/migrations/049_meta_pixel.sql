alter table organiser_profiles
    add column if not exists meta_pixel_id text;

insert into platform_settings (key, value)
values ('meta_pixel_id', '')
on conflict (key) do nothing;
