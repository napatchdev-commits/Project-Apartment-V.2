'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Home, KeyRound, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import { TenantDBService } from '@/services/tenantDbService';

export default function TenantLoginPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomId, setRoomId] = useState('');
  const [idCard, setIdCard] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apartmentName, setApartmentName] = useState('');

  useEffect(() => {
    // Check if tenant already logged in
    const currentTenant = TenantDBService.getLoggedInTenant();
    if (currentTenant) {
      router.push('/tenant/portal');
      return;
    }

    // Load active rooms for selection dropdown
    const loadRooms = async () => {
      try {
        const publicState = await TenantDBService.getPublicState();
        setRooms(publicState.rooms || []);
        setApartmentName(publicState.settings?.apartmentName || 'ระบบจัดการห้องเช่า');
      } catch (err: any) {
        console.error(err);
        setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ห้องพักได้ กรุณาติดต่อผู้ดูแลหอพักเพื่อตรวจสอบข้อมูลการเชื่อมโยง');
      } finally {
        setLoadingRooms(false);
      }
    };

    loadRooms();
  }, [router]);

  const handleTenantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!roomId || !idCard.trim()) {
      setError('กรุณาเลือกห้องพักและกรอกเลขบัตรประชาชน');
      setLoading(false);
      return;
    }

    try {
      const response = await TenantDBService.fetchTenantBill(idCard.trim(), roomId);
      if (response.status === 'error') {
        setError(response.message || 'ข้อมูลบัตรประชาชนไม่ตรงกับผู้เช่าห้องนี้');
        setLoading(false);
        return;
      }

      // Login success
      // Save tenant credentials context
      TenantDBService.setLoggedInTenant({
        roomId,
        idCard: idCard.trim(),
        roomName: response.room?.name || '',
        tenantName: response.tenant?.name || ''
      });

      router.push('/tenant/portal');
    } catch (err: any) {
      setError('การเข้าสู่ระบบล้มเหลว: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-slate-100 shadow-md">
        
        {/* Title */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
            <Home className="h-7 w-7" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 truncate">
            {apartmentName || 'พอร์ทัลผู้เช่าพัก'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            เข้าสู่ระบบผู้เช่าเพื่อเรียกดูบิลและส่งสลิปชำระเงิน
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start space-x-2 p-4 rounded-xl text-xs bg-red-50 text-red-700 border border-red-100">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loader while fetching rooms list */}
        {loadingRooms ? (
          <div className="flex justify-center items-center py-10">
            <div className="h-8 w-8 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin-custom"></div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleTenantLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="room-select" className="block text-sm font-semibold text-slate-700 mb-1">
                  เลือกห้องพักเช่าของคุณ *
                </label>
                <select
                  id="room-select"
                  required
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-green-600 focus:outline-none text-sm bg-white font-semibold"
                >
                  <option value="">-- เลือกหมายเลขห้องพัก --</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      ห้อง {room.name} (ชั้น {room.floor})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="id-card-input" className="block text-sm font-semibold text-slate-700 mb-1">
                  เลขบัตรประจำตัวประชาชน *
                </label>
                <input
                  id="id-card-input"
                  type="text"
                  required
                  placeholder="กรอกเลขบัตรเพื่อความปลอดภัย"
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-green-600 focus:outline-none sm:text-sm font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !roomId}
              className="group relative flex w-full justify-center rounded-xl bg-green-600 px-3 py-3 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin-custom"></div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <span>เข้าสู่ระบบพอร์ทัล</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-xs text-slate-400 hover:text-green-600 transition-colors"
          >
            ← กลับไปหน้าแรก
          </button>
        </div>
      </div>
    </div>
  );
}
