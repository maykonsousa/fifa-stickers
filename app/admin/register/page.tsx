"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminRegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <p className="text-gray-400">Carregando...</p>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <h1 className="text-xl font-bold">Link inválido</h1>
          <p className="mt-2 text-gray-400">Este link de convite é inválido ou expirou.</p>
        </div>
      </div>
    );
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Verify token
    const { data: invite } = await supabase
      .from("admin_invites")
      .select("id, email, expires_at, used_at")
      .eq("token", token)
      .single();

    if (!invite) {
      setError("Convite inválido.");
      setLoading(false);
      return;
    }

    if (invite.used_at) {
      setError("Este convite já foi utilizado.");
      setLoading(false);
      return;
    }

    if (new Date(invite.expires_at) < new Date()) {
      setError("Este convite expirou.");
      setLoading(false);
      return;
    }

    // Create user with email/password
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "Erro ao criar conta.");
      setLoading(false);
      return;
    }

    // Add to admins table
    const { error: adminError } = await supabase
      .from("admins")
      .insert({ user_id: authData.user.id });

    if (adminError) {
      setError("Erro ao registrar como admin.");
      setLoading(false);
      return;
    }

    // Mark invite as used
    await supabase
      .from("admin_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    router.push("/admin");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-gray-800 p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Criar conta Admin</h1>
          <p className="mt-1 text-sm text-gray-400">Você foi convidado como administrador</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
              Confirmar senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
