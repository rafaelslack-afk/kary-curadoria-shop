"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, User, ShoppingBag, Wallet } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/database";

interface Address {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface OrderRow {
  id: string;
  order_number: number;
  status: OrderStatus;
  total: number;
  payment_method: string | null;
  created_at: string;
}

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  address_json: Address | null;
  created_at: string;
  type: "registered" | "guest";
  orders: OrderRow[];
  total_orders: number;
  total_spent: number;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:   "Pendente",
  paid:      "Pago",
  preparing: "Preparando",
  shipped:   "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending:   "bg-amber-100 text-amber-700",
  paid:      "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  shipped:   "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const type = searchParams.get("type");        // "guest" | null
  const email = searchParams.get("email");      // only for guests

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        let url = `/api/admin/customers/${encodeURIComponent(id)}`;
        if (type === "guest" && email) {
          url += `?type=guest&email=${encodeURIComponent(email)}`;
        }
        const res = await fetch(url);
        if (res.status === 404) { setNotFound(true); return; }
        if (res.ok) setCustomer(await res.json());
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, [id, type, email]);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Carregando...</div>;
  }

  if (notFound || !customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">Cliente não encontrado.</p>
        <Link href="/admin/clientes" className="text-kc text-sm hover:underline">
          ← Voltar para Clientes
        </Link>
      </div>
    );
  }

  const addr = customer.address_json;
  const isGuest = customer.type === "guest";

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/clientes"
          className="inline-flex items-center gap-1 text-[10px] tracking-[0.2em] text-kc-muted hover:text-kc-dark uppercase mb-4"
        >
          <ChevronLeft size={12} />
          Clientes
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-kc/10 flex items-center justify-center">
            <User size={18} className="text-kc" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-medium text-kc-dark">{customer.name}</h1>
              <span
                className={cn(
                  "text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-full font-medium",
                  isGuest ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                )}
              >
                {isGuest ? "Convidado" : "Cadastrado"}
              </span>
            </div>
            <p className="text-sm text-kc-muted">
              {isGuest ? "Primeiro pedido em" : "Cliente desde"} {formatDate(customer.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <ShoppingBag size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">Pedidos pagos</p>
            <p className="text-2xl font-semibold text-kc-dark">{customer.total_orders}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">Total Gasto</p>
            <p className="text-2xl font-semibold text-kc-dark">
              {customer.total_spent > 0 ? formatCurrency(customer.total_spent) : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Dados cadastrais */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-serif text-base font-medium text-kc-dark mb-4">
            {isGuest ? "Dados do Comprador" : "Dados Cadastrais"}
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[10px] tracking-wider text-gray-400 uppercase">E-mail</dt>
              <dd className="text-gray-700 mt-0.5">{customer.email}</dd>
            </div>
            {customer.phone && (
              <div>
                <dt className="text-[10px] tracking-wider text-gray-400 uppercase">Telefone</dt>
                <dd className="text-gray-700 mt-0.5">{customer.phone}</dd>
              </div>
            )}
            {customer.cpf && (
              <div>
                <dt className="text-[10px] tracking-wider text-gray-400 uppercase">CPF</dt>
                <dd className="text-gray-700 font-mono mt-0.5">{customer.cpf}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Endereço de entrega (último pedido) */}
        {addr && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-serif text-base font-medium text-kc-dark mb-4">
              {isGuest ? "Último Endereço de Entrega" : "Endereço"}
            </h2>
            <address className="not-italic text-sm text-gray-700 leading-relaxed">
              {addr.logradouro}, {addr.numero}
              {addr.complemento && ` — ${addr.complemento}`}
              <br />
              {addr.bairro} · {addr.cidade} / {addr.estado}
              <br />
              CEP {addr.cep}
            </address>
          </div>
        )}
      </div>

      {/* Histórico de pedidos */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-serif text-base font-medium text-kc-dark">Histórico de Pedidos</h2>
        </div>

        {customer.orders.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Nenhum pedido registrado.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Número", "Data", "Status", "Total"].map((h) => (
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
              {customer.orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="text-sm font-medium text-kc hover:underline"
                    >
                      #{o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(o.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full font-medium",
                        STATUS_CLASS[o.status]
                      )}
                    >
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-kc-dark">
                    {formatCurrency(o.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
