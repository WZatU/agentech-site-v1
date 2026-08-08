create table if not exists public.master_live_camera_state (
  session_id bigint primary key,
  mode text not null check (mode in ('wall', 'focus')),
  camera_id text null check (
    camera_id is null or camera_id in ('front-main', 'front-left', 'front-right', 'rgbd-color')
  ),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint master_live_camera_state_focus_camera check (
    (mode = 'wall' and camera_id is null) or (mode = 'focus' and camera_id is not null)
  )
);

alter table public.master_live_camera_state enable row level security;

revoke all on table public.master_live_camera_state from anon, authenticated;
grant select, insert, update, delete on table public.master_live_camera_state to service_role;
