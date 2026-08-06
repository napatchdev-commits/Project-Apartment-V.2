'use client';

import { useEffect, useState } from 'react';
import { 
  Wrench, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  AlertCircle,
  FileCheck2,
  Hammer,
  Clock,
  ArrowUpRight,
  TrendingDown,
  ChevronDown
} from 'lucide-react';
import { DBService } from '@/services/dbService';
import { Formatters } from '@/services/formatters';

export default function AdminRepairs() {
  const [state, setState] = useState<any>(null);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail Modal State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  // Edit ticket state
  const [ticketStatus, setTicketStatus] = useState('pending');
  const [expense, setExpense] = useState('');
  const [technician, setTechnician] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const currentState = DBService.getState();
    setState(currentState);
    setRepairs(currentState.repairs || []);
    setRooms(currentState.rooms || []);
  };

  const handleOpenDetailModal = (ticket: any) => {
    setSelectedTicket(ticket);
    setTicketStatus(ticket.status || 'pending');
    setExpense(ticket.expenseAmount?.toString() || '');
    setTechnician(ticket.assignedTechnician || '');
  };

  const handleSaveTicketUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const expenseVal = Number(expense) || 0;
    const updatedRepairs = repairs.map(rep => {
      if (rep.id === selectedTicket.id) {
        return {
          ...rep,
          status: ticketStatus,
          expenseAmount: expenseVal,
          assignedTechnician: technician.trim()
        };
      }
      return rep;
    });

    // Also record the repair expense in Ledger if status changed to completed and there is an expense amount!
    let updatedLedger = state.ledger || [];
    if (ticketStatus === 'completed' && expenseVal > 0 && selectedTicket.status !== 'completed') {
      const newLedgerItem = {
        id: 'led_' + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        type: 'expense',
        category: 'maintenance',
        description: `ค่าซ่อมแซมห้อง ${selectedInvoiceRoomName(selectedTicket.roomId) || selectedTicket.roomName} (${selectedTicket.title})`,
        amount: expenseVal,
        recordedBy: 'Admin'
      };
      updatedLedger = [newLedgerItem, ...updatedLedger];
    }

    const nextState = { ...state, repairs: updatedRepairs, ledger: updatedLedger };
    setState(nextState);
    setRepairs(updatedRepairs);
    setSelectedTicket(null);

    // Save and Sync
    await DBService.saveState(nextState);
    loadData();
    alert('บันทึกสถานะแจ้งซ่อมและอัปเดตระบบเรียบร้อย!');
  };

  const handleDeleteTicket = async (id: string, number: string) => {
    if (confirm(`คุณต้องการลบตั๋วแจ้งซ่อมเลขที่ "${number}" ใช่หรือไม่?`)) {
      const updated = repairs.filter(rep => rep.id !== id);
      const nextState = { ...state, repairs: updated };
      setState(nextState);
      setRepairs(updated);

      // Save and Sync
      await DBService.saveState(nextState);
      loadData();
    }
  };

  const selectedInvoiceRoomName = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.name || '';
  };

  const filteredTickets = repairs.filter(rep => {
    const query = searchQuery.toLowerCase();
    const matchSearch = String(rep.ticketNumber || '').toLowerCase().includes(query) ||
                        String(rep.roomName || '').toLowerCase().includes(query) ||
                        String(rep.title || '').toLowerCase().includes(query) ||
                        String(rep.tenantName || '').toLowerCase().includes(query);
    const matchStatus = statusFilter === 'all' || rep.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (!state) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin-custom"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400">การดูแลรักษาสิ่งอำนวยความสะดวก</p>
          <h2 className="text-xl font-bold text-slate-800 mt-0.5">จัดการใบแจ้งซ่อมแซม</h2>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาเลขตั๋ว เลขห้อง ชื่อผู้แจ้ง อาการชำรุด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
          />
        </div>
        
        {/* Status filter */}
        <div className="relative shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none block w-full md:w-44 rounded-xl border border-slate-200 pl-4 pr-10 py-2 text-slate-700 focus:border-green-600 focus:outline-none text-sm bg-white font-semibold"
          >
            <option value="all">สถานะตั๋วทั้งหมด</option>
            <option value="pending">รอการดำเนินการ</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="completed">เสร็จสิ้นแล้ว</option>
          </select>
          <ChevronDown className="absolute right-3.5 top-3 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Repairs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Wrench className="h-14 w-14 text-slate-200 stroke-1 mb-3" />
            <h4 className="font-bold text-slate-500 text-sm">ยังไม่มีคำขอแจ้งซ่อม</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              ยังไม่มีประวัติการส่งคำขอแจ้งซ่อมแซมอาคารหรือห้องพักเข้ามาในระบบ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <th className="px-6 py-4">เลขที่แจ้ง</th>
                  <th className="px-6 py-4">ห้อง</th>
                  <th className="px-6 py-4">เรื่องแจ้งซ่อม</th>
                  <th className="px-6 py-4">ผู้แจ้ง</th>
                  <th className="px-6 py-4">วันที่แจ้ง</th>
                  <th className="px-6 py-4">สถานะ</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filteredTickets.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 font-bold">{rep.ticketNumber}</td>
                    <td className="px-6 py-4 text-slate-700">ห้อง {rep.roomName}</td>
                    <td className="px-6 py-4 text-slate-800 truncate max-w-[200px]">{rep.title}</td>
                    <td className="px-6 py-4 text-slate-500">{rep.tenantName || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{Formatters.thaiDate(rep.requestDate)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        rep.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : rep.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {rep.status === 'completed' ? 'ซ่อมเสร็จแล้ว' : rep.status === 'in_progress' ? 'กำลังซ่อม' : 'รอดำเนินการ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 shrink-0">
                      <button
                        onClick={() => handleOpenDetailModal(rep)}
                        className="inline-flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                        title="ดูข้อมูลตั๋ว / อัปเดตสถานะ"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTicket(rep.id, rep.ticketNumber)}
                        className="inline-flex p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="ลบคำแจ้ง"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL AND RESOLUTION MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">ใบแจ้งซ่อมเลขที่: {selectedTicket.ticketNumber}</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">ห้องพัก: ห้อง {selectedTicket.roomName} | ผู้แจ้ง: {selectedTicket.tenantName}</p>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scroll Container */}
            <div className="flex-1 overflow-y-auto p-6 md:grid md:grid-cols-2 md:gap-6">
              
              {/* Ticket Details Panel */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">ปัญหาหลักที่แจ้ง</span>
                  <h4 className="font-bold text-slate-800 text-sm leading-snug">{selectedTicket.title}</h4>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">รายละเอียดอาการชำรุด</span>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3.5 border border-slate-100 rounded-xl leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.description || 'ไม่ได้ระบุคำอธิบายเพิ่มเติม'}
                  </p>
                </div>

                {/* Ticket Image (if attached) */}
                {selectedTicket.imageUrl && (
                  <div className="space-y-1 pt-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">รูปภาพแนบจากผู้เช่า</span>
                    <div className="relative border border-slate-200 rounded-xl overflow-hidden max-h-[220px] bg-slate-100 flex items-center justify-center">
                      <img 
                        src={selectedTicket.imageUrl} 
                        alt="อาการชำรุด" 
                        className="object-contain max-h-[220px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Update Action Form */}
              <form onSubmit={handleSaveTicketUpdate} className="mt-6 md:mt-0 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-xs h-fit">
                <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">อัปเดตการทำงานช่าง</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">สถานะดำเนินการ *</label>
                    <select
                      value={ticketStatus}
                      onChange={(e) => setTicketStatus(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none bg-white font-semibold"
                    >
                      <option value="pending">รอดำเนินการ (Pending)</option>
                      <option value="in_progress">กำลังดำเนินการซ่อม (In Progress)</option>
                      <option value="completed">เสร็จสิ้นสมบูรณ์ (Completed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">ช่างที่ได้รับมอบหมาย</label>
                    <input
                      type="text"
                      placeholder="ชื่อช่าง / ร้านซ่อมภายนอก"
                      value={technician}
                      onChange={(e) => setTechnician(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-950 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">ค่าใช้จ่าย / ค่าแรงช่าง (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="ระบุค่าใช้จ่าย (ถ้ามี)"
                      value={expense}
                      onChange={(e) => setExpense(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-950 focus:outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2.5 bg-green-600 hover:bg-green-700 text-xs font-bold text-white rounded-xl shadow-xs transition-colors"
                  >
                    บันทึกอัปเดตใบซ่อม
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
