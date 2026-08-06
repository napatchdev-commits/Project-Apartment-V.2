'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bed, 
  Users, 
  Wrench, 
  TrendingUp, 
  ClipboardList, 
  AlertTriangle,
  ArrowRight,
  Plus,
  Zap,
  TrendingDown,
  Receipt,
  BookOpen
} from 'lucide-react';
import { DBService } from '@/services/dbService';
import { Formatters } from '@/services/formatters';

export default function AdminDashboard() {
  const router = useRouter();
  const [state, setState] = useState<any>(null);
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    vacantRooms: 0,
    reservedRooms: 0,
    occupancyRate: 0,
    activeRepairs: 0,
    totalRevenue: 0,
    pendingPaymentsCount: 0,
    pendingPaymentsAmount: 0
  });
  const [setupWarning, setSetupWarning] = useState(false);

  useEffect(() => {
    const currentState = DBService.getState();
    setState(currentState);

    // Calculate Stats
    const rooms = currentState.rooms || [];
    const tenants = currentState.tenants || [];
    const repairs = currentState.repairs || [];
    const invoices = currentState.invoices || [];
    const ledger = currentState.ledger || [];
    const settings = currentState.settings || {};

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r: any) => r.status === 'occupied').length;
    const vacantRooms = rooms.filter((r: any) => r.status === 'vacant').length;
    const reservedRooms = rooms.filter((r: any) => r.status === 'reserved').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const activeRepairs = repairs.filter((r: any) => r.status === 'pending' || r.status === 'in_progress').length;

    // Monthly revenue calculation (from ledger income items)
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const totalRevenue = ledger
      .filter((item: any) => item.type === 'income' && item.date && item.date.startsWith(currentMonthKey))
      .reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

    // Pending invoice payments
    const pendingInvoices = invoices.filter((inv: any) => inv.status === 'unpaid' || inv.status === 'pending_verification');
    const pendingPaymentsCount = pendingInvoices.length;
    const pendingPaymentsAmount = pendingInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.outstandingAmount) || 0), 0);

    setStats({
      totalRooms,
      occupiedRooms,
      vacantRooms,
      reservedRooms,
      occupancyRate,
      activeRepairs,
      totalRevenue,
      pendingPaymentsCount,
      pendingPaymentsAmount
    });

    // Check if critical settings are missing
    if (!settings.apartmentName || !settings.bankAccountNo || !settings.promptPayId) {
      setSetupWarning(true);
    }
  }, []);

  if (!state) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin-custom"></div>
      </div>
    );
  }

  const hasRooms = state.rooms && state.rooms.length > 0;

  return (
    <div className="space-y-6">
      {/* Settings Setup Warning */}
      {setupWarning && (
        <div className="flex items-start space-x-3 p-4 bg-amber-50 text-amber-800 border border-amber-100 rounded-2xl">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">ข้อมูลตั้งค่าระบบยังไม่ครบถ้วน!</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              กรุณาเข้าตั้งค่าข้อมูล ชื่อหอพัก ข้อมูลชำระเงิน (บัญชีธนาคาร, พร้อมเพย์) และ Supabase API คีย์ เพื่อให้พร้อมสำหรับการออกบิลและรับชำระเงินจริงจากผู้เช่า
            </p>
            <button
              onClick={() => router.push('/admin/settings')}
              className="flex items-center text-xs font-bold text-amber-900 mt-2 hover:underline"
            >
              <span>ไปที่หน้าตั้งค่าทันที</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Analytics Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card: Occupancy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400">อัตราการเข้าพัก</span>
            <h3 className="text-2xl font-extrabold text-slate-800">{stats.occupancyRate}%</h3>
            <p className="text-[10px] text-slate-400 font-semibold">
              เข้าพัก {stats.occupiedRooms} / ทั้งหมด {stats.totalRooms} ห้อง
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <Bed className="h-6 w-6" />
          </div>
        </div>

        {/* Card: Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400">รายได้ประจำเดือนนี้</span>
            <h3 className="text-2xl font-extrabold text-green-600">{Formatters.currency(stats.totalRevenue)}</h3>
            <p className="text-[10px] text-slate-400 font-semibold">เฉพาะรายรับที่บันทึกแล้วในเดือนนี้</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Card: Overdue Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400">ค้างชำระทั้งหมด</span>
            <h3 className="text-2xl font-extrabold text-amber-600">{Formatters.currency(stats.pendingPaymentsAmount)}</h3>
            <p className="text-[10px] text-slate-400 font-semibold">ค้างจ่าย {stats.pendingPaymentsCount} บิล</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ClipboardList className="h-6 w-6" />
          </div>
        </div>

        {/* Card: Repairs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400">รายการแจ้งซ่อมค้างคา</span>
            <h3 className="text-2xl font-extrabold text-red-600">{stats.activeRepairs} รายการ</h3>
            <p className="text-[10px] text-slate-400 font-semibold">รอและกำลังดำเนินการ</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Wrench className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-base mb-4">บริการจัดการด่วน</h3>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <button 
            onClick={() => router.push('/admin/billing')}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-green-50/50 hover:border-green-600/30 border border-transparent rounded-xl transition-all group"
          >
            <Zap className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform mb-2" />
            <span className="text-xs font-bold text-slate-700">จดมิเตอร์</span>
          </button>
          <button 
            onClick={() => router.push('/admin/billing?tab=invoice-generate')}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-green-50/50 hover:border-green-600/30 border border-transparent rounded-xl transition-all group"
          >
            <Receipt className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform mb-2" />
            <span className="text-xs font-bold text-slate-700">ออกบิลใหม่</span>
          </button>
          <button 
            onClick={() => router.push('/admin/tenants?action=new')}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-green-50/50 hover:border-green-600/30 border border-transparent rounded-xl transition-all group"
          >
            <Users className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform mb-2" />
            <span className="text-xs font-bold text-slate-700">เพิ่มผู้เช่า</span>
          </button>
          <button 
            onClick={() => router.push('/admin/repairs')}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-green-50/50 hover:border-green-600/30 border border-transparent rounded-xl transition-all group"
          >
            <Wrench className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform mb-2" />
            <span className="text-xs font-bold text-slate-700">ใบแจ้งซ่อม</span>
          </button>
          <button 
            onClick={() => router.push('/admin/ledger')}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-green-50/50 hover:border-green-600/30 border border-transparent rounded-xl transition-all group"
          >
            <BookOpen className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform mb-2" />
            <span className="text-xs font-bold text-slate-700">บันทึกบัญชี</span>
          </button>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Occupancy Status Grid */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-base">แผนผังห้องพักและสถานะ</h3>
            {hasRooms && (
              <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1">
                มี {stats.totalRooms} ห้องเช่า
              </span>
            )}
          </div>

          {!hasRooms ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bed className="h-12 w-12 text-slate-300 stroke-1 mb-3" />
              <h4 className="font-bold text-slate-600 text-sm">ยังไม่มีข้อมูลห้องพัก</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                กรุณาเพิ่มห้องพัก หรือเปิดการตั้งค่าโปรเจกต์เดโมเพื่อทดสอบการทำงานระบบ
              </p>
              <button
                onClick={() => router.push('/admin/rooms')}
                className="mt-4 flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>เพิ่มห้องพักห้องแรก</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Rooms Map Grid */}
              <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {[...state.rooms].sort(DBService.compareRooms).map((room: any) => {
                  let statusBg = 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';
                  let badgeColor = 'bg-slate-100 text-slate-500';
                  let statusText = 'ว่าง';

                  if (room.status === 'occupied') {
                    statusBg = 'bg-green-500 border-green-600 text-white hover:bg-green-600';
                    badgeColor = 'bg-white/25 text-white';
                    statusText = 'มีคนเช่า';
                  } else if (room.status === 'reserved') {
                    statusBg = 'bg-amber-400 border-amber-500 text-amber-950 hover:bg-amber-500';
                    badgeColor = 'bg-white/20 text-amber-950';
                    statusText = 'จองแล้ว';
                  }

                  return (
                    <div 
                      key={room.id}
                      onClick={() => router.push(`/admin/rooms?highlight=${room.id}`)}
                      className={`flex flex-col items-center justify-between p-3.5 border rounded-xl cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 shadow-xs ${statusBg}`}
                    >
                      <span className="font-extrabold text-sm">{room.name}</span>
                      <span className={`text-[8px] font-bold mt-1.5 px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {statusText}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status Guide Legends */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 pt-4 border-t border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <div className="h-3 w-3 rounded bg-white border border-slate-200"></div>
                  <span>ห้องว่าง ({stats.vacantRooms})</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="h-3 w-3 rounded bg-green-500"></div>
                  <span>มีผู้เช่า ({stats.occupiedRooms})</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="h-3 w-3 rounded bg-amber-400"></div>
                  <span>ถูกจอง ({stats.reservedRooms})</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Ledger Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-800 text-base mb-4">รายรับ-รายจ่ายล่าสุด</h3>
          {(!state.ledger || state.ledger.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ClipboardList className="h-10 w-10 text-slate-300 stroke-1 mb-2" />
              <h4 className="font-bold text-slate-500 text-sm">ยังไม่มีรายการบัญชี</h4>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">
                รายการบัญชีรายวันจะแสดงขึ้นที่นี่เมื่อบันทึก
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="divide-y divide-slate-100">
                {state.ledger.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.description}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{Formatters.thaiDate(item.date)}</p>
                    </div>
                    <div className="flex items-center text-right shrink-0">
                      <span className={`text-xs font-extrabold ${item.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {item.type === 'income' ? '+' : '-'}{Formatters.currency(item.amount).substring(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => router.push('/admin/ledger')}
                className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors"
              >
                ดูบัญชีรายรับ-รายจ่ายทั้งหมด
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
