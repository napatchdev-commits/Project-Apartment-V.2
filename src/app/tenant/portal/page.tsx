'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  LogOut, 
  Receipt, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  QrCode, 
  Upload, 
  Clock, 
  FileText,
  MessageSquareCode
} from 'lucide-react';
import { TenantDBService } from '@/services/tenantDbService';
import { Formatters } from '@/services/formatters';
import { PromptPayService } from '@/services/promptPayService';

export default function TenantDashboard() {
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [billData, setBillData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'billing' | 'repairs'>('billing');

  // Slip Payment Form State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [slipAmount, setSlipAmount] = useState('');
  const [slipDate, setSlipDate] = useState('');
  const [slipTime, setSlipTime] = useState('');
  const [slipRef, setSlipRef] = useState('');
  const [slipBank, setSlipBank] = useState('kbank');
  const [slipBase64, setSlipBase64] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Repair Request Form State
  const repairFileRef = useRef<HTMLInputElement>(null);
  const [repairTitle, setRepairTitle] = useState('');
  const [repairDesc, setRepairDesc] = useState('');
  const [repairImageBase64, setRepairImageBase64] = useState('');
  const [submittingRepair, setSubmittingRepair] = useState(false);

  useEffect(() => {
    const loggedTenant = TenantDBService.getLoggedInTenant();
    if (!loggedTenant) {
      router.push('/tenant');
      return;
    }
    setTenant(loggedTenant);
    fetchData(loggedTenant.idCard, loggedTenant.roomId);
  }, [router]);

  const fetchData = async (idCard: string, roomId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await TenantDBService.fetchTenantBill(idCard, roomId);
      if (data.status === 'error') {
        throw new Error(data.message || 'ไม่สามารถดึงข้อมูลบิลผู้เช่าได้');
      }
      setBillData(data);
      // Auto select the first unpaid invoice
      const unpaid = (data.invoices || []).find((inv: any) => inv.status === 'unpaid');
      if (unpaid) {
        setSelectedInvoice(unpaid);
        setSlipAmount(unpaid.outstandingAmount?.toString() || '');
      }
      // Populate defaults for date/time
      setSlipDate(new Date().toISOString().slice(0, 10));
      setSlipTime(new Date().toTimeString().slice(0, 5));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    TenantDBService.setLoggedInTenant(null);
    router.push('/tenant');
  };

  // Convert files to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setBase64: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBase64(event.target.result.toString());
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit bank transfer slip
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !slipAmount || !slipBase64) {
      alert('กรุณากรอกข้อมูลการชำระเงินและแนบภาพถ่ายสลิป');
      return;
    }

    setSubmittingPayment(true);
    try {
      await TenantDBService.submitPayment({
        idCard: tenant.idCard,
        roomId: tenant.roomId,
        invoiceNumber: selectedInvoice.invoiceNumber,
        paymentMethod: 'bank_transfer',
        base64Slip: slipBase64
      });

      alert('ส่งสลิปชำระเงินเรียบร้อยแล้ว แอดมินจะทำการตรวจสอบความถูกต้องโดยเร็วที่สุด');
      
      // Clear Form
      setSlipBase64('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Reload
      fetchData(tenant.idCard, tenant.roomId);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการส่งสลิป: ' + err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Submit repair claim request
  const handleRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairTitle.trim() || !repairDesc.trim()) {
      alert('กรุณากรอกหัวข้อแจ้งซ่อมและรายละเอียดให้ครบถ้วน');
      return;
    }

    setSubmittingRepair(true);
    try {
      await TenantDBService.submitRepair({
        idCard: tenant.idCard,
        roomId: tenant.roomId,
        title: repairTitle.trim(),
        description: repairDesc.trim(),
        base64Image: repairImageBase64 || undefined
      });

      alert('ส่งเรื่องแจ้งซ่อมแซมสำเร็จแล้ว ทีมงานช่างจะเข้าดำเนินการตรวจสอบต่อไป');
      
      // Clear Form
      setRepairTitle('');
      setRepairDesc('');
      setRepairImageBase64('');
      if (repairFileRef.current) repairFileRef.current.value = '';

      // Reload
      fetchData(tenant.idCard, tenant.roomId);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการส่งแจ้งซ่อม: ' + err.message);
    } finally {
      setSubmittingRepair(false);
    }
  };

  // Generate PromptPay URL
  const getPromptPayQrUrl = (amount: number) => {
    const ppId = billData?.settings?.promptPayId;
    if (!ppId) return '';
    const payload = PromptPayService.generatePayload(ppId, amount);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 border-4 border-slate-200 border-t-green-600 rounded-full animate-spin-custom"></div>
      </div>
    );
  }

  const unpaidInvoices = (billData?.invoices || []).filter((inv: any) => inv.status === 'unpaid');
  const pastInvoices = (billData?.invoices || []).filter((inv: any) => inv.status !== 'unpaid');
  const repairTickets = billData?.repairs || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Navigation Topbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Home className="h-5 w-5 text-green-600" />
            <h1 className="font-bold text-slate-800 text-base md:text-lg">
              ห้อง {tenant?.roomName} : {tenant?.tenantName}
            </h1>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-xl text-xs font-bold text-slate-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 space-y-6">
        
        {error && (
          <div className="flex items-start space-x-2.5 p-4 bg-red-50 text-red-800 border border-red-100 rounded-2xl">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <span className="text-xs font-semibold">{error}</span>
          </div>
        )}

        {/* Action tab switcher */}
        <div className="flex space-x-1.5 p-1 bg-slate-200/60 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'billing' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>ยอดค้างชำระ & ประวัติบิล</span>
          </button>
          <button
            onClick={() => setActiveTab('repairs')}
            className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'repairs' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="h-4 w-4" />
            <span>ส่งแจ้งซ่อมแซม ({repairTickets.length})</span>
          </button>
        </div>

        {/* Tab 1: Billing & payments */}
        {activeTab === 'billing' && (
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Left side PromptPay & Upload */}
            <div className="md:col-span-2 space-y-6">
              
              {unpaidInvoices.length === 0 ? (
                <div className="bg-white p-8 border border-slate-200 rounded-2xl shadow-xs text-center flex flex-col items-center justify-center py-16">
                  <CheckCircle2 className="h-14 w-14 text-green-500 mb-3" />
                  <h3 className="font-bold text-slate-800 text-base">ยอดค้างจ่ายเป็นศูนย์!</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    คุณได้เคลียร์หนี้สินและบิลค่าเช่าพักประจำงวดทั้งหมดเรียบร้อยแล้ว
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-6">
                  <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">รายละเอียดบิลค้างชำระ</h3>
                  
                  {/* Select Unpaid invoice */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">กรุณาเลือกบิลเพื่อชำระเงิน</label>
                    <select
                      value={selectedInvoice?.id || ''}
                      onChange={(e) => {
                        const inv = unpaidInvoices.find((i: any) => i.id === e.target.value);
                        setSelectedInvoice(inv);
                        setSlipAmount(inv?.outstandingAmount?.toString() || '');
                      }}
                      className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none bg-white font-semibold"
                    >
                      {unpaidInvoices.map((inv: any) => (
                        <option key={inv.id} value={inv.id}>
                          บิลเลขที่: {inv.invoiceNumber} (เดือน {inv.monthKey}) - {Formatters.currency(inv.outstandingAmount)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* QR SCAN + BANK TRANSFER */}
                  {selectedInvoice && (
                    <div className="grid gap-6 sm:grid-cols-2">
                      {/* QR PromptPay code */}
                      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                        <span className="text-xs font-bold text-slate-600">สแกนชำระผ่าน PromptPay</span>
                        
                        {getPromptPayQrUrl(selectedInvoice.outstandingAmount) ? (
                          <div className="bg-white p-2 border border-slate-100 rounded-xl">
                            <img 
                              src={getPromptPayQrUrl(selectedInvoice.outstandingAmount)} 
                              alt="PromptPay QR Code"
                              className="h-44 w-44 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="py-12 text-slate-400 text-xs font-semibold">
                            (เจ้าของหอพักยังไม่ป้อนพร้อมเพย์ในหน้าตั้งค่า)
                          </div>
                        )}

                        <div className="text-[10px] text-slate-500 font-semibold space-y-0.5">
                          <p>ยอดชำระจริง: <span className="font-extrabold text-green-600 text-sm">{Formatters.currency(selectedInvoice.outstandingAmount)}</span></p>
                          <p>ชื่อบัญชี: {billData?.settings?.bankAccountName || '-'}</p>
                          <p>เลขบัญชี: {billData?.settings?.bankAccountNo || '-'} ({billData?.settings?.bankName || 'ธนาคาร'})</p>
                        </div>
                      </div>

                      {/* Slip attachment Form */}
                      <form onSubmit={handlePaymentSubmit} className="space-y-3">
                        <span className="block text-xs font-bold text-slate-600 border-b border-slate-100 pb-1">แนบหลักฐานสลิปเงินโอน</span>
                        
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 mb-0.5">ยอดโอน (บาท)</label>
                            <input
                              type="number"
                              required
                              value={slipAmount}
                              onChange={(e) => setSlipAmount(e.target.value)}
                              className="block w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-900 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 mb-0.5">ธนาคารที่โอน</label>
                            <select
                              value={slipBank}
                              onChange={(e) => setSlipBank(e.target.value)}
                              className="block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none bg-white font-semibold"
                            >
                              <option value="kbank">กสิกรไทย (KBANK)</option>
                              <option value="scb">ไทยพาณิชย์ (SCB)</option>
                              <option value="bangkok">กรุงเทพ (BBL)</option>
                              <option value="krungthai">กรุงไทย (KTB)</option>
                              <option value="tmb">ทหารไทยธนชาต (TTB)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 mb-0.5">วันที่ตามสลิป</label>
                            <input
                              type="date"
                              required
                              value={slipDate}
                              onChange={(e) => setSlipDate(e.target.value)}
                              className="block w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-900 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 mb-0.5">เวลาตามสลิป</label>
                            <input
                              type="time"
                              required
                              value={slipTime}
                              onChange={(e) => setSlipTime(e.target.value)}
                              className="block w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-900 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 mb-0.5">เลขอ้างอิงสลิปโอน (เช่น เลขอ้างอิง/รหัสยืนยัน)</label>
                          <input
                            type="text"
                            placeholder="ระบุเลขอ้างอิงสลิป"
                            value={slipRef}
                            onChange={(e) => setSlipRef(e.target.value)}
                            className="block w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-900 focus:outline-none"
                          />
                        </div>

                        {/* File selector wrapper */}
                        <div className="space-y-1.5 pt-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => handleFileChange(e, setSlipBase64)}
                            className="hidden"
                            accept="image/*"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center space-x-1.5 py-2.5 border border-dashed border-slate-300 hover:border-green-600 hover:text-green-600 text-xs font-bold text-slate-500 rounded-xl bg-slate-50/50 transition-all"
                          >
                            <Upload className="h-4.5 w-4.5" />
                            <span>{slipBase64 ? 'เปลี่ยนภาพสลิปที่เลือก' : 'อัปโหลดภาพถ่ายสลิป *'}</span>
                          </button>
                          {slipBase64 && (
                            <p className="text-[10px] text-green-600 font-bold text-center">✓ ได้แนบภาพสลิปเรียบร้อยแล้ว</p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={submittingPayment || !slipBase64}
                          className="w-full flex justify-center py-2.5 bg-green-600 hover:bg-green-700 text-xs font-bold text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
                        >
                          {submittingPayment ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin-custom"></div>
                          ) : (
                            'ส่งสลิปชำระเงินให้หอพัก'
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Right side billing history */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">ประวัติการออกบิลย้อนหลัง</h3>
              
              {pastInvoices.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-4 text-center">ไม่มีข้อมูลประวัติบิลก่อนหน้า</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pastInvoices.map((inv: any) => (
                    <div key={inv.id} className="py-2.5 flex justify-between items-center text-xs font-semibold">
                      <div>
                        <p className="text-slate-800">บิลรอบเดือน {inv.monthKey}</p>
                        <p className="text-[10px] text-slate-400">{inv.invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-slate-700">{Formatters.currency(inv.totalAmount)}</p>
                        <span className={`text-[8px] font-extrabold mt-0.5 rounded px-1.5 inline-block ${
                          inv.status === 'paid' 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {inv.status === 'paid' ? 'จ่ายแล้ว' : 'รอตรวจสอบ'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Maintenance tickets claims */}
        {activeTab === 'repairs' && (
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Left side Form to create ticket */}
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-xs">
              <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2 mb-4">ฟอร์มส่งข้อมูลแจ้งซ่อมแซม</h3>
              
              <form onSubmit={handleRepairSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">หัวข้อปัญหาชำรุด *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ก๊อกน้ำอ่างล้างหน้ารั่ว, หลอดไฟเสีย"
                    value={repairTitle}
                    onChange={(e) => setRepairTitle(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">รายละเอียดและอาการชำรุด *</label>
                  <textarea
                    required
                    placeholder="ระบุข้อความอธิบายอาการอย่างละเอียด เพื่อให้ช่างจัดเตรียมเครื่องมือได้ถูกต้อง..."
                    value={repairDesc}
                    onChange={(e) => setRepairDesc(e.target.value)}
                    rows={4}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ถ่ายภาพแนบอาการเสีย (ถ้ามี)</label>
                  <input
                    type="file"
                    ref={repairFileRef}
                    onChange={(e) => handleFileChange(e, setRepairImageBase64)}
                    className="hidden"
                    accept="image/*"
                  />
                  <button
                    type="button"
                    onClick={() => repairFileRef.current?.click()}
                    className="w-full flex items-center justify-center space-x-1.5 py-2 border border-dashed border-slate-300 hover:border-green-600 hover:text-green-600 text-xs font-bold text-slate-500 rounded-lg bg-slate-50/50 transition-all"
                  >
                    <Upload className="h-4 w-4" />
                    <span>{repairImageBase64 ? 'เปลี่ยนภาพประกอบ' : 'อัปโหลดภาพถ่ายอาการชำรุด'}</span>
                  </button>
                  {repairImageBase64 && (
                    <p className="text-[10px] text-green-600 font-bold text-center">✓ ได้แนบรูปภาพอาการเสียเรียบร้อยแล้ว</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submittingRepair}
                  className="w-full flex justify-center py-2.5 bg-green-600 hover:bg-green-700 text-xs font-bold text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {submittingRepair ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin-custom"></div>
                  ) : (
                    'ส่งข้อมูลคำขอแจ้งซ่อม'
                  )}
                </button>
              </form>
            </div>

            {/* Right side history of repair list */}
            <div className="md:col-span-2 bg-white p-6 border border-slate-200 rounded-2xl shadow-xs">
              <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2 mb-4">รายการประวัติแจ้งซ่อมของคุณ</h3>
              
              {repairTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <Wrench className="h-12 w-12 text-slate-200 stroke-1 mb-2" />
                  <p className="text-xs font-semibold">คุณยังไม่มีประวัติแจ้งซ่อมแซมกับหอพักนี้</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 max-h-[450px] overflow-y-auto pr-1">
                  {repairTickets.map((ticket: any) => (
                    <div 
                      key={ticket.id}
                      className="border border-slate-100 bg-slate-50/40 p-4 rounded-xl space-y-2 text-xs font-semibold leading-relaxed"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 font-bold">{ticket.ticketNumber}</span>
                        <span className={`text-[8px] font-extrabold rounded px-1.5 ${
                          ticket.status === 'completed' 
                            ? 'bg-green-50 text-green-700' 
                            : ticket.status === 'in_progress'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {ticket.status === 'completed' ? 'ซ่อมเสร็จสิ้น' : ticket.status === 'in_progress' ? 'กำลังซ่อม' : 'รอดำเนินการ'}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-slate-800 text-sm truncate">{ticket.title}</h4>
                      <p className="text-slate-500 font-medium text-[10px] line-clamp-2">{ticket.description}</p>
                      
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                        <span>วันที่แจ้ง: {Formatters.thaiDate(ticket.requestDate)}</span>
                        {ticket.assignedTechnician && (
                          <span className="font-bold text-slate-500 bg-white px-2 py-0.5 border border-slate-200/50 rounded">ช่าง: {ticket.assignedTechnician}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
