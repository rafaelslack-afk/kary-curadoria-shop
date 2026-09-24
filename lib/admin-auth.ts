import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Verifica a sessão Supabase do admin (mesmo mecanismo que o middleware usa
// para proteger as páginas /admin). As rotas /api/admin não passam pela
// checagem do middleware, então precisam chamar isto explicitamente.
// Retorna uma resposta 401 quando não autenticado, ou null quando ok.
export async function requireAdmin(): Promise<NextResponse | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) return null;
  } catch {
    /* sem sessão válida */
  }
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
