export function generateId(prefix?: string): string {
    let uuid: string;
    
    // Safety check for crypto and randomUUID
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        uuid = crypto.randomUUID();
    } else if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
        uuid = window.crypto.randomUUID();
    } else {
        // Fallback: pseudo-UUID (compliant with UUID format 8-4-4-4-12)
        const hex = (len: number) => {
            let res = '';
            while (res.length < len) {
                res += Math.random().toString(16).substring(2);
            }
            return res.substring(0, len);
        };
        uuid = `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
    }

    if (prefix) {
        // Custom short format if prefix is provided (like lead_abc123_def)
        const parts = uuid.split('-');
        return `${prefix}_${parts[0]}_${parts[1] || '0000'}`;
    }

    return uuid;
}
