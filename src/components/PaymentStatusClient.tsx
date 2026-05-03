"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";

type PaymentStatus = {
  approved: boolean;
  final: boolean;
  paymentId: string;
  status?: string;
  statusDetail?: string;
  message?: string;
  purchaseId?: string;
  ticketNumbers?: string[];
  error?: string;
};

function statusCopy(status?: string) {
  if (status === "approved") return "Pago aprobado";
  if (status === "rejected") return "Pago rechazado";
  if (status === "cancelled") return "Pago cancelado";
  if (status === "refunded") return "Pago reembolsado";
  if (status === "charged_back") return "Pago devuelto";
  if (status === "in_process") return "Pago en revision";
  if (status === "pending") return "Esperando aprobacion";
  return "Consultando pago";
}

export function PaymentStatusClient({
  initialPaymentId,
}: {
  initialPaymentId?: string;
}) {
  const paymentId = initialPaymentId;
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(paymentId));
  const [error, setError] = useState("");

  async function refresh() {
    if (!paymentId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/mercadopago/payments/${encodeURIComponent(paymentId)}/status`, {
        cache: "no-store",
      });
      const data = (await response.json()) as PaymentStatus;

      if (!response.ok) {
        throw new Error(data.error || "No se pudo consultar el pago.");
      }

      setStatus(data);
    } catch (refreshError: any) {
      setError(refreshError?.message || "No se pudo consultar el pago.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [paymentId]);

  useEffect(() => {
    if (!paymentId || status?.final) return;

    const timer = window.setInterval(refresh, 7000);
    return () => window.clearInterval(timer);
  }, [paymentId, status?.final]);

  const approved = status?.approved;
  const declined = status?.final && !status.approved;
  const pending = !approved && !declined;

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-6 text-white sm:px-5 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-2xl flex-col justify-center">
        <Link href="/" className="mb-8 text-sm font-bold text-white/55 transition hover:text-white">
          Volver a la rifa
        </Link>

        <div className="rounded-[8px] border border-white/12 bg-white/[0.04] p-5 sm:p-8">
          {!paymentId ? (
            <>
              <AlertTriangle className="size-12 text-yellow-300" />
              <h1 className="mt-5 font-heading text-3xl font-bold">No encontramos el pago</h1>
              <p className="mt-3 text-white/65">Abre esta página desde el checkout de Mercado Pago o vuelve a iniciar la compra.</p>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 sm:items-center">
                {approved && <CheckCircle2 className="size-10 shrink-0 text-lime-300 sm:size-12" />}
                {declined && <XCircle className="size-10 shrink-0 text-red-300 sm:size-12" />}
                {pending && <Loader2 className="size-10 shrink-0 animate-spin text-lime-300 sm:size-12" />}
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45 sm:text-sm sm:tracking-[0.18em]">Mercado Pago</p>
                  <h1 className="break-words font-heading text-2xl font-bold sm:text-3xl">{statusCopy(status?.status)}</h1>
                </div>
              </div>

              <p className="mt-5 text-white/68">
                {approved
                  ? "Tus números quedaron asignados. También los envíaremos a tu correo."
                  : declined
                    ? status?.message || "El pago no fue aprobado. No se asignaron números de rifa."
                    : "Estamos esperando la confirmacion de Mercado Pago. Esta página se actualiza automáticamente."}
              </p>

              <dl className="mt-6 grid gap-3 rounded-[8px] border border-white/10 bg-black/25 p-4 text-sm">
                <div className="grid gap-1 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-4">
                  <dt className="text-white/45">ID de pago</dt>
                  <dd className="break-all font-mono text-white/80 sm:text-right">{status?.paymentId || paymentId}</dd>
                </div>
                {status?.status && (
                  <div className="grid gap-1 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-4">
                    <dt className="text-white/45">Estado</dt>
                    <dd className="break-words font-bold text-white/80 sm:text-right">{status.status}</dd>
                  </div>
                )}
                {status?.statusDetail && (
                  <div className="grid gap-1 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-4">
                    <dt className="text-white/45">Detalle</dt>
                    <dd className="break-words text-white/80 sm:text-right">{status.statusDetail}</dd>
                  </div>
                )}
              </dl>

              {approved && status?.ticketNumbers && status.ticketNumbers.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {status.ticketNumbers.map((number) => (
                    <span key={number} className="rounded-[6px] border border-lime-300/50 bg-lime-300/10 px-3 py-2 font-heading text-lg font-bold text-lime-300">
                      {number}
                    </span>
                  ))}
                </div>
              )}

              {error && <p className="mt-5 rounded-[8px] border border-red-400/35 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-lime-300 px-5 py-3 font-extrabold uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="size-5 animate-spin" /> : <RefreshCw className="size-5" />}
                  Actualizar
                </button>
                <Link href="/" className="inline-flex items-center justify-center rounded-[8px] border border-white/14 px-5 py-3 font-extrabold uppercase text-white transition hover:bg-white/8">
                  Ir al inicio
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
