"use client";

import { useEffect, useState } from "react";
import { Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";

const SIZES = ["G1", "G2", "G3"] as const;

export default function PlusSizeConfigPage() {
  const [values, setValues] = useState<Record<string, string>>({ G1: "", G2: "", G3: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/admin/config/plus-size-markup")
      .then((r) => r.json())
      .then((data) => {
        const markups = data.markups ?? {};
        setValues({
          G1: String(markups.G1 ?? 0),
          G2: String(markups.G2 ?? 0),
          G3: String(markups.G3 ?? 0),
        });
      })
      .catch(() => setError("Erro ao carregar configuração atual."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    const markups: Record<string, number> = {};
    for (const size of SIZES) {
      const n = parseFloat(values[size].replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        setError(`Valor inválido para ${size}. Informe um número maior ou igual a zero.`);
        setSaving(false);
        return;
      }
      markups[size] = n;
    }

    try {
      const res = await fetch("/api/admin/config/plus-size-markup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markups }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar configuração.");
        return;
      }
      setSuccess("Configuração salva com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Ruler size={22} className="text-kc-muted" strokeWidth={1.5} />
        <div>
          <h1 className="text-2xl font-serif font-medium text-kc-dark">Acréscimo Plus Size</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Valor somado ao preço base para os tamanhos G1, G2 e G3. Aplicado automaticamente
            na loja assim que salvo — sem necessidade de novo deploy.
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {loading ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : (
          <div className="space-y-4">
            {SIZES.map((size) => (
              <div key={size}>
                <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                  Acréscimo {size} (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={values[size]}
                  onChange={(e) => setValues((v) => ({ ...v, [size]: e.target.value }))}
                  placeholder="40.00"
                  className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-kc"
                />
              </div>
            ))}

            <Button onClick={handleSave} loading={saving} disabled={loading}>
              Salvar configuração
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
