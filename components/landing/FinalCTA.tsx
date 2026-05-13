"use client";

import { motion } from 'motion/react';
import Link from 'next/link';

const STICKER_BASE = "https://ryahywolbykyqrpiibmp.supabase.co/storage/v1/object/public/sticker-images/stickers";

const RAIN = [
  { src: `${STICKER_BASE}/BRA14.jpeg`, x: '10%', y: '18%', r: 18,  s: 0.45, o: 0.85, blur: 0 },
  { src: `${STICKER_BASE}/NED15.png`, x: '88%', y: '22%', r: -12, s: 0.5,  o: 0.85, blur: 0 },
  { src: `${STICKER_BASE}/ARG10.png`, x: '18%', y: '74%', r: 22,  s: 0.55, o: 0.7,  blur: 0 },
  { src: `${STICKER_BASE}/FRA20.png`, x: '76%', y: '70%', r: -28, s: 0.6,  o: 0.8,  blur: 0 },
  { src: `${STICKER_BASE}/POR15.png`, x: '50%', y: '12%', r: 6,   s: 0.35, o: 0.65, blur: 1 },
  { src: `${STICKER_BASE}/MAR4.png`,  x: '62%', y: '40%', r: 12,  s: 0.4,  o: 0.7,  blur: 0 },
  { src: `${STICKER_BASE}/CRO9.png`,  x: '30%', y: '42%', r: -18, s: 0.4,  o: 0.7,  blur: 1 },
  { src: `${STICKER_BASE}/NOR15.png`, x: '8%',  y: '48%', r: 28,  s: 0.35, o: 0.55, blur: 1 },
];

export default function FinalCTA() {
  return (
    <section className="relative py-32 overflow-hidden bg-gradient-to-b from-zinc-900 to-[#0a3d2a]">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-100"
        style={{ backgroundImage: `url('/brand/cta-bg.svg')` }}
      />

      <div className="absolute inset-0 pointer-events-none">
        {RAIN.map((s, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: s.x, top: s.y }}
            initial={{ opacity: 0, y: 40, rotate: s.r - 20 }}
            whileInView={{ opacity: s.o, y: 0, rotate: s.r }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.06, ease: 'easeOut' }}
          >
            <div
              style={{
                transform: `translate(-50%,-50%) scale(${s.s})`,
                filter: s.blur ? `blur(${s.blur}px)` : 'none',
              }}
            >
              <div className="bg-white p-[3px] rounded-lg shadow-[0_14px_30px_rgba(0,0,0,0.35)]">
                <img
                  src={s.src}
                  alt=""
                  className="block w-[220px] h-[295px] object-cover rounded-md"
                  loading="lazy"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-white mb-6"
          style={{
            fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif',
            fontSize: 'clamp(48px, 8vw, 96px)',
            lineHeight: 0.95,
            letterSpacing: '-2px',
          }}
        >
          falta<span className="text-yellow-400">Uma</span>
          <br />
          <span className="text-yellow-400">pra completar?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl text-green-50/85 mb-10 max-w-xl mx-auto"
        >
          Conecte com colecionadores, ofereça suas repetidas e cole a última do álbum.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Link href="/login">
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(251,191,36,0.4)' }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-3 bg-yellow-400 text-zinc-900 px-10 py-5 rounded-xl text-xl shadow-2xl"
              style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: 1 }}
            >
              ENTRAR COM GOOGLE
              <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
