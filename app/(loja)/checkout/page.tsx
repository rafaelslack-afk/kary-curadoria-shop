"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { calculateCouponDiscount } from "@/lib/coupons";
import { formatCurrency } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { pixelEvent } from "@/lib/pixel";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ShippingOption {
  id: number;
  name: string;
  company: string;
  preco: number;
  prazo: number;
}

interface FormData {
  // Step 0 — Identificação
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  // Step 1 — Endereço
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  // Step 2 — Frete
  shippingOption: ShippingOption | null;
  // Step 3 — Pagamento
  paymentMethod: "pix" | "credit_card" | "boleto" | "";
}

const INITIAL_FORM: FormData = {
  nome: "", email: "", cpf: "", telefone: "",
  cep: "", logradouro: "", numero: "", complemento: "",
  bairro: "", cidade: "", estado: "",
  shippingOption: null,
  paymentMethod: "",
};

const STEPS = ["Identificação", "Endereço", "Frete", "Pagamento"];

// ── Máscaras ──────────────────────────────────────────────────────────────────

function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.length <= 10
    ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
    : d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}
function maskCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

// ── Validação de CPF (algoritmo dos dígitos verificadores) ────────────────────

function validarCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11) return false;
  // Rejeita sequências como 111.111.111-11
  if (/^(\d)\1{10}$/.test(c)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(c[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === parseInt(c[10]);
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${done ? "bg-emerald-500 text-white" : active ? "bg-kc text-white" : "bg-kc-line text-kc-muted"}`}>
                {done ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-[9px] tracking-[0.1em] mt-1 hidden sm:block ${active ? "text-kc" : "text-kc-muted"}`}>
                {label.toUpperCase()}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 sm:w-16 mx-1 transition-colors ${done ? "bg-emerald-400" : "bg-kc-line"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Resumo do pedido ──────────────────────────────────────────────────────────

function OrderSummary({ shipping, discount }: { shipping: ShippingOption | null; discount: number }) {
  const { items, subtotal } = useCartStore();
  const sub = subtotal();
  const ship = shipping?.preco ?? 0;
  const total = sub - discount + ship;

  return (
    <div className="bg-kc-light border border-kc-line p-5 space-y-4 sticky top-4">
      <p className="text-[10px] tracking-[0.22em] text-kc-muted uppercase">Seu pedido</p>
      <ul className="space-y-3 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <li key={item.variantId} className="flex items-start gap-2.5">
            <div className="w-10 shrink-0 aspect-[3/4] bg-kc-cream overflow-hidden relative">
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
              )}
              <span className="absolute -top-1 -right-1 bg-kc text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-kc-dark font-medium leading-snug line-clamp-1">{item.productName}</p>
              <p className="text-[9px] text-kc-muted">Tam. {item.size}</p>
            </div>
            <span className="text-[11px] text-kc-dark shrink-0">{formatCurrency(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="h-px bg-kc-line" />
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-kc-muted"><span>Subtotal</span><span>{formatCurrency(sub)}</span></div>
        {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Desconto</span><span>− {formatCurrency(discount)}</span></div>}
        <div className="flex justify-between text-kc-muted"><span>Frete</span><span>{shipping ? formatCurrency(ship) : "—"}</span></div>
      </div>
      <div className="h-px bg-kc-line" />
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-medium text-kc-dark">Total</span>
        <span className="text-lg font-medium text-kc">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

// ── Chave pública MP (client-side) ────────────────────────────────────────────
// Usa variável única NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY (definida na Vercel com a
// key correta para cada ambiente). Fallback legacy por ENV para compatibilidade.
const MP_ENV = process.env.NEXT_PUBLIC_MERCADOPAGO_ENV ?? "sandbox";
const MP_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ||
  (MP_ENV === "production"
    ? process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PRODUCTION ?? ""
    : process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SANDBOX ?? "");

console.log("[MP Brick] env:", MP_ENV);
console.log("[MP Brick] key prefix:", MP_PUBLIC_KEY.substring(0, 15));

// ── Componente principal ──────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const { items, coupon: appliedCoupon, subtotal, clearCart } = useCartStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [cpfError, setCpfError] = useState("");
  // Impede o guard "carrinho vazio → /carrinho" de disparar após o pedido ser confirmado
  const [redirecting, setRedirecting] = useState(false);

  // Mercado Pago Bricks
  const [mpReady, setMpReady] = useState(false);
  const [brickReady, setBrickReady] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brickControllerRef = useRef<any>(null);
  // Snapshot dos dados do pedido para a closure do onSubmit do Brick
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderSnapshotRef = useRef<any>(null);

  // Redireciona para o carrinho quando este fica vazio,
  // EXCETO após um pedido ser confirmado com sucesso.
  useEffect(() => {
    if (items.length === 0 && !redirecting) router.replace("/carrinho");
  }, [items, router, redirecting]);

  // ── GA4: begin_checkout + Meta Pixel: InitiateCheckout ───────────────────
  useEffect(() => {
    if (items.length === 0) return;
    trackEvent('begin_checkout', {
      currency: 'BRL',
      value: subtotal(),
      items: items.map((item) => ({
        item_id: item.sku,
        item_name: item.productName,
        price: item.price,
        quantity: item.quantity,
      })),
    });
    pixelEvent('InitiateCheckout', {
      num_items: items.length,
      value: subtotal(),
      currency: 'BRL',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MP.js é carregado via <Script> no JSX com onLoad → setMpReady(true)
  // (ver elemento <Script> no return abaixo)

  function set(field: keyof FormData, value: string | ShippingOption | null) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const discount = calculateCouponDiscount(subtotal(), appliedCoupon);
  const total = subtotal() - discount + (form.shippingOption?.preco ?? 0);

  // ── Inicializar MP Payment Brick ──
  useEffect(() => {
    // Destruir Brick anterior ao mudar etapa, método ou valor
    if (brickControllerRef.current) {
      try { brickControllerRef.current.unmount(); } catch { /* ignore */ }
      brickControllerRef.current = null;
      setBrickReady(false);
    }

    if (!mpReady || step !== 3 || form.paymentMethod !== "credit_card") return;

    if (!MP_PUBLIC_KEY) {
      console.warn("[MP Brick] NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY não configurada (deve começar com TEST-)");
      return;
    }

    console.log("[MP Brick] Iniciando... total:", total, "publicKey prefix:", MP_PUBLIC_KEY.slice(0, 8));

    // Atualiza snapshot dos dados do pedido para a closure do onSubmit
    orderSnapshotRef.current = {
      customer: {
        nome: form.nome, email: form.email,
        cpf: form.cpf.replace(/\D/g, ""),
        telefone: form.telefone.replace(/\D/g, ""),
      },
      address: {
        cep: form.cep.replace(/\D/g, ""),
        logradouro: form.logradouro, numero: form.numero,
        complemento: form.complemento, bairro: form.bairro,
        cidade: form.cidade, estado: form.estado,
      },
      shipping: form.shippingOption,
      items,
      subtotal: subtotal(),
      discount,
      couponCode: discount > 0 ? (appliedCoupon?.code ?? null) : null,
    };

    let cancelled = false;

    (async () => {
      // Aguarda container estar no DOM
      let retries = 0;
      while (!document.getElementById("paymentBrick_container") && retries < 20) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }
      if (cancelled) return;

      const containerEl = document.getElementById("paymentBrick_container");
      if (!containerEl) {
        console.error("[MP Brick] Container #paymentBrick_container não encontrado após 2s.");
        return;
      }
      console.log("[MP Brick] Container encontrado, criando Brick...");

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mp = new (window as any).MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

        const controller = await bricksBuilder.create(
          "payment",
          "paymentBrick_container",
          {
            initialization: {
              amount: parseFloat(total.toFixed(2)),
              payer: {
                email: form.email,
                ...(form.cpf.replace(/\D/g, "").length === 11 && {
                  identification: {
                    type: "CPF",
                    number: form.cpf.replace(/\D/g, ""),
                  },
                }),
              },
            },
            customization: {
              paymentMethods: {
                creditCard: "all",
                debitCard: "all",
              },
              visual: {
                style: {
                  theme: "default",
                  customVariables: {
                    formBackgroundColor: "#F5F1EA",
                    baseColor: "#A0622A",
                    baseColorFirstVariant: "#5C3317",
                    fontSizeSmall: "12px",
                  },
                },
              },
            },
            callbacks: {
              onReady: () => {
                console.log("[MP Brick] Pronto");
                if (!cancelled) setBrickReady(true);
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onSubmit: async ({ formData }: { selectedPaymentMethod: string; formData: any }) => {
                console.log("[MP Brick] onSubmit formData:", JSON.stringify(formData).slice(0, 120));
                const snap = orderSnapshotRef.current;
                if (!snap) return;
                setSubmitting(true);
                setSubmitError("");

                const payload = {
                  customer: snap.customer,
                  address: snap.address,
                  shipping: {
                    servico: `${snap.shipping.company} - ${snap.shipping.name}`,
                    codigo: String(snap.shipping.id),
                    preco: snap.shipping.preco,
                    prazo: snap.shipping.prazo,
                  },
                  payment: {
                    method: "credit_card",
                    brickFormData: formData,
                  },
                  items: snap.items.map((i: typeof snap.items[0]) => ({
                    variantId: i.variantId,
                    productId: i.productId,
                    productName: i.productName,
                    size: i.size,
                    sku: i.sku,
                    price: i.price,
                    quantity: i.quantity,
                  })),
                  subtotal: snap.subtotal,
                  discount: snap.discount,
                  couponCode: snap.couponCode,
                };

                try {
                  const res = await fetch("/api/orders/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  const data = await res.json();

                  if (!res.ok || data.error) {
                    // Código 2067 do MP = CPF inválido matematicamente
                    if (
                      data.code === "INVALID_CPF" ||
                      data.error?.toLowerCase().includes("cpf") ||
                      data.error?.toLowerCase().includes("identification")
                    ) {
                      setSubmitError(
                        "CPF inválido para pagamento. Verifique se o CPF informado está correto."
                      );
                    } else {
                      setSubmitError(data.error ?? "Erro ao processar pagamento.");
                    }
                    setSubmitting(false);
                    return;
                  }

                  // Sucesso no cartão → redirecionar
                  setRedirecting(true);
                  sessionStorage.setItem("kvo-order", JSON.stringify({
                    orderId: data.orderId,
                    orderNumber: data.orderNumber,
                    customerName: snap.customer.nome,
                    customerEmail: snap.customer.email,
                    prazo: snap.shipping.prazo,
                  }));
                  clearCart();
                  router.push("/checkout/sucesso");
                } catch {
                  setSubmitError("Erro de conexão. Tente novamente.");
                  setSubmitting(false);
                }
              },
              onError: (error: unknown) => {
                console.error("[MP Brick] Erro:", error);
              },
            },
          }
        );

        if (!cancelled) brickControllerRef.current = controller;
        else controller.unmount();
      } catch (err) {
        console.error("[MP Brick] Erro ao criar Brick:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (brickControllerRef.current) {
        try { brickControllerRef.current.unmount(); } catch { /* ignore */ }
        brickControllerRef.current = null;
        setBrickReady(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpReady, step, form.paymentMethod, total]);

  // ── CEP auto-fill ──
  const fetchCep = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    setShippingOptions([]);
    setShippingError("");
    set("shippingOption", null);
    try {
      const res = await fetch(`/api/cep?cep=${digits}`);
      const data = await res.json();
      if (!res.ok) return;
      set("logradouro", data.logradouro ?? "");
      set("bairro", data.bairro ?? "");
      set("cidade", data.cidade ?? "");
      set("estado", data.estado ?? "");
    } finally {
      setCepLoading(false);
    }
  }, []);

  // ── Cálculo de frete (Melhor Envio) ──
  const fetchShipping = useCallback(
    async (cep: string) => {
      const digits = cep.replace(/\D/g, "");
      if (digits.length !== 8) return;

      const produtos = items.map((item) => ({
        peso_g: item.weight_g ?? 400,
        comprimento_cm: item.length_cm ?? 30,
        largura_cm: item.width_cm ?? 20,
        altura_cm: item.height_cm ?? 10,
        quantity: item.quantity,
      }));

      setShippingLoading(true);
      setShippingError("");

      try {
        const res = await fetch("/api/shipping/melhorenvio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cepDestino: digits, produtos }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setShippingError(data.error ?? "Erro ao calcular frete.");
        } else {
          setShippingOptions(data.opcoes ?? []);
        }
      } catch {
        setShippingError("Falha ao calcular opções de frete.");
      } finally {
        setShippingLoading(false);
      }
    },
    [items]
  );

  // Disparar cálculo de frete após preencher CEP e cidade
  useEffect(() => {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length === 8 && form.cidade) {
      fetchShipping(digits);
    }
  }, [form.cep, form.cidade, fetchShipping]);

  // ── Validação por etapa ──
  function canProceed(): boolean {
    switch (step) {
      case 0: {
        // CPF é opcional na etapa de identificação; valida só se preenchido
        const cpfDigits = form.cpf.replace(/\D/g, "");
        const cpfOk = cpfDigits.length === 0 || validarCPF(form.cpf);
        return !!(
          form.nome.trim() &&
          form.email.trim() &&
          cpfOk &&
          form.telefone.replace(/\D/g, "").length >= 10
        );
      }
      case 1:
        return !!(
          form.cep.replace(/\D/g, "").length === 8 &&
          form.logradouro &&
          form.numero &&
          form.cidade &&
          form.estado
        );
      case 2:
        return !!form.shippingOption;
      case 3:
        // Para credit_card o Brick tem seu próprio botão — apenas valida método selecionado
        // Para boleto, CPF é obrigatório
        if (form.paymentMethod === "boleto") {
          return !!(form.paymentMethod && validarCPF(form.cpf));
        }
        return !!form.paymentMethod;
      default:
        return false;
    }
  }

  // ── Submissão (PIX / Boleto) — credit_card é tratado pelo Brick ──
  async function doSubmit() {
    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        customer: {
          nome: form.nome,
          email: form.email,
          cpf: form.cpf.replace(/\D/g, ""),
          telefone: form.telefone.replace(/\D/g, ""),
        },
        address: {
          cep: form.cep.replace(/\D/g, ""),
          logradouro: form.logradouro,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
        },
        shipping: {
          servico: `${form.shippingOption!.company} - ${form.shippingOption!.name}`,
          codigo: String(form.shippingOption!.id),
          preco: form.shippingOption!.preco,
          prazo: form.shippingOption!.prazo,
        },
        payment: {
          method: form.paymentMethod,
        },
        items: items.map((i) => ({
          variantId: i.variantId,
          productId: i.productId,
          productName: i.productName,
          size: i.size,
          sku: i.sku,
          price: i.price,
          quantity: i.quantity,
        })),
        subtotal: subtotal(),
        discount,
        couponCode: discount > 0 ? (appliedCoupon?.code ?? null) : null,
      };

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setSubmitError(data.error ?? "Erro ao processar pedido.");
        return;
      }

      // Captura o total ANTES de limpar o carrinho (subtotal() retorna 0 depois)
      const orderTotal = subtotal() - discount + form.shippingOption!.preco;

      // Marca como redirecionando ANTES de limpar o carrinho para
      // evitar que o guard "carrinho vazio" dispare e sobrescreva a navegação
      setRedirecting(true);

      if (form.paymentMethod === "pix") {
        // Salva no sessionStorage ANTES de limpar o carrinho
        sessionStorage.setItem("kvo-pix", JSON.stringify({
          orderId: data.orderId,
          qrCode: data.qrCode,
          qrCodeText: data.qrCodeText,
          expiresAt: data.expiresAt,
          total: orderTotal,
          orderNumber: data.orderNumber,
        }));
        clearCart();
        // order_id na URL = fallback caso sessionStorage seja perdido
        router.push(`/checkout/pix?order_id=${data.orderId}`);
      } else if (form.paymentMethod === "boleto") {
        sessionStorage.setItem("kvo-boleto", JSON.stringify({
          orderId: data.orderId,
          boletoPdf: data.boletoPdf,
          boletoLine: data.boletoLine,
          orderNumber: data.orderNumber,
        }));
        clearCart();
        router.push("/checkout/sucesso");
      } else {
        sessionStorage.setItem("kvo-order", JSON.stringify({
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          customerName: form.nome,
          customerEmail: form.email,
          prazo: form.shippingOption!.prazo,
        }));
        clearCart();
        router.push("/checkout/sucesso");
      }
    } catch {
      setSubmitError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Clique no botão Confirmar (PIX / Boleto apenas) ──
  // Para credit_card o Brick tem seu próprio botão de submit.
  function handleConfirm() {
    doSubmit();
  }

  // ── Captura de abandono: fire-and-forget ao avançar da etapa 0 ──
  function saveAbandonedCheckout() {
    try {
      const cartItems = items.map((i) => ({
        product_id: i.productId,
        product_name: i.productName,
        variant_id: i.variantId,
        sku: i.sku,
        size: i.size,
        color: i.color ?? null,
        quantity: i.quantity,
        unit_price: i.price,
        image_url: i.image ?? null,
      }));
      fetch("/api/checkout/abandoned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.nome,
          email: form.email,
          phone: form.telefone,
          cart_items: cartItems,
          cart_total: subtotal(),
        }),
      }).catch(() => {/* silencioso */});
    } catch {
      // Nunca bloquear o checkout
    }
  }

  // ── Avançar etapa (com captura de abandono na etapa 0) ──
  function handleContinue() {
    if (step === 0) {
      saveAbandonedCheckout();
    }
    setStep((s) => s + 1);
  }

  if (items.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* SDK do Mercado Pago — carregado via next/script para garantir
          que onLoad dispara apenas após o objeto window.MercadoPago estar pronto */}
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("[MP] SDK carregado. window.MercadoPago:", !!(window as unknown as Record<string, unknown>).MercadoPago);
          setMpReady(true);
        }}
        onError={() => console.error("[MP] Falha ao carregar SDK do Mercado Pago")}
      />
      <div className="mb-6">
        <p className="text-[10px] tracking-[0.26em] text-kc-muted mb-1 uppercase">Compra</p>
        <h1 className="font-serif text-2xl font-medium text-kc-dark">Checkout</h1>
      </div>

      <StepIndicator current={step} steps={STEPS} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* ── STEP 0 — Identificação ── */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-medium text-kc-dark">Seus dados</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nome completo" required>
                  <input type="text" value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Maria da Silva" className={inputCls} />
                </Field>
                <Field label="E-mail" required>
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="maria@exemplo.com" className={inputCls} />
                </Field>
                <Field label="CPF (opcional — necessário para NF)">
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => {
                      const masked = maskCpf(e.target.value);
                      set("cpf", masked);
                      if (cpfError) setCpfError("");
                    }}
                    onBlur={() => {
                      // Valida apenas se o campo foi preenchido
                      const digits = form.cpf.replace(/\D/g, "");
                      if (digits.length > 0 && digits.length === 11 && !validarCPF(form.cpf)) {
                        setCpfError("CPF inválido. Verifique os números digitados.");
                      } else {
                        setCpfError("");
                      }
                    }}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    className={`${inputCls} ${cpfError ? "border-red-400" : ""}`}
                  />
                  {cpfError && (
                    <p className="text-xs text-red-500 mt-1">{cpfError}</p>
                  )}
                </Field>
                <Field label="Telefone / WhatsApp" required>
                  <input type="tel" value={form.telefone} onChange={(e) => set("telefone", maskPhone(e.target.value))} placeholder="(11) 99999-9999" className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP 1 — Endereço ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-medium text-kc-dark">Endereço de entrega</h2>
              <Field label="CEP" required>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.cep}
                    onChange={(e) => { const v = maskCep(e.target.value); set("cep", v); if (v.replace(/\D/g, "").length === 8) fetchCep(v); }}
                    placeholder="00000-000"
                    inputMode="numeric"
                    className={`${inputCls} flex-1`}
                  />
                  {cepLoading && <div className="flex items-center px-3 border border-kc-line"><Loader2 size={14} className="animate-spin text-kc-muted" /></div>}
                </div>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Logradouro" className="sm:col-span-2" required>
                  <input type="text" value={form.logradouro} onChange={(e) => set("logradouro", e.target.value)} placeholder="Rua das Flores" className={inputCls} />
                </Field>
                <Field label="Número" required>
                  <input type="text" value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="123" className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Complemento">
                  <input type="text" value={form.complemento} onChange={(e) => set("complemento", e.target.value)} placeholder="Apto 42 (opcional)" className={inputCls} />
                </Field>
                <Field label="Bairro">
                  <input type="text" value={form.bairro} onChange={(e) => set("bairro", e.target.value)} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Cidade" className="sm:col-span-2">
                  <input type="text" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Estado">
                  <input type="text" value={form.estado} onChange={(e) => set("estado", e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP 2 — Frete ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-medium text-kc-dark">Escolha o frete</h2>
              <p className="text-xs text-kc-muted">
                Entrega para: {form.logradouro}, {form.numero} — {form.cidade}/{form.estado} · CEP {form.cep}
              </p>

              {shippingLoading && (
                <div className="flex items-center gap-2 text-xs text-kc-muted py-4">
                  <Loader2 size={14} className="animate-spin" />
                  Calculando opções de frete…
                </div>
              )}

              {shippingError && !shippingLoading && (
                <div className="border border-red-200 bg-red-50 p-4 text-xs text-red-600">
                  <p className="font-medium mb-1">Erro ao calcular frete</p>
                  <p>{shippingError}</p>
                  <button onClick={() => fetchShipping(form.cep)} className="mt-2 underline underline-offset-2 hover:text-red-800">Tentar novamente</button>
                </div>
              )}

              {!shippingLoading && shippingOptions.length > 0 && (
                <div className="space-y-3">
                  {shippingOptions.map((opt) => {
                    const selected = form.shippingOption?.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => set("shippingOption", opt)}
                        className={`w-full flex items-center justify-between p-4 border text-left transition-colors ${selected ? "border-kc bg-kc/5" : "border-kc-line hover:border-kc-muted"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-kc" : "border-kc-line"}`}>
                            {selected && <div className="w-2 h-2 rounded-full bg-kc" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-kc-dark">{opt.company} · {opt.name}</p>
                            <p className="text-[10px] text-kc-muted">
                              Entrega em até {opt.prazo} dia{opt.prazo !== 1 ? "s" : ""} útil{opt.prazo !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-kc">{formatCurrency(opt.preco)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {!shippingLoading && !shippingError && shippingOptions.length === 0 && (
                <p className="text-xs text-kc-muted py-4">Calculando opções de frete para o seu CEP…</p>
              )}
            </div>
          )}

          {/* ── STEP 3 — Pagamento ── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-medium text-kc-dark">Forma de pagamento</h2>

              {/* Seletor de método */}
              <div className="grid grid-cols-3 gap-3">
                {(["pix", "credit_card", "boleto"] as const).map((m) => {
                  const labels = { pix: "PIX", credit_card: "Cartão", boleto: "Boleto" };
                  const descs = { pix: "Aprovação instantânea", credit_card: "Até 3x sem juros", boleto: "Vence em 3 dias" };
                  const selected = form.paymentMethod === m;
                  return (
                    <button
                      key={m}
                      onClick={() => set("paymentMethod", m)}
                      className={`p-4 border text-center transition-colors ${selected ? "border-kc bg-kc/5" : "border-kc-line hover:border-kc-muted"}`}
                    >
                      <p className={`text-sm font-medium mb-0.5 ${selected ? "text-kc" : "text-kc-dark"}`}>{labels[m]}</p>
                      <p className="text-[9px] text-kc-muted">{descs[m]}</p>
                    </button>
                  );
                })}
              </div>

              {/* PIX */}
              {form.paymentMethod === "pix" && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 space-y-1">
                  <p className="text-xs font-medium text-emerald-800">Pagamento via PIX</p>
                  <p className="text-[11px] text-emerald-700">
                    Após confirmar o pedido, um QR Code será gerado. Você terá 30 minutos para realizar o pagamento. A aprovação é instantânea.
                  </p>
                </div>
              )}

              {/* Cartão — MP Payment Brick */}
              {form.paymentMethod === "credit_card" && (
                <div className="space-y-3">
                  {!brickReady && (
                    <div className="flex items-center gap-2 text-xs text-kc-muted py-3">
                      <Loader2 size={12} className="animate-spin" />
                      Carregando formulário seguro…
                    </div>
                  )}
                  {/* Container onde o Brick injeta o formulário completo com botão de submit */}
                  <div id="paymentBrick_container" />
                  {submitting && (
                    <div className="flex items-center gap-2 text-xs text-kc-muted">
                      <Loader2 size={12} className="animate-spin" />
                      Processando pagamento…
                    </div>
                  )}
                  <p className="text-[9px] text-kc-muted">
                    Seus dados de cartão são tokenizados pelo Mercado Pago e nunca trafegam em nossos servidores.
                  </p>
                </div>
              )}

              {/* Boleto */}
              {form.paymentMethod === "boleto" && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 p-4 space-y-1">
                    <p className="text-xs font-medium text-amber-800">Pagamento via Boleto</p>
                    <p className="text-[11px] text-amber-700">
                      O boleto será gerado após a confirmação. Prazo de vencimento: 3 dias corridos. A compensação pode levar até 2 dias úteis após o pagamento.
                    </p>
                  </div>
                  <Field label="CPF obrigatório para emissão do boleto" required>
                    <input
                      type="text"
                      value={form.cpf}
                      onChange={(e) => {
                        const masked = maskCpf(e.target.value);
                        set("cpf", masked);
                        if (cpfError) setCpfError("");
                      }}
                      onBlur={() => {
                        const digits = form.cpf.replace(/\D/g, "");
                        if (digits.length === 11 && !validarCPF(form.cpf)) {
                          setCpfError("CPF inválido. Verifique os números digitados.");
                        } else {
                          setCpfError("");
                        }
                      }}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      className={`${inputCls} ${cpfError ? "border-red-400" : ""}`}
                    />
                    {cpfError && (
                      <p className="text-xs text-red-500 mt-1">{cpfError}</p>
                    )}
                  </Field>
                </div>
              )}

              {submitError && (
                <div className="border border-red-200 bg-red-50 p-3 text-xs text-red-600">{submitError}</div>
              )}
            </div>
          )}

          {/* ── Botões de navegação ── */}
          <div className="flex items-center justify-between pt-2">
            {step > 0 ? (
              <button onClick={() => setStep((s) => s - 1)} className="text-[10px] tracking-[0.14em] text-kc-muted hover:text-kc-dark transition-colors uppercase">
                ← Voltar
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                onClick={handleContinue}
                disabled={!canProceed()}
                className="flex items-center gap-2 bg-kc text-white text-[11px] tracking-[0.18em] uppercase px-6 py-3.5 hover:bg-kc-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar <ChevronRight size={13} />
              </button>
            ) : form.paymentMethod === "credit_card" ? (
              // Credit card: o Brick tem seu próprio botão de submit — não exibimos o nosso
              null
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!canProceed() || submitting}
                className="flex items-center gap-2 bg-kc text-white text-[11px] tracking-[0.18em] uppercase px-6 py-3.5 hover:bg-kc-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? <><Loader2 size={13} className="animate-spin" /> Processando…</> : <><Check size={13} /> Confirmar pedido</>}
              </button>
            )}
          </div>
        </div>

        {/* ── Resumo lateral ── */}
        <div className="lg:col-span-1">
          <OrderSummary shipping={form.shippingOption} discount={discount} />
        </div>
      </div>
    </div>
  );
}

// ── Estilos compartilhados ────────────────────────────────────────────────────

const inputCls =
  "w-full border border-kc-line bg-white px-3 py-2.5 text-sm text-kc-dark placeholder-kc-muted/50 focus:outline-none focus:border-kc";


function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] tracking-[0.16em] text-kc-muted uppercase mb-1.5">
        {label}{required && <span className="text-kc ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
