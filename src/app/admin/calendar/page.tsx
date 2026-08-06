'use client';

import { useEffect, useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  X,
  Clock,
  Pin
} from 'lucide-react';
import { DBService } from '@/services/dbService';
import { Formatters } from '@/services/formatters';

export default function AdminCalendar() {
  const [state, setState] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formCategory, setFormCategory] = useState('check_in');
  const [formRoom, setFormRoom] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const currentState = DBService.getState();
    setState(currentState);
    setEvents(currentState.events || []);
  };

  const handleOpenCreateModal = () => {
    setFormTitle('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormCategory('check_in');
    setFormRoom('');
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) {
      alert('กรุณากรอกหัวข้อกิจกรรมและเลือกวันแจ้งเตือน');
      return;
    }

    const newEvent = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: formTitle.trim(),
      date: formDate,
      category: formCategory,
      roomName: formRoom.trim()
    };

    const updated = [newEvent, ...events].sort((a, b) => a.date.localeCompare(b.date));
    const nextState = { ...state, events: updated };
    
    setState(nextState);
    setEvents(updated);
    setIsModalOpen(false);

    // Save and Sync
    await DBService.saveState(nextState);
    loadData();
    alert('บันทึกกิจกรรมแจ้งเตือนสำเร็จ!');
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (confirm(`คุณต้องการลบกิจกรรม "${title}" ใช่หรือไม่?`)) {
      const updated = events.filter(e => e.id !== id);
      const nextState = { ...state, events: updated };
      
      setState(nextState);
      setEvents(updated);

      // Save and Sync
      await DBService.saveState(nextState);
      loadData();
    }
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      check_in: 'bg-green-100 text-green-700',
      check_out: 'bg-red-100 text-red-700',
      maintenance: 'bg-blue-100 text-blue-700',
      other: 'bg-slate-100 text-slate-700'
    };
    return colors[cat] || 'bg-slate-100 text-slate-700';
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      check_in: 'เช็คอินผู้เช่า',
      check_out: 'เช็คเอาท์/ออก',
      maintenance: 'นัดหมายซ่อม',
      other: 'กิจกรรมอื่นๆ'
    };
    return labels[cat] || cat;
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
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400">ปฏิทินบันทึกกำหนดงานและแจ้งเตือน</p>
          <h2 className="text-xl font-bold text-slate-800 mt-0.5">จัดการกิจกรรมแจ้งเตือน</h2>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center space-x-1.5 px-4 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>เพิ่มกิจกรรมแจ้งเตือนใหม่</span>
        </button>
      </div>

      {/* Events List display */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CalendarIcon className="h-14 w-14 text-slate-200 stroke-1 mb-3" />
            <h4 className="font-bold text-slate-500 text-sm">ยังไม่มีกิจกรรมกำหนดวัน</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              ระบบจะแสดงการแจ้งเตือนต่างๆ เช่น การย้ายเข้า/ย้ายออกของห้อง หรือกำหนดนัดซ่อมแซมตรงนี้
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((evt) => (
              <div 
                key={evt.id} 
                className="flex items-start justify-between p-4 border border-slate-100 bg-slate-50/50 rounded-xl hover:border-slate-200 transition-colors shadow-xs"
              >
                <div className="space-y-1.5 min-w-0 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${getCategoryColor(evt.category)}`}>
                      {getCategoryLabel(evt.category)}
                    </span>
                    {evt.roomName && (
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 border border-slate-200/60 rounded">
                        ห้อง {evt.roomName}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="font-bold text-slate-800 text-sm leading-snug">{evt.title}</h4>
                  
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    <span>กำหนดการ: {Formatters.thaiDate(evt.date)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteEvent(evt.id, evt.title)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 transition-colors"
                  title="ลบกิจกรรม"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">เพิ่มกิจกรรมใหม่</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  หัวข้อแจ้งเตือน / เรื่องกิจกรรม *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณดารินทร์ นัดตรวจห้องพัก"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    วันที่กำหนด *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:outline-none text-sm bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    เลขอ้างอิงห้องพัก
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 101, 203"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  ประเภทนัดหมาย
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none text-sm bg-white font-semibold"
                >
                  <option value="check_in">เช็คอินผู้เช่าใหม่ (Check-in)</option>
                  <option value="check_out">ผู้เช่าย้ายออก (Check-out)</option>
                  <option value="maintenance">กำหนดงานซ่อม (Maintenance)</option>
                  <option value="other">เรื่องพิเศษอื่นๆ (Other)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-xs"
                >
                  บันทึกนัดหมาย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
