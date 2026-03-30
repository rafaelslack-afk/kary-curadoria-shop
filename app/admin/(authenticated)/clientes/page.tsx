"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  total_orders: number;
  total_spent: number;
  type: "registered" | "guest";
}

function customerHref(c: CustomerRow): string {
  if (c.type === "guest") {
    return `/admin/clientes/${encodeURIComponent(c.email)}?type=guest&email=${encodeURIComponent(c.email)}`;
  }
  return `/admin/clientes/${c.id}`;
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "registered" | "guest">("all");

  useEffect(() => { fetchCustomers(); }, []);

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/admin/customers");
      if (res.ok) setCustomers(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const filtered = customers.filter((c) => {
    if (filter !== "all" && c.type !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const registeredCount = customers.filter((c) => c.type === "registered").length;
  const guestCount = customers.filter((c) => c.type === "guest").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-medium text-kc-dark">Clientes</h1>
      </div>

      {/* Filtros + busca */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { key: "all",        label: `Todos (${customers.length})` },
            { key: "registered", label: `Cadastrados (${registeredCount})` },
            { key: "guest",      label: `Convidados (${guestCount})` },
          ] as { key: typeof filter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md transition-colors",
                filter === key
                  ? "bg-white text-kc-dark shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="flex-1 min-w-48 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-kc"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {search || filter !== "all"
              ? "Nenhum cliente encontrado para os filtros aplicados."
              : "Nenhum cliente ainda."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Nome", "E-mail", "Telefone", "Primeiro pedido", "Pedidos", "Total Gasto"].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={`${c.type}-${c.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={customerHref(c)}
                        className="text-sm font-medium text-kc-dark hover:text-kc hover:underline"
                      >
                        {c.name}
                      </Link>
                      <span
                        className={cn(
                          "text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-full font-medium",
                          c.type === "registered"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {c.type === "registered" ? "Cadastrado" : "Convidado"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={customerHref(c)} className="text-sm text-gray-600 hover:text-kc">
                      {c.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {c.phone ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-700 font-medium">
                    {c.total_orders}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-kc-dark">
                    {c.total_spent > 0
                      ? formatCurrency(c.total_spent)
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 text-right">
            {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
