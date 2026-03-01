import { supabase } from './supabase'

export interface BranchStats {
    total: number;
    vip: number;
    birthdays: number;
    birthdayIds: string[]; // Lưu list ID để tránh filter SQL lỗi
    birthdayMonth?: number; // Tháng đang lưu cache
}

export interface StatsCache {
    [branchId: string]: BranchStats;
}

const CACHE_TABLE = 'crm_stats_cache';

/**
 * Engine tính toán lại toàn bộ số liệu khách hàng
 * Quét toàn bộ 31,700+ hồ sơ theo từng đợt
 */
export async function syncCustomerStats(targetMonthIndex?: number) {
    console.log('StatsEngine: Bắt đầu tính toán lại số liệu...');

    const searchMonth = targetMonthIndex !== undefined ? targetMonthIndex : new Date().getMonth();

    const stats: StatsCache = {
        'all': { total: 0, vip: 0, birthdays: 0, birthdayIds: [], birthdayMonth: searchMonth }
    };

    let processedWithBirthday = 0;
    let birthdayMatches = 0;
    const sampleDates: string[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('crm_customers')
            .select('id, branch_id, is_vip, birthday')
            .range(from, from + step - 1);

        if (error) {
            console.error('StatsEngine Error:', error);
            break;
        }
        if (!data || data.length === 0) break;

        data.forEach(customer => {
            const bId = customer.branch_id || 'hq';
            if (!stats[bId]) {
                stats[bId] = { total: 0, vip: 0, birthdays: 0, birthdayIds: [], birthdayMonth: searchMonth };
            }

            // High-Precision Birthday Logic
            let isBirthday = false;
            if (customer.birthday) {
                processedWithBirthday++;
                if (sampleDates.length < 20) sampleDates.push(customer.birthday);

                try {
                    const bStr = customer.birthday.toString().trim();
                    const parts = bStr.split(/[\/\-\.]/).map((p: string) => parseInt(p));

                    // Logic: Month is usually index 1 in VN (DD/MM) or ISO (YYYY-MM)
                    // But some might use US (MM/DD)
                    // searchMonth is 0-indexed (Jan=0, Feb=1)
                    const targetMonth = searchMonth + 1; // Feb = 2

                    if (parts.length >= 2) {
                        // Case 1: YYYY-MM-DD
                        if (customer.birthday.toString().startsWith('20') || (bStr.includes('-') && bStr.split('-')[0].length === 4)) {
                            if (parts[1] === targetMonth) isBirthday = true;
                        }
                        // Case 2: DD/MM/YYYY or DD-MM-YYYY
                        else if (parts[1] === targetMonth) {
                            isBirthday = true;
                        }
                        // Case 3: MM/DD/YYYY?
                        else if (parts[0] === targetMonth && parts[1] > 12) {
                            isBirthday = true;
                        }
                        // Case 4: Short DD/MM
                        else if (parts.length === 2 && parts[1] === targetMonth) {
                            isBirthday = true;
                        }
                    }

                    // Strict backup with Date object is intentionally removed.
                    // JS new Date() erroneously parses DD/MM/YYYY as MM/DD/YYYY,
                    // causing birthdays on the 3rd of any month to be matched as March birthdays.
                } catch (e) { }
            }

            // Increment specific branch stats
            stats[bId].total++;
            if (customer.is_vip) stats[bId].vip++;
            if (isBirthday) {
                birthdayMatches++;
                stats[bId].birthdays++;
                stats[bId].birthdayIds.push(customer.id);
            }

            // Increment GLOBAL stats
            stats['all'].total++;
            if (customer.is_vip) stats['all'].vip++;
            if (isBirthday) {
                stats['all'].birthdays++;
                stats['all'].birthdayIds.push(customer.id);
            }
        });

        from += data.length;
        if (data.length < step) break;
    }

    console.log('StatsEngine: Kết quả phân tích:', {
        totalRecords: stats['all'].total,
        recordsWithBirthdayField: processedWithBirthday,
        birthdayMatchesInMonth: birthdayMatches,
        monthSearching: searchMonth + 1,
        samples: sampleDates
    });

    // Lưu vào Database Cache
    const entries = Object.entries(stats).map(([id, data]) => ({
        id,
        stats_data: data,
        updated_at: new Date().toISOString()
    }));

    const { error: upsertError } = await supabase
        .from(CACHE_TABLE)
        .upsert(entries);

    if (upsertError) {
        console.error('StatsEngine: Không thể lưu cache vào DB (Có thể chưa tạo bảng). Sử dụng LocalStorage làm dự phòng.');
        if (typeof window !== 'undefined') {
            localStorage.setItem('crm_stats_cache_fallback', JSON.stringify(stats));
        }
    }

    const branchBreakdown: Record<string, number> = {};
    Object.entries(stats).forEach(([id, s]) => {
        if (id !== 'all') branchBreakdown[id] = s.birthdays;
    });
    console.log('StatsEngine: Hoàn tất tính toán.', {
        totalGlobal: stats['all'].total,
        birthdaysGlobal: stats['all'].birthdays,
        branchBreakdown
    });
    return stats;
}

/**
 * Lấy số liệu nhanh từ Cache
 */
export async function getCachedStats(branchId: string = 'all', targetMonthIndex?: number): Promise<BranchStats | null> {
    const searchMonth = targetMonthIndex !== undefined ? targetMonthIndex : new Date().getMonth();

    // 1. Thử lấy từ Database trước
    const { data, error } = await supabase
        .from(CACHE_TABLE)
        .select('stats_data, updated_at')
        .eq('id', branchId)
        .single();

    if (data && !error && data.updated_at) {
        const cachedData = data.stats_data as BranchStats;
        if (cachedData.birthdayMonth !== searchMonth) {
            console.log(`StatsEngine: Cache is for month ${cachedData.birthdayMonth}, but requested ${searchMonth}. Returning null.`);
            return null;
        }
        return cachedData;
    }

    // 2. Dự phòng từ LocalStorage
    if (typeof window !== 'undefined') {
        const localRaw = localStorage.getItem('crm_stats_cache_fallback');
        if (localRaw) {
            const parsed = JSON.parse(localRaw);
            return parsed[branchId] || null;
        }
    }

    return null;
}
