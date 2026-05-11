"use client";

import { motion } from 'motion/react';
import { Heart, Globe, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 text-white overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-6"
            >
              <h3 className="text-2xl mb-3 bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                FIFA Stickers 2026
              </h3>
              <p className="text-gray-400 leading-relaxed max-w-md">
                A maior comunidade de colecionadores de figurinhas da Copa do Mundo.
                Complete seu álbum, encontre trocas e viva a paixão do futebol.
              </p>
            </motion.div>

            {/* Social */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex gap-4"
            >
              {[
                { icon: Globe, href: '#' },
                { icon: Heart, href: '#' },
                { icon: Globe, href: '#' },
                { icon: Mail, href: '#' }
              ].map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  whileHover={{ scale: 1.2, y: -3 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors duration-200"
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </motion.div>
          </div>

          {/* Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="mb-4 text-white">Produto</h4>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#" className="hover:text-yellow-300 transition-colors">Funcionalidades</a></li>
              <li><a href="#" className="hover:text-yellow-300 transition-colors">Como funciona</a></li>
              <li><a href="#" className="hover:text-yellow-300 transition-colors">Preços</a></li>
              <li><a href="#" className="hover:text-yellow-300 transition-colors">FAQ</a></li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <h4 className="mb-4 text-white">Empresa</h4>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#" className="hover:text-yellow-300 transition-colors">Sobre nós</a></li>
              <li><a href="#" className="hover:text-yellow-300 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-yellow-300 transition-colors">Carreiras</a></li>
              <li><a href="#" className="hover:text-yellow-300 transition-colors">Contato</a></li>
            </ul>
          </motion.div>
        </div>

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="pt-8 border-t border-white/10"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span>© {currentYear} FIFA Stickers.</span>
              <span className="hidden md:inline">|</span>
              <span>Todos os direitos reservados.</span>
            </div>

            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-yellow-300 transition-colors">Privacidade</a>
              <a href="#" className="hover:text-yellow-300 transition-colors">Termos</a>
              <a href="#" className="hover:text-yellow-300 transition-colors">Cookies</a>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <Globe className="w-4 h-4" />
            <span>Este é um projeto não oficial, sem vínculo com a FIFA.</span>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center text-sm text-gray-400 flex items-center justify-center gap-2"
          >
            <span>Feito com</span>
            <motion.span
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Heart className="w-4 h-4 fill-red-500 text-red-500 inline" />
            </motion.span>
            <span>por amantes do futebol</span>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}
