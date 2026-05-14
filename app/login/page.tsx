"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { MarkFU } from "@/components/brand/Logo";
import Link from "next/link";
import { isInAppBrowser, openInExternalBrowser } from "@/lib/detect-in-app-browser";

export default function LoginPage() {
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setInAppBrowser(isInAppBrowser());
  }, []);

  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleOpenExternal = () => {
    const url = window.location.origin + "/login";
    const { opened } = openInExternalBrowser(url);
    if (!opened) {
      setLinkCopied(true);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (otpError) {
      setError("Não foi possível enviar o link. Tente novamente.");
    } else {
      setEmailSent(true);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#155236] via-[#0a3d2a] to-[#04140b]">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{
            backgroundImage: `url('/brand/hero-bg-stadium.svg')`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.55)_100%)]" />
      </div>

      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <motion.div
        className="absolute top-20 left-10 text-6xl opacity-15"
        animate={{ y: [0, -20, 0], rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        ⚽
      </motion.div>
      <motion.div
        className="absolute bottom-32 right-16 text-5xl opacity-15"
        animate={{ y: [0, 25, 0], rotate: [0, -360] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      >
        🏆
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="rounded-3xl flex flex-col items-center justify-center border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8 text-center"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <MarkFU size={48} />
                <span
                  className="text-lg text-white font-bold text-3xl"
                  style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-0.5px', lineHeight: 1, fontWeight: 900, fontSize: 'clamp(24px, 4vw, 32px)' }}
                >
                  falta<span className="text-yellow-400">Uma</span>
                </span>
              </Link>
            </motion.div>
          </div>

          {!inAppBrowser ? (
            <>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-4 text-base font-medium text-gray-700 shadow-lg transition-colors hover:bg-gray-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Entrar com Google
              </motion.button>
            </>
          ) : (
            <>
              {!showEmailForm && !emailSent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="w-full space-y-3"
                >
                  <p className="mb-4 text-center text-sm text-green-100">
                    Para sua segurança, abra no navegador do celular ou entre com seu email.
                  </p>
                  <button
                    onClick={handleOpenExternal}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-4 text-base font-medium text-gray-700 shadow-lg transition-colors hover:bg-gray-50"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Abrir no navegador
                  </button>
                  {linkCopied && (
                    <p className="text-center text-sm text-yellow-300">
                      Link copiado! Cole no Safari ou Chrome para continuar.
                    </p>
                  )}
                  <button
                    onClick={() => setShowEmailForm(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Entrar com email
                  </button>
                </motion.div>
              )}

              {showEmailForm && !emailSent && (
                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleMagicLink}
                  className="w-full space-y-3"
                >
                  <p className="mb-2 text-center text-sm text-green-100">
                    Enviaremos um link de acesso para seu email.
                  </p>
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-yellow-400 focus:outline-none"
                  />
                  {error && <p className="text-center text-xs text-red-300">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center rounded-xl bg-yellow-400 px-4 py-3 text-base font-medium text-gray-900 shadow-lg transition-colors hover:bg-yellow-300 disabled:opacity-50"
                  >
                    {loading ? "Enviando..." : "Enviar link de acesso"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="w-full text-center text-sm text-white/70 hover:text-white"
                  >
                    Voltar
                  </button>
                </motion.form>
              )}

              {emailSent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full text-center"
                >
                  <div className="mb-3 text-4xl">✉️</div>
                  <p className="text-base font-medium text-white">Link enviado!</p>
                  <p className="mt-2 text-sm text-green-200">
                    Verifique sua caixa de entrada e clique no link para entrar.
                  </p>
                  <button
                    onClick={() => { setEmailSent(false); setEmail(""); }}
                    className="mt-4 text-sm text-white/70 hover:text-white"
                  >
                    Enviar novamente
                  </button>
                </motion.div>
              )}
            </>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 flex justify-center gap-4 text-xs text-green-200"
          >
            <span>✓ Gratuito</span>
            <span>✓ Seguro</span>
            <span>✓ Sem ads</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
