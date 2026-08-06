'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  BedDouble, 
  Users, 
  Receipt, 
  Wrench, 
  BookOpen, 
  FileCheck2, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  User,
  Calendar,
  Layers
} from 'lucide-react';
import { AuthService } from '@/services/authService';
import { DBService } from '@/services/dbService';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [apartmentName, setApartmentName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check Supabase credentials
    const url = DBService.getSavedSupabaseUrl();
    const key = DBService.getSavedApiKey();
    if (!url || !key) {
      router.push('/');
      return;
    }

    // 2. Check Auth
    const loggedUser = AuthService.getLoggedInUser();
    if (!loggedUser) {
      router.push('/login');
      return;
    }
    setUser(loggedUser);

    // 3. Load apartment name from settings state
    try {
      const state = DBService.getState();
      if (state && state.settings) {
        setApartmentName(state.settings.apartmentName || '');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      AuthService.logout();
      router.push('/login');
    }
  };

  const navItems = [
    { name: 'แดชบอร์ด', path: '/admin', icon: LayoutDashboard },
    { name: 'จัดการห้องพัก', path: '/admin/rooms', icon: BedDouble },
    { name: 'ประเภทห้องพัก', path: '/admin/room-types', icon: Layers },
    { name: 'ข้อมูลผู้เช่า', path: '/admin/tenants', icon: Users },
    { name: 'บันทึกมิเตอร์ & ออกบิล', path: '/admin/billing', icon: Receipt },
    { name: 'แจ้งซ่อมแซม', path: '/admin/repairs', icon: Wrench },
    { name: 'บัญชีรายรับ-รายจ่าย', path: '/admin/ledger', icon: BookOpen },
    { name: 'ยืนยันสลิปเงินโอน', path: '/admin/slip-verification', icon: FileCheck2 },
    { name: 'ตารางกิจกรรม', path: '/admin/calendar', icon: Calendar },
    { name: 'ตั้งค่าระบบ', path: '/admin/settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 border-4 border-slate-200 border-t-green-600 rounded-full animate-spin-custom"></div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-lg leading-tight truncate max-w-[180px]">
            {apartmentName || 'ยังไม่ได้ตั้งชื่อหอพัก'}
          </span>
          <span className="text-xs font-semibold text-green-600 mt-0.5">ระบบผู้ดูแล (Admin)</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(false)}
          className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive 
                  ? 'bg-green-50 text-green-700 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-green-600' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center space-x-3 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
            <User className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.displayName || 'Admin'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.role === 'super_admin' ? 'ผู้ดูแลสูงสุด' : 'ผู้ดูแล'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="ออกจากระบบ"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar (Left side, permanent) */}
      <div className="hidden md:flex md:w-64 md:shrink-0 h-full">
        <SidebarContent />
      </div>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar panel */}
          <div className="relative flex w-64 max-w-xs flex-col bg-white animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Right Column (Header + Content) */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header Topbar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-bold text-slate-800 text-lg md:text-xl">
              {navItems.find(item => item.path === pathname)?.name || 'ผู้ดูแลระบบ'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-700">{user?.displayName}</span>
              <span className="text-[10px] text-slate-400">{user?.role === 'super_admin' ? 'Super Administrator' : 'Administrator'}</span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable Subpage Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
