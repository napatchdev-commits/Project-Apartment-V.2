'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  FileText, 
  FilePlus2, 
  ShieldAlert, 
  ArrowUpRight,
  TrendingDown,
  Upload,
  CalendarDays,
  Coins
} from 'lucide-react';
import { DBService } from '@/services/dbService';
import { Formatters } from '@/services/formatters';

export default function AdminTenants() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');

  const [state, setState] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  // Nested Features Modals
  const [selectedTenantForDocs, setSelectedTenantForDocs] = useState<any | null>(null);
  const [selectedTenantForDeductions, setSelectedTenantForDeductions] = useState<any | null>(null);
  const [selectedTenantForContract, setSelectedTenantForContract] = useState<any | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formIdCard, setFormIdCard] = useState('');
  const [formTel, setFormTel] = useState('');
  const [formLineId, setFormLineId] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formRoomId, setFormRoomId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDeposit, setFormDeposit] = useState('');
  const [formDepositStatus, setFormDepositStatus] = useState('active');
  const [formWitness1, setFormWitness1] = useState('');
  const [formWitness2, setFormWitness2] = useState('');

  // Doc Form
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docCategory, setDocCategory] = useState('id_card');
  const [docTitle, setDocTitle] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Deduction Form
  const [deductDesc, setDeductDesc] = useState('');
  const [deductAmt, setDeductAmt] = useState('');
  const [deductDate, setDeductDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (actionParam === 'new' && state) {
      handleOpenCreateModal();
    }
  }, [actionParam, state]);

  const loadData = () => {
    const currentState = DBService.getState();
    setState(currentState);
    setTenants(currentState.tenants || []);
    setRooms(currentState.rooms || []);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingTenantId(null);
    setFormName('');
    setFormIdCard('');
    setFormTel('');
    setFormLineId('');
    setFormEmail('');
    setFormAddress('');
    setFormRoomId('');
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormEndDate('');
    setFormDeposit('');
    setFormDepositStatus('active');
    setFormWitness1('');
    setFormWitness2('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tenant: any) => {
    setModalMode('edit');
    setEditingTenantId(tenant.id);
    setFormName(tenant.name || '');
    setFormIdCard(tenant.idCard || '');
    setFormTel(tenant.tel || '');
    setFormLineId(tenant.lineId || '');
    setFormEmail(tenant.email || '');
    setFormAddress(tenant.address || '');
    setFormRoomId(tenant.assignedRoomId || '');
    setFormStartDate(tenant.startDate || '');
    setFormEndDate(tenant.endDate || '');
    setFormDeposit(tenant.depositAmount?.toString() || '');
    setFormDepositStatus(tenant.depositStatus || 'active');
    setFormWitness1(tenant.witness1 || '');
    setFormWitness2(tenant.witness2 || '');
    setIsModalOpen(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('กรุณากรอกชื่อผู้เช่า');
      return;
    }

    const depositVal = Number(formDeposit) || 0;
    const tenantId = modalMode === 'create' 
      ? 'tn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
      : editingTenantId!;

    const updatedTenants = [...tenants];
    const newOrUpdatedTenant: any = {
      id: tenantId,
      name: formName.trim(),
      idCard: formIdCard.trim(),
      tel: formTel.trim(),
      lineId: formLineId.trim(),
      email: formEmail.trim(),
      address: formAddress.trim(),
      assignedRoomId: formRoomId || null,
      startDate: formStartDate || null,
      endDate: formEndDate || null,
      depositAmount: depositVal,
      depositStatus: formDepositStatus,
      witness1: formWitness1.trim(),
      witness2: formWitness2.trim(),
      documents: modalMode === 'edit' ? (tenants.find(t => t.id === tenantId)?.documents || []) : [],
      deposit: modalMode === 'edit' ? (tenants.find(t => t.id === tenantId)?.deposit || { initialBail: depositVal, status: formDepositStatus, deductions: [] }) : { initialBail: depositVal, status: formDepositStatus, deductions: [] }
    };

    // If check-in to a room, update the rooms state as well
    const updatedRooms = rooms.map(r => {
      // Free old room occupied by this tenant
      if (modalMode === 'edit' && r.currentTenantId === tenantId && r.id !== formRoomId) {
        return { ...r, status: 'vacant', currentTenantId: '', currentTenantName: '', entryDate: null };
      }
      // Occupy new room
      if (formRoomId && r.id === formRoomId) {
        return { ...r, status: 'occupied', currentTenantId: tenantId, currentTenantName: formName.trim(), entryDate: formStartDate };
      }
      return r;
    });

    if (modalMode === 'create') {
      updatedTenants.push(newOrUpdatedTenant);
    } else {
      const idx = updatedTenants.findIndex(t => t.id === tenantId);
      if (idx !== -1) {
        updatedTenants[idx] = newOrUpdatedTenant;
      }
    }

    const nextState = { ...state, tenants: updatedTenants, rooms: updatedRooms };
    setState(nextState);
    setTenants(updatedTenants);
    setRooms(updatedRooms);
    setIsModalOpen(false);

    // Save and Sync
    await DBService.saveState(nextState);
    loadData();
    
    // Clear URL params if added via link
    if (actionParam) {
      router.replace('/admin/tenants');
    }
  };

  const handleDeleteTenant = async (id: string, name: string, roomId: string) => {
    if (confirm(`คุณต้องการลบผู้เช่า "${name}" ใช่หรือไม่? ระบบจะทำการย้ายออกจากห้องพักโดยอัตโนมัติ`)) {
      const updatedTenants = tenants.filter(t => t.id !== id);
      const updatedRooms = rooms.map(r => {
        if (r.currentTenantId === id) {
          return { ...r, status: 'vacant', currentTenantId: '', currentTenantName: '', entryDate: null };
        }
        return r;
      });

      const nextState = { ...state, tenants: updatedTenants, rooms: updatedRooms };
      setState(nextState);
      setTenants(updatedTenants);
      setRooms(updatedRooms);

      // Save and Sync
      await DBService.saveState(nextState);
      loadData();
    }
  };

  // Upload Document
  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTenantForDocs) return;

    setUploadingDoc(true);
    try {
      // Upload to Supabase Storage
      const fileUrl = await DBService.uploadFileToStorage(file, `tenants/${selectedTenantForDocs.id}`);
      if (!fileUrl) throw new Error('อัปโหลดไฟล์ล้มเหลว');

      const newDoc = {
        id: 'doc_' + Date.now(),
        tenantId: selectedTenantForDocs.id,
        category: docCategory,
        title: docTitle.trim() || file.name,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        dataUrl: fileUrl,
        uploadDate: new Date().toISOString().slice(0, 10)
      };

      const updatedTenants = tenants.map(t => {
        if (t.id === selectedTenantForDocs.id) {
          return {
            ...t,
            documents: [...(t.documents || []), newDoc]
          };
        }
        return t;
      });

      const nextState = { ...state, tenants: updatedTenants };
      setState(nextState);
      setTenants(updatedTenants);
      
      // Update local selection
      const updatedSelect = updatedTenants.find(t => t.id === selectedTenantForDocs.id);
      setSelectedTenantForDocs(updatedSelect);

      // Reset Form
      setDocTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Save and Sync
      await DBService.saveState(nextState);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดเอกสาร: ' + err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!selectedTenantForDocs || !confirm('คุณต้องการลบเอกสารนี้ใช่หรือไม่?')) return;

    const updatedTenants = tenants.map(t => {
      if (t.id === selectedTenantForDocs.id) {
        return {
          ...t,
          documents: (t.documents || []).filter((d: any) => d.id !== docId)
        };
      }
      return t;
    });

    const nextState = { ...state, tenants: updatedTenants };
    setState(nextState);
    setTenants(updatedTenants);

    const updatedSelect = updatedTenants.find(t => t.id === selectedTenantForDocs.id);
    setSelectedTenantForDocs(updatedSelect);

    // Save and Sync
    await DBService.saveState(nextState);
  };

  // Add Deposit Deduction
  const handleAddDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForDeductions || !deductDesc.trim() || !deductAmt) return;

    const amt = Number(deductAmt) || 0;
    const newDeduct = {
      id: 'ded_' + Date.now(),
      tenantId: selectedTenantForDeductions.id,
      description: deductDesc.trim(),
      amount: amt,
      date: deductDate || new Date().toISOString().slice(0, 10)
    };

    const updatedTenants = tenants.map(t => {
      if (t.id === selectedTenantForDeductions.id) {
        const deposit = t.deposit || { initialBail: t.depositAmount, status: t.depositStatus, deductions: [] };
        return {
          ...t,
          deposit: {
            ...deposit,
            deductions: [...(deposit.deductions || []), newDeduct]
          }
        };
      }
      return t;
    });

    const nextState = { ...state, tenants: updatedTenants };
    setState(nextState);
    setTenants(updatedTenants);

    const updatedSelect = updatedTenants.find(t => t.id === selectedTenantForDeductions.id);
    setSelectedTenantForDeductions(updatedSelect);

    // Reset Form
    setDeductDesc('');
    setDeductAmt('');
    setDeductDate('');

    // Save and Sync
    await DBService.saveState(nextState);
  };

  const handleDeleteDeduction = async (deductId: string) => {
    if (!selectedTenantForDeductions || !confirm('คุณต้องการลบรายการหักมัดจำนี้ใช่หรือไม่?')) return;

    const updatedTenants = tenants.map(t => {
      if (t.id === selectedTenantForDeductions.id) {
        const deposit = t.deposit;
        return {
          ...t,
          deposit: {
            ...deposit,
            deductions: (deposit.deductions || []).filter((d: any) => d.id !== deductId)
          }
        };
      }
      return t;
    });

    const nextState = { ...state, tenants: updatedTenants };
    setState(nextState);
    setTenants(updatedTenants);

    const updatedSelect = updatedTenants.find(t => t.id === selectedTenantForDeductions.id);
    setSelectedTenantForDeductions(updatedSelect);

    // Save and Sync
    await DBService.saveState(nextState);
  };

  // Filter vacant rooms (plus current tenant room if editing)
  const availableRooms = rooms.filter(r => {
    if (r.status === 'vacant') return true;
    if (modalMode === 'edit' && r.currentTenantId === editingTenantId) return true;
    return false;
  });

  const filteredTenants = tenants.filter(t => {
    const query = searchQuery.toLowerCase();
    const nameMatch = String(t.name || '').toLowerCase().includes(query);
    const roomMatch = rooms.find(r => r.id === t.assignedRoomId)?.name.toLowerCase().includes(query);
    const telMatch = String(t.tel || '').toLowerCase().includes(query);
    const idCardMatch = String(t.idCard || '').replace(/\D/g, '').includes(query);
    return nameMatch || roomMatch || telMatch || idCardMatch;
  });

  if (!state) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin-custom"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400">ระบบเข้าพัก สัญญาเช่า และเงินมัดจำ</p>
          <h2 className="text-xl font-bold text-slate-800 mt-0.5">จัดการทะเบียนผู้เช่า</h2>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center space-x-1.5 px-4 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>เพิ่มทะเบียนผู้เช่าใหม่</span>
        </button>
      </div>

      {/* Control bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้เช่า เลขห้อง เบอร์โทร เลขบัตรประชาชน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredTenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="h-14 w-14 text-slate-200 stroke-1 mb-3" />
            <h4 className="font-bold text-slate-500 text-sm">ยังไม่มีข้อมูลผู้เช่า</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              กรุณาเพิ่มผู้เช่าใหม่และทำรายการเช็คอินจัดสรรห้องพักเช่า
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <th className="px-6 py-4">ผู้เข้าพัก</th>
                  <th className="px-6 py-4">ห้องพัก</th>
                  <th className="px-6 py-4">เบอร์ติดต่อ</th>
                  <th className="px-6 py-4">ระยะเวลาสัญญาเช่า</th>
                  <th className="px-6 py-4 text-right">เงินมัดจำ</th>
                  <th className="px-6 py-4">เอกสาร</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filteredTenants.map((t) => {
                  const room = rooms.find(r => r.id === t.assignedRoomId);
                  const totalDeducts = t.deposit?.deductions?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) || 0;
                  const remainingBail = Math.max(0, (t.depositAmount || 0) - totalDeducts);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-bold">{t.name}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">บัตร: {Formatters.formatIdCard(t.idCard)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {room ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-extrabold border border-green-100">
                            ห้อง {room.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">ยังไม่ได้เข้าพัก</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{t.tel || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs text-slate-500 font-medium">
                          <span>เริ่ม: {Formatters.thaiDate(t.startDate)}</span>
                          <span>สิ้นสุด: {Formatters.thaiDate(t.endDate) || 'ไม่มีกำหนด'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col text-right">
                          <span className="font-extrabold text-slate-800">{Formatters.currency(t.depositAmount)}</span>
                          {totalDeducts > 0 && (
                            <span className="text-[10px] text-red-500 font-bold">หักแล้ว {Formatters.currency(totalDeducts)} (เหลือ {remainingBail})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedTenantForDocs(t)}
                          className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-800 font-bold bg-green-50 px-2.5 py-1 rounded-lg border border-green-100/50"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>({t.documents?.length || 0}) ใบ</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 shrink-0 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTenantForContract(t)}
                          className="inline-flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                          title="ทำสัญญาเช่า / พิมพ์สัญญา"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedTenantForDeductions(t)}
                          className="inline-flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                          title="หักค่ามัดจำ"
                        >
                          <Coins className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          className="inline-flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                          title="แก้ไขผู้เช่า"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTenant(t.id, t.name, t.assignedRoomId)}
                          className="inline-flex p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="ลบทะเบียน"
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

      {/* CREATE / EDIT TENANT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">
                {modalMode === 'create' ? 'เช็คอิน / เพิ่มผู้เช่าใหม่' : 'แก้ไขข้อมูลผู้เช่า'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <form onSubmit={handleSaveTenant} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    ชื่อ-นามสกุล ผู้เช่า *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คุณสุดดี ขยันเรียน"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    เลขบัตรประชาชน *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    placeholder="เลขบัตร 13 หลัก"
                    value={formIdCard}
                    onChange={(e) => setFormIdCard(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    เบอร์โทรศัพท์ติดต่อ *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="เช่น 089-xxxxxxx"
                    value={formTel}
                    onChange={(e) => setFormTel(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    LINE ID (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="@line_id"
                    value={formLineId}
                    onChange={(e) => setFormLineId(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    อีเมล (ถ้ามี)
                  </label>
                  <input
                    type="email"
                    placeholder="example@mail.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  ที่อยู่ตามสำเนาทะเบียนบ้าน (ผู้ให้เช่าอ้างอิง)
                </label>
                <textarea
                  placeholder="ระบุที่อยู่สำหรับการพิมพ์เอกสารสัญญาเช่า"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  rows={2}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:border-green-600 focus:outline-none text-sm resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    จัดสรรห้องพักเช่า
                  </label>
                  <select
                    value={formRoomId}
                    onChange={(e) => setFormRoomId(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:border-green-600 focus:outline-none text-sm bg-white"
                  >
                    <option value="">-- เลือกห้องเช่าว่าง --</option>
                    {availableRooms.map(r => (
                      <option key={r.id} value={r.id}>ห้อง {r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    วันเริ่มต้นสัญญา *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    วันสิ้นสุดสัญญา (ถ้ามี)
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    เงินประกัน/มัดจำแรกเข้า (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="มัดจำตั้งต้น"
                    value={formDeposit}
                    onChange={(e) => setFormDeposit(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    สถานะเงินมัดจำ
                  </label>
                  <select
                    value={formDepositStatus}
                    onChange={(e) => setFormDepositStatus(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:border-green-600 focus:outline-none text-sm bg-white"
                  >
                    <option value="active">มัดจำคงอยู่ (Active)</option>
                    <option value="returned">คืนเงินมัดจำแล้ว (Returned)</option>
                    <option value="confiscated">ยึดเงินมัดจำ (Confiscated)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    ชื่อพยานคนที่ 1 (สำหรับพิมพ์สัญญา)
                  </label>
                  <input
                    type="text"
                    placeholder="ชื่อพยาน 1"
                    value={formWitness1}
                    onChange={(e) => setFormWitness1(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    ชื่อพยานคนที่ 2 (สำหรับพิมพ์สัญญา)
                  </label>
                  <input
                    type="text"
                    placeholder="ชื่อพยาน 2"
                    value={formWitness2}
                    onChange={(e) => setFormWitness2(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:border-green-600 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-xs"
                >
                  {modalMode === 'create' ? 'บันทึกเช็คอิน' : 'บันทึกแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SELECTED TENANT DOCUMENTS MODAL */}
      {selectedTenantForDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">จัดการเอกสารผู้เช่า</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">ผู้เช่า: {selectedTenantForDocs.name}</p>
              </div>
              <button 
                onClick={() => setSelectedTenantForDocs(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scroll Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Add Doc Form */}
              <div className="bg-slate-50/60 p-4 border border-slate-100 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-600">แนบเอกสารเพิ่ม</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">หมวดหมู่เอกสาร</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none bg-white font-semibold"
                    >
                      <option value="id_card">สำเนาบัตรประชาชน</option>
                      <option value="house_reg">สำเนาทะเบียนบ้าน</option>
                      <option value="contract">เอกสารสัญญาเช่า</option>
                      <option value="other">เอกสารอื่นๆ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">ชื่อเรียกไฟล์</label>
                    <input
                      type="text"
                      placeholder="เช่น สำเนาบัตร ปชช คุณสุดดี"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadDoc}
                    className="hidden"
                    accept="image/*,.pdf"
                  />
                  <button
                    type="button"
                    disabled={uploadingDoc}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center space-x-2 py-2 border border-slate-200 hover:border-green-600 hover:text-green-600 text-xs font-bold text-slate-600 bg-white rounded-lg transition-all"
                  >
                    {uploadingDoc ? (
                      <div className="h-4 w-4 border-2 border-slate-400 border-t-green-600 rounded-full animate-spin-custom"></div>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>เลือกไฟล์และอัปโหลดทันที</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Docs list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-600">รายการเอกสารในแฟ้ม ({selectedTenantForDocs.documents?.length || 0})</h4>
                
                {(!selectedTenantForDocs.documents || selectedTenantForDocs.documents.length === 0) ? (
                  <p className="text-xs text-slate-400 text-center py-6 font-semibold">ยังไม่มีเอกสารอัปโหลดเข้าตารางนี้</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
                    {selectedTenantForDocs.documents.map((d: any) => (
                      <div key={d.id} className="flex justify-between items-center p-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-bold text-slate-800 truncate">{d.title}</p>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                            <span className="uppercase text-[8px] bg-slate-100 text-slate-500 rounded px-1">{d.category}</span>
                            <span>{Formatters.thaiDate(d.uploadDate)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <a 
                            href={d.dataUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                            title="ดูเอกสาร"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteDoc(d.id)}
                            className="inline-flex p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="ลบเอกสาร"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEPOSIT DEDUCTION MODAL */}
      {selectedTenantForDeductions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">หักเงินประกัน / เงินมัดจำ</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  มัดจำสุทธิ: {Formatters.currency(selectedTenantForDeductions.depositAmount)} | ผู้เช่า: {selectedTenantForDeductions.name}
                </p>
              </div>
              <button 
                onClick={() => setSelectedTenantForDeductions(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Add Deduction Form */}
              <form onSubmit={handleAddDeduction} className="bg-slate-50/60 p-4 border border-slate-100 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-600">หักยอดเงินมัดจำ (ชำรุดเสียหาย/ค้างจ่าย)</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">เหตุผลการหักเงิน *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ค่าทำความสะอาดห้องพัก, ลูกบิดประตูพัง"
                      value={deductDesc}
                      onChange={(e) => setDeductDesc(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-950 focus:outline-none bg-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">จำนวนเงินที่หัก (บาท) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="จำนวนเงิน"
                        value={deductAmt}
                        onChange={(e) => setDeductAmt(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-950 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">วันที่หักเงิน</label>
                      <input
                        type="date"
                        value={deductDate}
                        onChange={(e) => setDeductDate(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-950 focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-xs font-bold text-white rounded-lg transition-all"
                  >
                    หักมัดจำและบันทึก
                  </button>
                </div>
              </form>

              {/* Deductions list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-600">รายการหักมัดจำที่บันทึกแล้ว</h4>
                
                {(!selectedTenantForDeductions.deposit?.deductions || selectedTenantForDeductions.deposit.deductions.length === 0) ? (
                  <p className="text-xs text-slate-400 text-center py-6 font-semibold">ยังไม่มีประวัติการหักมัดจำสำหรับผู้เช่ารายนี้</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
                    {selectedTenantForDeductions.deposit.deductions.map((d: any) => (
                      <div key={d.id} className="flex justify-between items-center p-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-bold text-slate-800 truncate">{d.description}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{Formatters.thaiDate(d.date)}</p>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="font-extrabold text-red-500 text-xs">-{Formatters.currency(d.amount).substring(1)}</span>
                          <button
                            onClick={() => handleDeleteDeduction(d.id)}
                            className="inline-flex p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="ลบรายการ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT LEASE CONTRACT TEMPLATE */}
      {selectedTenantForContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-100 shadow-xl overflow-hidden my-8 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 no-print">
              <div>
                <h3 className="font-bold text-slate-800 text-base">ทำสัญญาเช่า / พิมพ์เอกสาร</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">ผู้เช่า: {selectedTenantForContract.name}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  พิมพ์ / บันทึก PDF
                </button>
                <button 
                  onClick={() => setSelectedTenantForContract(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                >
                  ปิด
                </button>
              </div>
            </div>

            {/* Contract Container */}
            <div className="flex-1 overflow-y-auto p-8 bg-white font-serif text-xs text-slate-800 leading-relaxed space-y-6 max-w-[210mm] mx-auto print:p-0 print:m-0 print:max-w-full">
              <div className="text-center font-bold text-base border-b-2 border-slate-900 pb-3">
                <h2>หนังสือสัญญาเช่าห้องพักและสิ่งอำนวยความสะดวก</h2>
                <p className="text-xs font-normal text-slate-500 mt-1">คู่ฉบับสำหรับคู่สัญญา</p>
              </div>

              <div className="flex justify-between text-[11px] font-semibold">
                <span>ทำที่: {state.settings?.apartmentName || 'ระบบจัดการหอพัก'}</span>
                <span>วันที่: {Formatters.thaiDate(selectedTenantForContract.startDate)}</span>
              </div>

              <div className="space-y-4 text-justify leading-loose text-slate-700">
                <p>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;หนังสือสัญญาฉบับนี้ทำขึ้นระหว่าง <strong>{state.settings?.bankAccountName || '(ผู้ให้เช่าไม่ได้ระบุชื่อจริงในหน้าตั้งค่า)'}</strong> ซึ่งต่อไปในสัญญานี้จะเรียกว่า <strong>"ผู้ให้เช่า"</strong> ฝ่ายหนึ่ง กับ <strong>{selectedTenantForContract.name}</strong> ถือบัตรประจำตัวประชาชนเลขที่ <strong>{Formatters.formatIdCard(selectedTenantForContract.idCard)}</strong> ซึ่งต่อไปในสัญญานี้จะเรียกว่า <strong>"ผู้เช่า"</strong> อีกฝ่ายหนึ่ง คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญากันโดยมีข้อความดังต่อไปนี้
                </p>

                <p>
                  <strong>ข้อ 1. วัตถุประสงค์การเช่า</strong><br />
                  ผู้ให้เช่าตกลงให้เช่า และผู้เช่าตกลงรับเช่าห้องพักห้องหมายเลข <strong>{rooms.find(r => r.id === selectedTenantForContract.assignedRoomId)?.name || '...'}</strong> ของ {state.settings?.apartmentName || 'หอพัก'} ซึ่งตั้งอยู่ ณ {state.settings?.address || '...'} เพื่อใช้อาศัยส่วนบุคคลเท่านั้น
                </p>

                <p>
                  <strong>ข้อ 2. อัตราค่าเช่าและการชำระเงิน</strong><br />
                  คู่สัญญาตกลงราคาเช่าห้องพักในอัตราเดือนละ <strong>{Formatters.currency(selectedTenantForContract.depositAmount)}</strong> บาท โดยผู้เช่าตกลงชำระเงินค่าเช่าล่วงหน้าภายในวันที่ 5 ของทุกเดือน ในกรณีชำระล่าช้ากว่ากำหนด ผู้เช่าตกลงยินยอมชำระค่าปรับตามข้อบังคับของหอพักเป็นเงินจำนวนตามที่กำหนดไว้ในคู่มือระเบียบหอพัก
                </p>

                <p>
                  <strong>ข้อ 3. เงินประกัน/มัดจำแรกเข้า</strong><br />
                  ในวันทำสัญญานี้ ผู้เช่าได้วางเงินประกัน/มัดจำแรกเข้าไว้แก่ผู้ให้เช่าเป็นเงินจำนวน <strong>{Formatters.currency(selectedTenantForContract.depositAmount)}</strong> บาท ซึ่งผู้ให้เช่าจะคืนมัดจำจำนวนดังกล่าวโดยหักมูลค่าความชำรุดเสียหายใดๆ ของสถานที่พักเช่า เมื่อระยะเวลาสัญญาเช่าได้สิ้นสุดลงตามเงื่อนไขอย่างถูกต้องสมบูรณ์
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-12 text-center text-slate-800 font-semibold">
                <div className="space-y-12">
                  <p>ลงชื่อ..........................................................ผู้ให้เช่า<br />( {state.settings?.bankAccountName || '..........................................................'} )</p>
                  <p>ลงชื่อ..........................................................พยาน<br />( {selectedTenantForContract.witness1 || '..........................................................'} )</p>
                </div>
                <div className="space-y-12">
                  <p>ลงชื่อ..........................................................ผู้เช่า<br />( {selectedTenantForContract.name || '..........................................................'} )</p>
                  <p>ลงชื่อ..........................................................พยาน<br />( {selectedTenantForContract.witness2 || '..........................................................'} )</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
