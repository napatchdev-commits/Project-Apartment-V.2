'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Printer, 
  Send, 
  Check, 
  Calculator,
  Search,
  Filter,
  DollarSign,
  ChevronDown,
  LineChart,
  Bolt,
  Droplets,
  Calendar,
  ClipboardList
} from 'lucide-react';
import { DBService } from '@/services/dbService';
import { Formatters } from '@/services/formatters';
import { AuthService } from '@/services/authService';
import { LineService } from '@/services/lineService';

export default function AdminBilling() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'history';

  const [state, setState] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [rates, setRates] = useState<any>({ electricityRate: 8, waterRate: 20, trashFee: 20 });
  const [lateFeeSettings, setLateFeeSettings] = useState<any>({});
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Search & Filters for History
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Meter Record inputs
  const [meterRecords, setMeterRecords] = useState<Record<string, { waterCurr: string; elecCurr: string; fineVal: string }>>({});

  // Active Invoice for details modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Manual payment form
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const currentState = DBService.getState();
    setState(currentState);
    setRooms(currentState.rooms || []);
    setInvoices(currentState.invoices || []);
    setRates(currentState.rates || { electricityRate: 8, waterRate: 20, trashFee: 20 });
    setLateFeeSettings(currentState.lateFeeSettings || {});

    // Initializing meter record inputs with rooms
    const records: Record<string, { waterCurr: string; elecCurr: string; fineVal: string }> = {};
    (currentState.rooms || []).forEach((room: any) => {
      // Look up if temp values exist or set to blank
      records[room.id] = {
        waterCurr: room.tempWaterMeter?.toString() || '',
        elecCurr: room.tempElecMeter?.toString() || '',
        fineVal: room.tempFineAmount?.toString() || '0'
      };
    });
    setMeterRecords(records);
  };

  const handleMeterInputChange = (roomId: string, field: 'waterCurr' | 'elecCurr' | 'fineVal', value: string) => {
    setMeterRecords(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [field]: value
      }
    }));
  };

  // Save temporary meter logs to state
  const handleSaveTempMeters = async () => {
    const updatedRooms = rooms.map(r => {
      const record = meterRecords[r.id];
      if (record) {
        return {
          ...r,
          tempWaterMeter: record.waterCurr ? Number(record.waterCurr) : null,
          tempElecMeter: record.elecCurr ? Number(record.elecCurr) : null,
          tempFineAmount: record.fineVal ? Number(record.fineVal) : null
        };
      }
      return r;
    });

    const nextState = { ...state, rooms: updatedRooms };
    setState(nextState);
    setRooms(updatedRooms);
    await DBService.saveState(nextState, true);
    alert('บันทึกร่างข้อมูลมิเตอร์เรียบร้อยแล้ว');
  };

  // Issue invoice for a single room
  const handleIssueInvoice = async (room: any, monthKey: string) => {
    const record = meterRecords[room.id];
    if (!record || !record.waterCurr || !record.elecCurr) {
      alert(`กรุณากรอกเลขมิเตอร์น้ำและไฟสำหรับห้อง ${room.name} ให้ครบถ้วน`);
      return;
    }

    const waterCurr = Number(record.waterCurr);
    const elecCurr = Number(record.elecCurr);
    const waterPrev = room.lastWaterMeter || 0;
    const elecPrev = room.lastElecMeter || 0;

    if (waterCurr < waterPrev) {
      if (!confirm(`เลขมิเตอร์น้ำห้อง ${room.name} ใหม่ (${waterCurr}) น้อยกว่าเดิม (${waterPrev}) คุณยืนยันต้องการทำต่อใช่หรือไม่?`)) return;
    }
    if (elecCurr < elecPrev) {
      if (!confirm(`เลขมิเตอร์ไฟห้อง ${room.name} ใหม่ (${elecCurr}) น้อยกว่าเดิม (${elecPrev}) คุณยืนยันต้องการทำต่อใช่หรือไม่?`)) return;
    }

    const waterUnits = Math.max(0, waterCurr - waterPrev);
    const elecUnits = Math.max(0, elecCurr - elecPrev);

    const waterAmount = waterUnits * (rates.waterRate || 20);
    const elecAmount = elecUnits * (rates.electricityRate || 8);
    
    // Rent & Overrides
    const rentAmount = DBService.getRoomRent(room);
    const trashFee = room.trashFee !== null && room.trashFee !== undefined ? Number(room.trashFee) : Number(rates.trashFee || 20);
    const internetFee = room.internetFee !== null && room.internetFee !== undefined ? Number(room.internetFee) : Number(rates.internetFee || 0);
    const commonFee = room.commonFee !== null && room.commonFee !== undefined ? Number(room.commonFee) : Number(rates.commonFee || 0);
    const fineAmount = Number(record.fineVal) || 0;

    const baseTotal = rentAmount + waterAmount + elecAmount + trashFee + internetFee + commonFee + fineAmount;

    // Due Date
    const [year, month] = monthKey.split('-').map(Number);
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    const nextMonthStr = String(nextMonth).padStart(2, '0');
    const dueDate = `${nextYear}-${nextMonthStr}-05`;

    const invoiceId = 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newInvoice = {
      id: invoiceId,
      invoiceNumber: `INV${monthKey.replace('-', '')}-${room.name}`,
      monthKey,
      roomId: room.id,
      roomName: room.name,
      tenantId: room.currentTenantId || null,
      tenantName: room.currentTenantName || '',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate,
      waterPrev,
      waterCurr,
      waterAmount,
      elecPrev,
      elecCurr,
      elecAmount,
      rentAmount,
      trashFee,
      fineAmount,
      internetFee,
      commonFee,
      totalAmount: baseTotal,
      paidAmount: 0,
      outstandingAmount: baseTotal,
      status: 'unpaid',
      slipUrl: null,
      penaltyAmount: 0,
      penaltyRule: '',
      penaltyCalculatedAt: null
    };

    // Update Room reading state
    const updatedRooms = rooms.map(r => {
      if (r.id === room.id) {
        return {
          ...r,
          lastWaterMeter: waterCurr,
          lastElecMeter: elecCurr,
          tempWaterMeter: null,
          tempElecMeter: null,
          tempFineAmount: null
        };
      }
      return r;
    });

    // Remove existing invoice for same room+month to prevent duplicate rows in array (onConflict rule)
    const filteredInvoices = invoices.filter(inv => !(inv.roomId === room.id && inv.monthKey === monthKey));
    const updatedInvoices = [...filteredInvoices, newInvoice];

    const nextState = { ...state, rooms: updatedRooms, invoices: updatedInvoices };
    setState(nextState);
    setRooms(updatedRooms);
    setInvoices(updatedInvoices);

    // Save and Sync
    await DBService.saveState(nextState);
    loadData();
    alert(`ออกบิลห้อง ${room.name} สำเร็จ!`);
  };

  // Issue bulk invoices for all occupied rooms
  const handleBulkIssueInvoices = async () => {
    const occupiedRooms = rooms.filter(r => r.status === 'occupied');
    if (occupiedRooms.length === 0) {
      alert('ไม่มีห้องพักที่มีคนเข้าพักสำหรับการออกบิล');
      return;
    }

    const unrecordedRooms = occupiedRooms.filter(r => {
      const rec = meterRecords[r.id];
      return !rec || !rec.waterCurr || !rec.elecCurr;
    });

    if (unrecordedRooms.length > 0) {
      alert(`มีห้องมีผู้เช่าจำนวน ${unrecordedRooms.length} ห้องที่ยังไม่ได้ป้อนเลขมิเตอร์น้ำ/ไฟ กรุณากรอกให้ครบก่อนออกบิลกลุ่ม`);
      return;
    }

    if (!confirm(`คุณแน่ใจว่าต้องการออกบิลกลุ่มสำหรับเดือน ${selectedMonth} ทั้งหมดจำนวน ${occupiedRooms.length} ห้องใช่หรือไม่?`)) return;

    let issuedCount = 0;
    const updatedRooms = [...rooms];
    let currentInvoices = [...invoices];

    for (const room of occupiedRooms) {
      const record = meterRecords[room.id];
      const waterCurr = Number(record.waterCurr);
      const elecCurr = Number(record.elecCurr);
      const waterPrev = room.lastWaterMeter || 0;
      const elecPrev = room.lastElecMeter || 0;

      const waterUnits = Math.max(0, waterCurr - waterPrev);
      const elecUnits = Math.max(0, elecCurr - elecPrev);

      const waterAmount = waterUnits * (rates.waterRate || 20);
      const elecAmount = elecUnits * (rates.electricityRate || 8);
      
      const rentAmount = DBService.getRoomRent(room);
      const trashFee = room.trashFee !== null && room.trashFee !== undefined ? Number(room.trashFee) : Number(rates.trashFee || 20);
      const internetFee = room.internetFee !== null && room.internetFee !== undefined ? Number(room.internetFee) : Number(rates.internetFee || 0);
      const commonFee = room.commonFee !== null && room.commonFee !== undefined ? Number(room.commonFee) : Number(rates.commonFee || 0);
      const fineAmount = Number(record.fineVal) || 0;

      const baseTotal = rentAmount + waterAmount + elecAmount + trashFee + internetFee + commonFee + fineAmount;

      const [year, month] = selectedMonth.split('-').map(Number);
      let nextMonth = month + 1;
      let nextYear = year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }
      const nextMonthStr = String(nextMonth).padStart(2, '0');
      const dueDate = `${nextYear}-${nextMonthStr}-05`;

      const invoiceId = 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newInvoice = {
        id: invoiceId,
        invoiceNumber: `INV${selectedMonth.replace('-', '')}-${room.name}`,
        monthKey: selectedMonth,
        roomId: room.id,
        roomName: room.name,
        tenantId: room.currentTenantId || null,
        tenantName: room.currentTenantName || '',
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate,
        waterPrev,
        waterCurr,
        waterAmount,
        elecPrev,
        elecCurr,
        elecAmount,
        rentAmount,
        trashFee,
        fineAmount,
        internetFee,
        commonFee,
        totalAmount: baseTotal,
        paidAmount: 0,
        outstandingAmount: baseTotal,
        status: 'unpaid',
        slipUrl: null,
        penaltyAmount: 0,
        penaltyRule: '',
        penaltyCalculatedAt: null
      };

      // Update room last meter readings
      const rIdx = updatedRooms.findIndex(r => r.id === room.id);
      if (rIdx !== -1) {
        updatedRooms[rIdx] = {
          ...updatedRooms[rIdx],
          lastWaterMeter: waterCurr,
          lastElecMeter: elecCurr,
          tempWaterMeter: null,
          tempElecMeter: null,
          tempFineAmount: null
        };
      }

      // Deduplicate in array
      currentInvoices = currentInvoices.filter(inv => !(inv.roomId === room.id && inv.monthKey === selectedMonth));
      currentInvoices.push(newInvoice);
      issuedCount++;
    }

    const nextState = { ...state, rooms: updatedRooms, invoices: currentInvoices };
    setState(nextState);
    setRooms(updatedRooms);
    setInvoices(currentInvoices);

    // Save and Sync
    await DBService.saveState(nextState);
    loadData();
    alert(`ออกบิลกลุ่มทั้งหมดสำเร็จรวม ${issuedCount} ห้อง!`);
  };

  // Pay offline (manual cash check-in)
  const handleOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amount = Number(payAmount) || 0;
    if (amount <= 0) {
      alert('กรุณากรอกจำนวนเงินชำระที่ถูกต้อง');
      return;
    }

    const outstanding = selectedInvoice.outstandingAmount || 0;
    const paid = selectedInvoice.paidAmount || 0;
    const isFullyPaid = amount >= outstanding;

    const updatedInvoices = invoices.map(inv => {
      if (inv.id === selectedInvoice.id) {
        const nextPaid = paid + amount;
        return {
          ...inv,
          paidAmount: nextPaid,
          outstandingAmount: Math.max(0, inv.totalAmount - nextPaid),
          status: isFullyPaid ? 'paid' : 'unpaid'
        };
      }
      return inv;
    });

    // Record to general Ledger too!
    const newLedgerItem = {
      id: 'led_' + Date.now(),
      date: payDate || new Date().toISOString().slice(0, 10),
      type: 'income',
      category: 'rental',
      description: `ค่าเช่าห้อง ${selectedInvoice.roomName} รอบเดือน ${selectedInvoice.monthKey}`,
      amount: amount,
      recordedBy: AuthService.getLoggedInUser()?.displayName || 'Admin'
    };

    const updatedLedger = [newLedgerItem, ...(state.ledger || [])];
    const nextState = { ...state, invoices: updatedInvoices, ledger: updatedLedger };
    
    setState(nextState);
    setInvoices(updatedInvoices);
    setSelectedInvoice(updatedInvoices.find(inv => inv.id === selectedInvoice.id));
    setPayAmount('');

    // Save and Sync
    await DBService.saveState(nextState);
    loadData();
    alert('บันทึกการชำระเงินสดสำเร็จ!');
  };

  // Delete invoice
  const handleDeleteInvoice = async (id: string, number: string) => {
    if (confirm(`คุณแน่ใจว่าต้องการลบบิลเลขที่ "${number}" ใช่หรือไม่?`)) {
      const updated = invoices.filter(inv => inv.id !== id);
      const nextState = { ...state, invoices: updated };
      setState(nextState);
      setInvoices(updated);

      // Save and Sync
      await DBService.saveState(nextState);
      loadData();
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice(null);
      }
    }
  };

  // Send LINE Alert Message (Mock direct copy logic)
  const handleSendLine = (invoice: any) => {
    const text = LineService.createBillingMessage(invoice, state.settings?.apartmentName, '', state.settings?.lineId);
    
    // Copy msg to clipboard for convenience
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    
    // If webhook/Notify Token is configured, notify. In this UI we trigger copy + alert
    alert('สร้างข้อความส่งแจ้งเตือนบิลสำเร็จ! ระบบได้คัดลอกข้อความสำหรับส่งหาผู้เช่าลงคลิปบอร์ดแล้ว:\n\n' + text);
  };

  const filteredInvoices = invoices.filter(inv => {
    const query = searchQuery.toLowerCase();
    const matchSearch = String(inv.roomName || '').toLowerCase().includes(query) ||
                        String(inv.invoiceNumber || '').toLowerCase().includes(query) ||
                        String(inv.tenantName || '').toLowerCase().includes(query);
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchMonth = inv.monthKey === selectedMonth;
    return matchSearch && matchStatus && matchMonth;
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
      {/* Tab Navigation Controls */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3.5 text-sm font-bold border-b-2 -mb-[2px] transition-colors ${
            activeTab === 'history' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ประวัติออกบิล
        </button>
        <button
          onClick={() => setActiveTab('meters')}
          className={`px-4 py-3.5 text-sm font-bold border-b-2 -mb-[2px] transition-colors ${
            activeTab === 'meters' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          บันทึกมิเตอร์น้ำ-ไฟ
        </button>
      </div>

      {/* TABS CONTAINER */}
      {activeTab === 'history' ? (
        <div className="space-y-6">
          {/* Filters History */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาเลขห้อง เลขบิล ชื่อผู้เช่า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
              />
            </div>
            
            {/* Month Filter */}
            <div className="relative shrink-0">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-green-600 focus:outline-none text-sm bg-white font-semibold"
              />
            </div>

            {/* Status Filter */}
            <div className="relative shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none block w-full md:w-40 rounded-xl border border-slate-200 pl-4 pr-10 py-2 text-slate-700 focus:border-green-600 focus:outline-none text-sm bg-white font-semibold"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="unpaid">ค้างชำระ</option>
                <option value="pending_verification">รอตรวจสอบสลิป</option>
                <option value="paid">จ่ายแล้ว</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-3 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Invoices History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Receipt className="h-14 w-14 text-slate-200 stroke-1 mb-3" />
                <h4 className="font-bold text-slate-500 text-sm">ยังไม่มีการออกบิลในเดือนนี้</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  ยังไม่ได้สร้างบิลค่าเช่าในรอบเดือนนี้ หรือสอดคล้องตามเงื่อนไขที่ระบุ
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="px-6 py-4">เลขที่ใบแจ้งหนี้</th>
                      <th className="px-6 py-4">ห้อง</th>
                      <th className="px-6 py-4">ผู้เช่า</th>
                      <th className="px-6 py-4 text-right">ยอดรวมค่าเช่า</th>
                      <th className="px-6 py-4 text-right">ชำระแล้ว</th>
                      <th className="px-6 py-4">สถานะ</th>
                      <th className="px-6 py-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4 text-slate-700">ห้อง {inv.roomName}</td>
                        <td className="px-6 py-4 text-slate-800">{inv.tenantName || '-'}</td>
                        <td className="px-6 py-4 text-right text-slate-950 font-extrabold">{Formatters.currency(inv.totalAmount)}</td>
                        <td className="px-6 py-4 text-right text-green-600 font-extrabold">{Formatters.currency(inv.paidAmount)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            inv.status === 'paid' 
                              ? 'bg-green-100 text-green-700' 
                              : inv.status === 'pending_verification'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {inv.status === 'paid' ? 'จ่ายแล้ว' : inv.status === 'pending_verification' ? 'รอตรวจสลิป' : 'ค้างชำระ'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 shrink-0">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                            title="ดูใบเสร็จ / บันทึกการจ่าย"
                          >
                            <Search className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSendLine(inv)}
                            className="inline-flex p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title="ส่ง LINE"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                            className="inline-flex p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="ลบบิล"
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
        </div>
      ) : (
        /* METER ENTRIES TAB */
        <div className="space-y-6">
          {/* Top Panel Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-xs">
              <Calendar className="h-4.5 w-4.5 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-sm font-bold text-slate-700 focus:outline-none bg-white"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSaveTempMeters}
                className="px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
              >
                บันทึกร่างข้อมูล
              </button>
              <button
                onClick={handleBulkIssueInvoices}
                className="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all shadow-sm"
              >
                ออกบิลกลุ่มผู้เช่าทั้งหมด
              </button>
            </div>
          </div>

          {/* Rooms Meter Form List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {rooms.filter(r => r.status === 'occupied').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ClipboardList className="h-14 w-14 text-slate-200 stroke-1 mb-3" />
                <h4 className="font-bold text-slate-500 text-sm">ไม่มีผู้เช่าเข้าพักในขณะนี้</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  เมื่อจัดสรรผู้เช่าเข้าห้องพักแล้ว ห้องเช่าดังกล่าวจะแสดงประวัติสำหรับการจดมิเตอร์ตรงนี้
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="px-6 py-4">ห้อง</th>
                      <th className="px-6 py-4">ผู้เช่า</th>
                      <th className="px-6 py-4 text-right">น้ำเดิม</th>
                      <th className="px-6 py-4 w-32">น้ำใหม่ (ปัจจุบัน)</th>
                      <th className="px-6 py-4 text-right">ไฟเดิม</th>
                      <th className="px-6 py-4 w-32">ไฟใหม่ (ปัจจุบัน)</th>
                      <th className="px-6 py-4 w-28">ค่าปรับพิเศษ</th>
                      <th className="px-6 py-4 text-right">ออกบิลเดี่ยว</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {rooms.filter(r => r.status === 'occupied').map((room) => {
                      const record = meterRecords[room.id] || { waterCurr: '', elecCurr: '', fineVal: '0' };
                      const waterPrev = room.lastWaterMeter || 0;
                      const elecPrev = room.lastElecMeter || 0;
                      
                      const isWaterError = record.waterCurr !== '' && Number(record.waterCurr) < waterPrev;
                      const isElecError = record.elecCurr !== '' && Number(record.elecCurr) < elecPrev;

                      return (
                        <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-900 font-bold">ห้อง {room.name}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs truncate max-w-[120px]">
                            {room.currentTenantName || '-'}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-400 font-bold">{waterPrev}</td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              placeholder="จดมิเตอร์"
                              value={record.waterCurr}
                              onChange={(e) => handleMeterInputChange(room.id, 'waterCurr', e.target.value)}
                              className={`block w-full rounded-lg border px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none ${
                                isWaterError ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-green-600'
                              }`}
                            />
                          </td>
                          <td className="px-6 py-4 text-right text-slate-400 font-bold">{elecPrev}</td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              placeholder="จดมิเตอร์"
                              value={record.elecCurr}
                              onChange={(e) => handleMeterInputChange(room.id, 'elecCurr', e.target.value)}
                              className={`block w-full rounded-lg border px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none ${
                                isElecError ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-green-600'
                              }`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              placeholder="ระบุค่าปรับ"
                              value={record.fineVal}
                              onChange={(e) => handleMeterInputChange(room.id, 'fineVal', e.target.value)}
                              className="block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-green-600 focus:outline-none"
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleIssueInvoice(room, selectedMonth)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold border border-green-100"
                            >
                              <Plus className="h-3 w-3" />
                              <span>สร้างบิล</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAILED INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 no-print">
              <div>
                <h3 className="font-bold text-slate-800 text-base">รายละเอียดใบแจ้งหนี้</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">บิลเลขที่: {selectedInvoice.invoiceNumber}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  <Printer className="h-4.5 w-4.5" />
                  <span>พิมพ์บิล</span>
                </button>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content & Payment Recording Pane */}
            <div className="flex-1 overflow-y-auto p-6 md:grid md:grid-cols-3 md:gap-6">
              
              {/* Receipt Layout Form (Col span 2) */}
              <div className="md:col-span-2 border border-slate-200 p-8 rounded-2xl bg-white space-y-6 shadow-xs leading-relaxed max-w-[210mm] mx-auto print:border-none print:shadow-none print:p-0">
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-800 text-base leading-tight">
                      {state.settings?.apartmentName || 'ใบเสร็จค่าเช่า'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold max-w-[250px]">{state.settings?.address || 'ไม่ระบุที่อยู่หอพัก'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-green-600 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1">
                      {selectedInvoice.status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                    </span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-2">วันที่ออกบิล: {Formatters.thaiDate(selectedInvoice.issueDate)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">ข้อมูลห้องเช่า</span>
                    <span className="text-slate-800 text-sm font-bold">ห้อง {selectedInvoice.roomName}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">ผู้เข้าพัก</span>
                    <span className="text-slate-800">{selectedInvoice.tenantName || '-'}</span>
                  </div>
                </div>

                {/* Items Breakdown */}
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2">รายการ</th>
                      <th className="py-2 text-right">จำนวนหน่วย</th>
                      <th className="py-2 text-right">ราคาต่อหน่วย</th>
                      <th className="py-2 text-right">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {/* Rental */}
                    <tr>
                      <td className="py-2.5">ค่าเช่าห้องพักหลัก</td>
                      <td className="py-2.5 text-right">-</td>
                      <td className="py-2.5 text-right">-</td>
                      <td className="py-2.5 text-right font-extrabold">{Formatters.currency(selectedInvoice.rentAmount)}</td>
                    </tr>
                    {/* Water */}
                    {selectedInvoice.waterCurr !== selectedInvoice.waterPrev && (
                      <tr>
                        <td className="py-2.5">ค่าน้ำประปา ({selectedInvoice.waterPrev} - {selectedInvoice.waterCurr})</td>
                        <td className="py-2.5 text-right">{(selectedInvoice.waterCurr - selectedInvoice.waterPrev) || 0}</td>
                        <td className="py-2.5 text-right">{Formatters.currency(rates.waterRate || 20)}</td>
                        <td className="py-2.5 text-right font-extrabold">{Formatters.currency(selectedInvoice.waterAmount)}</td>
                      </tr>
                    )}
                    {/* Elec */}
                    {selectedInvoice.elecCurr !== selectedInvoice.elecPrev && (
                      <tr>
                        <td className="py-2.5">ค่าไฟฟ้า ({selectedInvoice.elecPrev} - {selectedInvoice.elecCurr})</td>
                        <td className="py-2.5 text-right">{(selectedInvoice.elecCurr - selectedInvoice.elecPrev) || 0}</td>
                        <td className="py-2.5 text-right">{Formatters.currency(rates.electricityRate || 8)}</td>
                        <td className="py-2.5 text-right font-extrabold">{Formatters.currency(selectedInvoice.elecAmount)}</td>
                      </tr>
                    )}
                    {/* Trash */}
                    {selectedInvoice.trashFee > 0 && (
                      <tr>
                        <td className="py-2.5">ค่าเก็บขยะมูลฝอย</td>
                        <td className="py-2.5 text-right">-</td>
                        <td className="py-2.5 text-right">-</td>
                        <td className="py-2.5 text-right font-extrabold">{Formatters.currency(selectedInvoice.trashFee)}</td>
                      </tr>
                    )}
                    {/* Internet override */}
                    {selectedInvoice.internetFee > 0 && (
                      <tr>
                        <td className="py-2.5">ค่าอินเทอร์เน็ต</td>
                        <td className="py-2.5 text-right">-</td>
                        <td className="py-2.5 text-right">-</td>
                        <td className="py-2.5 text-right font-extrabold">{Formatters.currency(selectedInvoice.internetFee)}</td>
                      </tr>
                    )}
                    {/* Common fee override */}
                    {selectedInvoice.commonFee > 0 && (
                      <tr>
                        <td className="py-2.5">ค่าส่วนกลาง</td>
                        <td className="py-2.5 text-right">-</td>
                        <td className="py-2.5 text-right">-</td>
                        <td className="py-2.5 text-right font-extrabold">{Formatters.currency(selectedInvoice.commonFee)}</td>
                      </tr>
                    )}
                    {/* Fines */}
                    {selectedInvoice.fineAmount > 0 && (
                      <tr>
                        <td className="py-2.5 text-red-500">ค่าปรับล่าช้า / ปรับประพฤติ</td>
                        <td className="py-2.5 text-right">-</td>
                        <td className="py-2.5 text-right">-</td>
                        <td className="py-2.5 text-right text-red-500 font-extrabold">{Formatters.currency(selectedInvoice.fineAmount)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 font-extrabold text-slate-900 text-sm">
                      <td colSpan={3} className="py-3">ยอดรวมสุทธิ</td>
                      <td className="py-3 text-right text-green-600">{Formatters.currency(selectedInvoice.totalAmount)}</td>
                    </tr>
                    <tr className="font-bold text-slate-500 text-xs">
                      <td colSpan={4} className="py-1 text-right font-normal">
                        ({Formatters.thaiBahtText(selectedInvoice.totalAmount)})
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Record manual payment offline pane (Col span 1) */}
              <div className="mt-6 md:mt-0 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-xs h-fit no-print">
                <h4 className="font-bold text-slate-800 text-sm">บันทึกการชำระเงิน</h4>
                
                <div className="text-xs space-y-2 text-slate-600 font-semibold">
                  <div className="flex justify-between">
                    <span>ยอดรวมบิล:</span>
                    <span>{Formatters.currency(selectedInvoice.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ชำระแล้ว:</span>
                    <span className="text-green-600">{Formatters.currency(selectedInvoice.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                    <span>ยอดค้างชำระ:</span>
                    <span className="text-red-500">{Formatters.currency(selectedInvoice.outstandingAmount)}</span>
                  </div>
                </div>

                {selectedInvoice.outstandingAmount > 0 ? (
                  <form onSubmit={handleOfflinePayment} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ระบุยอดเงินชำระ (บาท) *</label>
                      <input
                        type="number"
                        required
                        max={selectedInvoice.outstandingAmount}
                        placeholder={selectedInvoice.outstandingAmount.toString()}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-950 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">วันที่ชำระเงิน *</label>
                      <input
                        type="date"
                        required
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-950 bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full flex justify-center py-2.5 bg-green-600 hover:bg-green-700 text-xs font-bold text-white rounded-xl shadow-xs transition-colors"
                    >
                      บันทึกรับเงินชำระ
                    </button>
                  </form>
                ) : (
                  <div className="p-3 bg-green-100 text-green-700 rounded-xl border border-green-200 text-center font-bold text-xs">
                    ชำระหนี้สินครบถ้วนแล้ว
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
