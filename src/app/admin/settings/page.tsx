'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Database, 
  HelpCircle, 
  ShieldAlert, 
  Trash2, 
  Check, 
  Info,
  DollarSign,
  AlertTriangle,
  Building,
  KeyRound,
  MessageSquare
} from 'lucide-react';
import { DBService } from '@/services/dbService';

export default function AdminSettings() {
  const router = useRouter();
  const [state, setState] = useState<any>(null);
  
  // Settings Tab
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'rates' | 'api' | 'reset'>('info');

  // Form states - settings table
  const [aptName, setAptName] = useState('');
  const [address, setAddress] = useState('');
  const [tel, setTel] = useState('');
  const [lineId, setLineId] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [promptPayId, setPromptPayId] = useState('');
  const [lineToken, setLineToken] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [lineNotifyToken, setLineNotifyToken] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [tenantApiKey, setTenantApiKey] = useState('');

  // Form states - rates table
  const [elecRate, setElecRate] = useState('');
  const [waterRate, setWaterRate] = useState('');
  const [trashFee, setTrashFee] = useState('');
  const [internetFee, setInternetFee] = useState('');
  const [commonFee, setCommonFee] = useState('');

  // Form states - late fee settings
  const [dueDay, setDueDay] = useState(5);
  const [penaltyP1Start, setPenaltyP1Start] = useState(6);
  const [penaltyP1End, setPenaltyP1End] = useState(15);
  const [penaltyP1Amt, setPenaltyP1Amt] = useState(200);
  const [penaltyP2Start, setPenaltyP2Start] = useState(16);
  const [penaltyP2End, setPenaltyP2End] = useState(31);
  const [penaltyP2Amt, setPenaltyP2Amt] = useState(300);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const currentState = DBService.getState();
    setState(currentState);

    // Populate Settings
    const s = currentState.settings || {};
    setAptName(s.apartmentName || '');
    setAddress(s.address || '');
    setTel(s.tel || '');
    setLineId(s.lineId || '');
    setBankName(s.bankName || '');
    setBankAccountNo(s.bankAccountNo || '');
    setBankAccountName(s.bankAccountName || '');
    setPromptPayId(s.promptPayId || '');
    setLineToken(s.lineToken || '');
    setLineUserId(s.lineUserId || '');
    setLineNotifyToken(s.lineNotifyToken || '');

    // Credentials from localStorage/state
    setSupabaseUrl(DBService.getSavedSupabaseUrl());
    setApiKey(DBService.getSavedApiKey());
    setTenantApiKey(DBService.getSavedTenantApiKey());

    // Populate Rates
    const r = currentState.rates || {};
    setElecRate(r.electricityRate?.toString() || '8.0');
    setWaterRate(r.waterRate?.toString() || '20.0');
    setTrashFee(r.trashFee?.toString() || '20.0');
    setInternetFee(r.internetFee?.toString() || '0');
    setCommonFee(r.commonFee?.toString() || '0');

    // Populate Penalty settings
    const p = currentState.lateFeeSettings || {};
    setDueDay(Number(p.dueDay ?? 5));
    setPenaltyP1Start(Number(p.penaltyPhase1Start ?? 6));
    setPenaltyP1End(Number(p.penaltyPhase1End ?? 15));
    setPenaltyP1Amt(Number(p.penaltyPhase1Amount ?? 200));
    setPenaltyP2Start(Number(p.penaltyPhase2Start ?? 16));
    setPenaltyP2End(Number(p.penaltyPhase2End ?? 31));
    setPenaltyP2Amt(Number(p.penaltyPhase2Amount ?? 300));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Prepare credentials update
    if (supabaseUrl && !supabaseUrl.includes('supabase.co')) {
      alert('รูปแบบ Supabase URL ไม่ถูกต้อง');
      return;
    }

    if (supabaseUrl) localStorage.setItem('HOSTEL_APARTMENT_SAVED_SUPABASE_URL', supabaseUrl.trim());
    if (apiKey) localStorage.setItem('HOSTEL_APARTMENT_SAVED_API_KEY', apiKey.trim());
    if (tenantApiKey) localStorage.setItem('HOSTEL_APARTMENT_SAVED_TENANT_API_KEY', tenantApiKey.trim());

    // 2. Build updated State
    const nextState = {
      ...state,
      settings: {
        ...state.settings,
        apartmentName: aptName.trim(),
        address: address.trim(),
        tel: tel.trim(),
        lineId: lineId.trim(),
        bankName: bankName.trim(),
        bankAccountNo: bankAccountNo.trim(),
        bankAccountName: bankAccountName.trim(),
        promptPayId: promptPayId.trim(),
        lineToken: lineToken.trim(),
        lineUserId: lineUserId.trim(),
        lineNotifyToken: lineNotifyToken.trim(),
        supabaseUrl: supabaseUrl.trim()
      },
      rates: {
        electricityRate: Number(elecRate) || 8.0,
        waterRate: Number(waterRate) || 20.0,
        trashFee: Number(trashFee) || 0,
        internetFee: Number(internetFee) || 0,
        commonFee: Number(commonFee) || 0
      },
      lateFeeSettings: {
        dueDay: Number(dueDay),
        penaltyPhase1Start: Number(penaltyP1Start),
        penaltyPhase1End: Number(penaltyP1End),
        penaltyPhase1Amount: Number(penaltyP1Amt),
        penaltyPhase2Start: Number(penaltyP2Start),
        penaltyPhase2End: Number(penaltyP2End),
        penaltyPhase2Amount: Number(penaltyP2Amt)
      }
    };

    setState(nextState);

    // Save and Sync to Supabase
    try {
      await DBService.saveState(nextState);
      loadData();
      alert('บันทึกการตั้งค่าทั้งหมดสำเร็จ!');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    }
  };

  // Start Production Mode (Wipe Rooms, Tenants, Bills to start clean)
  const handleStartProduction = async () => {
    if (!confirm('⚠️ คำเตือนสำคัญ! การเปิดโหมดใช้งานจริงจะทำการลบห้องพัก ผู้เช่า และประวัติบิลตัวอย่างทั้งหมดทิ้งอย่างถาวรทั้งบนเครื่องและบน Supabase เพื่อจัดเตรียมระบบให้เป็นแบบว่างเปล่าพร้อมป้อนข้อมูลจริง\n\nคุณยืนยันที่จะทำรายการนี้ใช่หรือไม่?')) return;

    try {
      const nextState = await DBService.startProductionMode(state);
      setState(nextState);
      loadData();
      alert('เปลี่ยนระบบเป็นโหมดพร้อมใช้งานจริง เรียบร้อยแล้ว!');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการล้างข้อมูล: ' + err.message);
    }
  };

  // Clear usage logs only (Keep Rooms)
  const handleClearUsage = async () => {
    if (!confirm('⚠️ คุณยืนยันต้องการล้างข้อมูลผู้เช่า สัญญา บิล ประวัติแจ้งซ่อม และบัญชีทั้งหมดใช่หรือไม่? (โครงสร้างข้อมูลห้องพักจะถูกรักษาไว้ แต่จะถูกปรับเป็นห้องว่างทั้งหมด)')) return;

    try {
      const nextState = await DBService.clearUsageData(state);
      setState(nextState);
      loadData();
      alert('ล้างข้อมูลบันทึกการใช้งานทั้งหมดสำเร็จ!');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  if (!state) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin-custom"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub tabs navigation */}
      <div className="flex space-x-1.5 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveSubTab('info')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'info' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ตั้งค่าหอพัก & ชำระเงิน
        </button>
        <button
          onClick={() => setActiveSubTab('rates')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'rates' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ค่าน้ำ-ค่าไฟ & ค่าปรับ
        </button>
        <button
          onClick={() => setActiveSubTab('api')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'api' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ฐานข้อมูล & LINE
        </button>
        <button
          onClick={() => setActiveSubTab('reset')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'reset' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ล้างระบบเดโม
        </button>
      </div>

      {/* Forms content block */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-3xl">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* TAB 1: General Info & Payment */}
          {activeSubTab === 'info' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
                <Building className="h-5 w-5 text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">ข้อมูลทั่วไปของหอพัก</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อหอพัก / อพาร์ทเม้นท์</label>
                  <input
                    type="text"
                    placeholder="ระบุชื่อหอพักจริง"
                    value={aptName}
                    onChange={(e) => setAptName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    placeholder="เช่น 08x-xxxxxxx"
                    value={tel}
                    onChange={(e) => setTel(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ที่อยู่หอพัก (แสดงบนใบแจ้งหนี้)</label>
                <textarea
                  placeholder="ระบุที่อยู่สำหรับการพิมพ์ใบแจ้งหนี้"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm resize-none"
                />
              </div>

              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2 pt-4">
                <DollarSign className="h-5 w-5 text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">ข้อมูลบัญชีชำระเงิน</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ธนาคาร</label>
                  <input
                    type="text"
                    placeholder="เช่น ธนาคารกสิกรไทย (KBANK)"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อบัญชีเงินโอน</label>
                  <input
                    type="text"
                    placeholder="ชื่อ-นามสกุลจริงเจ้าของบัญชี"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เลขที่บัญชีธนาคาร</label>
                  <input
                    type="text"
                    placeholder="ระบุเลขบัญชี 10-12 หลัก"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เลขพร้อมเพย์ (PromptPay ID) สำหรับสแกน QR</label>
                  <input
                    type="text"
                    placeholder="ระบุเบอร์โทรศัพท์ หรือเลขบัตรประชาชน"
                    value={promptPayId}
                    onChange={(e) => setPromptPayId(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Rates & Penalties */}
          {activeSubTab === 'rates' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">อัตราค่าบริการสาธารณูปโภค</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">อัตราค่าไฟฟ้า (บาท/หน่วย)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="ค่าไฟต่อหน่วย"
                    value={elecRate}
                    onChange={(e) => setElecRate(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">อัตราค่าน้ำประปา (บาท/หน่วย)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="ค่าน้ำต่อหน่วย"
                    value={waterRate}
                    onChange={(e) => setWaterRate(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ค่าเก็บขยะมาตรฐาน (บาท/ห้อง)</label>
                  <input
                    type="number"
                    placeholder="เช่น 20, 40"
                    value={trashFee}
                    onChange={(e) => setTrashFee(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2 pt-4">
                <AlertTriangle className="h-5 w-5 text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">การตั้งค่าค่าปรับชำระล่าช้า</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">วันครบกำหนดชำระ (วันที่)</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={dueDay}
                    onChange={(e) => setDueDay(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ปรับช่วง 1 เริ่ม (วันที่)</label>
                  <input
                    type="number"
                    value={penaltyP1Start}
                    onChange={(e) => setPenaltyP1Start(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ค่าปรับช่วง 1 (บาท)</label>
                  <input
                    type="number"
                    value={penaltyP1Amt}
                    onChange={(e) => setPenaltyP1Amt(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ปรับช่วง 2 เริ่ม (วันที่)</label>
                  <input
                    type="number"
                    value={penaltyP2Start}
                    onChange={(e) => setPenaltyP2Start(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ค่าปรับช่วง 2 (บาท)</label>
                  <input
                    type="number"
                    value={penaltyP2Amt}
                    onChange={(e) => setPenaltyP2Amt(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Supabase & LINE Credentials */}
          {activeSubTab === 'api' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
                <Database className="h-5 w-5 text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">การเชื่อมโยงฐานข้อมูล Supabase</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Supabase URL</label>
                  <input
                    type="url"
                    placeholder="https://your-project.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Supabase Anon Key (สำหรับแอดมิน)</label>
                  <input
                    type="password"
                    placeholder="กรอกคีย์ความปลอดภัย Anon Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Supabase Tenant Key (สำหรับผู้เช่า)</label>
                  <input
                    type="password"
                    placeholder="คีย์จำกัดสิทธิ์สำหรับเข้าถึงพอร์ทัลผู้เช่า"
                    value={tenantApiKey}
                    onChange={(e) => setTenantApiKey(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2 pt-4">
                <MessageSquare className="h-5 w-5 text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">การตั้งค่า LINE API (เพื่อแจ้งหนี้ผ่านบอท)</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">LINE Notify Token (แจ้งแอดมิน)</label>
                  <input
                    type="password"
                    placeholder="ระบุ LINE Notify Token"
                    value={lineNotifyToken}
                    onChange={(e) => setLineNotifyToken(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">LINE Official Account ID</label>
                  <input
                    type="text"
                    placeholder="เช่น @line_hostel_id"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Wipe Demo Data (Blank Project tools) */}
          {activeSubTab === 'reset' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2 text-red-600">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="font-bold text-sm">ส่วนบริการล้างข้อมูลระบบเดโม</h3>
              </div>

              <div className="p-4 bg-red-50 text-red-800 border border-red-100 rounded-2xl space-y-3">
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h5 className="font-bold text-slate-800">โปรดระวังการทำรายการ!</h5>
                    <p className="text-slate-600 mt-1">
                      ปุ่มควบคุมด้านล่างนี้จะทำการเคลียร์ข้อมูลในฐานข้อมูล Supabase เพื่อให้โครงการนี้กลายเป็น **Blank Project (โปรเจกต์เปล่าสมบูรณ์)** เพื่อเตรียมพร้อมส่งมอบลูกค้าจริง
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleStartProduction}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-xs font-bold text-white rounded-xl shadow-xs transition-colors"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                    <span>ล้างห้องพักและข้อมูลผู้เช่า (เริ่มระบบเปล่าจริง)</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleClearUsage}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 border border-red-200 bg-white hover:bg-red-50 text-xs font-bold text-red-600 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                    <span>ล้างประวัติการใช้/สัญญา (รักษาห้องพักไว้)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions (Only for Tabs 1-3) */}
          {activeSubTab !== 'reset' && (
            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                บันทึกการตั้งค่าทั้งหมด
              </button>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
