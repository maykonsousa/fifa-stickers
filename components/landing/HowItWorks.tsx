"use client";

import { motion } from 'motion/react';
import { UserPlus, ImagePlus, Repeat2, Sparkles } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Crie sua conta',
    description: 'Login rápido com Google em menos de 30 segundos',
    color: 'from-green-600 to-emerald-600',
    image: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400&h=300&fit=crop'
  },
  {
    number: '02',
    icon: ImagePlus,
    title: 'Monte seu álbum',
    description: 'Adicione suas figurinhas ou use nosso scanner inteligente',
    color: 'from-blue-600 to-cyan-600',
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=300&fit=crop'
  },
  {
    number: '03',
    icon: Repeat2,
    title: 'Troque e complete',
    description: 'Encontre matches perfeitos e complete seu álbum',
    color: 'from-purple-600 to-pink-600',
    image: 'https://images.unsplash.com/photo-1764438344341-d4700ad674f0?w=400&h=300&fit=crop'
  }
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1705593973313-75de7bf95b56?w=1920&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/95 to-green-900/80" />
      </div>

      {/* Floating elements */}
      <motion.div
        className="absolute top-20 right-20 text-7xl opacity-10"
        animate={{
          rotate: 360,
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        🏆
      </motion.div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-2 text-white mb-6"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span className="text-sm">Simples e rápido</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl mb-6 text-white">
            Complete seu álbum em{' '}
            <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              3 passos
            </span>
          </h2>
          <p className="text-xl text-green-100 max-w-2xl mx-auto">
            Processo simplificado para você focar no que importa: sua coleção
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative"
              >
                <div className={`flex flex-col lg:flex-row gap-8 items-center ${!isEven ? 'lg:flex-row-reverse' : ''}`}>
                  {/* Content side */}
                  <div className="flex-1">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 lg:p-10 hover:bg-white/15 transition-all duration-300"
                    >
                      {/* Number badge */}
                      <motion.div
                        whileHover={{ rotate: [0, -5, 5, -5, 0] }}
                        className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl shadow-xl mb-6`}
                      >
                        <span className="text-2xl text-white">{step.number}</span>
                      </motion.div>

                      {/* Icon and title */}
                      <div className="flex items-center gap-4 mb-4">
                        <Icon className="w-8 h-8 text-yellow-300" />
                        <h3 className="text-2xl md:text-3xl text-white">
                          {step.title}
                        </h3>
                      </div>

                      <p className="text-lg text-green-100 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Features list */}
                      <ul className="mt-6 space-y-3">
                        {index === 0 && (
                          <>
                            <li className="flex items-center gap-2 text-green-100">
                              <span className="text-yellow-300">✓</span>
                              <span>Sem necessidade de criar senha</span>
                            </li>
                            <li className="flex items-center gap-2 text-green-100">
                              <span className="text-yellow-300">✓</span>
                              <span>100% seguro e privado</span>
                            </li>
                          </>
                        )}
                        {index === 1 && (
                          <>
                            <li className="flex items-center gap-2 text-green-100">
                              <span className="text-yellow-300">✓</span>
                              <span>Scanner de código de barras</span>
                            </li>
                            <li className="flex items-center gap-2 text-green-100">
                              <span className="text-yellow-300">✓</span>
                              <span>Organização automática por time</span>
                            </li>
                          </>
                        )}
                        {index === 2 && (
                          <>
                            <li className="flex items-center gap-2 text-green-100">
                              <span className="text-yellow-300">✓</span>
                              <span>Algoritmo inteligente de matching</span>
                            </li>
                            <li className="flex items-center gap-2 text-green-100">
                              <span className="text-yellow-300">✓</span>
                              <span>Chat integrado para negociação</span>
                            </li>
                          </>
                        )}
                      </ul>
                    </motion.div>
                  </div>

                  {/* Image side */}
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    className="flex-1 max-w-md"
                  >
                    <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url('${step.image}')` }}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-20`} />

                      {/* Overlay icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 10, -10, 0]
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="text-8xl opacity-30"
                        >
                          {index === 0 && '👤'}
                          {index === 1 && '📱'}
                          {index === 2 && '🤝'}
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.2 }}
                    className="hidden lg:block absolute left-1/2 -translate-x-1/2 w-1 h-8 bg-gradient-to-b from-white/30 to-transparent mt-8"
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
