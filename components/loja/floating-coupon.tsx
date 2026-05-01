"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface FloatingCoupon {
  code: string;
  floating_title: string;
  floating_description: string;
  value: number;
  type: "percent" | "fixed";
}

export function FloatingCoupon() {
  const [coupon, setCoupon] = useState<FloatingCoupon | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (dismissed) return;

    const wasDismissed = sessionStorage.getItem("coupon_dismissed");
    if (wasDismissed) return;

    fetch(`/api/coupons/floating?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data) {
          // Cupom desativado — limpa estado imediatamente
          setCoupon(null);
          setVisible(false);
          hasShownRef.current = false;
          return;
        }
        setCoupon(data);
        // Exibe o card apenas na primeira vez que o cupom é carregado
        if (!hasShownRef.current) {
          hasShownRef.current = true;
          setTimeout(() => setVisible(true), 3000);
        }
      })
      .catch(() => {});
  }, [pathname, dismissed]);

  function handleCopy() {
    if (!coupon) return;
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => {
      handleDismiss();
    }, 1500);
  }

  function handleDismiss() {
    setVisible(false);
    sessionStorage.setItem("coupon_dismissed", "true");
    setTimeout(() => setDismissed(true), 400);
  }

  if (!coupon || dismissed) return null;

  const discountLabel =
    coupon.type === "percent"
      ? `${coupon.value}% OFF`
      : `R$ ${Number(coupon.value).toFixed(2).replace(".", ",")} OFF`;

  return (
    <div
      style={{
        position: "fixed",
        right: visible ? 0 : "-320px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 9999,
        transition: "right 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        width: 280,
      }}
    >
      {/* Aba lateral — visível quando recolhido */}
      {!visible && (
        <div
          onClick={() => setVisible(true)}
          style={{
            position: "absolute",
            left: -36,
            top: "50%",
            transform: "translateY(-50%) rotate(-90deg)",
            background: "#A0622A",
            color: "white",
            padding: "6px 14px",
            fontSize: 11,
            letterSpacing: "0.1em",
            cursor: "pointer",
            borderRadius: "4px 4px 0 0",
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
        >
          🏷️ CUPOM
        </div>
      )}

      {/* Card do cupom */}
      <div
        style={{
          background: "linear-gradient(135deg, #5C3317 0%, #A0622A 100%)",
          borderRadius: "12px 0 0 12px",
          padding: "20px 16px",
          boxShadow: "-4px 4px 20px rgba(0,0,0,0.25)",
          position: "relative",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRight: "none",
        }}
      >
        {/* Botão fechar */}
        <button
          onClick={handleDismiss}
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
            padding: "2px 6px",
          }}
          aria-label="Fechar cupom"
        >
          ×
        </button>

        {/* Título */}
        <p
          style={{
            color: "#EDE8DC",
            fontSize: 11,
            letterSpacing: "0.15em",
            fontWeight: 600,
            margin: "0 0 4px 0",
            textTransform: "uppercase",
          }}
        >
          {coupon.floating_title || "🎉 Oferta Especial"}
        </p>

        {/* Desconto em destaque */}
        <p
          style={{
            color: "#FFD89B",
            fontSize: 28,
            fontWeight: 800,
            margin: "0 0 8px 0",
            lineHeight: 1,
          }}
        >
          {discountLabel}
        </p>

        {/* Instrução */}
        <p
          style={{
            color: "rgba(237,232,220,0.85)",
            fontSize: 11,
            margin: "0 0 12px 0",
            lineHeight: 1.4,
          }}
        >
          {coupon.floating_description || "Copie o código e aplique no carrinho"}
        </p>

        {/* Código + botão copiar */}
        <div
          style={{
            background: "rgba(255,255,255,0.12)",
            borderRadius: 6,
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            border: "1px dashed rgba(255,255,255,0.3)",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "0.15em",
              fontFamily: "monospace",
            }}
          >
            {coupon.code}
          </span>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? "#22c55e" : "#EDE8DC",
              color: copied ? "white" : "#5C3317",
              border: "none",
              borderRadius: 4,
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.05em",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {copied ? "✓ COPIADO!" : "COPIAR"}
          </button>
        </div>

        {/* Rodapé */}
        <p
          style={{
            color: "rgba(237,232,220,0.5)",
            fontSize: 10,
            margin: "8px 0 0 0",
            textAlign: "center",
          }}
        >
          Válido por tempo limitado
        </p>
      </div>
    </div>
  );
}
