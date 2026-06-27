"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Search, Send } from "lucide-react";
import { formatCOP } from "@/components/utils";

type Purchase = {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_whatsapp: string | null;
  package_name: string;
  ticket_count: number;
  amount_cop: number;
  payment_method: string;
  status: string;
  email_sent_at: string | null;
  created_at: string;
  ticket_numbers: string[];
};

export default function AdminCorreosPage() {
  const [query, setQuery] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ id: string; text: string; type: "ok" | "error" } | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!query) {
      setPurchases([]);
      return;
    }

    setLoading(true);
    setError("");

    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/purchases/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Error al buscar");
        } else {
          setPurchases(data.purchases ?? []);
        }
      } catch {
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query]);

  async function handleResend(purchase: Purchase) {
    setResending(purchase.id);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/admin/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: purchase.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatusMessage({ id: purchase.id, text: data.error || "Error al reenviar", type: "error" });
      } else {
        setStatusMessage({ id: purchase.id, text: "Correo reenviado", type: "ok" });
        setPurchases((prev) => prev.map((p) => (p.id === purchase.id ? { ...p, email_sent_at: new Date().toISOString() } : p)));
      }
    } catch {
      setStatusMessage({ id: purchase.id, text: "Error de conexión", type: "error" });
    } finally {
      setResending(null);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Admin interno</p>
            <h1 className="mt-2 font-heading text-4xl font-extrabold uppercase sm:text-5xl">Correos</h1>
            <p className="mt-3 text-sm text-white/65">Busca compras y reenvía el correo con los números de rifa.</p>
          </div>
          <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/14 px-4 py-2 font-bold text-foreground transition hover:border-lime-300 hover:text-lime-300">
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </header>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o ID de compra..."
            className="w-full rounded-md border border-white/12 bg-white/[0.045] px-11 py-3 text-foreground outline-none placeholder:text-white/35 focus:border-transparent focus:ring-2 focus:ring-primary"
          />
        </div>

        {error ? <p className="mt-4 rounded-md border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p> : null}

        {loading ? (
          <p className="mt-8 text-center text-sm text-white/50">Buscando...</p>
        ) : query && purchases.length === 0 ? (
          <p className="mt-8 text-center text-sm text-white/50">No se encontraron compras.</p>
        ) : !query ? (
          <p className="mt-8 text-center text-sm text-white/50">Escribe para buscar compras.</p>
        ) : (
          <div className="mt-6 space-y-4 pb-8">
            {purchases.map((purchase) => (
              <article key={purchase.id} className="rounded-md border border-white/12 bg-white/[0.035] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-lg font-bold text-lime-300">{purchase.buyer_name}</p>
                    <p className="flex items-center gap-2 text-sm text-white/70">
                      <Mail className="size-3.5 shrink-0" />
                      {purchase.buyer_email || <span className="italic text-white/40">Sin correo</span>}
                    </p>
                    <p className="text-sm text-white/60">
                      {purchase.package_name} · {purchase.ticket_count} números · {formatCOP(purchase.amount_cop)}
                    </p>
                    <p className="text-xs text-white/45">
                      {new Date(purchase.created_at).toLocaleString("es-CO")}
                      {purchase.email_sent_at ? (
                        <span className="ml-3 text-lime-300/70">Correo enviado: {new Date(purchase.email_sent_at).toLocaleString("es-CO")}</span>
                      ) : (
                        <span className="ml-3 text-yellow-300/70">Correo no enviado</span>
                      )}
                    </p>
                    {purchase.ticket_numbers.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {purchase.ticket_numbers.map((num) => (
                          <span key={num} className="rounded bg-white/8 px-2 py-0.5 font-mono text-xs text-white/60">
                            {num}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {statusMessage?.id === purchase.id && (
                      <p className={`text-xs font-bold ${statusMessage.type === "ok" ? "text-lime-300" : "text-red-300"}`}>{statusMessage.text}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleResend(purchase)}
                      disabled={resending === purchase.id || !purchase.buyer_email}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md bg-lime-300 px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="size-4" />
                      {resending === purchase.id ? "Enviando..." : "Reenviar correo"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
