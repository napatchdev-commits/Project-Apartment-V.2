import { DBService } from './dbService';

export class LineService {
  static createBillingMessage(
    invoice: any,
    propertyName: string | null | undefined,
    tenantUrl?: string,
    lineBotUrl?: string,
    isBroadcast = false
  ): string {
    const aptName = propertyName || 'ระบบจัดการหอพัก';
    let url = tenantUrl || (typeof window !== 'undefined' ? (localStorage.getItem('HOSTEL_TENANT_PORTAL_URL') || (window.location.origin + '/tenant')) : '');
    const botUrl = lineBotUrl !== undefined ? lineBotUrl : (typeof window !== 'undefined' ? (localStorage.getItem('HOSTEL_LINE_BOT_URL') || '') : '');

    const savedUrl = DBService.getSavedSupabaseUrl();
    const savedTenantKey = typeof window !== 'undefined' ? (localStorage.getItem('SOMBAT_APARTMENT_SAVED_TENANT_API_KEY') || '') : '';
    if (savedUrl) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}supabaseUrl=${encodeURIComponent(savedUrl)}`;
      if (savedTenantKey) url += `&apiKey=${encodeURIComponent(savedTenantKey)}`;
    }

    const greeting = (isBroadcast || !invoice || !invoice.tenantName) 
      ? 'เรียนผู้เช่าทุกท่าน' 
      : `เรียน คุณ${invoice.tenantName}`;

    let msg = `🏠 ${aptName}\n\n📢 แจ้งเตือนค่าเช่าประจำเดือน\n\n${greeting}\n\nระบบได้ออกบิลประจำเดือนเรียบร้อยแล้ว\n\nกรุณาเข้าสู่ระบบผู้เช่า\nเพื่อตรวจสอบรายละเอียดบิล\nและอัปโหลดหลักฐานการชำระเงิน\n\nกดที่นี่\n\n${url}`;

    if (botUrl && botUrl.trim()) {
      msg += `\n\nติดต่อสอบถาม / LINE Bot:\n${botUrl.trim()}`;
    }

    msg += `\n\nขอบคุณครับ`;

    return msg;
  }

  static createOverdueMessage(
    invoice: any,
    propertyName: string | null | undefined,
    tenantUrl?: string,
    lineBotUrl?: string
  ): string {
    const aptName = propertyName || 'ระบบจัดการหอพัก';
    let url = tenantUrl || (typeof window !== 'undefined' ? (localStorage.getItem('HOSTEL_TENANT_PORTAL_URL') || (window.location.origin + '/tenant')) : '');
    const botUrl = lineBotUrl !== undefined ? lineBotUrl : (typeof window !== 'undefined' ? (localStorage.getItem('HOSTEL_LINE_BOT_URL') || '') : '');

    const savedUrl = DBService.getSavedSupabaseUrl();
    const savedTenantKey = typeof window !== 'undefined' ? (localStorage.getItem('SOMBAT_APARTMENT_SAVED_TENANT_API_KEY') || '') : '';
    if (savedUrl) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}supabaseUrl=${encodeURIComponent(savedUrl)}`;
      if (savedTenantKey) url += `&apiKey=${encodeURIComponent(savedTenantKey)}`;
    }

    const greeting = (!invoice || !invoice.tenantName) 
      ? 'เรียนผู้เช่า' 
      : `เรียน คุณ${invoice.tenantName} (ห้อง ${invoice.roomName})`;

    const fineAmt = invoice.fineAmount || 0;
    const totalAmt = invoice.totalAmount || 0;

    let msg = `⚠️ แจ้งเตือนค้างชำระค่าเช่าเลยกำหนด ⚠️\n🏠 ${aptName}\n\n${greeting}\n\nขณะนี้บิลรอบเดือน ${invoice.monthKey} ของท่านยังไม่ได้ชำระและเลยกำหนดจ่ายแล้ว\n\n- ยอดค่าเช่าเดิม: ฿${(totalAmt - fineAmt).toLocaleString()}\n- ค่าปรับจ่ายล่าช้า: ฿${fineAmt.toLocaleString()}\n- ยอดค้างชำระรวม: ฿${totalAmt.toLocaleString()}\n\nกรุณาชำระเงินและแนบสลิปโดยด่วนที่สุดผ่านลิงก์ด้านล่างนี้ครับ:\n\n${url}`;

    if (botUrl && botUrl.trim()) {
      msg += `\n\nติดต่อสอบถาม / LINE Bot:\n${botUrl.trim()}`;
    }

    msg += `\n\nขอบคุณครับ`;

    return msg;
  }
}
