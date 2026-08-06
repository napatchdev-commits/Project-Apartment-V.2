'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldAlert, CheckCircle2, User } from 'lucide-react';
import { AuthService } from '@/services/authService';
import { DBService } from '@/services/dbService';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    // Load state which has users list
    const currentState = DBService.getState();
    setState(currentState);

    // If already logged in, redirect to admin
    const user = AuthService.getLoggedInUser();
    if (user) {
      router.push('/admin');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      setLoading(false);
      return;
    }

    try {
      const activeState = state || DBService.getState();
      const users = activeState.users || [];
      const user = users.find((u: any) => u.username === username.trim());

      if (!user) {
        setError('ไม่พบชื่อผู้ใช้งานนี้ในระบบ');
        setLoading(false);
        return;
      }

      const inputHash = await AuthService.sha256(password.trim());
      if (user.passwordHash === inputHash) {
        // Success
        setSuccess(true);
        AuthService.setLoggedInUser({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role
        });

        setTimeout(() => {
          router.push('/admin');
        }, 1000);
      } else {
        setError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        setLoading(false);
      }
    } catch (err: any) {
      setError('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-slate-100 shadow-md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
            <KeyRound className="h-7 w-7" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            เข้าสู่ระบบผู้ดูแล
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            ระบบจัดการห้องเช่าและหอพักสำหรับแอดมิน
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username-input" className="block text-sm font-semibold text-slate-700 mb-1">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  id="username-input"
                  type="text"
                  required
                  placeholder="เช่น superadmin, admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-green-600 focus:outline-none sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password-input" className="block text-sm font-semibold text-slate-700 mb-1">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <KeyRound className="h-4.5 w-4.5" />
                </div>
                <input
                  id="password-input"
                  type="password"
                  required
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-slate-950 placeholder-slate-400 focus:border-green-600 focus:outline-none sm:text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3.5 rounded-xl text-sm bg-red-50 text-red-700 border border-red-100 animate-pulse">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3.5 rounded-xl text-sm bg-green-50 text-green-700 border border-green-100">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>เข้าสู่ระบบสำเร็จ กำลังนำทางไปแผงควบคุม...</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="group relative flex w-full justify-center rounded-xl bg-green-600 px-3 py-3 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none transition-all duration-200 disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin-custom"></div>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
        </form>

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
