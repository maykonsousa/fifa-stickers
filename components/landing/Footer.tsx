"use client";

import Link from 'next/link';
import { LogoWordmark } from '../brand/Logo';

export default function Footer() {
  return (
    <footer className="relative bg-zinc-950 text-zinc-300 overflow-hidden">
      {/* Dotted bg */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand col */}
          <div className="md:col-span-2">
            <LogoWordmark variant="light" width={260} />
            <p className="mt-6 text-zinc-400 max-w-sm leading-relaxed">
              Plataforma para gerenciar sua coleção de figurinhas da Copa do Mundo de 2026.
            </p>
          </div>

          {/* Links */}
          <div>
            <div
              className="text-xs text-zinc-500 mb-4"
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 2 }}
            >
              APP
            </div>
            <ul className="space-y-2">
              <li><Link href="/collection" className="hover:text-yellow-400 transition">Coleção</Link></li>
              <li><Link href="/trades" className="hover:text-yellow-400 transition">Trocas</Link></li>
              <li><Link href="/friends" className="hover:text-yellow-400 transition">Amigos</Link></li>
              <li><Link href="/profile" className="hover:text-yellow-400 transition">Perfil</Link></li>
            </ul>
          </div>

          <div>
            <div
              className="text-xs text-zinc-500 mb-4"
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 2 }}
            >
              SOBRE
            </div>
            <ul className="space-y-2">
              <li><Link href="/about" className="hover:text-yellow-400 transition">Quem somos</Link></li>
              <li><Link href="/privacy" className="hover:text-yellow-400 transition">Privacidade</Link></li>
              <li><Link href="/terms" className="hover:text-yellow-400 transition">Termos</Link></li>
              <li><a href="mailto:contato@devpoolbr.com.br" className="hover:text-yellow-400 transition">Contato</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-zinc-500" style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 2 }}>
            © 2026 · FALTAUMA.COM · ÁLBUM · COLECIONÁVEL
          </div>
          <div className="text-xs text-zinc-500">
            Produzido por{' '}
            <a href="https://www.linkedin.com/in/maykonsousa/" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">Maykon Sousa</a>
            {' '}e{' '}
            <a href="https://www.linkedin.com/in/brunasousasantos/" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">Bruna Sousa</a>
            {' '}· 🇧🇷
          </div>
        </div>
      </div>
    </footer>
  );
}
