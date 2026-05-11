"use client";

import { motion } from 'motion/react';
import { BarChart3, RefreshCw, Users, MapPin, Zap, Shield } from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Progresso em tempo real',
    description: 'Acompanhe cada figurinha colada e veja sua coleção crescer',
    color: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-600'
  },
  {
    icon: RefreshCw,
    title: 'Trocas inteligentes',
    description: 'Algoritmo que encontra o match perfeito entre colecionadores',
    color: 'from-green-500 to-emerald-500',
    iconColor: 'text-green-600'
  },
  {
    icon: Users,
    title: 'Comunidade ativa',
    description: 'Milhares de fãs trocando figurinhas pelo Brasil todo',
    color: 'from-purple-500 to-pink-500',
    iconColor: 'text-purple-600'
  },
  {
    icon: MapPin,
    title: 'Encontros locais',
    description: 'Veja quem está perto de você e marque trocas presenciais',
    color: 'from-orange-500 to-red-500',
    iconColor: 'text-orange-600'
  },
  {
    icon: Zap,
    title: 'Super rápido',
    description: 'Adicione figurinhas em segundos digitando o código',
    color: 'from-yellow-500 to-amber-500',
    iconColor: 'text-yellow-600'
  },
  {
    icon: Shield,
    title: '100% seguro',
    description: 'Suas informações protegidas e contato visível só para amigos',
    color: 'from-indigo-500 to-blue-500',
    iconColor: 'text-indigo-600'
  }
];

export default function Features() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5">
        <div className="absolute top-20 left-20 text-9xl">⚽</div>
        <div className="absolute bottom-40 right-40 text-9xl">🏆</div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-full text-sm mb-4"
          >
            Por que escolher FIFA Stickers?
          </motion.div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl mb-4 text-gray-900">
            Tudo que você precisa para
            <br />
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              completar seu álbum
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A plataforma mais completa e moderna para colecionadores
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group"
              >
                <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 h-full relative overflow-hidden">
                  {/* Gradient background on hover */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                  />

                  {/* Icon */}
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-5 shadow-lg relative z-10`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="mb-3 text-gray-900 relative z-10 group-hover:text-green-700 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed relative z-10">
                    {feature.description}
                  </p>

                  {/* Hover arrow */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    className="mt-4 text-green-600 flex items-center gap-2 text-sm relative z-10"
                  >
                    <span>Saiba mais</span>
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
