'use client';

import { useEffect, useState } from 'react';
import { 
  FileCheck2, 
  Search, 
  X, 
  Check, 
  AlertCircle,
  FileImage,
  TrendingUp,
  Image,
  Building,
  User,
  CalendarDays,
  ShieldCheck,
  Calendar,
  Clock
} from 'lucide-react';
import { DBService } from '@/services/dbService';
import { Formatters } from '@/services/formatters';
import { AuthService } from '@/services/authService';

export default function AdminSlipVerification() {
  const [state, setState] = useState<any>(null);
  const [slips, setSlips] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal details
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);
  
  // Rejection state
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Compute selected invoice dynamically
  const selectedInvoice = invoices.find(inv => inv.id === selectedSlip?.invoiceId);

  const handleOpenDetailModal = (slip: any) => {
    setSelectedSlip(slip);
    setIsRejecting(false);
    setRejectReason('');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const currentState = DBService.getState();
    setState(currentState);
    
    // Slips can be read from paymentSlips state
    setSlips(currentState.paymentSlips || []);
    setRooms(currentState.rooms || []);
    setInvoices(currentState.invoices || []);
  };

  const handleApproveSlip = async (slip: any) => {
    if (!confirm(`คุณต้องการยืนยันและอนุมัติสลิปโอนเงินจำนวน ${Formatters.currency(slip.amount)} ของห้อง ${slip.roomName} ใช่หรือไม่?`)) return;

    // 1. Update Slip entry
    const updatedSlips = slips.map(s => {
      if (s.id === slip.id) {
        return {
          ...s,
          verificationStatus: 'approved',
          verifiedBy: AuthService.getLoggedInUser()?.displayName || 'Admin',
          verifiedAt: new Date().toISOString()
        };
      }
      return s;
    });

    // 2. Update Invoice entry
    const updatedInvoices = invoices.map(inv => {
      if (inv.id === slip.invoiceId) {
        const payAmt = Number(slip.amount) || 0;
        return {
          ...inv,
          status: 'paid',
          paidAmount: payAmt,
          outstandingAmount: Math.max(0, inv.totalAmount - payAmt),
          slipUrl: slip.publicUrl // Ensure url is set
        };
      }
      return inv;
    });

    // 3. Update Room latest meter readings (Sync meters from invoice)
    const associatedInvoice = invoices.find(inv => inv.id === slip.invoiceId);
    let updatedRooms = [...rooms];
    if (associatedInvoice) {
      updatedRooms = rooms.map(r => {
        if (r.id === slip.roomId) {
          return {
            ...r,
            lastWaterMeter: associatedInvoice.waterCurr || r.lastWaterMeter,
            lastElecMeter: associatedInvoice.elecCurr || r.lastElecMeter
          };
        }
        return r;
      });
    }

    // 4. Record to general Ledger too!
    const newLedgerItem = {
      id: 'led_' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      type: 'income',
      category: 'rental',
      description: `ค่าเช่าห้อง ${slip.roomName} รอบเดือน ${slip.monthKey} (โอนผ่าน LINE/สลิป)`,
      amount: slip.amount,
      recordedBy: 'Admin'
    };
    const updatedLedger = [newLedgerItem, ...(state.ledger || [])];

    const nextState = { 
      ...state, 
      paymentSlips: updatedSlips, 
      invoices: updatedInvoices, 
      rooms: updatedRooms,
      ledger: updatedLedger
    };

    setState(nextState);
    setSlips(updatedSlips);
    setInvoices(updatedInvoices);
    setRooms(updatedRooms);
    setSelectedSlip(null);

    // Save and Sync
    await DBService.saveState(nextState);
    loadData();
    alert('อนุมัติการตรวจสอบสลิปและปรับปรุงยอดในระบบสำเร็จ!');
  };

  const handleRejectSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlip || !rejectReason.trim()) {
      alert('กรุณากรอกเหตุผลในการปฏิเสธการโอนเงิน');
      return;
    }

    // 1. Update Slip entry
    const updatedSlips = slips.map(s => {
      if (s.id === selectedSlip.id) {
        return {
          ...s,
          verificationStatus: 'rejected',
          rejectReason: rejectReason.trim(),
          verifiedBy: AuthService.getLoggedInUser()?.displayName || 'Admin',
          verifiedAt: new Date().toISOString()
        };
      }
      return s;
    });

    // 2. Update Invoice entry back to unpaid
    const updatedInvoices = invoices.map(inv => {
      if (inv.id === selectedSlip.invoiceId) {
        return {
          ...inv,
          status: 'unpaid',
          slipUrl: null // Clear slip url
        };
      }
      return inv;
    });

    const nextState = { ...state, paymentSlips: updatedSlips, invoices: updatedInvoices };
    setState(nextState);
    setSlips(updatedSlips);
    setInvoices(updatedInvoices);
    setSelectedSlip(null);
    setRejectReason('');
    setIsRejecting(false);

    // Save and Sync
    await DBService.saveState(nextState);
    loadData();
    alert('ปฏิเสธการอนุมัติสลิปและตั้งยอดเรียกเก็บกลับเป็นค้างชำระเรียบร้อย!');
  };

  const filteredSlips = slips.filter(slip => {
    const query = searchQuery.toLowerCase();
    const matchSearch = String(slip.roomName || '').toLowerCase().includes(query) ||
                        String(slip.tenantName || '').toLowerCase().includes(query) ||
                        String(slip.referenceNo || '').toLowerCase().includes(query);
    // Display pending by default or matching search
    return matchSearch;
  });

  // Split slips into pending and history
  const pendingSlips = filteredSlips.filter(s => s.verificationStatus === 'pending' || !s.verificationStatus);
  const verifiedSlips = filteredSlips.filter(s => s.verificationStatus === 'approved' || s.verificationStatus === 'rejected');

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
          <p className="text-xs font-semibold text-slate-400">ตรวจสอบความถูกต้องของการโอนผ่านธนาคาร</p>
          <h2 className="text-xl font-bold text-slate-800 mt-0.5">ยืนยันสลิปเงินโอนผู้เช่า</h2>
        </div>
      </div>

      {/* Control Search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาประวัติตามชื่อห้อง ชื่อผู้เช่า หรือเลขอ้างอิงสลิป..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Main Grid Panels (Pending on left, History on right) */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Left Side: Pending Slips list */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
            <Clock className="h-4.5 w-4.5 text-blue-500" />
            <span>รอการตรวจสอบ ({pendingSlips.length}) รายการ</span>
          </h3>

          {pendingSlips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck className="h-12 w-12 text-slate-200 stroke-1 mb-2" />
              <p className="text-xs text-slate-400 font-semibold">ไม่มีรายการสลิปที่ต้องตรวจสอบเพิ่มเติมในขณะนี้</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
              {pendingSlips.map((slip) => (
                <div 
                  key={slip.id} 
                  onClick={() => handleOpenDetailModal(slip)}
                  className="flex justify-between items-center p-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-slate-800">ห้อง {slip.roomName} ({slip.tenantName})</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">เลขอ้างอิงสลิป: {slip.referenceNo || 'ไม่มีเลขอ้างอิง'}</p>
                    <p className="text-[9px] text-slate-400 font-semibold">ส่งเข้ามาเมื่อ: {Formatters.thaiDate(slip.createdAt)}</p>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="font-extrabold text-green-600 text-xs">{Formatters.currency(slip.amount)}</span>
                    <button
                      className="px-2.5 py-1.5 bg-green-50 text-green-700 font-bold hover:bg-green-100 border border-green-100 rounded-lg text-xs transition-colors"
                    >
                      ตรวจสอบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Slip History */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-base">ประวัติการตรวจสอบล่าสุด</h3>
          
          {verifiedSlips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileCheck2 className="h-12 w-12 text-slate-200 stroke-1 mb-2" />
              <p className="text-xs text-slate-400 font-semibold">ยังไม่มีประวัติการอนุมัติหรือปฏิเสธสลิป</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white max-h-[350px] overflow-y-auto">
              {verifiedSlips.slice(0, 10).map((slip) => (
                <div key={slip.id} className="flex justify-between items-center p-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-slate-800">ห้อง {slip.roomName} ({slip.tenantName})</p>
                    <div className="flex items-center space-x-2 text-[9px] text-slate-400 font-semibold mt-0.5">
                      <span>เลขอ้างอิง: {slip.referenceNo || '-'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <p className="font-extrabold text-slate-700 text-xs">{Formatters.currency(slip.amount)}</p>
                      <span className={`inline-block text-[8px] font-extrabold mt-0.5 rounded px-1.5 ${
                        slip.verificationStatus === 'approved' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {slip.verificationStatus === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SLIP AUDIT DETAIL MODAL */}
      {selectedInvoice && selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">ตรวจสอบรายการโอนเงินสลิป</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">ห้อง {selectedSlip.roomName} | บิลเดือน {selectedSlip.monthKey}</p>
              </div>
              <button 
                onClick={() => setSelectedSlip(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Split Screen Audit Layout */}
            <div className="flex-1 overflow-y-auto p-6 md:grid md:grid-cols-2 md:gap-6">
              
              {/* Slip image preview on left */}
              <div className="flex flex-col space-y-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">สลิปที่อัปโหลดแนบเข้าบิล</span>
                <div className="relative border border-slate-200 rounded-xl overflow-hidden max-h-[350px] bg-slate-100 flex items-center justify-center">
                  {selectedSlip.publicUrl ? (
                    <img 
                      src={selectedSlip.publicUrl} 
                      alt="สลิปธนาคาร" 
                      className="object-contain max-h-[350px]"
                    />
                  ) : (
                    <div className="py-20 text-center text-slate-400 flex flex-col items-center">
                      <Image className="h-10 w-10 text-slate-300 mb-2" />
                      <span className="text-xs">ไม่มีรูปภาพสลิปแนบ</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Verify Fields & Control Actions on right */}
              <div className="space-y-4 mt-6 md:mt-0">
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-2.5 text-xs text-slate-700 font-semibold">
                  <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2 flex items-center space-x-1.5">
                    <ShieldCheck className="h-4.5 w-4.5 text-green-600" />
                    <span>ข้อมูลทำรายการโอน (จากสลิป)</span>
                  </h4>
                  
                  <div className="flex justify-between">
                    <span>เลขอ้างอิงสลิป:</span>
                    <span className="text-slate-900 font-bold">{selectedSlip.referenceNo || 'ไม่ระบุ'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ยอดโอนจริง:</span>
                    <span className="text-green-600 font-extrabold text-sm">{Formatters.currency(selectedSlip.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>วันที่ทำรายการ:</span>
                    <span>{Formatters.thaiDate(selectedSlip.transactionDate)} {selectedSlip.transactionTime || ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ธนาคารผู้โอน:</span>
                    <span>{selectedSlip.senderBank || 'ไม่ระบุ'}</span>
                  </div>
                  
                  <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200 pt-2 pb-2 flex items-center space-x-1.5">
                    <FileCheck2 className="h-4.5 w-4.5 text-slate-500" />
                    <span>ยอดเงินเรียกเก็บในบิล</span>
                  </h4>
                  
                  <div className="flex justify-between">
                    <span>ยอดสุทธิในใบแจ้งหนี้:</span>
                    <span className="text-slate-950 font-extrabold">{Formatters.currency(selectedInvoice.totalAmount)}</span>
                  </div>
                </div>

                {/* Normal Action buttons / Toggle reject reason form */}
                {!isRejecting ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleApproveSlip(selectedSlip)}
                      className="py-2.5 bg-green-600 hover:bg-green-700 text-xs font-bold text-white rounded-xl transition-all shadow-xs"
                    >
                      อนุมัติและปรับสถานะบิล
                    </button>
                    <button
                      onClick={() => setIsRejecting(true)}
                      className="py-2.5 border border-red-200 hover:bg-red-50 text-xs font-bold text-red-600 rounded-xl transition-all"
                    >
                      ปฏิเสธสลิป / แจ้งโอนผิด
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRejectSlip} className="space-y-3 pt-2 bg-red-50/50 p-4 border border-red-100 rounded-xl">
                    <h5 className="text-xs font-bold text-red-700">ระบุเหตุผลที่ปฏิเสธสลิป</h5>
                    <textarea
                      required
                      placeholder="เช่น ยอดเงินโอนไม่ตรงกับในบิล, สลิปโอนเงินซ้ำ/ใช้แล้ว"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      className="block w-full rounded-lg border border-red-200 px-3 py-1.5 text-xs text-slate-950 focus:outline-none bg-white resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-xs font-bold text-white rounded-lg transition-colors"
                      >
                        ยืนยันปฏิเสธ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRejecting(false);
                          setRejectReason('');
                        }}
                        className="px-3 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 rounded-lg transition-colors"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
