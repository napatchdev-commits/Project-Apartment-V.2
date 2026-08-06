'use client';

import { useEffect, useState } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  X,
  Calculator
} from 'lucide-react';
import { DBService } from '@/services/dbService';
import { Formatters } from '@/services/formatters';

export default function AdminRoomTypes() {
  const [state, setState] = useState<any>(null);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formRent, setFormRent] = useState('');
  const [formDesc, setFormDesc] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const currentState = DBService.getState();
    setState(currentState);
    setRoomTypes(currentState.roomTypes || []);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingTypeId(null);
    setFormName('');
    setFormRent('');
    setFormDesc('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (type: any) => {
    setModalMode('edit');
    setEditingTypeId(type.id);
    setFormName(type.name || '');
    setFormRent(type.defaultRent?.toString() || '');
    setFormDesc(type.description || '');
    setIsModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('กรุณากรอกชื่อประเภทห้องพัก');
      return;
    }

    const rentVal = Number(formRent) || 0;
    const updatedTypes = [...roomTypes];

    if (modalMode === 'create') {
      const newType = {
        id: 'rt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: formName.trim(),
        defaultRent: rentVal,
        description: formDesc.trim(),
        rentalType: 'monthly'
      };
      updatedTypes.push(newType);
    } else {
      const idx = updatedTypes.findIndex(t => t.id === editingTypeId);
      if (idx !== -1) {
        updatedTypes[idx] = {
          ...updatedTypes[idx],
          name: formName.trim(),
          defaultRent: rentVal,
          description: formDesc.trim()
        };
      }
    }

    const nextState = { ...state, roomTypes: updatedTypes };
    setState(nextState);
    setRoomTypes(updatedTypes);
    setIsModalOpen(false);

    // Save and Sync to Supabase
    await DBService.saveState(nextState);
    loadData();
  };

  const handleDeleteType = async (id: string, name: string) => {
    if (confirm(`คุณต้องการลบประเภทห้อง "${name}" ใช่หรือไม่? ห้องพักที่ใช้ประเภทนี้จะไม่มีข้อมูลประเภทผูกมัด`)) {
      const updated = roomTypes.filter(t => t.id !== id);
      const nextState = { ...state, roomTypes: updated };
      setState(nextState);
      setRoomTypes(updated);

      // Save and Sync
      await DBService.saveState(nextState);
      loadData();
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
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400">การแบ่งกลุ่มและกำหนดราคาพื้นฐาน</p>
          <h2 className="text-xl font-bold text-slate-800 mt-0.5">จัดการประเภทห้องพัก</h2>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center space-x-1.5 px-4 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>เพิ่มประเภทห้องพักใหม่</span>
        </button>
      </div>

      {/* Room Types Grid Card */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roomTypes.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
            <Layers className="h-12 w-12 text-slate-200 stroke-1 mb-3" />
            <h4 className="font-bold text-slate-500 text-sm">ยังไม่มีประเภทห้องพัก</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              กรุณาเพิ่มประเภทห้องเพื่อแบ่งกลุ่มห้องเช่าและจัดตั้งเรทราคาเริ่มต้น
            </p>
          </div>
        ) : (
          roomTypes.map((type) => (
            <div 
              key={type.id} 
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800 text-base">{type.name}</h3>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleOpenEditModal(type)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="แก้ไขประเภทห้อง"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteType(type.id, type.name)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="ลบประเภทห้อง"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 min-h-[40px] leading-relaxed">
                  {type.description || 'ไม่มีคำอธิบายรายละเอียด'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <Calculator className="h-4 w-4" />
                  <span className="text-[10px] font-bold">อัตราค่าเช่ามาตรฐาน</span>
                </div>
                <span className="font-extrabold text-green-600 text-lg">
                  {Formatters.currency(type.defaultRent)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">
                {modalMode === 'create' ? 'เพิ่มประเภทห้องพักใหม่' : 'แก้ไขประเภทห้องพัก'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveType} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  ชื่อประเภทห้องพัก *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ห้องพัดลมพิเศษ, ห้องสูทแอร์คอน"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  ค่าเช่าห้องพักมาตรฐานต่อเดือน (บาท) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="ระบุค่าเช่า เช่น 3000, 4500"
                  value={formRent}
                  onChange={(e) => setFormRent(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  คำอธิบายรายละเอียด
                </label>
                <textarea
                  placeholder="เช่น สิทธิพิเศษระเบียงกว้างพิเศษ เตียงนอน 6 ฟุต..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm resize-none"
                />
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
                  {modalMode === 'create' ? 'เพิ่มประเภท' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
