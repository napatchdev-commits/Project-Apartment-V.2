-- ============================================================================
--  CONSOLIDATED SCHEMA SETUP SCRIPT FOR APARTMENT MANAGEMENT SYSTEM
--  รันไฟล์นี้ใน Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) ตารางตั้งค่า อัตราบริการ และค่าปรับชำระล่าช้า (Settings, Rates, late_fee_settings)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id                  int primary key default 1,
  apartment_name      text,
  address             text,
  tel                 text,
  line_id             text,
  bank_name           text,
  bank_account_no     text,
  bank_account_name   text,
  prompt_pay_id       text,
  line_token          text,
  line_user_id        text,
  line_notify_token   text,
  is_demo_mode        boolean default false,
  updated_at          timestamptz default now(),
  constraint settings_single_row check (id = 1)
);

create table if not exists public.rates (
  id                  int primary key default 1,
  electricity_rate    numeric default 8,
  water_rate          numeric default 20,
  trash_fee           numeric default 20,
  internet_fee        numeric default 0,
  common_fee          numeric default 0,
  updated_at          timestamptz default now(),
  constraint rates_single_row check (id = 1)
);

create table if not exists public.late_fee_settings (
  id                      int primary key default 1,
  due_day                 int default 5,
  penalty_phase1_start    int default 6,
  penalty_phase1_end      int default 15,
  penalty_phase1_amount   numeric default 200,
  penalty_phase2_start    int default 16,
  penalty_phase2_end      int default 31,
  penalty_phase2_amount   numeric default 300,
  updated_at              timestamptz default now(),
  constraint late_fee_settings_single_row check (id = 1)
);

-- ---------------------------------------------------------------------------
-- 2) ผู้ใช้งานระบบ (แอดมิน/สตาฟ)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id             text primary key,
  username       text unique not null,
  display_name   text,
  role           text not null default 'staff',
  password_hash  text not null,
  updated_at     timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 3) ประเภทห้องพักและข้อมูลห้องเช่า
-- ---------------------------------------------------------------------------
create table if not exists public.room_types (
  id            text primary key,
  name          text not null,
  rental_type   text,
  default_rent  numeric default 0,
  description   text,
  updated_at    timestamptz default now()
);

create table if not exists public.rooms (
  id                    text primary key,
  name                  text not null,
  floor                 int default 1,
  type_id               text references public.room_types(id) on delete set null,
  base_rent             numeric default 0,
  status                text default 'vacant',
  current_tenant_id     text,
  current_tenant_name   text,
  entry_date            date,
  last_water_meter      numeric default 0,
  last_elec_meter       numeric default 0,
  trash_fee             numeric,
  internet_fee          numeric,
  common_fee            numeric,
  temp_elec_meter       numeric,
  temp_water_meter      numeric,
  temp_fine_amount      numeric,
  updated_at            timestamptz default now()
);
create index if not exists idx_rooms_status on public.rooms(status);

-- ---------------------------------------------------------------------------
-- 4) ข้อมูลผู้เช่าและรายละเอียดประกันสัญญา
-- ---------------------------------------------------------------------------
create table if not exists public.tenants (
  id                text primary key,
  name              text not null,
  id_card           text,
  tel               text,
  line_id           text,
  email             text,
  address           text,
  start_date        date,
  end_date          date,
  assigned_room_id  text references public.rooms(id) on delete set null,
  deposit_amount    numeric default 0,
  deposit_status    text default 'active',
  witness1          text,
  witness2          text,
  updated_at        timestamptz default now()
);
create index if not exists idx_tenants_room on public.tenants(assigned_room_id);
create index if not exists idx_tenants_idcard on public.tenants(id_card);

create table if not exists public.tenant_documents (
  id            text primary key,
  tenant_id     text not null references public.tenants(id) on delete cascade,
  category      text not null,
  title         text,
  file_name     text,
  file_type     text,
  file_size     bigint,
  file_url      text,
  upload_date   date,
  updated_at    timestamptz default now()
);
create index if not exists idx_tenant_documents_tenant on public.tenant_documents(tenant_id);

create table if not exists public.tenant_deposit_deductions (
  id            text primary key,
  tenant_id     text not null references public.tenants(id) on delete cascade,
  description   text,
  amount        numeric default 0,
  date          date,
  updated_at    timestamptz default now()
);
create index if not exists idx_deposit_deductions_tenant on public.tenant_deposit_deductions(tenant_id);

-- ---------------------------------------------------------------------------
-- 5) ใบแจ้งหนี้ และประวัติสลิปเงินโอน
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id                  text primary key,
  invoice_number      text not null,
  month_key           text not null,
  room_id             text references public.rooms(id) on delete set null,
  room_name           text,
  tenant_id           text,
  tenant_name         text,
  issue_date          date,
  due_date            date,
  water_prev          numeric default 0,
  water_curr          numeric default 0,
  water_amount        numeric default 0,
  elec_prev           numeric default 0,
  elec_curr           numeric default 0,
  elec_amount         numeric default 0,
  rent_amount         numeric default 0,
  trash_fee           numeric default 0,
  fine_amount         numeric default 0,
  internet_fee        numeric default 0,
  common_fee          numeric default 0,
  penalty_amount      numeric default 0,
  penalty_rule        text,
  penalty_calculated_at timestamptz,
  total_amount        numeric default 0,
  paid_amount         numeric default 0,
  outstanding_amount  numeric default 0,
  status              text default 'unpaid',
  slip_url            text,
  updated_at          timestamptz default now(),
  unique (room_id, month_key),
  unique (invoice_number)
);
create index if not exists idx_invoices_month on public.invoices(month_key);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_room on public.invoices(room_id);

create table if not exists public.payment_slips (
  id                  text primary key,
  invoice_id          text references public.invoices(id) on delete cascade,
  tenant_id           text references public.tenants(id) on delete set null,
  room_id             text references public.rooms(id) on delete set null,
  room_name           text not null,
  tenant_name         text not null,
  month_key           text not null,
  storage_path        text,
  public_url          text not null,
  amount              numeric default 0,
  required_amount     numeric default 0,
  fine_amount         numeric default 0,
  reference_no        text,
  qr_transaction_id   text,
  sender_bank         text,
  receiver_bank       text,
  transaction_date    date,
  transaction_time    text,
  image_hash          text,
  verification_status text default 'pending',
  verified_by         text,
  verified_at         timestamptz,
  reject_reason       text,
  created_at          timestamptz default now()
);
create index if not exists idx_payment_slips_ref on public.payment_slips(reference_no);
create index if not exists idx_payment_slips_invoice on public.payment_slips(invoice_id);
create index if not exists idx_payment_slips_room_month on public.payment_slips(room_id, month_key);

-- ---------------------------------------------------------------------------
-- 6) รายการแจ้งซ่อม สมุดบัญชี ตารางนัดหมาย และมิเตอร์ล็อก
-- ---------------------------------------------------------------------------
create table if not exists public.repairs (
  id                    text primary key,
  ticket_number         text,
  room_id               text references public.rooms(id) on delete set null,
  room_name             text,
  tenant_name           text,
  title                 text,
  description           text,
  category              text default 'general',
  request_date          date,
  status                text default 'pending',
  expense_amount        numeric default 0,
  assigned_technician   text,
  image_url             text,
  updated_at            timestamptz default now()
);
create index if not exists idx_repairs_room on public.repairs(room_id);
create index if not exists idx_repairs_status on public.repairs(status);

create table if not exists public.ledger (
  id            text primary key,
  date          date,
  type          text,
  category      text,
  description   text,
  amount        numeric default 0,
  recorded_by   text,
  updated_at    timestamptz default now()
);
create index if not exists idx_ledger_date on public.ledger(date);

create table if not exists public.events (
  id            text primary key,
  title         text,
  date          date,
  category      text,
  room_name     text,
  updated_at    timestamptz default now()
);

create table if not exists public.meter_audit_logs (
  id                 text primary key,
  room_id            text,
  room_name          text,
  month_key          text,
  recorded_by        text,
  action_type        text,
  old_water_curr     numeric,
  new_water_curr     numeric,
  old_elec_curr      numeric,
  new_elec_curr      numeric,
  water_units        numeric,
  elec_units         numeric,
  water_amount       numeric,
  elec_amount        numeric,
  notes              text,
  created_at         timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 7) เปิดสิทธิ์ Row Level Security (RLS) และ Allow All Policies
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array['settings','rates','users','room_types','rooms','tenants','tenant_documents','tenant_deposit_deductions','invoices','repairs','ledger','events','payment_slips','meter_audit_logs'])
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "allow all" on public.%I;', t);
    execute format('create policy "allow all" on public.%I for all using (true) with check (true);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 8) อัปเดตข้อมูลตั้งค่าพื้นฐานและบันทึก Seed ผู้ใช้งานเริ่มต้น
-- ---------------------------------------------------------------------------
insert into public.users (id, username, display_name, role, password_hash)
values 
  ('usr_super', 'superadmin', 'ผู้ดูแลระบบสูงสุด', 'super_admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'),
  ('usr_admin', 'admin', 'ผู้ดูแลระบบ', 'admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'),
  ('usr_staff', 'staff', 'พนักงานทั่วไป', 'staff', '1562206543da764123c21bd524674f0a8aaf49c8a89744c97352fe677f7e4006')
on conflict (id) do nothing;

insert into public.settings (id, apartment_name, address, tel, is_demo_mode)
values (1, 'ระบบอพาร์ตเมนต์ใหม่', 'ที่อยู่สำหรับพิมพ์บิลระบุในหน้าตั้งค่า', '080-xxx-xxxx', false)
on conflict (id) do nothing;

insert into public.rates (id, electricity_rate, water_rate, trash_fee, internet_fee, common_fee)
values (1, 8.0, 20.0, 20.0, 0.0, 0.0)
on conflict (id) do nothing;

insert into public.late_fee_settings (id, due_day, penalty_phase1_start, penalty_phase1_end, penalty_phase1_amount, penalty_phase2_start, penalty_phase2_end, penalty_phase2_amount)
values (1, 5, 6, 15, 200, 16, 31, 300)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 9) ฟังก์ชัน RPC สำหรับพอร์ทัลผู้เช่า (get_room_list, get_tenant_bill, rpc)
-- ---------------------------------------------------------------------------
create or replace function public.get_room_list()
returns json
language sql
security definer
as $$
  select json_build_object(
    'apartmentName', (select apartment_name from public.settings where id = 1),
    'rooms', coalesce((
      select json_agg(json_build_object(
        'id', r.id, 'name', r.name, 'floor', r.floor,
        'typeId', r.type_id, 'baseRent', r.base_rent, 'status', r.status,
        'currentTenantId', r.current_tenant_id, 'currentTenantName', r.current_tenant_name,
        'lastElecMeter', r.last_elec_meter, 'lastWaterMeter', r.last_water_meter
      ) order by r.name)
      from public.rooms r
    ), '[]'::json)
  );
$$;

create or replace function public.get_tenant_bill(p_id_card text, p_room_id text)
returns json
language plpgsql
security definer
as $$
declare
  v_tenant record;
  v_due_day int;
  v_p1_start int;
  v_p1_end int;
  v_p1_amt numeric;
  v_p2_start int;
  v_p2_end int;
  v_p2_amt numeric;
  v_inv record;
  v_today date;
  v_today_str text;
  v_t_day int;
  v_t_month int;
  v_t_year int;
  v_d_day int;
  v_d_month int;
  v_d_year int;
  v_penalty numeric;
  v_rule text;
begin
  select * into v_tenant
  from public.tenants
  where assigned_room_id = p_room_id
    and regexp_replace(id_card, '\D', '', 'g') = regexp_replace(p_id_card, '\D', '', 'g')
  limit 1;

  if not found then
    return json_build_object('status', 'error', 'message', 'ไม่พบข้อมูลผู้เช่า หรือเลขบัตรไม่ตรงกับห้องนี้');
  end if;

  select due_day, penalty_phase1_start, penalty_phase1_end, penalty_phase1_amount, penalty_phase2_start, penalty_phase2_end, penalty_phase2_amount
  into v_due_day, v_p1_start, v_p1_end, v_p1_amt, v_p2_start, v_p2_end, v_p2_amt
  from public.late_fee_settings
  where id = 1;

  if not found then
    v_due_day := 5;
    v_p1_start := 6;
    v_p1_end := 15;
    v_p1_amt := 200;
    v_p2_start := 16;
    v_p2_end := 31;
    v_p2_amt := 300;
  end if;

  v_today := current_date;
  v_today_str := to_char(v_today, 'YYYY-MM-DD');

  for v_inv in
    select * from public.invoices
    where room_id = p_room_id and status = 'unpaid'
  loop
    v_penalty := 0;
    v_rule := '';

    if v_inv.due_date is not null and v_today_str > to_char(v_inv.due_date, 'YYYY-MM-DD') then
      v_t_day := extract(day from v_today);
      v_t_month := extract(month from v_today);
      v_t_year := extract(year from v_today);

      v_d_day := extract(day from v_inv.due_date);
      v_d_month := extract(month from v_inv.due_date);
      v_d_year := extract(year from v_inv.due_date);

      if (v_t_year > v_d_year) or (v_t_year = v_d_year and v_t_month > v_d_month) then
        v_penalty := v_p2_amt;
        v_rule := 'ค้างชำระข้ามเดือน (ค่าปรับ ' || v_p2_amt || ' บาท)';
      elsif v_t_day >= v_p1_start and v_t_day <= v_p1_end then
        v_penalty := v_p1_amt;
        v_rule := 'ชำระล่าช้าช่วงที่ 1 (วันที่ ' || v_p1_start || '-' || v_p1_end || ': ค่าปรับ ' || v_p1_amt || ' บาท)';
      elsif v_t_day >= v_p2_start then
        v_penalty := v_p2_amt;
        v_rule := 'ชำระล่าช้าช่วงที่ 2 (วันที่ ' || v_p2_start || ' เป็นต้นไป: ค่าปรับ ' || v_p2_amt || ' บาท)';
      else
        v_penalty := v_p2_amt;
        v_rule := 'ชำระล่าช้าเกินกำหนด (ค่าปรับ ' || v_p2_amt || ' บาท)';
      end if;
    end if;

    if coalesce(v_inv.penalty_amount, 0) != v_penalty or coalesce(v_inv.penalty_rule, '') != v_rule then
      update public.invoices
      set penalty_amount = v_penalty,
          penalty_rule = v_rule,
          penalty_calculated_at = now(),
          total_amount = rent_amount + water_amount + elec_amount + trash_fee + internet_fee + common_fee + fine_amount + v_penalty,
          outstanding_amount = (rent_amount + water_amount + elec_amount + trash_fee + internet_fee + common_fee + fine_amount + v_penalty) - paid_amount,
          updated_at = now()
      where id = v_inv.id;
    end if;
  end loop;

  return json_build_object(
    'status', 'success',
    'settings', (select json_build_object(
                  'apartmentName', apartment_name,
                  'address', address,
                  'tel', tel,
                  'bankName', bank_name,
                  'bankAccountNo', bank_account_no,
                  'bankAccountName', bank_account_name,
                  'promptPayId', prompt_pay_id
                 ) from public.settings where id = 1),
    'lateFeeSettings', (select json_build_object(
                          'dueDay', due_day,
                          'penaltyPhase1Start', penalty_phase1_start,
                          'penaltyPhase1End', penalty_phase1_end,
                          'penaltyPhase1Amount', penalty_phase1_amount,
                          'penaltyPhase2Start', penalty_phase2_start,
                          'penaltyPhase2End', penalty_phase2_end,
                          'penaltyPhase2Amount', penalty_phase2_amount
                        ) from public.late_fee_settings where id = 1),
    'room', (select json_build_object(
               'id', id, 'name', name, 'floor', floor, 'baseRent', base_rent,
               'status', status, 'lastElecMeter', last_elec_meter, 'lastWaterMeter', last_water_meter
             ) from public.rooms where id = p_room_id),
    'tenant', json_build_object(
               'id', v_tenant.id, 'name', v_tenant.name, 'idCard', v_tenant.id_card,
               'tel', v_tenant.tel, 'email', v_tenant.email, 'assignedRoomId', v_tenant.assigned_room_id
             ),
    'invoices', coalesce((
               select json_agg(json_build_object(
                 'id', id, 'invoiceNumber', invoice_number, 'monthKey', month_key,
                 'roomId', room_id, 'roomName', room_name,
                 'tenantName', tenant_name,
                 'issueDate', issue_date, 'dueDate', due_date,
                 'waterPrev', water_prev, 'waterCurr', water_curr, 'waterAmount', water_amount,
                 'elecPrev', elec_prev, 'elecCurr', elec_curr, 'elecAmount', elec_amount,
                 'rentAmount', rent_amount, 'trashFee', trash_fee, 'fineAmount', fine_amount,
                 'internetFee', internet_fee, 'commonFee', common_fee,
                 'penaltyAmount', penalty_amount, 'penaltyRule', penalty_rule, 'penaltyCalculatedAt', penalty_calculated_at,
                 'totalAmount', total_amount, 'paidAmount', paid_amount, 'outstandingAmount', outstanding_amount,
                 'status', status, 'slipUrl', slip_url
               ) order by month_key desc)
               from public.invoices where room_id = p_room_id
             ), '[]'::json),
    'repairs', coalesce((
               select json_agg(json_build_object(
                 'id', id, 'ticketNumber', ticket_number, 'title', title, 'description', description,
                 'status', status, 'requestDate', request_date
               ) order by request_date desc)
               from public.repairs where room_id = p_room_id
             ), '[]'::json),
    'events', '[]'::json
  );
end;
$$;

create or replace function public.submit_tenant_payment(
  p_id_card text, p_room_id text, p_invoice_number text,
  p_payment_method text, p_slip_url text
)
returns json
language plpgsql
security definer
as $$
declare
  v_tenant_ok boolean;
  v_invoice record;
  v_due_day int;
  v_p1_start int;
  v_p1_end int;
  v_p1_amt numeric;
  v_p2_start int;
  v_p2_end int;
  v_p2_amt numeric;
  v_today date;
  v_today_str text;
  v_t_day int;
  v_t_month int;
  v_t_year int;
  v_d_day int;
  v_d_month int;
  v_d_year int;
  v_penalty numeric;
  v_rule text;
begin
  select exists(
    select 1 from public.tenants
    where assigned_room_id = p_room_id
      and regexp_replace(id_card, '\D', '', 'g') = regexp_replace(p_id_card, '\D', '', 'g')
  ) into v_tenant_ok;

  if not v_tenant_ok then
    return json_build_object('status', 'error', 'message', 'ยืนยันตัวตนผู้เช่าไม่สำเร็จ');
  end if;

  select * into v_invoice from public.invoices
  where invoice_number = p_invoice_number and room_id = p_room_id
  for update;

  if not found then
    return json_build_object('status', 'error', 'message', 'ไม่พบใบแจ้งหนี้นี้');
  end if;

  if v_invoice.status = 'paid' then
    return json_build_object('status', 'error', 'message', 'ใบแจ้งหนี้นี้ชำระแล้ว');
  end if;

  select due_day, penalty_phase1_start, penalty_phase1_end, penalty_phase1_amount, penalty_phase2_start, penalty_phase2_end, penalty_phase2_amount
  into v_due_day, v_p1_start, v_p1_end, v_p1_amt, v_p2_start, v_p2_end, v_p2_amt
  from public.late_fee_settings
  where id = 1;

  if not found then
    v_due_day := 5;
    v_p1_start := 6;
    v_p1_end := 15;
    v_p1_amt := 200;
    v_p2_start := 16;
    v_p2_end := 31;
    v_p2_amt := 300;
  end if;

  v_today := current_date;
  v_today_str := to_char(v_today, 'YYYY-MM-DD');
  v_penalty := 0;
  v_rule := '';

  if v_invoice.due_date is not null and v_today_str > to_char(v_invoice.due_date, 'YYYY-MM-DD') then
    v_t_day := extract(day from v_today);
    v_t_month := extract(month from v_today);
    v_t_year := extract(year from v_today);

    v_d_day := extract(day from v_invoice.due_date);
    v_d_month := extract(month from v_invoice.due_date);
    v_d_year := extract(year from v_invoice.due_date);

    if (v_t_year > v_d_year) or (v_t_year = v_d_year and v_t_month > v_d_month) then
      v_penalty := v_p2_amt;
      v_rule := 'ค้างชำระข้ามเดือน (ค่าปรับ ' || v_p2_amt || ' บาท)';
    elsif v_t_day >= v_p1_start and v_t_day <= v_p1_end then
      v_penalty := v_p1_amt;
      v_rule := 'ชำระล่าช้าช่วงที่ 1 (วันที่ ' || v_p1_start || '-' || v_p1_end || ': ค่าปรับ ' || v_p1_amt || ' บาท)';
    elsif v_t_day >= v_p2_start then
      v_penalty := v_p2_amt;
      v_rule := 'ชำระล่าช้าช่วงที่ 2 (วันที่ ' || v_p2_start || ' เป็นต้นไป: ค่าปรับ ' || v_p2_amt || ' บาท)';
    else
      v_penalty := v_p2_amt;
      v_rule := 'ชำระล่าช้าเกินกำหนด (ค่าปรับ ' || v_p2_amt || ' บาท)';
    end if;
  end if;

  update public.invoices
  set status = case when p_payment_method = 'transfer' then 'pending_verification' else 'paid' end,
      slip_url = coalesce(p_slip_url, slip_url),
      penalty_amount = v_penalty,
      penalty_rule = v_rule,
      penalty_calculated_at = now(),
      total_amount = rent_amount + water_amount + elec_amount + trash_fee + internet_fee + common_fee + fine_amount + v_penalty,
      outstanding_amount = case when p_payment_method = 'transfer' then (rent_amount + water_amount + elec_amount + trash_fee + internet_fee + common_fee + fine_amount + v_penalty) else 0.0 end,
      paid_amount = case when p_payment_method = 'transfer' then paid_amount else (rent_amount + water_amount + elec_amount + trash_fee + internet_fee + common_fee + fine_amount + v_penalty) end,
      updated_at = now()
  where id = v_invoice.id;

  insert into public.payment_slips (
    id, invoice_id, tenant_id, room_id, room_name, tenant_name, month_key,
    public_url, amount, required_amount, verification_status
  ) values (
    'sl_' || extract(epoch from now())::bigint,
    v_invoice.id, v_invoice.tenant_id, v_invoice.room_id, v_invoice.room_name,
    v_invoice.tenant_name, v_invoice.month_key, p_slip_url, 
    (v_invoice.rent_amount + v_invoice.water_amount + v_invoice.elec_amount + v_invoice.trash_fee + v_invoice.internet_fee + v_invoice.common_fee + v_invoice.fine_amount + v_penalty),
    (v_invoice.rent_amount + v_invoice.water_amount + v_invoice.elec_amount + v_invoice.trash_fee + v_invoice.internet_fee + v_invoice.common_fee + v_invoice.fine_amount + v_penalty),
    'pending'
  );

  return json_build_object('status', 'success', 'message', 'ส่งแจ้งชำระเงินเรียบร้อย รอตรวจสอบจากแอดมิน');
end;
$$;

create or replace function public.submit_tenant_repair(
  p_id_card text, p_room_id text, p_title text, p_description text, p_image_url text
)
returns json
language plpgsql
security definer
as $$
declare
  v_tenant record;
  v_room record;
  v_new_id text;
begin
  select * into v_tenant from public.tenants
  where assigned_room_id = p_room_id
    and regexp_replace(id_card, '\D', '', 'g') = regexp_replace(p_id_card, '\D', '', 'g')
  limit 1;

  if not found then
    return json_build_object('status', 'error', 'message', 'ยืนยันตัวตนผู้เช่าไม่สำเร็จ');
  end if;

  select * into v_room from public.rooms where id = p_room_id;
  v_new_id := 'rep_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6);

  insert into public.repairs (id, ticket_number, room_id, room_name, tenant_name, title, description, category, request_date, status, image_url)
  values (v_new_id, 'REP-' || to_char(now(), 'YYYY') || '-' || floor(random()*900+100)::int,
          p_room_id, v_room.name, v_tenant.name, p_title, p_description, 'general', current_date, 'pending', p_image_url);

  return json_build_object('status', 'success', 'message', 'แจ้งซ่อมเรียบร้อย');
end;
$$;

grant execute on function public.get_room_list() to anon, authenticated;
grant execute on function public.get_tenant_bill(text, text) to anon, authenticated;
grant execute on function public.submit_tenant_payment(text, text, text, text, text) to anon, authenticated;
grant execute on function public.submit_tenant_repair(text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10) สร้าง Storage Bucket สำหรับเก็บสลิปและไฟล์หลักฐาน (slips, tenant-documents)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values 
  ('slips', 'slips', true),
  ('tenant-documents', 'tenant-documents', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 11) ตั้งค่านโยบายความปลอดภัยของไฟล์ (Storage Objects Rules)
-- ---------------------------------------------------------------------------
drop policy if exists "slips allow all select" on storage.objects;
create policy "slips allow all select" on storage.objects for select using (bucket_id = 'slips');
drop policy if exists "slips allow all insert" on storage.objects;
create policy "slips allow all insert" on storage.objects for insert with check (bucket_id = 'slips');
drop policy if exists "slips allow all update" on storage.objects;
create policy "slips allow all update" on storage.objects for update using (bucket_id = 'slips');
drop policy if exists "slips allow all delete" on storage.objects;
create policy "slips allow all delete" on storage.objects for delete using (bucket_id = 'slips');

drop policy if exists "tenant-documents allow all select" on storage.objects;
create policy "tenant-documents allow all select" on storage.objects for select using (bucket_id = 'tenant-documents');
drop policy if exists "tenant-documents allow all insert" on storage.objects;
create policy "tenant-documents allow all insert" on storage.objects for insert with check (bucket_id = 'tenant-documents');
drop policy if exists "tenant-documents allow all update" on storage.objects;
create policy "tenant-documents allow all update" on storage.objects for update using (bucket_id = 'tenant-documents');
drop policy if exists "tenant-documents allow all delete" on storage.objects;
create policy "tenant-documents allow all delete" on storage.objects for delete using (bucket_id = 'tenant-documents');
