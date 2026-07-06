create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text,
  gender text not null default 'female',
  phone text,
  email text,
  birth_date date,
  marketing_consent boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.treatments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  treatment_name text not null,
  treatment_date date not null,
  area text,
  product_used text,
  price numeric,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  remind_at date not null,
  reason text,
  message text,
  status text not null default 'pending',
  contact_status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  visit_date date not null,
  visit_time text,
  treatment text,
  value numeric,
  status text not null default 'planned',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  sms boolean not null default false,
  whatsapp boolean not null default false,
  email boolean not null default false,
  photos boolean not null default false,
  rodo_info boolean not null default true,
  consent_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.sms_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  message text not null,
  source text,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.clients enable row level security;
alter table public.treatments enable row level security;
alter table public.reminders enable row level security;
alter table public.appointments enable row level security;
alter table public.consents enable row level security;
alter table public.sms_queue enable row level security;

create policy clients_select_own on public.clients for select using (auth.uid() = user_id);
create policy clients_insert_own on public.clients for insert with check (auth.uid() = user_id);
create policy clients_update_own on public.clients for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy clients_delete_own on public.clients for delete using (auth.uid() = user_id);

create policy treatments_select_own on public.treatments for select using (auth.uid() = user_id);
create policy treatments_insert_own on public.treatments for insert with check (auth.uid() = user_id);
create policy treatments_update_own on public.treatments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy treatments_delete_own on public.treatments for delete using (auth.uid() = user_id);

create policy reminders_select_own on public.reminders for select using (auth.uid() = user_id);
create policy reminders_insert_own on public.reminders for insert with check (auth.uid() = user_id);
create policy reminders_update_own on public.reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reminders_delete_own on public.reminders for delete using (auth.uid() = user_id);

create policy appointments_select_own on public.appointments for select using (auth.uid() = user_id);
create policy appointments_insert_own on public.appointments for insert with check (auth.uid() = user_id);
create policy appointments_update_own on public.appointments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy appointments_delete_own on public.appointments for delete using (auth.uid() = user_id);

create policy consents_select_own on public.consents for select using (auth.uid() = user_id);
create policy consents_insert_own on public.consents for insert with check (auth.uid() = user_id);
create policy consents_update_own on public.consents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy consents_delete_own on public.consents for delete using (auth.uid() = user_id);

create policy sms_queue_select_own on public.sms_queue for select using (auth.uid() = user_id);
create policy sms_queue_insert_own on public.sms_queue for insert with check (auth.uid() = user_id);
create policy sms_queue_update_own on public.sms_queue for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sms_queue_delete_own on public.sms_queue for delete using (auth.uid() = user_id);
