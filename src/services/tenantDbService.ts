export class TenantDBService {
  static getSavedSupabaseUrl(): string {
    if (typeof window === 'undefined') return '';
    const fromParam = new URLSearchParams(window.location.search).get('supabaseUrl');
    if (fromParam) {
      const cleaned = this.cleanUrl(fromParam);
      if (cleaned) {
        localStorage.setItem('HOSTEL_APARTMENT_SAVED_SUPABASE_URL', cleaned);
        return cleaned;
      }
    }
    return localStorage.getItem('HOSTEL_APARTMENT_SAVED_SUPABASE_URL') || '';
  }

  static getSavedTenantApiKey(): string {
    if (typeof window === 'undefined') return '';
    const fromParam = new URLSearchParams(window.location.search).get('apiKey');
    if (fromParam && fromParam.startsWith('eyJ')) {
      localStorage.setItem('HOSTEL_APARTMENT_SAVED_TENANT_API_KEY', fromParam);
      return fromParam;
    }
    return localStorage.getItem('HOSTEL_APARTMENT_SAVED_TENANT_API_KEY') || '';
  }

  static cleanUrl(url: string): string {
    if (!url) return '';
    try {
      const parsed = new URL(url.trim());
      parsed.searchParams.delete('merge');
      return parsed.toString();
    } catch (e) {
      let u = url.trim();
      u = u.replace(/[&?]merge=true/g, '');
      return u;
    }
  }

  static getLoggedInTenant() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('HOSTEL_APARTMENT_LOGGED_IN_TENANT');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  static setLoggedInTenant(tenant: any) {
    if (typeof window === 'undefined') return;
    if (tenant) {
      localStorage.setItem('HOSTEL_APARTMENT_LOGGED_IN_TENANT', JSON.stringify(tenant));
    } else {
      localStorage.removeItem('HOSTEL_APARTMENT_LOGGED_IN_TENANT');
    }
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

  static async uploadBase64ToStorage(url: string, apiKey: string, base64Data: string, roomId: string, ext = 'png'): Promise<string> {
    if (!base64Data) return '';
    try {
      const baseUrl = this.getBaseSupabaseUrl(url);
      const parts = base64Data.split(';base64,');
      const mime = parts[0].split(':')[1] || 'image/png';
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: mime });

      const filename = `slip_${roomId}_${Date.now()}.${ext}`;
      const uploadUrl = `${baseUrl}/storage/v1/object/slips/${filename}`;

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': mime
        },
        body: blob
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`อัปโหลดรูปภาพไม่สำเร็จ: ${txt || res.statusText}`);
      }
      return `${baseUrl}/storage/v1/object/public/slips/${filename}`;
    } catch (e: any) {
      console.error('Storage upload error:', e);
      throw new Error('ระบบอัปโหลดสลิป/รูปภาพขัดข้อง: ' + e.message);
    }
  }

  static async getPublicState() {
    const url = this.getSavedSupabaseUrl();
    const apiKey = this.getSavedTenantApiKey() || localStorage.getItem('HOSTEL_APARTMENT_SAVED_API_KEY') || '';
    if (!url) {
      throw new Error('ไม่พบข้อมูลจุดเชื่อมต่อระบบฐานข้อมูล (Supabase URL)');
    }
    const baseUrl = this.getBaseSupabaseUrl(url);
    
    const res = await fetch(`${baseUrl}/rest/v1/rpc/get_room_list`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      throw new Error(`โหลดรายการห้องล้มเหลว: ${res.statusText}`);
    }
    
    const data = await res.json();
    if (data.status === 'error') {
      throw new Error(data.message || 'เกิดข้อผิดพลาดในการโหลดฐานข้อมูลห้อง');
    }
    return {
      settings: { apartmentName: data.apartmentName || 'ระบบจัดการห้องเช่า' },
      rooms: (data.rooms && Array.isArray(data.rooms)) ? data.rooms : [],
      invoices: [],
      tenants: [],
      repairs: [],
      events: []
    };
  }

  static async fetchTenantBill(idCard: string, roomId: string) {
    const url = this.getSavedSupabaseUrl();
    const apiKey = this.getSavedTenantApiKey() || localStorage.getItem('HOSTEL_APARTMENT_SAVED_API_KEY') || '';
    if (!url) {
      throw new Error('ไม่พบข้อมูลจุดเชื่อมต่อระบบฐานข้อมูล (Supabase URL)');
    }
    const baseUrl = this.getBaseSupabaseUrl(url);

    const res = await fetch(`${baseUrl}/rest/v1/rpc/get_tenant_bill`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_id_card: idCard,
        p_room_id: roomId
      })
    });
    
    if (!res.ok) {
      throw new Error(`โหลดบิลล้มเหลว: ${res.statusText}`);
    }
    
    return res.json();
  }

  static async submitPayment(paymentData: { idCard: string; roomId: string; invoiceNumber: string; paymentMethod: string; base64Slip: string; ext?: string }) {
    const url = this.getSavedSupabaseUrl();
    const apiKey = this.getSavedTenantApiKey() || localStorage.getItem('HOSTEL_APARTMENT_SAVED_API_KEY') || '';
    if (!url) {
      throw new Error('ไม่พบข้อมูลจุดเชื่อมต่อระบบฐานข้อมูล (Supabase URL)');
    }
    const baseUrl = this.getBaseSupabaseUrl(url);

    let slipUrl = '';
    if (paymentData.base64Slip) {
      slipUrl = await this.uploadBase64ToStorage(url, apiKey, paymentData.base64Slip, paymentData.roomId, paymentData.ext || 'png');
    }

    const res = await fetch(`${baseUrl}/rest/v1/rpc/submit_tenant_payment`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_id_card: paymentData.idCard,
        p_room_id: paymentData.roomId,
        p_invoice_number: paymentData.invoiceNumber,
        p_payment_method: paymentData.paymentMethod,
        p_slip_url: slipUrl
      })
    });

    if (!res.ok) {
      throw new Error(`ส่งข้อมูลชำระเงินล้มเหลว: ${res.statusText}`);
    }

    const result = await res.json();
    if (result.status === 'error') {
      throw new Error(result.message || 'เกิดข้อผิดพลาดในการทำรายการ');
    }
    return result;
  }

  static async submitRepair(repairData: { idCard: string; roomId: string; title: string; description: string; base64Image?: string; ext?: string }) {
    const url = this.getSavedSupabaseUrl();
    const apiKey = this.getSavedTenantApiKey() || localStorage.getItem('HOSTEL_APARTMENT_SAVED_API_KEY') || '';
    if (!url) {
      throw new Error('ไม่พบข้อมูลจุดเชื่อมต่อระบบฐานข้อมูล (Supabase URL)');
    }
    const baseUrl = this.getBaseSupabaseUrl(url);

    let imageUrl = '';
    if (repairData.base64Image) {
      imageUrl = await this.uploadBase64ToStorage(url, apiKey, repairData.base64Image, repairData.roomId, repairData.ext || 'png');
    }

    const res = await fetch(`${baseUrl}/rest/v1/rpc/submit_tenant_repair`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_id_card: repairData.idCard,
        p_room_id: repairData.roomId,
        p_title: repairData.title,
        p_description: repairData.description,
        p_image_url: imageUrl
      })
    });

    if (!res.ok) {
      throw new Error(`ส่งเรื่องแจ้งซ่อมล้มเหลว: ${res.statusText}`);
    }

    const result = await res.json();
    if (result.status === 'error') {
      throw new Error(result.message || 'เกิดข้อผิดพลาดในการทำรายการ');
    }
    return result;
  }
}
