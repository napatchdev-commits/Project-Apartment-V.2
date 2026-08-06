export class Formatters {
  static currency(amount: number | string): string {
    return '฿' + (Number(amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  static thaiDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    if (String(dateStr).includes('-')) {
      const parts = String(dateStr).split('T')[0].split('-');
      if (parts.length === 3) {
        const yearBE = parseInt(parts[0], 10) + 543;
        const day = parts[2].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        return `${day}/${month}/${yearBE}`;
      }
    }
    return dateStr;
  }

  static parseThaiDateToISO(thDateStr: string | null | undefined): string {
    if (!thDateStr) return new Date().toISOString().slice(0, 10);
    if (String(thDateStr).includes('/')) {
      const parts = String(thDateStr).split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let yearAD = parseInt(parts[2], 10);
        if (yearAD > 2400) yearAD -= 543;
        return `${yearAD}-${month}-${day}`;
      }
    }
    return thDateStr;
  }

  static thaiMonthBE(monthKey: string | null | undefined): string {
    if (!monthKey) return '-';
    const parts = monthKey.split('-');
    if (parts.length !== 2) return monthKey;
    const yearBE = parseInt(parts[0], 10) + 543;
    const monthNum = parseInt(parts[1], 10);
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${months[monthNum - 1]} ${yearBE}`;
  }

  static formatIdCard(idCard: string | null | undefined): string {
    const clean = String(idCard || '').replace(/\D/g, '');
    if (clean.length !== 13) return idCard || '-';
    return `${clean.substring(0, 1)}-${clean.substring(1, 5)}-${clean.substring(5, 10)}-${clean.substring(10, 12)}-${clean.substring(12)}`;
  }

  static thaiBahtText(num: number | string): string {
    const floatNum = Number(num) || 0;
    if (floatNum === 0) return 'ศูนย์บาทถ้วน';
    const numbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    
    // Split into Baht and Satang
    const strVal = floatNum.toFixed(2);
    const [bahtStr, satangStr] = strVal.split('.');
    
    let text = '';
    const bahtLen = bahtStr.length;
    for (let i = 0; i < bahtLen; i++) {
      const digit = parseInt(bahtStr.charAt(i), 10);
      const pos = bahtLen - 1 - i;
      if (digit !== 0) {
        if (pos === 1 && digit === 1) text += 'สิบ';
        else if (pos === 1 && digit === 2) text += 'ยี่สิบ';
        else if (pos === 0 && digit === 1 && bahtLen > 1) text += 'เอ็ด';
        else text += numbers[digit] + units[pos];
      }
    }
    
    if (text) text += 'บาท';
    
    const satangVal = parseInt(satangStr, 10);
    if (satangVal > 0) {
      let satangText = '';
      const satangLen = satangStr.length;
      for (let i = 0; i < satangLen; i++) {
        const digit = parseInt(satangStr.charAt(i), 10);
        const pos = satangLen - 1 - i;
        if (digit !== 0) {
          if (pos === 1 && digit === 1) satangText += 'สิบ';
          else if (pos === 1 && digit === 2) satangText += 'ยี่สิบ';
          else if (pos === 0 && digit === 1 && satangLen > 1) satangText += 'เอ็ด';
          else satangText += numbers[digit] + units[pos];
        }
      }
      text += satangText + 'สตางค์';
    } else {
      text += 'ถ้วน';
    }
    
    return text;
  }
}
