'use client';

import { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Search,
  Filter,
  DollarSign,
  ChevronDown
} from 'lucide-react';
import { DBService } from '@/services/dbService';
import { Formatters } from '@/services/formatters';
import { AuthService } from '@/services/authService';

export default function AdminLedger() {
  const [state, setState] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Summary Metrics
  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState('income');
  const [formCategory, setFormCategory] = useState('rental');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const currentState = DBService.getState();
    setState(currentState);
    const list = currentState.ledger || [];
    setLedger(list);
    calculateMetrics(list);
  };

  const calculateMetrics = (list: any[]) => {
    const totalIncome = list
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalExpense = list
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const netBalance = totalIncome - totalExpense;

    setMetrics({ totalIncome, totalExpense, netBalance });
  };

  const handleOpenCreateModal = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormType('income');
    setFormCategory('rental');
    setFormDesc('');
    setFormAmount('');
    setIsModalOpen(true);
  };

  const handleTypeChange = (type: string) => {
    setFormType(type);
    if (type === 'income') {
      setFormCategory('rental');
    } else {
      setFormCategory('maintenance');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc.trim() || !formAmount) {
      alert('กรุณากรอกคำอธิบายและจำนวนเงิน');
      return;
    }

    const amountVal = Number(formAmount) || 0;
    const newItem = {
      id: 'led_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      date: formDate || new Date().toISOString().slice(0, 10),
      type: formType,
      category: formCategory,
      description: formDesc.trim(),
      amount: amountVal,
      recordedBy: AuthService.getLoggedInUser()?.displayName || 'Admin'
    };

    const updatedLedger = [newItem, ...ledger];
    const nextState = { ...state, ledger: updatedLedger };
    
    setState(nextState);
    setLedger(updatedLedger);
    setIsModalOpen(false);
    calculateMetrics(updatedLedger);

    // Save and Sync
    await DBService.saveState(nextState);
    loadData();
    alert('บันทึกรายการบัญชีสำเร็จ!');
  };

  const handleDeleteItem = async (id: string, description: string) => {
    if (confirm(`คุณต้องการลบรายการ "${description}" ใช่หรือไม่?`)) {
      const updated = ledger.filter(item => item.id !== id);
      const nextState = { ...state, ledger: updated };
      
      setState(nextState);
      setLedger(updated);
      calculateMetrics(updated);

      // Save and Sync
      await DBService.saveState(nextState);
      loadData();
    }
  };

  const filteredLedger = ledger.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchSearch = String(item.description || '').toLowerCase().includes(query) ||
                        String(item.category || '').toLowerCase().includes(query) ||
                        String(item.recordedBy || '').toLowerCase().includes(query);
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchType && matchCategory;
  });

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      rental: 'ค่าเช่าห้องพัก',
      utilities: 'ค่าน้ำ/ไฟ/ขยะ',
      deposit: 'เงินค้ำประกัน',
      maintenance: 'ค่าปรับปรุง/ซ่อมแซม',
      salary: 'เงินเดือนพนักงาน',
      other: 'รายจ่ายอื่นๆ/จิปาถะ'
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
          <p className="text-xs font-semibold text-slate-400">สมุดบัญชีรายรับและรายจ่ายรวม</p>
          <h2 className="text-xl font-bold text-slate-800 mt-0.5">จัดการธุรกรรมบัญชี</h2>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center space-x-1.5 px-4 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>บันทึกธุรกรรมบัญชีด่วน</span>
        </button>
      </div>

      {/* Analytics widgets */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Income Card */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">รายรับทั้งหมด</span>
            <h3 className="text-2xl font-extrabold text-green-600 mt-1">{Formatters.currency(metrics.totalIncome)}</h3>
          </div>
          <div className="h-10 w-10 bg-green-50 text-green-600 flex items-center justify-center rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">รายจ่ายทั้งหมด</span>
            <h3 className="text-2xl font-extrabold text-red-500 mt-1">{Formatters.currency(metrics.totalExpense)}</h3>
          </div>
          <div className="h-10 w-10 bg-red-50 text-red-600 flex items-center justify-center rounded-xl">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        {/* Net Card */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">รายได้คงเหลือ (สุทธิ)</span>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{Formatters.currency(metrics.netBalance)}</h3>
          </div>
          <div className="h-10 w-10 bg-slate-50 text-slate-600 flex items-center justify-center rounded-xl">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Control panel filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาตามคำอธิบาย หมวดหมู่ ผู้บันทึก..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
          />
        </div>
        
        {/* Type Filter */}
        <div className="relative shrink-0">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none block w-full md:w-44 rounded-xl border border-slate-200 pl-4 pr-10 py-2 text-slate-700 focus:border-green-600 focus:outline-none text-sm bg-white font-semibold"
          >
            <option value="all">ธุรกรรมทั้งหมด</option>
            <option value="income">เฉพาะรายรับ</option>
            <option value="expense">เฉพาะรายจ่าย</option>
          </select>
          <ChevronDown className="absolute right-3.5 top-3 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLedger.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="h-14 w-14 text-slate-200 stroke-1 mb-3" />
            <h4 className="font-bold text-slate-500 text-sm">ยังไม่มีรายการบัญชีรายวัน</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              ยังไม่มีประวัติบันทึกการบัญชีรายรับ-รายจ่ายที่ตรงกับเงื่อนไขในระบบ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <th className="px-6 py-4">วันที่ทำรายการ</th>
                  <th className="px-6 py-4">ประเภท</th>
                  <th className="px-6 py-4">หมวดหมู่</th>
                  <th className="px-6 py-4">คำอธิบายรายละเอียด</th>
                  <th className="px-6 py-4 text-right">จำนวนเงิน</th>
                  <th className="px-6 py-4">ผู้บันทึก</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filteredLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-900">{Formatters.thaiDate(item.date)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        item.type === 'income' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {item.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 text-xs">{getCategoryLabel(item.category)}</td>
                    <td className="px-6 py-4 text-slate-800 truncate max-w-[240px]">{item.description}</td>
                    <td className={`px-6 py-4 text-right font-extrabold text-sm ${item.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {item.type === 'income' ? '+' : '-'}{Formatters.currency(item.amount).substring(1)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{item.recordedBy || '-'}</td>
                    <td className="px-6 py-4 text-right shrink-0">
                      <button
                        onClick={() => handleDeleteItem(item.id, item.description)}
                        className="inline-flex p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบรายการ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE TRANSACTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">บันทึกธุรกรรมบัญชี</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    ประเภทรายการ *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none text-sm bg-white font-semibold"
                  >
                    <option value="income">รายรับ (Income)</option>
                    <option value="expense">รายจ่าย (Expense)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    วันที่จดบันทึก
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 focus:outline-none text-sm bg-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  หมวดหมู่การชำระ
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none text-sm bg-white font-semibold"
                >
                  {formType === 'income' ? (
                    <>
                      <option value="rental">ค่าเช่าห้องพัก</option>
                      <option value="utilities">ค่าน้ำ/ไฟ/ขยะ</option>
                      <option value="deposit">เงินค้ำประกันแรกเข้า</option>
                      <option value="other">รายรับอื่นๆ</option>
                    </>
                  ) : (
                    <>
                      <option value="maintenance">ค่าซ่อมแซมบำรุงรักษา</option>
                      <option value="utilities">ค่าน้ำ/ค่าไฟหลวง</option>
                      <option value="salary">เงินเดือนพนักงาน/ผู้บริหาร</option>
                      <option value="other">รายจ่ายจิปาถะอื่นๆ</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  คำอธิบายรายการธุรกรรม *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าเช่าห้อง 101, ซื้อหลอดไฟทางเดินใหม่"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  จำนวนยอดเงิน (บาท) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="ยอดเงินธุรกรรม"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-950 placeholder-slate-400 focus:border-green-600 focus:outline-none text-sm"
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
                  บันทึกรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
