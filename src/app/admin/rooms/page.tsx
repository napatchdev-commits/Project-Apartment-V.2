'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Bed, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { DBService } from '@/services/dbService';
import { Formatters } from '@/services/formatters';

export default function AdminRooms() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [state, setState] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formFloor, setFormFloor] = useState(1);
  const [formTypeId, setFormTypeId] = useState('');
  const [formBaseRent, setFormBaseRent] = useState('');
  const [formStatus, setFormStatus] = useState('vacant');
  const [formLastWater, setFormLastWater] = useState('0');
  const [formLastElec, setFormLastElec] = useState('0');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const currentState = DBService.getState();
    setState(currentState);
    setRooms(currentState.rooms || []);
    const types = currentState.roomTypes || [];
    setRoomTypes(types);
    if (types.length > 0) {
      setFormTypeId(types[0].id);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingRoomId(null);
    setFormName('');
    setFormFloor(1);
    if (roomTypes.length > 0) {
      setFormTypeId(roomTypes[0].id);
      setFormBaseRent(roomTypes[0].defaultRent?.toString() || '');
    } else {
      setFormTypeId('');
      setFormBaseRent('');
    }
    setFormStatus('vacant');
    setFormLastWater('0');
    setFormLastElec('0');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (room: any) => {
    setModalMode('edit');
    setEditingRoomId(room.id);
    setFormName(room.name || '');
    setFormFloor(room.floor || 1);
    setFormTypeId(room.typeId || '');
    setFormBaseRent(room.baseRent?.toString() || '');
    setFormStatus(room.status || 'vacant');
    setFormLastWater(room.lastWaterMeter?.toString() || '0');
    setFormLastElec(room.lastElecMeter?.toString() || '0');
    setIsModalOpen(true);
  };

  const handleTypeChange = (typeId: string) => {
    setFormTypeId(typeId);
    const selectedType = roomTypes.find(t => t.id === typeId);
    if (selectedType) {
      setFormBaseRent(selectedType.defaultRent?.toString() || '');
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('กรุณากรอกชื่อห้องพัก');
      return;
    }

    const rentVal = Number(formBaseRent) || 0;
    const waterVal = Number(formLastWater) || 0;
    const elecVal = Number(formLastElec) || 0;

    const updatedRooms = [...rooms];

    if (modalMode === 'create') {
      const newRoom = {
        id: 'rm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: formName.trim(),
        floor: Number(formFloor) || 1,
        typeId: formTypeId,
        baseRent: rentVal,
        status: formStatus,
        currentTenantId: '',
        currentTenantName: '',
        lastWaterMeter: waterVal,
        lastElecMeter: elecVal,
        trashFee: null,
        internetFee: null,
        commonFee: null
      };
      updatedRooms.push(newRoom);
    } else {
      const idx = updatedRooms.findIndex(r => r.id === editingRoomId);
      if (idx !== -1) {
        updatedRooms[idx] = {
          ...updatedRooms[idx],
          name: formName.trim(),
          floor: Number(formFloor) || 1,
          typeId: formTypeId,
          baseRent: rentVal,
          status: formStatus,
          lastWaterMeter: waterVal,
          lastElecMeter: elecVal
        };
      }
    }

    const nextState = { ...state, rooms: updatedRooms };
    setState(nextState);
    setRooms(updatedRooms);
    setIsModalOpen(false);

    // Save and Sync to Supabase
    await DBService.saveState(nextState);
    loadData();
  };

  const handleDeleteRoom = async (id: string, name: string) => {
    if (confirm(`คุณต้องการลบห้อง "${name}" ใช่หรือไม่? การลบห้องอาจจะกระทบกับสัญญาเช่าที่ผูกกับห้องนี้`)) {
      const updated = rooms.filter(r => r.id !== id);
      const nextState = { ...state, rooms: updated };
      setState(nextState);
      setRooms(updated);

      // Save and Sync to Supabase
      await DBService.saveState(nextState);
      loadData();
    }
  };

  // Filters calculation
  const uniqueFloors = Array.from(new Set(rooms.map(r => r.floor || 1))).sort((a, b) => a - b);
  
  const filteredRooms = rooms
    .filter(room => {
      const matchSearch = String(room.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || room.status === statusFilter;
      const matchFloor = floorFilter === 'all' || room.floor?.toString() === floorFilter;
      return matchSearch && matchStatus && matchFloor;
    })
    .sort(DBService.compareRooms);

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
          <p className="text-xs font-semibold text-slate-400">ภาพรวมสิ่งอำนวยความสะดวก</p>
          <h2 className="text-xl font-bold text-slate-800 mt-0.5">จัดการทะเบียนห้องพัก</h2>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center space-x-1.5 px-4 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>เพิ่มห้องพักใหม่</span>
        </button>
      </div>

      {/* Control panel (Filters + Search) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อห้อง/เลขห้อง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
          />
        </div>
        {/* Filter status */}
        <div className="relative shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none block w-full md:w-44 rounded-xl border border-slate-200 pl-4 pr-10 py-2 text-slate-700 focus:border-green-600 focus:outline-none text-sm bg-white"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="vacant">ห้องว่าง</option>
            <option value="occupied">มีคนเช่า</option>
            <option value="reserved">จองแล้ว</option>
          </select>
          <ChevronDown className="absolute right-3.5 top-3 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
        </div>
        {/* Filter floor */}
        <div className="relative shrink-0">
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="appearance-none block w-full md:w-40 rounded-xl border border-slate-200 pl-4 pr-10 py-2 text-slate-700 focus:border-green-600 focus:outline-none text-sm bg-white"
          >
            <option value="all">ชั้นทั้งหมด</option>
            {uniqueFloors.map(floor => (
              <option key={floor} value={floor.toString()}>ชั้น {floor}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 top-3 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Rooms Table List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bed className="h-14 w-14 text-slate-200 stroke-1 mb-3" />
            <h4 className="font-bold text-slate-500 text-sm">ยังไม่มีข้อมูลห้องเช่า</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              ยังไม่มีประวัติบันทึกห้องพักที่ตรงกับเงื่อนไขการค้นหาในระบบ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <th className="px-6 py-4">ห้องพัก</th>
                  <th className="px-6 py-4">ชั้น</th>
                  <th className="px-6 py-4">ประเภทห้อง</th>
                  <th className="px-6 py-4 text-right">ค่าเช่าหลัก</th>
                  <th className="px-6 py-4">สถานะ</th>
                  <th className="px-6 py-4">ผู้เช่าปัจจุบัน</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filteredRooms.map((room) => {
                  const type = roomTypes.find(t => t.id === room.typeId);
                  const isHighlighted = highlightId === room.id;

                  return (
                    <tr 
                      key={room.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isHighlighted ? 'bg-green-50/30 font-bold' : ''
                      }`}
                    >
                      <td className="px-6 py-4.5 text-slate-900 font-bold">ห้อง {room.name}</td>
                      <td className="px-6 py-4.5 text-slate-500">ชั้น {room.floor}</td>
                      <td className="px-6 py-4.5 text-slate-800">
                        {type ? type.name : <span className="text-slate-400 font-normal">(ไม่ได้ผูกประเภท)</span>}
                      </td>
                      <td className="px-6 py-4.5 text-slate-900 text-right font-extrabold">
                        {Formatters.currency(room.baseRent)}
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          room.status === 'occupied' 
                            ? 'bg-green-100 text-green-700' 
                            : room.status === 'reserved'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {room.status === 'occupied' ? 'มีคนเช่า' : room.status === 'reserved' ? 'จองแล้ว' : 'ห้องว่าง'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        {room.currentTenantName ? (
                          <span className="text-slate-800">{room.currentTenantName}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(room)}
                          className="inline-flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                          title="แก้ไขข้อมูลห้อง"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id, room.name)}
                          className="inline-flex p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="ลบห้องพัก"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">
                {modalMode === 'create' ? 'เพิ่มห้องพักห้องใหม่' : 'แก้ไขข้อมูลห้องพัก'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  ชื่อห้องพัก / เลขห้องพัก *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 101, 204, A1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    ชั้นที่พัก
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formFloor}
                    onChange={(e) => setFormFloor(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    สถานะห้องพัก
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:border-green-600 focus:outline-none text-sm bg-white"
                  >
                    <option value="vacant">ห้องว่าง</option>
                    <option value="occupied">มีคนเช่า</option>
                    <option value="reserved">จองแล้ว</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  ประเภทห้องเช่า
                </label>
                <select
                  value={formTypeId}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:border-green-600 focus:outline-none text-sm bg-white"
                >
                  {roomTypes.length === 0 ? (
                    <option value="">ไม่มีข้อมูลประเภทห้อง</option>
                  ) : (
                    roomTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  อัตราค่าเช่ารายเดือน (บาท) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="สอดคล้องตามประเภทห้อง"
                  value={formBaseRent}
                  onChange={(e) => setFormBaseRent(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    เลขจดมิเตอร์น้ำล่าสุด
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formLastWater}
                    onChange={(e) => setFormLastWater(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    เลขจดมิเตอร์ไฟล่าสุด
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formLastElec}
                    onChange={(e) => setFormLastElec(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
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
                  {modalMode === 'create' ? 'เพิ่มห้อง' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
