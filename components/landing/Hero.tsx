"use client";

import { motion } from 'motion/react';
import { Sparkles, Trophy, Users, Zap } from 'lucide-react';
import Link from 'next/link';

const STICKER_BASE = "https://ryahywolbykyqrpiibmp.supabase.co/storage/v1/object/public/sticker-images/stickers";

const COLLAGE_STICKERS = [
  { src: `${STICKER_BASE}/BRA14.jpeg`, x: '4%',  y: '55%', r: -14, s: 0.55, blur: 0, mobileHidden: false },
  { src: `${STICKER_BASE}/ARG20.png`, x: '10%', y: '12%', r: 8,   s: 0.45, blur: 1, mobileHidden: true },
  { src: `${STICKER_BASE}/FRA20.png`, x: '82%', y: '15%', r: -6,  s: 0.5,  blur: 0, mobileHidden: false },
  { src: `${STICKER_BASE}/ESP15.png`, x: '88%', y: '60%', r: 12,  s: 0.55, blur: 0, mobileHidden: false },
  { src: `${STICKER_BASE}/POR15.png`, x: '50%', y: '5%',  r: 0,   s: 0.4,  blur: 2, mobileHidden: true },
  { src: `${STICKER_BASE}/COL14.png`, x: '28%', y: '82%', r: -10, s: 0.5,  blur: 1, mobileHidden: true },
  { src: `${STICKER_BASE}/ENG18.png`, x: '68%', y: '85%', r: 14,  s: 0.45, blur: 1, mobileHidden: false },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#155236] via-[#0a3d2a] to-[#04140b]">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url('/brand/hero-bg-stadium.svg')` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.55)_100%)]" />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        {COLLAGE_STICKERS.map((s, i) => (
          <motion.div
            key={i}
            className={`absolute ${s.mobileHidden ? 'hidden md:block' : ''}`}
            style={{ left: s.x, top: s.y }}
            initial={{ opacity: 0, scale: 0.3, rotate: s.r - 20 }}
            animate={{ opacity: s.blur ? 0.55 : 0.85, scale: 1, rotate: s.r }}
            transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: [0.2, 0.7, 0.3, 1] }}
          >
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [s.r, s.r + 1.5, s.r] }}
              transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                transform: `translate(-50%,-50%) scale(${s.s})`,
                filter: s.blur ? `blur(${s.blur}px)` : 'none',
              }}
            >
              <div className="bg-white p-[3px] rounded-lg shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                <img
                  src={s.src}
                  alt=""
                  width={220}
                  height={295}
                  className="block w-[120px] h-[160px] md:w-[220px] md:h-[295px] object-cover rounded-md"
                  loading="lazy"
                />
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 text-white">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span className="text-sm" style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 2 }}>
              EDIÇÃO COLECIONÁVEL · 2026
            </span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6 text-white text-center"
          style={{
            fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif',
            fontSize: 'clamp(64px, 12vw, 160px)',
            lineHeight: 0.92,
            letterSpacing: '-3px',
          }}
        >
          falta<span className="text-yellow-400">Uma</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl mb-12 text-green-50/90 max-w-2xl mx-auto text-center leading-relaxed"
        >
          Cada figurinha colada é uma vitória. Acompanhe seu álbum, encontre trocas e cole a última que falta.
        </motion.p>

        {/* Stats cards - hidden until we have real data
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-12"
        >
          {[
            { icon: Trophy, label: 'Álbum completo', value: '638' },
            { icon: Users, label: 'Colecionadores', value: '50K+' },
            { icon: Zap, label: 'Trocas/dia', value: '10K+' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center"
            >
              <stat.icon className="w-6 h-6 mx-auto mb-2 text-yellow-300" />
              <div className="text-2xl md:text-3xl text-white mb-1" style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif' }}>
                {stat.value}
              </div>
              <div className="text-xs md:text-sm text-green-100">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
        */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link href="/login">
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
              whileTap={{ scale: 0.95 }}
              className="bg-yellow-400 text-zinc-900 px-10 py-5 rounded-xl text-xl shadow-2xl hover:shadow-yellow-500/50 transition-shadow duration-300 flex items-center gap-3"
              style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: 1 }}
            >
              <span>COMEÇAR AGORA</span>
              <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
            </motion.div>
          </Link>

          <Link href="/login">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-10 py-5 rounded-xl text-xl hover:bg-white/20 transition-all duration-300"
            >
              Entrar com Google
            </motion.div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="hidden md:block mt-16"
        >
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-white/60 text-center">
            <div className="text-sm mb-2">Role para baixo</div>
            <div className="text-2xl">↓</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
