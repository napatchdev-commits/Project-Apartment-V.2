export class DBService {
  static STORAGE_KEY = 'HOSTEL_APARTMENT_DB_STATE_V3';
  static SNAPSHOT_KEY = 'HOSTEL_APARTMENT_TABLE_SNAPSHOT_V1';

  static getUniqueInvoices(invoices: any[]) {
    if (!invoices || !Array.isArray(invoices)) return [];
    const seen = new Set();
    const unique = [];
    const sorted = [...invoices].sort((a, b) => (b.status === 'paid' ? 1 : 0) - (a.status === 'paid' ? 1 : 0));
    for (const inv of sorted) {
      const key = `${inv.monthKey || ''}_${inv.roomId || inv.roomName || ''}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(inv);
      }
    }
    return unique;
  }

  static getStateFromStorage() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  static getInitialState() {
    const savedState = this.getStateFromStorage();
    const hasSavedState = !!savedState;
    const isDemo = hasSavedState && savedState.settings && savedState.settings.isDemoMode !== undefined
      ? Boolean(savedState.settings.isDemoMode)
      : false; // Default to false for Blank Project

    return {
      settings: {
        apartmentName: '',
        address: '',
        tel: '',
        lineId: '',
        bankName: '',
        bankAccountNo: '',
        bankAccountName: '',
        promptPayId: '',
        supabaseUrl: '',
        isDemoMode: isDemo
      },
      rates: { electricityRate: 8.0, waterRate: 20.0, trashFee: 20.0, internetFee: 0, commonFee: 0 },
      lateFeeSettings: {
        dueDay: 5,
        penaltyPhase1Start: 6,
        penaltyPhase1End: 15,
        penaltyPhase1Amount: 200,
        penaltyPhase2Start: 16,
        penaltyPhase2End: 31,
        penaltyPhase2Amount: 300
      },
      users: [
        { id: 'usr_super', username: 'superadmin', displayName: 'ผู้ดูแลระบบสูงสุด', role: 'super_admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' /* sha256('admin') */ },
        { id: 'usr_admin', username: 'admin', displayName: 'ผู้ดูแลระบบ', role: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' /* sha256('admin') */ },
        { id: 'usr_staff', username: 'staff', displayName: 'พนักงานทั่วไป', role: 'staff', passwordHash: '1562206543da764123c21bd524674f0a8aaf49c8a89744c97352fe677f7e4006' /* sha256('staff') */ }
      ],
      roomTypes: [
        { id: 'rt_fan', name: 'ห้องพัดลม', description: 'ห้องพัดลมมาตรฐาน', defaultRent: 0 },
        { id: 'rt_air', name: 'ห้องแอร์', description: 'ห้องปรับอากาศมาตรฐาน', defaultRent: 0 }
      ],
      rooms: [],
      tenants: [],
      invoices: [],
      repairs: [],
      ledger: [],
      events: []
    };
  }

  static cleanUrl(url: string | null | undefined): string {
    if (!url) return '';
    return url.split('?')[0].trim();
  }

  static getSavedSupabaseUrl(): string {
    if (typeof window === 'undefined') return '';
    const rawState = localStorage.getItem(this.STORAGE_KEY);
    if (rawState) {
      try {
        const parsed = JSON.parse(rawState);
        if (parsed.settings && parsed.settings.supabaseUrl) {
          return this.cleanUrl(parsed.settings.supabaseUrl);
        }
      } catch (e) {}
    }
    const fromStorage = localStorage.getItem('HOSTEL_APARTMENT_SAVED_SUPABASE_URL');
    if (fromStorage && fromStorage.includes('supabase.co')) {
      return this.cleanUrl(fromStorage);
    }
    return '';
  }

  static getSavedApiKey(): string {
    if (typeof window === 'undefined') return '';
    const rawState = localStorage.getItem(this.STORAGE_KEY);
    if (rawState) {
      try {
        const parsed = JSON.parse(rawState);
        if (parsed.settings && parsed.settings.apiKey && parsed.settings.apiKey.startsWith('eyJ')) {
          return parsed.settings.apiKey;
        }
      } catch (e) {}
    }
    const fromStorage = localStorage.getItem('HOSTEL_APARTMENT_SAVED_API_KEY');
    if (fromStorage && fromStorage.startsWith('eyJ')) return fromStorage;

    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('apiKey');
    if (fromParam && fromParam.startsWith('eyJ')) {
      localStorage.setItem('HOSTEL_APARTMENT_SAVED_API_KEY', fromParam);
      return fromParam;
    }
    return '';
  }

  static getSavedTenantApiKey(): string {
    if (typeof window === 'undefined') return '';
    const rawState = localStorage.getItem(this.STORAGE_KEY);
    if (rawState) {
      try {
        const parsed = JSON.parse(rawState);
        if (parsed.settings && parsed.settings.tenantApiKey && parsed.settings.tenantApiKey.startsWith('eyJ')) {
          return parsed.settings.tenantApiKey;
        }
      } catch (e) {}
    }
    const fromStorage = localStorage.getItem('HOSTEL_APARTMENT_SAVED_TENANT_API_KEY');
    if (fromStorage && fromStorage.startsWith('eyJ')) return fromStorage;
    return '';
  }

  static getState() {
    if (typeof window === 'undefined') return this.getInitialState();
    const raw = localStorage.getItem(this.STORAGE_KEY);
    let state: any = null;
    if (raw) {
      try { state = JSON.parse(raw); } catch (e) {}
    }
    if (!state) {
      state = this.getInitialState();
    }
    if (!state.lateFeeSettings) {
      state.lateFeeSettings = {
        dueDay: 5,
        penaltyPhase1Start: 6,
        penaltyPhase1End: 15,
        penaltyPhase1Amount: 200,
        penaltyPhase2Start: 16,
        penaltyPhase2End: 31,
        penaltyPhase2Amount: 300
      };
    }
    if (!state.rooms || !Array.isArray(state.rooms)) {
      state.rooms = [];
    }
    if (state.invoices && Array.isArray(state.invoices)) {
      state.invoices = this.getUniqueInvoices(state.invoices);
      let migrated = false;
      state.invoices.forEach((inv: any) => {
        if (inv.monthKey && inv.dueDate && inv.dueDate.slice(0, 7) === inv.monthKey) {
          const [year, month] = inv.monthKey.split('-').map(Number);
          let nextMonth = month + 1;
          let nextYear = year;
          if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
          }
          const nextMonthFormatted = String(nextMonth).padStart(2, '0');
          inv.dueDate = `${nextYear}-${nextMonthFormatted}-05`;
          migrated = true;
        }
      });
      if (migrated) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
        this.syncToSupabase(this.getSavedSupabaseUrl(), state).catch(() => {});
      }
    }
    const savedUrl = this.getSavedSupabaseUrl();
    if (savedUrl && (!state.settings || !state.settings.supabaseUrl)) {
      if (!state.settings) state.settings = {};
      state.settings.supabaseUrl = savedUrl;
    }
    
    if (!state.users || !Array.isArray(state.users) || state.users.length === 0) {
      state.users = [
        { id: 'usr_super', username: 'superadmin', displayName: 'ผู้ดูแลระบบสูงสุด', role: 'super_admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' },
        { id: 'usr_admin', username: 'admin', displayName: 'ผู้ดูแลระบบ', role: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' },
        { id: 'usr_staff', username: 'staff', displayName: 'พนักงานทั่วไป', role: 'staff', passwordHash: '1562206543da764123c21bd524674f0a8aaf49c8a89744c97352fe677f7e4006' }
      ];
    }
    
    return state;
  }

  static async saveState(state: any, silent = false) {
    if (typeof window === 'undefined') return;
    if (state.settings && state.settings.supabaseUrl) {
      localStorage.setItem('HOSTEL_APARTMENT_SAVED_SUPABASE_URL', state.settings.supabaseUrl);
    }
    const url = this.getSavedSupabaseUrl();
    if (url) {
      let syncLoader: HTMLDivElement | null = null;
      if (!silent && typeof document !== 'undefined') {
        syncLoader = document.createElement('div');
        syncLoader.id = 'app-sync-loader';
        syncLoader.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15, 23, 42, 0.75); color:#f8fafc; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:99999; font-family:sans-serif; backdrop-filter:blur(4px);';
        syncLoader.innerHTML = `
          <div style="width:45px; height:45px; border:4px solid #334155; border-top-color:#16A34A; border-radius:50%; animation: spin 1s linear infinite; margin-bottom:1rem;"></div>
          <div style="font-weight:700; font-size:1.15rem; margin-bottom:0.25rem;">กำลังบันทึกข้อมูลไปยัง Supabase...</div>
          <div style="font-size:0.88rem; color:#cbd5e1;">กรุณารอสักครู่ ระบบกำลังอัปเดตข้อมูล</div>
          <style>
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        `;
        document.body.appendChild(syncLoader);
      }

      try {
        await this.syncToSupabase(url, state);
      } catch (e: any) {
        console.error("Failed to sync to Supabase, state will be saved to local cache:", e);
        if (!silent) {
          alert('⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase: ' + e.message + '\n\n(ข้อมูลถูกบันทึกในอุปกรณ์เครื่องนี้แล้ว แต่ไม่สามารถอัปโหลดไปยังเซิร์ฟเวอร์ Supabase ได้ กรุณาตรวจสอบ URL หรือ Anon Key ในหน้าตั้งค่า)');
        }
      } finally {
        if (syncLoader && syncLoader.parentNode) {
          syncLoader.remove();
        }
      }
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  static getBaseSupabaseUrl(url: string) {
    if (!url) return '';
    let cleaned = url.split('?')[0].trim();
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    const match = cleaned.match(/^(https?:\/\/[^\/]+)/i);
    return match ? match[1] : cleaned;
  }

  static async uploadFileToStorage(file: File, folderPath = 'doc'): Promise<string | null> {
    if (!file) return null;
    const url = this.getSavedSupabaseUrl();
    const apiKey = this.getSavedApiKey();
    if (!url || !apiKey) {
      throw new Error('ยังไม่ได้ตั้งค่า Supabase URL / API Key จึงอัปโหลดไฟล์ไม่ได้');
    }
    const baseUrl = this.getBaseSupabaseUrl(url);
    const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${safeName}`;
    const cleanFolder = folderPath.replace(/\/+$/, '').replace(/^\/+/, '');
    const objectPath = cleanFolder ? `${cleanFolder}/${filename}` : filename;
    const uploadUrl = `${baseUrl}/storage/v1/object/tenant-documents/${objectPath}`;

    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let errorData: any = null;
        try {
          errorData = JSON.parse(errorText);
        } catch {}

        const status = res.status;
        const message = errorData ? (errorData.message || errorData.error) : errorText;
        const errorCode = errorData ? errorData.code : 'Unknown';

        console.error('❌ Supabase Storage Upload Error Details:', {
          status,
          message,
          error: errorCode,
          bucket: 'tenant-documents',
          path: objectPath,
          filename: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream'
        });

        if (status === 403 || message.includes('row-level security') || errorCode === 'AccessDenied') {
          throw new Error('ไม่มีสิทธิ์อัปโหลดไฟล์ (403 Unauthorized) กรุณาตรวจสอบ Storage RLS Policy หรือตรวจสอบว่าสร้าง Storage bucket ชื่อ "tenant-documents" และตั้งค่าเป็น public แล้ว');
        } else if (status === 404) {
          throw new Error('ไม่พบข้อมูลปลายทาง (404 Not Found) กรุณาตรวจสอบว่าสร้าง Storage bucket ชื่อ "tenant-documents" เรียบร้อยแล้ว');
        } else {
          throw new Error(message || `เกิดข้อผิดพลาดรหัส ${status}`);
        }
      }
      return `${baseUrl}/storage/v1/object/public/tenant-documents/${objectPath}`;
    } catch (err: any) {
      if (err.message.includes('ไม่มีสิทธิ์อัปโหลด') || err.message.includes('ไม่พบข้อมูลปลายทาง')) {
        throw err;
      }
      console.error('❌ Network or Upload exception:', err);
      throw new Error(`การเชื่อมต่อล้มเหลวหรือไม่สามารถอัปโหลดได้: ${err.message}`);
    }
  }

  static async callRpc(fnName: string, params: any = {}) {
    const url = this.getSavedSupabaseUrl();
    const apiKey = this.getSavedApiKey();
    if (!url || !apiKey) {
      throw new Error('ยังไม่ได้ตั้งค่า Supabase URL / API Key');
    }
    const baseUrl = this.getBaseSupabaseUrl(url);
    const res = await fetch(`${baseUrl}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`เรียกใช้ฟังก์ชัน ${fnName} ไม่สำเร็จ: ${txt || res.statusText}`);
    }
    return res.json();
  }

  static calculateLatePenalty(invoice: any, settings: any) {
    if (invoice.status === 'paid' || invoice.status === 'cancelled' || invoice.status === 'refund' || invoice.status === 'pending_verification') {
      return {
        amount: Number(invoice.penaltyAmount || 0),
        rule: invoice.penaltyRule || ''
      };
    }

    const phase1Start = Number(settings?.penaltyPhase1Start ?? 6);
    const phase1End = Number(settings?.penaltyPhase1End ?? 15);
    const phase1Amt = Number(settings?.penaltyPhase1Amount ?? 200);
    const phase2Start = Number(settings?.penaltyPhase2Start ?? 16);
    const phase2Amt = Number(settings?.penaltyPhase2Amount ?? 300);

    const todayStr = new Date().toLocaleDateString('sv-SE');
    const dueStr = invoice.dueDate;

    if (!dueStr) {
      return { amount: 0, rule: '' };
    }

    if (todayStr <= dueStr) {
      return { amount: 0, rule: 'ชำระภายในกำหนด' };
    }

    const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
    const [dYear, dMonth] = dueStr.split('-').map(Number);

    const isLaterMonthOrYear = (tYear > dYear) || (tYear === dYear && tMonth > dMonth);

    if (isLaterMonthOrYear) {
      return { 
        amount: phase2Amt, 
        rule: `ค้างชำระข้ามเดือน (ค่าปรับ ${phase2Amt} บาท)` 
      };
    }

    if (tDay >= phase1Start && tDay <= phase1End) {
      return { 
        amount: phase1Amt, 
        rule: `ชำระล่าช้าช่วงที่ 1 (วันที่ ${phase1Start}-${phase1End}: ค่าปรับ ${phase1Amt} บาท)` 
      };
    } else if (tDay >= phase2Start) {
      return { 
        amount: phase2Amt, 
        rule: `ชำระล่าช้าช่วงที่ 2 (วันที่ ${phase2Start} เป็นต้นไป: ค่าปรับ ${phase2Amt} บาท)` 
      };
    }

    return { amount: phase2Amt, rule: `ชำระล่าช้าเกินกำหนด (ค่าปรับ ${phase2Amt} บาท)` };
  }

  static updateInvoicePenalties(state: any) {
    if (!state || !state.invoices) return false;
    let changed = false;
    state.invoices.forEach((inv: any) => {
      if (inv.status === 'unpaid') {
        const penalty = this.calculateLatePenalty(inv, state.lateFeeSettings);
        if (Number(inv.penaltyAmount || 0) !== penalty.amount || inv.penaltyRule !== penalty.rule) {
          inv.penaltyAmount = penalty.amount;
          inv.penaltyRule = penalty.rule;
          inv.penaltyCalculatedAt = new Date().toISOString();
          
          const baseTotal = Number(inv.rentAmount || 0) +
                            Number(inv.waterAmount || 0) +
                            Number(inv.elecAmount || 0) +
                            Number(inv.trashFee || 0) +
                            Number(inv.internetFee || 0) +
                            Number(inv.commonFee || 0) +
                            Number(inv.fineAmount || 0);
          inv.totalAmount = baseTotal + penalty.amount;
          inv.outstandingAmount = inv.totalAmount - Number(inv.paidAmount || 0);
          changed = true;
        }
      }
    });
    return changed;
  }

  static getRoomRent(room: any) {
    if (!room) return 0;
    if (room.status === 'vacant' || room.status === 'reserved') {
      return 0;
    }
    if (room.baseRent !== undefined && room.baseRent !== null && room.baseRent !== '') {
      return Number(room.baseRent);
    }
    return room.floor === 2 ? 3500 : 2500;
  }

  static cleanRoomName(roomName: string | null | undefined) {
    let name = String(roomName || '').trim();
    name = name.replace(/^(?:ห้องพัก|ห้อง)\s*/, '');
    return name.trim();
  }

  static getRoomSortWeight(roomName: string | null | undefined) {
    const name = DBService.cleanRoomName(roomName);
    if (!name) return 2;
    if (/^s/i.test(name)) {
      return 1;
    }
    const isNamed = /^[^A-Za-z0-9]/i.test(name) || name.startsWith('บ้าน') || name.startsWith('เรือน');
    if (isNamed) {
      return 3;
    }
    return 2;
  }

  static compareRooms(a: any, b: any) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    const nameA = DBService.cleanRoomName(a.name);
    const nameB = DBService.cleanRoomName(b.name);
    const wA = DBService.getRoomSortWeight(nameA);
    const wB = DBService.getRoomSortWeight(nameB);
    if (wA !== wB) return wA - wB;
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  }

  static getTableConfigs(): Record<string, any> {
    return {
      rooms: {
        table: 'rooms', onConflict: 'id',
        fields: [['id','id'],['name','name'],['floor','floor'],['typeId','type_id'],['baseRent','base_rent'],
                 ['status','status'],['currentTenantId','current_tenant_id'],['currentTenantName','current_tenant_name'],
                 ['entryDate','entry_date'],['lastWaterMeter','last_water_meter'],['lastElecMeter','last_elec_meter'],
                 ['trashFee','trash_fee'],['internetFee','internet_fee'],['commonFee','common_fee'],
                 ['tempElecMeter','temp_elec_meter'],['tempWaterMeter','temp_water_meter'],['tempFineAmount','temp_fine_amount']]
      },
      tenants: {
        table: 'tenants', onConflict: 'id',
        fields: [['id','id'],['name','name'],['idCard','id_card'],['tel','tel'],['lineId','line_id'],['email','email'],
                 ['address','address'],['startDate','start_date'],['endDate','end_date'],['assignedRoomId','assigned_room_id'],
                 ['depositAmount','deposit_amount'],['depositStatus','deposit_status'],
                 ['witness1','witness1'],['witness2','witness2']]
      },
      invoices: {
        table: 'invoices', onConflict: 'room_id,month_key',
        keyFn: (r: any) => `${r.roomId || ''}::${r.monthKey || ''}`,
        fields: [['id','id'],['invoiceNumber','invoice_number'],['monthKey','month_key'],['roomId','room_id'],
                 ['roomName','room_name'],['tenantId','tenant_id'],['tenantName','tenant_name'],['issueDate','issue_date'],
                 ['dueDate','due_date'],['waterPrev','water_prev'],['waterCurr','water_curr'],['waterAmount','water_amount'],
                 ['elecPrev','elec_prev'],['elecCurr','elec_curr'],['elecAmount','elec_amount'],['rentAmount','rent_amount'],
                 ['trashFee','trash_fee'],['fineAmount','fine_amount'],['internetFee','internet_fee'],['commonFee','common_fee'],
                 ['totalAmount','total_amount'],['paidAmount','paid_amount'],['outstandingAmount','outstanding_amount'],
                 ['status','status'],['slipUrl','slip_url'],
                 ['penaltyAmount','penalty_amount'],['penaltyRule','penalty_rule'],['penaltyCalculatedAt','penalty_calculated_at']]
      },
      repairs: {
        table: 'repairs', onConflict: 'id',
        fields: [['id','id'],['ticketNumber','ticket_number'],['roomId','room_id'],['roomName','room_name'],
                 ['tenantName','tenant_name'],['title','title'],['description','description'],['category','category'],
                 ['requestDate','request_date'],['status','status'],['expenseAmount','expense_amount'],
                 ['assignedTechnician','assigned_technician'],['imageUrl','image_url']]
      },
      ledger: {
        table: 'ledger', onConflict: 'id',
        fields: [['id','id'],['date','date'],['type','type'],['category','category'],['description','description'],
                 ['amount','amount'],['recordedBy','recorded_by']]
      },
      roomTypes: {
        table: 'room_types', onConflict: 'id',
        fields: [['id','id'],['name','name'],['rentalType','rental_type'],['defaultRent','default_rent'],['description','description']]
      },
      events: {
        table: 'events', onConflict: 'id',
        fields: [['id','id'],['title','title'],['date','date'],['category','category'],['roomName','room_name']]
      },
      users: {
        table: 'users', onConflict: 'id',
        fields: [['id','id'],['username','username'],['displayName','display_name'],['role','role'],['passwordHash','password_hash']]
      },
      meterAuditLogs: {
        table: 'meter_audit_logs', onConflict: 'id',
        fields: [['id','id'],['roomId','room_id'],['roomName','room_name'],['monthKey','month_key'],
                 ['recordedBy','recorded_by'],['actionType','action_type'],['oldWaterCurr','old_water_curr'],
                 ['newWaterCurr','new_water_curr'],['oldElecCurr','old_elec_curr'],['newElecCurr','new_elec_curr'],
                 ['waterUnits','water_units'],['elecUnits','elec_units'],['waterAmount','water_amount'],
                 ['elecAmount','elec_amount'],['notes','notes'],['createdAt','created_at']]
      },
      paymentSlips: {
        table: 'payment_slips', onConflict: 'id',
        fields: [['id','id'],['invoiceId','invoice_id'],['tenantId','tenant_id'],['roomId','room_id'],
                 ['roomName','room_name'],['tenantName','tenant_name'],['monthKey','month_key'],
                 ['storagePath','storage_path'],['publicUrl','public_url'],['amount','amount'],
                 ['requiredAmount','required_amount'],['fineAmount','fine_amount'],
                 ['referenceNo','reference_no'],['qrTransactionId','qr_transaction_id'],
                 ['senderBank','sender_bank'],['receiverBank','receiver_bank'],
                 ['transactionDate','transaction_date'],['transactionTime','transaction_time'],
                 ['imageHash','image_hash'],
                 ['verificationStatus','verification_status'],['verifiedBy','verified_by'],
                 ['verifiedAt','verified_at'],['rejectReason','reject_reason'],['createdAt','created_at']]
      }
    };
  }

  static getNestedTenantConfigs(): Record<string, any> {
    return {
      documents: {
        table: 'tenant_documents', onConflict: 'id',
        fields: [['id','id'],['tenantId','tenant_id'],['category','category'],['title','title'],
                 ['fileName','file_name'],['fileType','file_type'],['fileSize','file_size'],
                 ['dataUrl','file_url'],['uploadDate','upload_date']]
      },
      deductions: {
        table: 'tenant_deposit_deductions', onConflict: 'id',
        fields: [['id','id'],['tenantId','tenant_id'],['description','description'],['amount','amount'],['date','date']]
      }
    };
  }

  static getSingletonConfigs(): Record<string, any> {
    return {
      settings: {
        table: 'settings',
        fields: [['apartmentName','apartment_name'],['address','address'],['tel','tel'],['lineId','line_id'],
                 ['bankName','bank_name'],['bankAccountNo','bank_account_no'],['bankAccountName','bank_account_name'],
                 ['promptPayId','prompt_pay_id'],
                 ['lineToken','line_token'],['lineUserId','line_user_id'],['lineNotifyToken','line_notify_token']]
      },
      rates: {
        table: 'rates',
        fields: [['electricityRate','electricity_rate'],['waterRate','water_rate'],['trashFee','trash_fee'],
                 ['internetFee','internet_fee'],['commonFee','common_fee']]
      },
      lateFeeSettings: {
        table: 'late_fee_settings',
        fields: [['dueDay','due_day'],['penaltyPhase1Start','penalty_phase1_start'],['penaltyPhase1End','penalty_phase1_end'],
                 ['penaltyPhase1Amount','penalty_phase1_amount'],['penaltyPhase2Start','penalty_phase2_start'],
                 ['penaltyPhase2End','penalty_phase2_end'],['penaltyPhase2Amount','penalty_phase2_amount']]
      }
    };
  }

  static toRow(fields: string[][], obj: any, state?: any) {
    const row: Record<string, any> = {};
    fields.forEach(([jsKey, dbKey]) => {
      let val = obj[jsKey] !== undefined ? obj[jsKey] : null;
      if (val === '' || val === 'null' || val === 'undefined') val = null;
      if ((dbKey === 'assigned_room_id' || dbKey === 'room_id') && val) {
        if (state && Array.isArray(state.rooms)) {
          const roomExists = state.rooms.some((r: any) => r.id === val);
          if (!roomExists) val = null;
        }
      }
      row[dbKey] = val;
    });
    return row;
  }

  static fromRow(fields: string[][], row: any) {
    const obj: Record<string, any> = {};
    fields.forEach(([jsKey, dbKey]) => { obj[jsKey] = row[dbKey] !== undefined ? row[dbKey] : null; });
    return obj;
  }

  static loadSnapshot() {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(this.SNAPSHOT_KEY) || '{}'); } catch (e) { return {}; }
  }

  static saveSnapshot(snap: any) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.SNAPSHOT_KEY, JSON.stringify(snap));
  }

  static async pullFromSupabase(url: string) {
    if (!url) return null;
    const apiKey = this.getSavedApiKey();
    const baseUrl = this.getBaseSupabaseUrl(url);
    const headers = { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` };
    try {
      const tableCfgs = this.getTableConfigs();
      const singleCfgs = this.getSingletonConfigs();

      const tableEntries = Object.entries(tableCfgs);
      const singleEntries = Object.entries(singleCfgs);

      const [tableResults, singleResults] = await Promise.all([
        Promise.all(tableEntries.map(([, cfg]) =>
          fetch(`${baseUrl}/rest/v1/${cfg.table}?select=*`, { headers }).then(r => r.ok ? r.json() : Promise.reject(new Error(`โหลดตาราง ${cfg.table} ไม่สำเร็จ: ${r.statusText}`)))
        )),
        Promise.all(singleEntries.map(([, cfg]) =>
          fetch(`${baseUrl}/rest/v1/${cfg.table}?id=eq.1&select=*`, { headers })
            .then(r => r.ok ? r.json() : [])
            .catch(() => [])
        ))
      ]);

      const data = this.getInitialState();
      const snapshot: Record<string, any> = {};

      tableEntries.forEach(([category, cfg], idx) => {
        const rows = tableResults[idx] || [];
        const jsRows = rows.map((r: any) => this.fromRow(cfg.fields, r));
        data[category as keyof typeof data] = jsRows as any;
        const keyFn = cfg.keyFn || ((r: any) => r.id);
        const catSnap: Record<string, any> = {};
        jsRows.forEach((jsRow: any) => {
          catSnap[keyFn(jsRow)] = { id: jsRow.id, json: JSON.stringify(this.toRow(cfg.fields, jsRow)) };
        });
        snapshot[category] = catSnap;
      });

      singleEntries.forEach(([category, cfg], idx) => {
        const rows = singleResults[idx] || [];
        if (rows && rows.length > 0) {
          data[category as keyof typeof data] = Object.assign({}, data[category as keyof typeof data], this.fromRow(cfg.fields, rows[0])) as any;
        }
      });

      const nestedCfgs = this.getNestedTenantConfigs();
      const nestedEntries = Object.entries(nestedCfgs);
      const nestedResults = await Promise.all(nestedEntries.map(([, cfg]) =>
        fetch(`${baseUrl}/rest/v1/${cfg.table}?select=*`, { headers }).then(r => r.ok ? r.json() : Promise.reject(new Error(`โหลดตาราง ${cfg.table} ไม่สำเร็จ: ${r.statusText}`)))
      ));
      const tenantsById: Record<string, any> = {};
      (data.tenants || []).forEach((t: any) => {
        t.documents = [];
        t.depositAmount = (t.depositAmount !== undefined && t.depositAmount !== null) ? Number(t.depositAmount) : 0;
        t.deposit = { initialBail: t.depositAmount, status: t.depositStatus || 'active', deductions: [] };
        tenantsById[t.id] = t;
      });
      nestedEntries.forEach(([key, cfg], idx) => {
        const rows = nestedResults[idx] || [];
        const jsRows = rows.map((r: any) => this.fromRow(cfg.fields, r));
        const catSnap: Record<string, any> = {};
        jsRows.forEach((jsRow: any) => {
          catSnap[jsRow.id] = { id: jsRow.id, json: JSON.stringify(this.toRow(cfg.fields, jsRow)) };
          const tenant = tenantsById[jsRow.tenantId];
          if (tenant) {
            if (key === 'documents') tenant.documents.push(jsRow);
            else if (key === 'deductions') tenant.deposit.deductions.push(jsRow);
          }
        });
        snapshot['tenant_' + key] = catSnap;
      });

      if (!data.settings) data.settings = {} as any;
      data.settings.supabaseUrl = this.cleanUrl(url);
      if (apiKey) (data.settings as any).apiKey = apiKey;
      
      data.users = [
        { id: 'usr_super', username: 'superadmin', displayName: 'ผู้ดูแลระบบสูงสุด', role: 'super_admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' },
        { id: 'usr_admin', username: 'admin', displayName: 'ผู้ดูแลระบบ', role: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' },
        { id: 'usr_staff', username: 'staff', displayName: 'พนักงานทั่วไป', role: 'staff', passwordHash: '1562206543da764123c21bd524674f0a8aaf49c8a89744c97352fe677f7e4006' }
      ];

      localStorage.setItem('HOSTEL_APARTMENT_SAVED_SUPABASE_URL', this.cleanUrl(url));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      this.saveSnapshot(snapshot);
      return data;
    } catch (e) {
      console.error('Failed to pull from Supabase:', e);
    }
    return null;
  }

  static async purgeSupabaseData(url: string, state: any) {
    const cleanUrl = this.cleanUrl(url);
    if (!cleanUrl) return;
    const baseUrl = this.getBaseSupabaseUrl(cleanUrl);
    const apiKey = this.getSavedApiKey();
    const headers = {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    const tablesToDelete = [
      'invoices',
      'tenant_documents',
      'tenant_deposit_deductions',
      'repairs',
      'ledger',
      'events',
      'tenants',
      'rooms'
    ];

    for (const table of tablesToDelete) {
      try {
        await fetch(`${baseUrl}/rest/v1/${table}?id=not.is.null`, { method: 'DELETE', headers });
        await fetch(`${baseUrl}/rest/v1/${table}?room_id=not.is.null`, { method: 'DELETE', headers });

        const getRes = await fetch(`${baseUrl}/rest/v1/${table}?select=*`, { headers });
        if (getRes.ok) {
          const rows = await getRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            for (const r of rows) {
              let query = '';
              if (r.id !== undefined && r.id !== null) {
                query = `id=eq.${encodeURIComponent(r.id)}`;
              } else if (r.room_id && r.month_key) {
                query = `room_id=eq.${encodeURIComponent(r.room_id)}&month_key=eq.${encodeURIComponent(r.month_key)}`;
              }
              if (query) {
                await fetch(`${baseUrl}/rest/v1/${table}?${query}`, { method: 'DELETE', headers });
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Purge table ${table} failed:`, err);
      }
    }

    localStorage.removeItem(this.SNAPSHOT_KEY);
  }

  static async purgeUsageTablesSupabase(url: string, state: any) {
    const cleanUrl = this.cleanUrl(url);
    if (!cleanUrl) return;
    const baseUrl = this.getBaseSupabaseUrl(cleanUrl);
    const apiKey = this.getSavedApiKey();
    const headers = {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    const tablesToDelete = [
      'invoices',
      'tenant_documents',
      'tenant_deposit_deductions',
      'repairs',
      'ledger',
      'events',
      'tenants'
    ];

    for (const table of tablesToDelete) {
      try {
        await fetch(`${baseUrl}/rest/v1/${table}?id=not.is.null`, { method: 'DELETE', headers });
        await fetch(`${baseUrl}/rest/v1/${table}?room_id=not.is.null`, { method: 'DELETE', headers });

        const getRes = await fetch(`${baseUrl}/rest/v1/${table}?select=*`, { headers });
        if (getRes.ok) {
          const rows = await getRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            for (const r of rows) {
              let query = '';
              if (r.id !== undefined && r.id !== null) {
                query = `id=eq.${encodeURIComponent(r.id)}`;
              } else if (r.room_id && r.month_key) {
                query = `room_id=eq.${encodeURIComponent(r.room_id)}&month_key=eq.${encodeURIComponent(r.month_key)}`;
              }
              if (query) {
                await fetch(`${baseUrl}/rest/v1/${table}?${query}`, { method: 'DELETE', headers });
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Purge usage table ${table} failed:`, err);
      }
    }

    if (state.rooms && Array.isArray(state.rooms) && state.rooms.length > 0) {
      try {
        const cfg = this.getTableConfigs().rooms;
        const dbRooms = state.rooms.map((r: any) => this.toRow(cfg.fields, r));
        await fetch(`${baseUrl}/rest/v1/rooms?on_conflict=id`, {
          method: 'POST',
          headers: {
            ...headers,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(dbRooms)
        });
      } catch (err) {
        console.warn('Sync rooms status in Supabase failed:', err);
      }
    }

    localStorage.removeItem(this.SNAPSHOT_KEY);
  }

  static async startProductionMode(state: any) {
    if (!state.settings) state.settings = {};
    state.settings.isDemoMode = false;

    state.tenants = [];
    state.invoices = [];
    state.repairs = [];
    state.ledger = [];
    state.events = [];
    state.rooms = [];

    localStorage.removeItem(this.SNAPSHOT_KEY);

    await this.saveState(state);

    const url = this.getSavedSupabaseUrl();
    if (url) {
      await this.purgeSupabaseData(url, state);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  static async clearUsageData(state: any) {
    state.tenants = [];
    state.invoices = [];
    state.repairs = [];
    state.ledger = [];
    state.events = [];

    if (state.rooms && Array.isArray(state.rooms)) {
      state.rooms.forEach((r: any) => {
        r.status = 'vacant';
        r.occupied = false;
        r.currentTenantId = '';
        r.currentTenantName = '';
        r.entryDate = null;
        r.lastElecMeter = 0;
        r.lastWaterMeter = 0;
      });
    }

    localStorage.removeItem(this.SNAPSHOT_KEY);
    await this.saveState(state);

    const url = this.getSavedSupabaseUrl();
    if (url) {
      await this.purgeUsageTablesSupabase(url, state);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  static async clearDemoData(state: any) {
    const isDemo = state && state.settings && state.settings.isDemoMode !== undefined
      ? Boolean(state.settings.isDemoMode)
      : false;
    if (isDemo) {
      return this.startProductionMode(state);
    } else {
      return this.clearUsageData(state);
    }
  }

  static async syncToSupabase(url: string, state: any) {
    if (!url) throw new Error('กรุณาระบุ Supabase Project URL ก่อน');
    if (!state) {
      console.warn('Blocked syncToSupabase: state is null.');
      return { status: 'success', message: 'Sync blocked: state is null' };
    }
    const apiKey = (state.settings && state.settings.apiKey) || this.getSavedApiKey();
    localStorage.setItem('HOSTEL_APARTMENT_SAVED_SUPABASE_URL', this.cleanUrl(url));
    const baseUrl = this.getBaseSupabaseUrl(url);
    const headers = {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };

    const tableCfgs = this.getTableConfigs();
    const singleCfgs = this.getSingletonConfigs();
    const snapshot = this.loadSnapshot();
    const newSnapshot: Record<string, any> = {};

    const buildRequestsForCategory = (category: string, cfg: any) => {
      const catRequests: Promise<any>[] = [];
      const rows = Array.isArray(state[category]) ? state[category] : [];
      const keyFn = cfg.keyFn || ((r: any) => r.id);
      const prevCat = snapshot[category] || {};
      const catSnap: Record<string, any> = {};
      const upserts: any[] = [];

      rows.forEach(jsRow => {
        if (!jsRow || !jsRow.id) return;
        const key = keyFn(jsRow);
        const dbRow = this.toRow(cfg.fields, jsRow, state);
        const json = JSON.stringify(dbRow);
        catSnap[key] = { id: jsRow.id, json };
        if (!prevCat[key] || prevCat[key].json !== json) {
          upserts.push(dbRow);
        }
      });
      newSnapshot[category] = catSnap;

      const newKeys = new Set(Object.keys(catSnap));
      const deleteIds = Object.entries(prevCat)
        .filter(([key]) => !newKeys.has(key))
        .map(([, v]: any) => v.id)
        .filter(Boolean);

      if (upserts.length > 0) {
        catRequests.push(
          fetch(`${baseUrl}/rest/v1/${cfg.table}?on_conflict=${cfg.onConflict}`, {
            method: 'POST', headers, body: JSON.stringify(upserts)
          }).then(async r => {
            if (!r.ok) throw new Error(`บันทึก ${cfg.table} ไม่สำเร็จ: ${await r.text() || r.statusText}`);
          })
        );
      }
      if (deleteIds.length > 0) {
        const idList = deleteIds.map(id => `"${String(id).replace(/"/g, '')}"`).join(',');
        catRequests.push(
          fetch(`${baseUrl}/rest/v1/${cfg.table}?id=in.(${idList})`, {
            method: 'DELETE', headers
          }).then(async r => {
            if (!r.ok) throw new Error(`ลบข้อมูล ${cfg.table} ไม่สำเร็จ: ${await r.text() || r.statusText}`);
          })
        );
      }
      return catRequests;
    };

    const syncPhases = [
      ['roomTypes', 'users', 'ledger', 'events', 'meterAuditLogs'],
      ['rooms'],
      ['tenants', 'invoices', 'repairs', 'paymentSlips']
    ];
    const handledCategories = new Set(syncPhases.flat());

    for (const phaseCategories of syncPhases) {
      const phaseRequests: Promise<any>[] = [];
      phaseCategories.forEach(category => {
        const cfg = tableCfgs[category];
        if (cfg) phaseRequests.push(...buildRequestsForCategory(category, cfg));
      });
      if (phaseRequests.length > 0) {
        await Promise.all(phaseRequests);
      }
    }

    const leftoverRequests: Promise<any>[] = [];
    for (const [category, cfg] of Object.entries(tableCfgs)) {
      if (!handledCategories.has(category)) {
        leftoverRequests.push(...buildRequestsForCategory(category, cfg));
      }
    }
    if (leftoverRequests.length > 0) {
      await Promise.all(leftoverRequests);
    }

    const requests: Promise<any>[] = [];
    const nestedCfgs = this.getNestedTenantConfigs();
    for (const [key, cfg] of Object.entries(nestedCfgs)) {
      const flatRows: any[] = [];
      (Array.isArray(state.tenants) ? state.tenants : []).forEach((t: any) => {
        const arr = key === 'documents' ? (t.documents || []) : ((t.deposit && t.deposit.deductions) || []);
        arr.forEach((item: any) => {
          if (!item || !item.id) return;
          flatRows.push(Object.assign({}, item, { tenantId: t.id }));
        });
      });

      const snapKey = 'tenant_' + key;
      const prevCat = snapshot[snapKey] || {};
      const catSnap: Record<string, any> = {};
      const upserts: any[] = [];
      flatRows.forEach(jsRow => {
        const dbRow = this.toRow(cfg.fields, jsRow);
        const json = JSON.stringify(dbRow);
        catSnap[jsRow.id] = { id: jsRow.id, json };
        if (!prevCat[jsRow.id] || prevCat[jsRow.id].json !== json) upserts.push(dbRow);
      });
      newSnapshot[snapKey] = catSnap;

      const newKeys = new Set(Object.keys(catSnap));
      const deleteIds = Object.entries(prevCat)
        .filter(([k]) => !newKeys.has(k))
        .map(([, v]: any) => v.id)
        .filter(Boolean);

      if (upserts.length > 0) {
        requests.push(
          fetch(`${baseUrl}/rest/v1/${cfg.table}?on_conflict=${cfg.onConflict}`, {
            method: 'POST', headers, body: JSON.stringify(upserts)
          }).then(async r => {
            if (!r.ok) throw new Error(`บันทึก ${cfg.table} ไม่สำเร็จ: ${await r.text() || r.statusText}`);
          })
        );
      }
      if (deleteIds.length > 0) {
        const idList = deleteIds.map(id => `"${String(id).replace(/"/g, '')}"`).join(',');
        requests.push(
          fetch(`${baseUrl}/rest/v1/${cfg.table}?id=in.(${idList})`, {
            method: 'DELETE', headers
          }).then(async r => {
            if (!r.ok) throw new Error(`ลบข้อมูล ${cfg.table} ไม่สำเร็จ: ${await r.text() || r.statusText}`);
          })
        );
      }
    }

    for (const [category, cfg] of Object.entries(singleCfgs)) {
      const obj = state[category] || {};
      const row = this.toRow(cfg.fields, obj);
      row.id = 1;
      requests.push(
        fetch(`${baseUrl}/rest/v1/${cfg.table}?on_conflict=id`, {
          method: 'POST', headers, body: JSON.stringify(row)
        }).then(async r => {
          if (!r.ok) throw new Error(`บันทึก ${cfg.table} ไม่สำเร็จ: ${await r.text() || r.statusText}`);
        })
      );
    }

    await Promise.all(requests);
    this.saveSnapshot(newSnapshot);
    return { status: 'success', message: 'บันทึกข้อมูลเรียบร้อย' };
  }
}
