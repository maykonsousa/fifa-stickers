"use client";

import { motion } from 'motion/react';
import { Package, ArrowRightLeft, BookOpenCheck } from 'lucide-react';

const STEPS = [
  {
    icon: Package,
    title: 'Adicione suas figurinhas',
    body: 'Antes de colar suas figurinhas, adicione na plataforma inclusive as repetidas.',
    illust: '/brand/illust-pack.svg',
  },
  {
    icon: ArrowRightLeft,
    title: 'Troque com amigos',
    body: 'Localize amigos em sua região que tenham as figurinhas que você precisa e querem as que você tem.',
    illust: '/brand/illust-trade.svg',
  },
  {
    icon: BookOpenCheck,
    title: 'Complete seu álbum',
    body: 'Acompanhe o seu progresso em tempo real, conecte-se com outros colecionadores e torne a brincadeira ainda mais divertida.',
    illust: '/brand/illust-album.svg',
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-[#fef9e8]">
      {/* Subtle dotted bg */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, #0a3d2a 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div
            className="inline-block text-xs text-[#0a3d2a]/60 mb-4"
            style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 3 }}
          >
            COMO · FUNCIONA
          </div>
          <h2
            className="text-zinc-900 mb-4"
            style={{
              fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif',
              fontSize: 'clamp(40px, 6vw, 72px)',
              lineHeight: 0.95,
              letterSpacing: '-1.5px',
            }}
          >
            Três passos pra
            <br />
            <span className="text-[#0a3d2a]">completar o álbum</span>
          </h2>
        </motion.div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="bg-[#fffaf0] rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.08)] flex flex-col"
            >
              {/* Illustration */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={step.illust} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 bg-yellow-400 text-zinc-900 w-10 h-10 rounded-lg flex items-center justify-center shadow-md">
                  <span style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif' }}>{i + 1}</span>
                </div>
              </div>
              {/* Body */}
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <step.icon className="w-5 h-5 text-[#0a3d2a]" />
                  <h3
                    className="text-2xl text-zinc-900"
                    style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-0.5px' }}
                  >
                    {step.title}
                  </h3>
                </div>
                <p className="text-zinc-700 leading-relaxed">{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
