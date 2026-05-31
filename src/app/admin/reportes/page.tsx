"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { formatCOP } from "@/components/utils";

type ReportTotals = {
  soldNumbersCount: number;
  transactionsCount: number;
  grossCop: number;
  feeCop: number;
  netCop: number;
};

type ReportByDayItem = {
  date: string;
  soldNumbersCount: number;
  transactionsCount: number;
  grossCop: number;
  feeCop: number;
  netCop: number;
};

type ReportSummary = {
  reportTotals: ReportTotals;
  reportByDay: ReportByDayItem[];
  cycleId: string;
  cycleReportDownloads: number;
  lastReportDownloadAt: string | null;
};

type SoldNumberItem = {
  number: string;
  buyer_name: string | null;
  buyer_whatsapp: string | null;
  buyer_email: string | null;
  sold_at: string | null;
  purchase_id: string | null;
};

const EMPTY_SUMMARY: ReportSummary = {
  reportTotals: { soldNumbersCount: 0, transactionsCount: 0, grossCop: 0, feeCop: 0, netCop: 0 },
  reportByDay: [],
  cycleId: "cycle-initial",
  cycleReportDownloads: 0,
  lastReportDownloadAt: null,
};

export default function AdminReportesPage() {
  const [summary, setSummary] = useState<ReportSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [soldNumbers, setSoldNumbers] = useState<SoldNumberItem[]>([]);
  const [soldCount, setSoldCount] = useState(0);
  const [soldPercentage, setSoldPercentage] = useState(0);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);

  async function loadSummary() {
    const response = await fetch("/api/admin/reports/summary", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "No se pudo cargar el reporte.");
    }
    setSummary(data);
  }

  useEffect(() => {
    loadSummary()
      .catch((error: any) => setStatus(error?.message || "No se pudo cargar el reporte."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`/api/admin/sales?page=${salesPage}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setSoldNumbers(data?.soldNumbers ?? []);
        setSoldCount(data?.soldCount ?? 0);
        setSoldPercentage(data?.soldPercentage ?? 0);
        setSalesTotalPages(data?.totalPages ?? 0);
        setTotalTickets(data?.totalTickets ?? 0);
      })
      .catch(() => undefined);
  }, [salesPage]);

  async function handleDownload(format: "xlsx" | "pdf") {
    setStatus("");
    const response = await fetch(`/api/admin/reports/export?format=${format}`, { method: "GET" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data?.error || "No se pudo descargar el archivo.");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    anchor.href = url;
    anchor.download = `reporte-financiero-${timestamp}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    await loadSummary().catch(() => undefined);
  }

  const maxTotalValue = Math.max(summary.reportTotals.grossCop, summary.reportTotals.feeCop, summary.reportTotals.netCop, 1);
  const maxDailySold = Math.max(...summary.reportByDay.map((item) => item.soldNumbersCount), 1);
  const maxDailyNet = Math.max(...summary.reportByDay.map((item) => item.netCop), 1);

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Admin interno</p>
            <h1 className="mt-2 font-heading text-4xl font-extrabold uppercase sm:text-5xl">Reportes</h1>
            <p className="mt-3 text-sm text-white/65">
              Ciclo: <span className="font-bold text-white/90">{summary.cycleId}</span> · Descargas del ciclo:{" "}
              <span className="font-bold text-lime-300">{summary.cycleReportDownloads}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/14 px-4 py-2 font-bold text-foreground transition hover:border-lime-300 hover:text-lime-300">
              <ArrowLeft className="size-4" />
              Volver
            </Link>
            <button type="button" onClick={() => handleDownload("xlsx")} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-lime-300 px-4 py-2 font-bold text-primary-foreground transition hover:brightness-110">
              <Download className="size-4" />
              Descargar Excel
            </button>
            <button type="button" onClick={() => handleDownload("pdf")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-lime-300 px-4 py-2 font-bold text-lime-300 transition hover:bg-lime-300 hover:text-primary-foreground">
              <Download className="size-4" />
              Descargar PDF
            </button>
          </div>
        </header>

        {status ? <p className="mt-4 rounded-md border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">{status}</p> : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-md border border-white/12 bg-white/[0.045] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Números vendidos</p>
            <p className="mt-2 font-heading text-3xl font-bold text-lime-300">{summary.reportTotals.soldNumbersCount.toLocaleString("es-CO")}</p>
          </article>
          <article className="rounded-md border border-white/12 bg-white/[0.045] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Transacciones</p>
            <p className="mt-2 font-heading text-3xl font-bold text-cyan-300">{summary.reportTotals.transactionsCount.toLocaleString("es-CO")}</p>
          </article>
          <article className="rounded-md border border-white/12 bg-white/[0.045] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Total bruto</p>
            <p className="mt-2 font-heading text-3xl font-bold text-yellow-300">{formatCOP(summary.reportTotals.grossCop)}</p>
          </article>
          <article className="rounded-md border border-white/12 bg-white/[0.045] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Total neto</p>
            <p className="mt-2 font-heading text-3xl font-bold text-emerald-300">{formatCOP(summary.reportTotals.netCop)}</p>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="rounded-md border border-white/12 bg-white/[0.035] p-4">
            <p className="text-sm font-bold text-white/85">Acumulado total</p>
            <p className="mt-1 text-xs text-white/60">Bruto, comisión (3.29% + 800 por transacción) y neto.</p>
            <div className="mt-4 space-y-4">
              {[
                { label: "Bruto", value: summary.reportTotals.grossCop, tone: "bg-yellow-300" },
                { label: "Comisión", value: summary.reportTotals.feeCop, tone: "bg-rose-300" },
                { label: "Neto", value: summary.reportTotals.netCop, tone: "bg-emerald-300" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <p className="font-bold text-white/80">{item.label}</p>
                    <p className="font-bold text-white/90">{formatCOP(item.value)}</p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full ${item.tone}`} style={{ width: `${Math.max((item.value / maxTotalValue) * 100, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-md border border-white/12 bg-white/[0.035] p-4">
            <p className="text-sm font-bold text-white/85">Evolución diaria</p>
            <p className="mt-1 text-xs text-white/60">Barras de números vendidos + línea de neto por día.</p>
            {loading ? (
              <p className="mt-6 text-sm text-white/60">Cargando...</p>
            ) : summary.reportByDay.length === 0 ? (
              <p className="mt-6 text-sm text-white/60">No hay compras vendidas todavía.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {summary.reportByDay.map((day) => (
                  <div key={day.date} className="rounded-md border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/60">{day.date}</p>
                      <p className="text-xs font-bold text-white/70">
                        {day.soldNumbersCount} números · {day.transactionsCount} transacciones
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-white/65">
                          <span>Vendidos</span>
                          <span>{day.soldNumbersCount.toLocaleString("es-CO")}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full bg-cyan-300" style={{ width: `${Math.max((day.soldNumbersCount / maxDailySold) * 100, 3)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-white/65">
                          <span>Neto</span>
                          <span>{formatCOP(day.netCop)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full bg-emerald-300" style={{ width: `${Math.max((day.netCop / maxDailyNet) * 100, 3)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="mt-6 grid gap-4 pb-4 lg:grid-cols-2">
          <article className="rounded-md border border-white/12 bg-white/[0.045] p-4">
            <p className="text-sm font-bold text-white/80">Se ha vendido el {soldPercentage}%</p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-lime-300" style={{ width: `${Math.min(soldPercentage, 100)}%` }} />
            </div>
          </article>
          <article className="rounded-md border border-white/12 bg-white/[0.045] p-4">
            <p className="text-sm font-bold text-white/80">Se han vendido {soldCount} Números</p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-yellow-300" style={{ width: `${Math.min(totalTickets > 0 ? Math.round((soldCount / totalTickets) * 100) : 0, 100)}%` }} />
            </div>
          </article>
        </section>

        <section className="pb-8">
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Ventas</p>
            <h2 className="mt-1 font-heading text-2xl font-bold">Números vendidos</h2>
          </div>
          <div className="overflow-x-auto rounded-md border border-white/12 bg-white/[0.03]">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="px-3 py-2 text-left">Número</th>
                  <th className="px-3 py-2 text-left">Comprador</th>
                  <th className="px-3 py-2 text-left">Correo</th>
                  <th className="px-3 py-2 text-left">WhatsApp</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {soldNumbers.map((item) => (
                  <tr key={`${item.purchase_id}-${item.number}`} className="border-t border-white/10">
                    <td className="px-3 py-2 font-bold text-lime-300">{item.number}</td>
                    <td className="px-3 py-2">{item.buyer_name || "-"}</td>
                    <td className="px-3 py-2">{item.buyer_email || "-"}</td>
                    <td className="px-3 py-2">{item.buyer_whatsapp || "-"}</td>
                    <td className="px-3 py-2">{item.sold_at ? new Date(item.sold_at).toLocaleString("es-CO") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-white/60">Mostrando 10 compras por página.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSalesPage((current) => Math.max(1, current - 1))}
                disabled={salesPage <= 1}
                className="rounded-md border border-white/14 px-3 py-1 text-sm font-bold text-foreground transition hover:border-lime-300 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Anterior
              </button>
              <p className="text-sm text-white/75">Página {salesPage}{salesTotalPages > 0 ? ` de ${salesTotalPages}` : ""}</p>
              <button
                type="button"
                onClick={() => setSalesPage((current) => (salesTotalPages > 0 ? Math.min(salesTotalPages, current + 1) : current + 1))}
                disabled={salesTotalPages > 0 ? salesPage >= salesTotalPages : soldNumbers.length < 10}
                className="rounded-md border border-white/14 px-3 py-1 text-sm font-bold text-foreground transition hover:border-lime-300 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
