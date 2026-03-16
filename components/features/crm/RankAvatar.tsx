"use client"

import React from 'react'

interface RankAvatarProps {
    src: string
    rank?: string
    size?: number
    className?: string
    style?: React.CSSProperties
}

export default function RankAvatar({
    src,
    rank = "gold",
    size = 120,
    className = "",
    style = {}
}: RankAvatarProps) {

    // Map Vietnamese rank labels to style keys
    const getRankKey = (r: string) => {
        if (!r) return 'bronze';
        const normalized = r.toLowerCase();
        if (normalized.includes('kim cương') || normalized === 'diamond') return 'diamond';
        if (normalized.includes('bạch kim') || normalized === 'platinum') return 'platinum';
        if (normalized.includes('vàng') || normalized === 'gold') return 'gold';
        if (normalized.includes('bạc') || normalized === 'silver') return 'silver';
        if (normalized.includes('đồng') || normalized === 'bronze' || normalized.includes('thành viên')) return 'bronze';
        return 'bronze';
    };

    const rankKey = getRankKey(rank);

    const rankStyle = {
        gold: `from-[#FADCA0] via-[#FAD296] to-[#965000] shadow-[0_0_25px_rgba(250,210,150,0.6)]`,
        silver: `from-[#FFFFFF] via-[#D1D5DB] to-[#9CA3AF] shadow-[0_0_20px_rgba(200,200,200,0.5)]`,
        bronze: `from-[#E6A97A] via-[#B87333] to-[#7A4A1F] shadow-[0_0_20px_rgba(184,115,51,0.5)]`,
        diamond: `from-[#C7F9FF] via-[#60EFFF] to-[#0EA5E9] shadow-[0_0_25px_rgba(96,239,255,0.7)]`,
        platinum: `from-[#E5E7EB] via-[#F9FAFB] to-[#9CA3AF] shadow-[0_0_25px_rgba(229,231,235,0.6)]`
    };

    const selectedStyle = rankStyle[rankKey as keyof typeof rankStyle] || rankStyle.bronze;

    return (
        <div
            style={{ ...style, width: size, height: size }}
            className={`relative flex items-center justify-center shrink-0 ${className}`}
        >
            {/* Glow */}
            <div className={`absolute inset-0 rounded-full blur-xl opacity-70 bg-gradient-to-br ${selectedStyle}`} />

            {/* Frame */}
            <div className={`relative rounded-full p-[4px] flex items-center justify-center bg-gradient-to-br w-full h-full ${selectedStyle}`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white">
                    <img
                        src={src}
                        className="rounded-full object-cover w-full h-full"
                        alt="Avatar"
                    />
                </div>
            </div>

            {/* Shine animation - uses animate-shine from globals.css */}
            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                <div className="absolute w-[60%] h-full bg-white/30 blur-lg rotate-12 animate-shine" />
            </div>
        </div>
    );
}
