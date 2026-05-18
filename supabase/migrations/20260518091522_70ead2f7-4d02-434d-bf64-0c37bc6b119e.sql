-- Roles
create type public.app_role as enum ('admin', 'manager', 'employee');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "roles readable by authenticated" on public.user_roles
  for select to authenticated using (true);
create policy "admin manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Auto profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'employee') on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active',
  color text not null default '#3B82F6',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;

create policy "projects readable" on public.projects for select to authenticated using (true);
create policy "managers create projects" on public.projects for insert to authenticated
  with check (public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'admin'));
create policy "managers update projects" on public.projects for update to authenticated
  using (public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'admin'));
create policy "admins delete projects" on public.projects for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- Tasks
create sequence if not exists public.task_code_seq start 1000;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default ('TASK-' || nextval('public.task_code_seq')),
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'medium',
  assignee_id uuid references auth.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  progress integer not null default 0 check (progress between 0 and 100),
  estimated_hours numeric not null default 0,
  logged_hours numeric not null default 0,
  due_date date,
  sprint text,
  tags text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;

create policy "tasks readable" on public.tasks for select to authenticated using (true);
create policy "tasks insert auth" on public.tasks for insert to authenticated with check (auth.uid() is not null);
create policy "tasks update" on public.tasks for update to authenticated
  using (
    auth.uid() = assignee_id
    or auth.uid() = created_by
    or public.has_role(auth.uid(),'manager')
    or public.has_role(auth.uid(),'admin')
  );
create policy "tasks delete managers" on public.tasks for delete to authenticated
  using (public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'admin'));

-- Timesheets
create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  hours numeric not null check (hours > 0),
  date date not null default current_date,
  notes text,
  billable boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.timesheets enable row level security;

create policy "timesheets readable" on public.timesheets for select to authenticated using (true);
create policy "timesheets insert own" on public.timesheets for insert to authenticated with check (auth.uid() = user_id);
create policy "timesheets update own" on public.timesheets for update to authenticated using (auth.uid() = user_id);
create policy "timesheets delete own" on public.timesheets for delete to authenticated using (auth.uid() = user_id);

-- Updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger trg_projects_touch before update on public.projects for each row execute function public.touch_updated_at();
create trigger trg_tasks_touch before update on public.tasks for each row execute function public.touch_updated_at();

-- Indexes
create index on public.tasks (assignee_id);
create index on public.tasks (project_id);
create index on public.tasks (status);
create index on public.timesheets (user_id, date);