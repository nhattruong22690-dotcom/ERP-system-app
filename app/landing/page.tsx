"use client";
import React, { useRef, useState, useEffect, Suspense } from 'react';
import * as htmlToImage from 'html-to-image';
import { useSearchParams, useRouter } from 'next/navigation';

import LandingAdminModal from '@/components/features/landing/LandingAdminModal';
import { Settings, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase/supabase';

function LandingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlId = searchParams.get('id');

  const abbreviateName = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 3) return name;
    const first = parts[0];
    const last = parts[parts.length - 1];
    const middle = parts.slice(1, parts.length - 1).map(p => p[0].toUpperCase() + '.').join(' ');
    return `${first} ${middle} ${last}`;
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<any>(null);
  
  // No mock data, start with null
  const [customerData, setCustomerData] = useState<{id: string, fullName: string} | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminModalInitialTab, setAdminModalInitialTab] = useState<'entry' | 'scan' | 'search'>('entry');
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(!!urlId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch data if ID is present in URL
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!urlId) return;
      try {
        const { data, error } = await supabase
          .from('landing_vips')
          .select('*')
          .eq('id', urlId)
          .single();
        
        if (data && !error) {
          setCustomerData({ id: data.id, fullName: data.full_name });
        }
      } catch (err) {
        console.error("Error fetching VIP:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomer();
  }, [urlId]);

  // Initialize QR Code Styling
  useEffect(() => {
    if (!mounted || !customerData) return;
    const initQr = async () => {
      if (typeof window !== 'undefined') {
        const QRCodeStyling = (await import('qr-code-styling')).default;

        const qrCode = new QRCodeStyling({
          width: 300,
          height: 300,
          type: 'svg',
          data: customerData.id,
          dotsOptions: {
            color: '#333333',
            type: 'dots'
          },
          backgroundOptions: {
            color: 'transparent',
          },
          cornersSquareOptions: {
            color: '#333333',
            type: 'extra-rounded'
          },
          cornersDotOptions: {
            color: '#333333',
            type: 'dot'
          },
          qrOptions: {
            errorCorrectionLevel: 'H'
          }
        });

        if (qrRef.current) {
          qrRef.current.innerHTML = "";
          qrCode.append(qrRef.current);
          qrCodeInstance.current = qrCode;
        }
      }
    };
    initQr();
  }, [mounted, customerData]);

  // Update QR Code if customerData changes dynamically (e.g. from Admin Modal)
  useEffect(() => {
    if (qrCodeInstance.current && customerData) {
      qrCodeInstance.current.update({
        data: customerData.id
      });
    }
  }, [customerData?.id]);

  const handleDownload = async () => {
    if (!containerRef.current || !customerData) return;
    try {
      const dataUrl = await htmlToImage.toPng(containerRef.current, {
        quality: 1,
        pixelRatio: 3,
        skipFonts: true,
      });
      const link = document.createElement('a');
      link.download = `VIP_Ticket_${customerData.fullName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-[500px] aspect-[500/959] bg-gray-800 animate-pulse rounded-2xl flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative">
      <>
        {/* Top Right Action Buttons */}
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
          <button
            onClick={() => {
              setAdminModalInitialTab('scan');
              setIsAdminModalOpen(true);
            }}
            className="bg-blue-600/90 hover:bg-blue-600 backdrop-blur-md p-3 rounded-full border border-blue-500/50 text-white transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            title="Scan QR Code"
          >
            <QrCode size={24} />
          </button>

          <button
            onClick={() => {
              setAdminModalInitialTab('entry');
              setIsAdminModalOpen(true);
            }}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/20 text-white transition-all active:scale-95"
            title="Admin Settings"
          >
            <Settings size={24} />
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative w-full max-w-[500px] mx-auto overflow-hidden bg-white shadow-2xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/551_Landingpage.png"
            alt="Landing Background"
            className="w-full h-auto block"
          />

          {customerData && (
            <>
              {/* QR Code - Premium Styled */}
              <button
                onClick={() => router.push(`/crm/customers?id=${customerData.id}`)}
                className="absolute z-10 flex items-center justify-center bg-white rounded-lg shadow-sm cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-300"
                style={{
                  top: '79.1%',
                  left: '63%',
                  width: '20%',
                  aspectRatio: '1/1',
                  padding: '6px'
                }}
                title="Go to Personal Page"
              >
                <div ref={qrRef} className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full" />
              </button>

              {/* Customer Name - On the white bar at bottom-left of card */}
              <div
                className="absolute z-20 flex items-center justify-center overflow-visible"
                style={{
                  top: '86.5%',
                  left: '15.0%',
                  width: '44.0%',
                  height: '2%'
                }}
              >
                <span
                  className="font-serif tracking-[0.10em] font-bold uppercase text-center w-full whitespace-nowrap"
                  style={{
                    color: '#c4a055',
                    fontSize: 'clamp(8px, 1.8vw, 14px)',
                    textShadow: '0.3px 0.3px 0px rgba(0,0,0,0.1)'
                  }}
                >
                  {abbreviateName(customerData.fullName)}
                </span>
              </div>
            </>
          )}

          {/* Download Button Area */}
          <button
            onClick={handleDownload}
            disabled={!customerData}
            className="absolute cursor-pointer bg-transparent text-transparent border-none outline-none z-30 disabled:cursor-not-allowed"
            style={{
              top: '91.3%',
              left: '18%',
              width: '64%',
              height: '3.5%'
            }}
          >
            Nhấn để tải ảnh
          </button>
        </div>

        <LandingAdminModal
          isOpen={isAdminModalOpen}
          initialTab={adminModalInitialTab}
          scanOnly={adminModalInitialTab === 'scan'}
          onClose={() => setIsAdminModalOpen(false)}
          onSelectCustomer={(data) => {
            setCustomerData(data);
            router.push(`?id=${data.id}`);
          }}
        />
      </>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-[500px] aspect-[500/959] bg-gray-800 animate-pulse rounded-2xl"></div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}
