'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, ShieldAlert, CheckCircle, ArrowRight, Settings, ClipboardList } from 'lucide-react';
import { DBService } from '@/services/dbService';

export default function RootPage() {
  const router = useRouter();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [tenantKey, setTenantKey] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    // Check if Supabase is already configured in storage
    const url = DBService.getSavedSupabaseUrl();
    const key = DBService.getSavedApiKey();
    if (url && key) {
      setIsConfigured(true);
    } else {
      setIsConfigured(false);
    }
  }, []);

  const handleConfigure = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(null);

    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setSaveStatus({ success: false, message: 'กรุณากรอก Supabase URL และ Anon Key' });
      return;
    }

    try {
      const cleanUrl = DBService.cleanRoomName(supabaseUrl); // Use generic cleaning if needed, or cleanUrl helper
      const parsedUrl = supabaseUrl.split('?')[0].trim();

      // Save credentials directly to localStorage using keys compatible with dbService
      localStorage.setItem('HOSTEL_APARTMENT_SAVED_SUPABASE_URL', parsedUrl);
      localStorage.setItem('HOSTEL_APARTMENT_SAVED_API_KEY', supabaseKey.trim());
      localStorage.setItem('SOMBAT_APARTMENT_SAVED_TENANT_API_KEY', tenantKey.trim() || supabaseKey.trim());

      // Save initialized state
      const state = DBService.getInitialState();
      state.settings.supabaseUrl = parsedUrl;
      localStorage.setItem(DBService.STORAGE_KEY, JSON.stringify(state));

      setSaveStatus({ success: true, message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว!' });
      
      // Delay redirection
      setTimeout(() => {
        setIsConfigured(true);
      }, 1000);
    } catch (err: any) {
      setSaveStatus({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
  };

  if (isConfigured === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 border-4 border-slate-200 border-t-green-600 rounded-full animate-spin-custom"></div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-slate-100 shadow-md">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
              <Database className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
              ตั้งค่าเซิร์ฟเวอร์ Supabase
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              กรุณากรอกข้อมูลการเชื่อมต่อเพื่อเชื่อมโยงระบบเข้ากับฐานข้อมูลของคุณ
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleConfigure}>
            <div className="space-y-4 rounded-md">
              <div>
                <label htmlFor="url" className="block text-sm font-semibold text-slate-700 mb-1">
                  Supabase URL
                </label>
                <input
                  id="url"
                  name="url"
                  type="url"
                  required
                  placeholder="https://your-project.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-green-600 focus:outline-none sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="key" className="block text-sm font-semibold text-slate-700 mb-1">
                  Supabase Anon Key (สำหรับแอดมิน)
                </label>
                <input
                  id="key"
                  name="key"
                  type="password"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-green-600 focus:outline-none sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="tenantKey" className="block text-sm font-semibold text-slate-700 mb-1">
                  Supabase Tenant Key (สำหรับพอร์ทัลผู้เช่า - ไม่บังคับ)
                </label>
                <input
                  id="tenantKey"
                  name="tenantKey"
                  type="password"
                  placeholder="หากไม่มีระบบจะใช้คีย์แอดมินแทน"
                  value={tenantKey}
                  onChange={(e) => setTenantKey(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-green-600 focus:outline-none sm:text-sm"
                />
              </div>
            </div>

            {saveStatus && (
              <div className={`flex items-center space-x-2 p-3.5 rounded-xl text-sm ${saveStatus.success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {saveStatus.success ? <CheckCircle className="h-5 w-5 shrink-0" /> : <ShieldAlert className="h-5 w-5 shrink-0" />}
                <span>{saveStatus.message}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="group relative flex w-full justify-center rounded-xl bg-green-600 px-3 py-3 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none transition-all duration-200"
              >
                บันทึกการเชื่อมต่อและเริ่มต้นใช้งาน
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg text-center space-y-8 bg-white p-10 rounded-2xl border border-slate-100 shadow-md">
        <div>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600 mb-4">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ระบบจัดการห้องเช่าอัจฉริยะ</h1>
          <p className="mt-3 text-slate-500">
            ระบบเชื่อมต่อกับฐานข้อมูล Supabase เรียบร้อยแล้ว เลือกพอร์ทัลที่ต้องการเข้าใช้งาน
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mt-8">
          <button
            onClick={() => router.push('/login')}
            className="flex flex-col items-center justify-center p-5 bg-white border border-slate-200 hover:border-green-600 rounded-2xl group transition-all duration-200 shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Settings className="h-5.5 w-5.5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">ฝ่ายดูแลระบบ</h3>
            <p className="text-[10px] text-slate-400 mt-1 text-center">สำหรับผู้ดูแล และแอดมินหลัก</p>
            <div className="flex items-center text-green-600 font-semibold text-xs mt-3 group-hover:translate-x-1 transition-transform">
              <span>เข้าสู่ระบบ</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </button>

          <button
            onClick={() => router.push('/tenant')}
            className="flex flex-col items-center justify-center p-5 bg-white border border-slate-200 hover:border-green-600 rounded-2xl group transition-all duration-200 shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Database className="h-5.5 w-5.5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">พอร์ทัลผู้เช่า</h3>
            <p className="text-[10px] text-slate-400 mt-1 text-center">สำหรับผู้เช่าเช็คบิล แนบสลิป</p>
            <div className="flex items-center text-green-600 font-semibold text-xs mt-3 group-hover:translate-x-1 transition-transform">
              <span>เข้าใช้งาน</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </button>

          <button
            onClick={() => router.push('/meter')}
            className="flex flex-col items-center justify-center p-5 bg-white border border-slate-200 hover:border-green-600 rounded-2xl group transition-all duration-200 shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <ClipboardList className="h-5.5 w-5.5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">จดมิเตอร์มือถือ</h3>
            <p className="text-[10px] text-slate-400 mt-1 text-center">สำหรับพนักงานจดค่าน้ำ-ค่าไฟ</p>
            <div className="flex items-center text-green-600 font-semibold text-xs mt-3 group-hover:translate-x-1 transition-transform">
              <span>จดมิเตอร์</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </button>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
          <span>สถานะเซิร์ฟเวอร์: <span className="text-green-600 font-semibold">เชื่อมต่ออยู่</span></span>
          <button
            onClick={() => {
              if (confirm('คุณต้องการรีเซ็ตการเชื่อมต่อฐานข้อมูลใช่หรือไม่?')) {
                localStorage.removeItem('HOSTEL_APARTMENT_SAVED_SUPABASE_URL');
                localStorage.removeItem('HOSTEL_APARTMENT_SAVED_API_KEY');
                localStorage.removeItem('SOMBAT_APARTMENT_SAVED_TENANT_API_KEY');
                setIsConfigured(false);
              }
            }}
            className="text-slate-400 hover:text-red-500 font-semibold transition-colors"
          >
            รีเซ็ตคีย์เชื่อมโยง
          </button>
        </div>
      </div>
    </div>
  );
}
