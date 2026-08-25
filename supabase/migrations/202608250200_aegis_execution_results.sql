alter table public.agentech_robot_sessions
  add column if not exists execution_result jsonb,
  add column if not exists execution_error text,
  add column if not exists execution_updated_at timestamptz;

comment on column public.agentech_robot_sessions.execution_result is
  'Validated, identity-bound final result produced by the trusted robot runner.';

comment on column public.agentech_robot_sessions.execution_error is
  'Runner-reported failure or Gateway reason that no trustworthy final result was available.';

comment on column public.agentech_robot_sessions.execution_updated_at is
  'Gateway timestamp for the most recent execution-result persistence attempt that succeeded.';
