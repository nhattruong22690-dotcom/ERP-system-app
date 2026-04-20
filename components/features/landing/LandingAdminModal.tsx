"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, QrCode, UserPlus, Camera, Loader2, Edit2, Trash2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/lib/supabase/supabase';

interface LandingAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: { id: string; fullName: string }) => void;
  initialTab?: 'entry' | 'scan' | 'search';
  scanOnly?: boolean;
}

export default function LandingAdminModal({ isOpen, onClose, onSelectCustomer, initialTab = 'entry', scanOnly = false }: LandingAdminModalProps) {
  const [activeTab, setActiveTab] = useState<'entry' | 'scan' | 'search'>(scanOnly ? 'scan' : initialTab);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cardValue, setCardValue] = useState('');
  const [branch, setBranch] = useState('');
  const [notes, setNotes] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isScannerStarted, setIsScannerStarted] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(scanOnly ? 'scan' : initialTab);
    }
  }, [isOpen, initialTab, scanOnly]);

  useEffect(() => {
    if (isOpen && activeTab === 'scan') {
      // Initialize instance once
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }
      
      // Auto-start if tab is active
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab]);

  const startScanner = async () => {
    if (!scannerRef.current || isScannerStarted) return;
    
    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // ignore common errors
        }
      );
      setIsScannerStarted(true);
    } catch (err) {
      console.error("Failed to start scanner:", err);
      // If error, it might be permission denied
      setIsScannerStarted(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScannerStarted) {
      try {
        await scannerRef.current.stop();
        setIsScannerStarted(false);
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }
  };

  const handleScanSuccess = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('landing_vips')
        .select('*')
        .eq('id', id)
        .single();
      
      if (data) {
        onSelectCustomer({ id: data.id, fullName: data.full_name });
        onClose();
      } else {
        alert("Không tìm thấy khách hàng với mã này.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFullName('');
    setPhone('');
    setBirthDate('');
    setCardValue('');
    setBranch('');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) return;
    setLoading(true);
    try {
      const payload = {
        full_name: fullName.toUpperCase(),
        phone_number: phone.trim() || null,
        birth_date: birthDate || null,
        card_value: cardValue ? parseFloat(cardValue) : 0,
        branch: branch.trim() || null,
        notes: notes.trim() || null
      };

      let res;
      if (editingId) {
        res = await supabase.from('landing_vips').update(payload).eq('id', editingId).select().single();
      } else {
        res = await supabase.from('landing_vips').insert([payload]).select().single();
      }
      
      if (res.error) throw res.error;
      
      if (res.data) {
        onSelectCustomer({ id: res.data.id, fullName: res.data.full_name });
        onClose();
        resetForm();
      }
    } catch (err) {
      console.error(err);
      alert(`Lỗi khi ${editingId ? 'cập nhật' : 'tạo'} thẻ: ` + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: any) => {
    setEditingId(customer.id);
    setFullName(customer.full_name || '');
    setPhone(customer.phone_number || '');
    setBirthDate(customer.birth_date || '');
    setCardValue(customer.card_value || '');
    setBranch(customer.branch || '');
    setNotes(customer.notes || '');
    setActiveTab('entry');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có đồng ý XÓA VĨNH VIỄN khách hàng \n${name}?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('landing_vips').delete().eq('id', id);
      if (error) throw error;
      setSearchResults(prev => prev.filter(c => c.id !== id));
      // Nếu customer đang được chọn hiện tại trên landing page bị xóa thì sao? (tạm bỏ qua)
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('landing_vips')
        .select('*')
        .ilike('full_name', `%${searchTerm}%`)
        .limit(5);
      
      if (data) setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {scanOnly ? <QrCode size={20} className="text-gray-600" /> : <UserPlus size={20} className="text-gray-600" />}
            {scanOnly ? 'Quét Thẻ VIP' : 'Cài đặt Thẻ VIP'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs - Only show if not scanOnly */}
        {!scanOnly && (
          <div className="flex border-b border-gray-100 bg-gray-50/30">
          <button 
            onClick={() => {
              setActiveTab('entry');
              resetForm();
            }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'entry' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {editingId ? 'Cập nhật' : 'Nhập mới'}
          </button>
          <button 
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'search' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Tìm kiếm
          </button>
          <button 
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'scan' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Quét QR
          </button>
        </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'entry' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Họ và tên khách hàng *</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all uppercase font-medium"
                  placeholder="VD: NGUYỄN VĂN A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Số điện thoại</label>
                  <input 
                    type="tel" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                    placeholder="VD: 0912..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Ngày Sinh</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Giá trị thẻ (VNĐ)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="1000"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                    placeholder="VD: 5000000"
                    value={cardValue}
                    onChange={(e) => setCardValue(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Chi nhánh</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                    placeholder="VD: CN Quận 1"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Chú thích</label>
                <textarea 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium resize-none h-20"
                  placeholder="Thêm thông tin..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button 
                onClick={handleSubmit}
                disabled={loading || !fullName.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (editingId ? <Edit2 size={18} /> : <UserPlus size={18} />)}
                {editingId ? 'Lưu Thay Đổi' : 'Tạo Thẻ & Lưu'}
              </button>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  autoFocus
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                  placeholder="Tìm theo tên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="space-y-3">
                {searchResults.map((customer) => (
                  <div 
                    key={customer.id}
                    className="w-full p-4 hover:bg-gray-50 border border-gray-100 rounded-xl transition-all flex items-center justify-between group bg-white shadow-sm"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase truncate">
                        {customer.full_name}
                      </p>
                      <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-gray-400 mt-1 font-medium">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded uppercase font-bold text-gray-500">
                          {customer.id}
                        </span>
                        {customer.phone_number && <span>• {customer.phone_number}</span>}
                        {customer.branch && <span>• {customer.branch}</span>}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          onSelectCustomer({ id: customer.id, fullName: customer.full_name });
                          onClose();
                        }}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                        title="Chọn và Hiển thị thẻ"
                      >
                        <QrCode size={18} />
                      </button>
                      <button 
                        onClick={() => handleEdit(customer)}
                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(customer.id, customer.full_name)}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                        title="Xóa khách hàng"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'scan' && (
            <div className="space-y-4">
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center">
                <div id="reader" className="w-full h-full"></div>
                
                {!isScannerStarted && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-50/90 gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse">
                      <Camera size={32} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Sẵn sàng quét mã</p>
                      <p className="text-xs text-gray-500 mt-1">Vui lòng cho phép truy cập camera để tiếp tục</p>
                    </div>
                    <button 
                      onClick={startScanner}
                      className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      Bắt đầu quét
                    </button>
                  </div>
                )}
              </div>

              {isScannerStarted && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-center text-xs text-blue-600 font-medium animate-pulse">
                    Đang tìm mã QR trong khung hình...
                  </p>
                  <button 
                    onClick={stopScanner}
                    className="px-4 py-2 text-gray-400 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest border border-gray-100 hover:border-red-100 rounded-lg transition-all"
                  >
                    Dừng quét
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Bảo mật thông tin bởi Xinh Group</p>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ size, className }: { size: number, className: string }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>;
}
