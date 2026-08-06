'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Zap, 
  Droplets, 
  Check, 
  Lock, 
  ArrowLeft,
  Building,
  KeyRound,
  User,
  ShieldAlert,
  ClipboardList
} from 'lucide-react';
import { DBService } from '@/services/dbService';
import { AuthService } from '@/services/authService';

export default function MobileMeterEntry() {
  const router = useRouter();
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // App state
  const [state, setState] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [meterRecords, setMeterRecords] = useState<Record<string, { waterCurr: string; elecCurr: string }>>({});
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null);
  const [apartmentName, setApartmentName] = useState('');

  useEffect(() => {
    // 1. Check if logged in
    const loggedUser = AuthService.getLoggedInUser();
    if (loggedUser) {
      setUser(loggedUser);
      loadRoomsData();
    }
  }, []);

  const loadRoomsData = () => {
    const currentState = DBService.getState();
    setState(currentState);
    setApartmentName(currentState.settings?.apartmentName || 'ระบบจัดการหอพัก');
    
    const occupied = (currentState.rooms || []).filter((r: any) => r.status === 'occupied');
    setRooms(occupied);

    const records: Record<string, { waterCurr: string; elecCurr: string }> = {};
    occupied.forEach((room: any) => {
      records[room.id] = {
        waterCurr: room.tempWaterMeter?.toString() || '',
        elecCurr: room.tempElecMeter?.toString() || ''
      };
    });
    setMeterRecords(records);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const activeState = DBService.getState();
    const users = activeState.users || [];
    const matched = users.find((u: any) => u.username === username.trim());

    if (!matched) {
      setLoginError('ไม่พบชื่อผู้ใช้งานนี้ในระบบ');
      return;
    }

    const inputHash = await AuthService.sha256(password.trim());
    if (matched.passwordHash === inputHash) {
      const sessionUser = {
        id: matched.id,
        username: matched.username,
        displayName: matched.displayName,
        role: matched.role
      };
      AuthService.setLoggedInUser(sessionUser);
      setUser(sessionUser);
      loadRoomsData();
    } else {
      setLoginError('รหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleInputChange = (roomId: string, field: 'waterCurr' | 'elecCurr', val: string) => {
    setMeterRecords(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [field]: val
      }
    }));
  };

  const handleSaveSingleRoomMeter = async (room: any) => {
    const rec = meterRecords[room.id];
    if (!rec || !rec.waterCurr || !rec.elecCurr) {
      alert('กรุณากรอกเลขมิเตอร์น้ำและไฟให้ครบถ้วน');
      return;
    }

    const waterCurr = Number(rec.waterCurr);
    const elecCurr = Number(rec.elecCurr);
    const waterPrev = room.lastWaterMeter || 0;
    const elecPrev = room.lastElecMeter || 0;

    if (waterCurr < waterPrev) {
      if (!confirm(`เลขมิเตอร์น้ำใหม่ (${waterCurr}) น้อยกว่ามิเตอร์เดิม (${waterPrev}) คุณยืนยันป้อนข้อมูลนี้ใช่หรือไม่?`)) return;
    }
    if (elecCurr < elecPrev) {
      if (!confirm(`เลขมิเตอร์ไฟใหม่ (${elecCurr}) น้อยกว่ามิเตอร์เดิม (${elecPrev}) คุณยืนยันป้อนข้อมูลนี้ใช่หรือไม่?`)) return;
    }

    setSavingRoomId(room.id);
    
    // Update local and database state
    const updatedRooms = state.rooms.map((r: any) => {
      if (r.id === room.id) {
        return {
          ...r,
          tempWaterMeter: waterCurr,
          tempElecMeter: elecCurr
        };
      }
      return r;
    });

    const nextState = { ...state, rooms: updatedRooms };
    setState(nextState);
    
    try {
      await DBService.saveState(nextState, true); // Sync temp logs
      alert(`บันทึกมิเตอร์ห้อง ${room.name} สำเร็จ!`);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อเซฟ: ' + err.message);
    } finally {
      setSavingRoomId(null);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
  };

  // If not logged in as Admin or Staff, show a mobile-optimized login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-md">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-800">จดมิเตอร์สำหรับผู้ดูแล</h2>
            <p className="text-xs text-slate-400 mt-1">ล็อกอินเพื่อจดข้อมูลน้ำ-ไฟจากหน้ามิเตอร์จริง</p>
          </div>

          {loginError && (
            <div className="flex items-center space-x-1.5 p-3 rounded-lg text-xs bg-red-50 text-red-700">
              <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="mobile-user" className="block text-xs font-bold text-slate-600 mb-1">ชื่อผู้ใช้งาน</label>
              <input
                id="mobile-user"
                type="text"
                required
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none text-xs font-semibold"
              />
            </div>
            <div>
              <label htmlFor="mobile-pass" className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่าน</label>
              <input
                id="mobile-pass"
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none text-xs font-semibold"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-xs font-bold text-white rounded-xl shadow-xs transition-colors"
            >
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Mobile Topbar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => router.push('/admin')}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <span className="font-extrabold text-slate-800 text-sm leading-tight">{apartmentName}</span>
            <span className="text-[10px] text-green-600 font-bold">บันทึกมิเตอร์มือถือ</span>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
        >
          ออก
        </button>
      </header>

      {/* Main Form list */}
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        {rooms.length === 0 ? (
          <div className="bg-white p-8 border border-slate-200 rounded-2xl shadow-xs text-center py-16">
            <ClipboardList className="h-12 w-12 text-slate-200 stroke-1 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-semibold">ไม่มีห้องพักมีผู้เช่าในขณะนี้</p>
          </div>
        ) : (
          rooms.sort(DBService.compareRooms).map((room) => {
            const rec = meterRecords[room.id] || { waterCurr: '', elecCurr: '' };
            const isSaving = savingRoomId === room.id;

            return (
              <div 
                key={room.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
              >
                {/* Room title & tenant info */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-slate-800 text-base">ห้อง {room.name}</span>
                  <span className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">{room.currentTenantName}</span>
                </div>

                {/* Entry grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Water meter entry */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-slate-400 font-bold text-[10px]">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      <span>น้ำเดิม: {room.lastWaterMeter || 0}</span>
                    </div>
                    <input
                      type="number"
                      placeholder="ป้อนเลขอ่านใหม่"
                      value={rec.waterCurr}
                      onChange={(e) => handleInputChange(room.id, 'waterCurr', e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Elec meter entry */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-slate-400 font-bold text-[10px]">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span>ไฟเดิม: {room.lastElecMeter || 0}</span>
                    </div>
                    <input
                      type="number"
                      placeholder="ป้อนเลขอ่านใหม่"
                      value={rec.elecCurr}
                      onChange={(e) => handleInputChange(room.id, 'elecCurr', e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Save button for this room */}
                <button
                  onClick={() => handleSaveSingleRoomMeter(room)}
                  disabled={isSaving}
                  className="w-full py-2 bg-green-50 hover:bg-green-100 border border-green-100 text-green-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-1 transition-all"
                >
                  {isSaving ? (
                    <div className="h-4 w-4 border-2 border-slate-400 border-t-green-600 rounded-full animate-spin-custom"></div>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>บันทึกน้ำ-ไฟห้องนี้</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
