/**
 * Tiện ích xử lý ngày giờ chuẩn Việt Nam (GMT+7)
 */

/**
 * Chuyển một đối tượng Date sang chuỗi YYYY-MM-DD theo giờ Việt Nam
 */
export const getVNString = (date: Date) => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

/**
 * Trả về chuỗi ngày hiện tại theo giờ Việt Nam (YYYY-MM-DD)
 */
export const getVNToday = () => getVNString(new Date());

/**
 * Trả về giờ hiện tại Việt Nam (HH:mm)
 */
export const getVNTime = () => {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date());
}

/**
 * Định dạng hiển thị ngày giờ Việt Nam từ chuỗi ISO
 */
export const formatVN = (dateStr?: string | Date, options: Intl.DateTimeFormatOptions = {}) => {
    if (!dateStr) return '—';
    try {
        const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
        return d.toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            ...options
        });
    } catch (e) {
        return '—';
    }
}

/**
 * Lấy tháng hiện tại Việt Nam (1-12)
 */
export const getVNMonth = () => {
    return parseInt(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        month: '2-digit',
    }).format(new Date()));
}

/**
 * Lấy năm hiện tại Việt Nam
 */
export const getVNYear = () => {
    return parseInt(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
    }).format(new Date()));
}

/**
 * Lấy chuỗi YYYY-MM từ một ngày (mặc định là hôm nay)
 */
export const getVNMonthStr = (date: Date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    return `${year}-${month}`;
}
