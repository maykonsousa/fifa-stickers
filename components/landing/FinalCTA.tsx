"use client";

import { motion } from 'motion/react';
import { Rocket, ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';

export default function FinalCTA() {
  return (
    <section className="relative py-32 px-6 bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1764438344341-d4700ad674f0?w=1920&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-green-900 via-green-900/90 to-transparent" />
      </div>

      {/* Animated elements */}
      <motion.div
        className="absolute top-20 left-10 text-6xl"
        animate={{
          y: [0, -30, 0],
          rotate: [0, 360],
          opacity: [0.1, 0.3, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity }}
      >
        ⚽
      </motion.div>
      <motion.div
        className="absolute bottom-20 right-10 text-7xl"
        animate={{
          y: [0, 30, 0],
          rotate: [0, -360],
          opacity: [0.1, 0.3, 0.1]
        }}
        transition={{ duration: 10, repeat: Infinity }}
      >
        🏆
      </motion.div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Stars decoration */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center gap-2 mb-6"
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            </motion.div>
          ))}
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 text-white mb-8"
        >
          <Rocket className="w-5 h-5 text-yellow-300" />
          <span>Mais de 50.000 colecionadores já começaram</span>
        </motion.div>

        {/* Main heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-6xl lg:text-7xl mb-6 text-white leading-tight"
        >
          Complete seu álbum
          <br />
          <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
            da Copa 2026
          </span>
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl md:text-2xl mb-12 text-green-50 max-w-3xl mx-auto leading-relaxed"
        >
          Junte-se à maior comunidade de colecionadores de figurinhas do mundo.
          <span className="text-yellow-300 font-semibold"> Gratuito para sempre.</span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12"
        >
          <Link href="/login">
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
              whileTap={{ scale: 0.95 }}
              className="group relative bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 text-green-900 px-12 py-6 rounded-2xl text-xl shadow-2xl overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-600"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              <span className="relative flex items-center gap-3 z-10">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Começar com Google</span>
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </span>
            </motion.div>
          </Link>

          <Link href="/login">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-12 py-6 rounded-2xl text-xl hover:bg-white/20 transition-all duration-300"
            >
              Ver demonstração
            </motion.div>
          </Link>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center items-center gap-8 text-green-100"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span>4.9 de 5 estrelas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">✓</span>
            <span>Grátis para sempre</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">✓</span>
            <span>Sem propagandas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">✓</span>
            <span>100% seguro</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
