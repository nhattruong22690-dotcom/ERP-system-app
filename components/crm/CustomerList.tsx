import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Customer, User, Branch, Appointment } from '@/lib/types';
import { getCachedStats, syncCustomerStats, BranchStats } from '@/lib/customerStatsEngine';
import { canViewAllBranches } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import CustomerProfileModal from './CustomerProfileModal';
import CustomerFormModal from './CustomerFormModal';
import {
    Users,
    Crown,
    Cake,
    TrendingUp,
    Search,
    UserPlus,
    Edit3,
    Trash2,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Phone,
    Mail,
    Calendar,
    Fingerprint,
    Loader2,
    RefreshCw
} from 'lucide-react';
import RankAvatar from './RankAvatar';

interface CustomerListProps {
    currentUser: User;
    onNavigate: (tab: string) => void;
    branches: Branch[];
    customers: Customer[];
    appointments: Appointment[];
    onDeleteCustomer: (id: string) => void;
    onUpdateTreatmentCard?: (customerId: string, updatedCard: any) => void;
    onDeleteTreatmentCard?: (customerId: string, cardId: string) => void;
    onViewCustomer: (customer: Customer) => void;
    onOpenForm: (customer?: Customer) => void;
    customerStats?: {
        total: number
        vip: number
        birthdays: number
    }
}

const ITEMS_PER_PAGE = 25;

const CustomerList: React.FC<CustomerListProps> = ({
    currentUser,
    onNavigate,
    branches,
    customers,
    appointments,
    onDeleteCustomer,
    onUpdateTreatmentCard,
    onDeleteTreatmentCard,
    onViewCustomer,
    onOpenForm,
    customerStats
}) => {
    const [selectedTab, setSelectedTab] = useState<string>('all');
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
    const [filterRank, setFilterRank] = useState<string>('all');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Customer[]>([]);
    const [searchCount, setSearchCount] = useState<number | null>(null);
    const [localStats, setLocalStats] = useState<BranchStats | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const canViewAll = canViewAllBranches(currentUser);

    const fetchRemoteData = useCallback(async () => {
        // Always fetch stats first
        const targetBranch = (selectedBranchFilter === 'all' && canViewAll) ? 'all' : (selectedBranchFilter === 'all' ? currentUser.branchId : selectedBranchFilter);
        let cached = await getCachedStats(targetBranch || 'all');

        if (!cached) {
            console.log("CustomerList: Cache missing or expired. Automatically syncing...");
            setIsSyncing(true);
            await syncCustomerStats();
            cached = await getCachedStats(targetBranch || 'all');
            setIsSyncing(false);
        }

        if (cached) setLocalStats(cached);

        // Skip fetching all customers if no filter/search is active
        const isSearchActive = searchTerm.trim().length >= 2;
        const isTabActive = selectedTab !== 'all';
        const isRankActive = filterRank !== 'all';
        const isBranchFilterActive = selectedBranchFilter !== 'all' || (!canViewAll && currentUser.branchId);

        if (!isSearchActive && !isTabActive && !isRankActive && !isBranchFilterActive && selectedTab === 'all') {
            setSearchResults([]);
            setSearchCount(0);
            return;
        }

        setIsSearching(true);
        try {
            let query = supabase
                .from('crm_customers')
                .select('*', { count: 'exact' });

            if (selectedBranchFilter !== 'all') {
                query = query.eq('branch_id', selectedBranchFilter);
            } else if (!canViewAll && currentUser.branchId) {
                query = query.eq('branch_id', currentUser.branchId);
            }

            if (isSearchActive) {
                const lowerTerm = searchTerm.trim();
                query = query.or(`full_name.ilike.%${lowerTerm}%,phone.ilike.%${lowerTerm}%,email.ilike.%${lowerTerm}%`);
            } else if (selectedTab === 'vip') {
                query = query.eq('is_vip', true);
            } else if (selectedTab === 'birthdays') {
                if (cached?.birthdayIds && cached.birthdayIds.length > 0) {
                    query = query.in('id', cached.birthdayIds.slice(0, 199));
                } else {
                    setSearchResults([]);
                    setSearchCount(0);
                    setIsSearching(false);
                    return;
                }
            }

            if (filterRank !== 'all') query = query.eq('rank', filterRank);

            const start = (currentPage - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE - 1;

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(start, end);

            if (error) throw error;

            if (data) {
                const mapped = data.map((c: any) => ({
                    id: c.id, fullName: c.full_name, avatar: c.avatar, phone: c.phone, phone2: c.phone2,
                    email: c.email, gender: c.gender, facebook: c.facebook, zalo: c.zalo,
                    address: c.address, birthday: c.birthday, rank: c.rank as any,
                    points: c.points || 0, totalSpent: c.total_spent || 0,
                    lastVisit: c.last_visit || 'Chưa có', branchId: c.branch_id,
                    isVip: c.is_vip, professionalNotes: c.professional_notes,
                    createdAt: c.created_at, updatedAt: c.updated_at
                }));

                setSearchResults(mapped);
                setSearchCount(count);
            }
        } catch (err) {
            console.error('Fetch error details:', err);
        } finally {
            setIsSearching(false);
        }
    }, [selectedBranchFilter, selectedTab, searchTerm, filterRank, canViewAll, currentUser.branchId, currentPage]);

    const handleSync = async () => {
        setIsSyncing(true);
        await syncCustomerStats();
        const bIdForStats = selectedBranchFilter === 'all' ? 'all' : selectedBranchFilter;
        const cached = await getCachedStats(bIdForStats);
        if (cached) setLocalStats(cached);
        await fetchRemoteData();
        setIsSyncing(false);
    };

    useEffect(() => {
        if (!canViewAll && currentUser.branchId) {
            setSelectedBranchFilter(currentUser.branchId);
        }
    }, [currentUser, canViewAll]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedTab, selectedBranchFilter, searchTerm, filterRank]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchRemoteData();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchRemoteData]);

    const currentMonth = new Date().getMonth();
    const paginatedCustomers = searchResults;

    const effectiveTotal = searchCount ?? 0;
    const totalPages = Math.ceil(effectiveTotal / ITEMS_PER_PAGE);
    const startRange = effectiveTotal > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
    const endRange = Math.min(currentPage * ITEMS_PER_PAGE, effectiveTotal);

    return (
        <div className="flex flex-col h-full space-y-8 animate-fade-in p-10">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
                <div
                    onClick={() => setSelectedTab('all')}
                    className={`bg-white p-8 rounded-[40px] shadow-luxury border border-gold-light/20 relative overflow-hidden group cursor-pointer transition-all duration-500 hover:scale-[1.05] ${selectedTab === 'all' ? 'ring-4 ring-gold-light/50 border-gold-muted/40' : ''}`}
                >
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-gold-light/5 rounded-full blur-3xl group-hover:bg-gold-light/10 transition-colors"></div>
                    <div className="flex items-center gap-5 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-gold-light/30 flex items-center justify-center text-gold-muted shadow-sm border border-gold-light/10">
                            <Users size={28} strokeWidth={1.5} />
                        </div>
                        <span className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.3em]">Tổng khách hàng</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-4xl font-serif font-black text-text-main tabular-nums italic whitespace-nowrap">
                            {(localStats?.total ?? 0).toLocaleString()}
                        </h2>
                        <span className="text-[10px] font-black text-text-soft/40 uppercase tracking-widest italic whitespace-nowrap">Hồ sơ</span>
                    </div>
                </div>

                <div
                    onClick={() => setSelectedTab('vip')}
                    className={`bg-white p-8 rounded-[40px] shadow-luxury border border-gold-light/20 relative overflow-hidden group cursor-pointer transition-all duration-500 hover:scale-[1.05] ${selectedTab === 'vip' ? 'ring-4 ring-gold-light/50 border-gold-muted/40' : ''}`}
                >
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-gold-light/5 rounded-full blur-3xl group-hover:bg-gold-light/10 transition-colors"></div>
                    <div className="flex items-center gap-5 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-900 flex items-center justify-center text-gold-muted shadow-sm border border-indigo-800">
                            <Crown size={28} strokeWidth={1.5} />
                        </div>
                        <span className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.3em]">Khách hàng VIP</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-4xl font-serif font-black text-gold-muted tabular-nums italic whitespace-nowrap">
                            {(localStats?.vip ?? 0).toLocaleString()}
                        </h2>
                        <span className="text-[10px] font-black text-gold-muted uppercase tracking-widest italic opacity-60 whitespace-nowrap">Khách hàng VIP</span>
                    </div>
                </div>

                <div
                    onClick={() => setSelectedTab('birthdays')}
                    className={`bg-white p-8 rounded-[40px] shadow-luxury border border-gold-light/20 relative overflow-hidden group cursor-pointer transition-all duration-500 hover:scale-[1.05] ${selectedTab === 'birthdays' ? 'ring-4 ring-gold-light/50 border-gold-muted/40' : ''}`}
                >
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-pink-50 rounded-full blur-3xl group-hover:bg-pink-100 transition-colors"></div>
                    <div className="flex items-center gap-5 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-sm border border-rose-100">
                            <Cake size={28} strokeWidth={1.5} />
                        </div>
                        <span className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.3em]">Sinh nhật T{currentMonth + 1}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-4xl font-serif font-black text-rose-600 tabular-nums italic whitespace-nowrap">
                            {(localStats?.birthdays ?? 0).toLocaleString()}
                        </h2>
                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest italic opacity-60 whitespace-nowrap">Khách hàng</span>
                    </div>
                </div>

                <div className="bg-text-main p-8 rounded-[40px] shadow-luxury border border-white/5 relative overflow-hidden group transition-all duration-500 hover:scale-[1.05]">
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
                    <div className="flex items-center gap-5 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-gold-muted shadow-sm border border-white/5">
                            <TrendingUp size={28} strokeWidth={1.5} />
                        </div>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Tỉ lệ quay lại</span>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="absolute right-6 top-8 p-2 text-white/20 hover:text-gold-muted transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h2 className="text-4xl font-serif font-black text-white tabular-nums italic">84%</h2>
                        <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">+5.2%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 border-b border-gold-light/10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white">
                <div className="flex gap-2 p-1.5 bg-beige-soft/50 rounded-2xl">
                    {['all', 'vip', 'birthdays'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setSelectedTab(tab)}
                            className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center ${selectedTab === tab ? 'bg-gold-muted text-white shadow-lg shadow-gold-muted/20' : 'text-text-soft hover:text-gold-muted hover:bg-white'}`}
                        >
                            {tab === 'all' ? 'Tất cả' : tab === 'vip' ? 'Khách VIP' : `Sinh nhật T${currentMonth + 1}`}
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] ${selectedTab === tab ? 'bg-white/20 text-white' : 'bg-gold-light/20 text-gold-muted'}`}>
                                {tab === 'all' ? (localStats?.total ?? 0).toLocaleString() : tab === 'vip' ? (localStats?.vip ?? 0).toLocaleString() : (localStats?.birthdays ?? 0).toLocaleString()}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap gap-4 w-full xl:w-auto items-center">
                    {canViewAll && (
                        <select
                            className="bg-beige-soft/50 border-none rounded-2xl px-6 py-3 text-xs font-bold focus:ring-2 focus:ring-gold-muted/20 transition-all cursor-pointer min-w-[200px] text-text-main"
                            value={selectedBranchFilter}
                            onChange={(e) => setSelectedBranchFilter(e.target.value)}
                        >
                            <option value="all">Tất cả chi nhánh</option>
                            {branches.filter(b => b.type === 'spa').map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    )}

                    <div className="relative flex-1 lg:w-80">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            {isSearching ? (
                                <Loader2 className="text-gold-muted animate-spin" size={16} />
                            ) : (
                                <Search className="text-gold-muted/50" size={16} strokeWidth={1.5} />
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên, số điện thoại..."
                            className="w-full pl-12 pr-6 py-3 bg-beige-soft/50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-gold-muted/20 transition-all placeholder:text-text-soft/40"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => onOpenForm()}
                        className="px-6 py-3 bg-text-main text-white rounded-[15px] text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted hover:shadow-gold-muted/20 transition-all duration-300 flex items-center gap-2 active:scale-95 group"
                    >
                        <UserPlus size={18} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                        Thêm khách hàng
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto flex-1 luxury-scrollbar">
                <table className="w-full text-left luxury-table border-collapse">
                    <thead>
                        <tr className="bg-beige-soft/50 border-b border-gold-light/20">
                            <th className="w-6 p-0 bg-gold-muted/5 border-r border-gold-light/10" />
                            <th className="px-6 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest pl-10">Chân dung</th>
                            <th className="px-10 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest">Định danh</th>
                            <th className="px-10 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest">Liên hệ</th>
                            <th className="px-10 py-5 text-right w-32" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gold-light/10">
                        {paginatedCustomers.map((customer) => (
                            <tr
                                key={customer.id}
                                className="hover:bg-beige-soft/30 transition-colors group cursor-pointer relative"
                                onClick={() => onViewCustomer(customer)}
                            >
                                <td className="w-6 p-0 relative overflow-hidden bg-gold-muted/5 group-hover:bg-gold-muted/10 transition-colors border-r border-gold-light/10">
                                    <div className="absolute inset-0 flex items-center justify-center p-0">
                                        <span className="rotate-[-90deg] whitespace-nowrap text-[14px] font-black tracking-tighter text-gold-muted opacity-60 flex items-center justify-center uppercase">
                                            {branches.find(b => b.id === customer.branchId)?.code || 'HQ'}
                                        </span>
                                    </div>
                                </td>

                                <td className="px-6 py-8 md:px-10">
                                    <div className="flex flex-col items-center justify-center gap-3 w-[100px] relative">
                                        <div className="relative">
                                            <RankAvatar
                                                src={customer.avatar || `https://ui-avatars.com/api/?name=${customer.fullName}&background=FAF7F2&color=C5A059&bold=true`}
                                                rank={customer.rank}
                                                size={80}
                                            />
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm z-10 animate-pulse"></div>
                                            {customer.isVip && (
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 z-[15] w-16 h-12 flex items-center justify-center">
                                                    <img
                                                        src="/images/vip-badge-luxury.png"
                                                        alt="VIP"
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                <td className="px-10 py-8">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-[16px] font-bold text-text-main group-hover:text-gold-muted transition-colors tracking-tight leading-tight text-tight-wrap max-w-[200px]">
                                            {customer.fullName}
                                        </h3>
                                        <div className="flex items-center gap-2 bg-gold-light/5 px-3 py-1.5 rounded-xl border border-gold-light/10 w-fit force-nowrap flex-shrink-0">
                                            <Fingerprint size={14} className="text-gold-muted flex-shrink-0" />
                                            <span className="text-[10px] text-text-soft font-black uppercase tracking-widest">
                                                {customer.id.replace(/-/g, '').slice(0, 10).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-6 md:px-10">
                                    <div className="flex flex-col gap-1.5 min-w-[max-content]">
                                        <div className="flex items-center gap-2 text-[12px] md:text-[13px] font-bold text-text-main">
                                            <div className="w-5 h-5 rounded-lg bg-gold-muted/5 flex items-center justify-center">
                                                <Phone size={10} className="text-gold-muted" />
                                            </div>
                                            {customer.phone}
                                        </div>
                                        {customer.email && (
                                            <div className="flex items-center gap-2 text-[10px] text-text-soft italic ml-7">
                                                {customer.email}
                                            </div>
                                        )}
                                    </div>
                                </td>

                                <td className="px-6 py-6 text-right md:px-10">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onOpenForm(customer); }}
                                            className="w-10 h-10 flex items-center justify-center bg-white text-gold-muted hover:bg-gold-light/10 border border-transparent hover:border-gold-light/30 rounded-xl transition-all shadow-sm active:scale-90"
                                        >
                                            <Edit3 size={15} strokeWidth={2} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); if (confirm('Xóa khách hàng này?')) onDeleteCustomer(customer.id); }}
                                            className="w-10 h-10 flex items-center justify-center bg-white text-rose-300 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all shadow-sm active:scale-90"
                                        >
                                            <Trash2 size={15} strokeWidth={2} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {!isSearching && effectiveTotal === 0 && (
                    <div className="py-32 flex flex-col items-center justify-center text-text-soft/20 text-center">
                        <Search size={64} strokeWidth={1} className="mb-4 opacity-20" />
                        <p className="text-sm font-black uppercase tracking-widest text-text-soft/40 max-w-xs">
                            {searchTerm.trim().length > 0 ? 'Không tìm thấy kết quả' : 'Nhập tìm kiếm hoặc chọn thẻ ở trên để xem dữ liệu'}
                        </p>
                    </div>
                )}

                {isSearching && (
                    <div className="py-32 flex flex-col items-center justify-center gap-4">
                        <Loader2 size={40} className="animate-spin text-gold-muted" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-soft">Đang đồng bộ dữ liệu...</span>
                    </div>
                )}
            </div>

            <div className="p-8 bg-beige-soft/30 border-t border-gold-light/10 flex items-center justify-between">
                <p className="text-[10px] font-black text-text-soft uppercase tracking-[0.2em] opacity-40">
                    Hiển thị {effectiveTotal > 0 ? startRange : 0} - {endRange} <span className="mx-2">/</span> {effectiveTotal} Hồ sơ
                </p>
                <div className="flex gap-4">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="w-12 h-12 flex items-center justify-center bg-white border border-gold-light/20 rounded-2xl disabled:opacity-20 hover:border-gold-muted hover:text-gold-muted transition-all shadow-sm active:scale-90"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex items-center px-4 text-[12px] font-black text-text-main uppercase tracking-widest tabular-nums">
                        Trang {currentPage} <span className="mx-2 text-gold-muted/30">/</span> {totalPages || 1}
                    </div>
                    <button
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="w-12 h-12 flex items-center justify-center bg-white border border-gold-light/20 rounded-2xl disabled:opacity-20 hover:border-gold-muted hover:text-gold-muted transition-all shadow-sm active:scale-90"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerList;
