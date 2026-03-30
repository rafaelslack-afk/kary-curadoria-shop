"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("E-mail ou senha incorretos.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-kc-cream flex items-center justify-center px-4">
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-5xl font-medium text-kc-dark tracking-[0.12em]">
          KVO
        </h1>
        <p className="text-[10px] tracking-[0.28em] text-kc-muted mt-1.5">
          PAINEL ADMINISTRATIVO
        </p>
        <div className="w-8 h-px bg-kc-line mx-auto mt-4" />
      </div>

      {/* Login Card */}
      <div className="bg-white border border-kc-line p-8 space-y-5">
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] tracking-[0.14em] text-kc-muted mb-2 uppercase"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@karycuradoria.com.br"
              className="w-full border border-kc-line bg-kc-light px-4 py-3 text-sm text-kc-dark placeholder:text-kc-muted/40 focus:outline-none focus:border-kc transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[11px] tracking-[0.14em] text-kc-muted mb-2 uppercase"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full border border-kc-line bg-kc-light px-4 py-3 text-sm text-kc-dark placeholder:text-kc-muted/40 focus:outline-none focus:border-kc transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="md">
            Entrar
          </Button>
        </form>
      </div>

      <p className="text-center text-[10px] text-kc-muted mt-6 tracking-wider">
        Kary Curadoria &middot; karycuradoria.com.br
      </p>
    </div>
    </div>
  );
}
