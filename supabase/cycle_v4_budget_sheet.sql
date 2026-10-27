-- Cycle v4: one budget sheet.
-- Fixed bills move onto their fixed category (due day + paying account), so
-- the separate cycle_recurring_expenses list is no longer needed. A manual
-- "paid" tick per category per cycle replaces cycle_recurring_paid_log.
-- The old tables are left in place (not read by the app any more).

alter table public.cycle_categories
  add column if not exists due_day smallint check (due_day between 1 and 31),
  add column if not exists pay_account_id uuid references public.cycle_accounts(id) on delete set null;

create table if not exists public.cycle_fixed_paid (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.cycle_categories(id) on delete cascade,
  cycle_key   date not null,
  paid_at     timestamptz not null default now(),
  unique (category_id, cycle_key)
);
alter table public.cycle_fixed_paid enable row level security;
drop policy if exists "own fixed paid" on public.cycle_fixed_paid;
create policy "own fixed paid" on public.cycle_fixed_paid
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Carry the old recurring bills over to their categories
update public.cycle_categories c
set due_day        = r.due_day,
    pay_account_id = coalesce(c.pay_account_id, a.id)
from public.cycle_recurring_expenses r
left join public.cycle_accounts a on a.user_id = r.user_id and a.name = r.account
where r.category_id = c.id and r.user_id = c.user_id and r.is_active;

insert into public.cycle_fixed_paid (user_id, category_id, cycle_key, paid_at)
select p.user_id, r.category_id, p.cycle_key, p.paid_at
from public.cycle_recurring_paid_log p
join public.cycle_recurring_expenses r on r.id = p.recurring_id
where r.category_id is not null
on conflict (category_id, cycle_key) do nothing;
