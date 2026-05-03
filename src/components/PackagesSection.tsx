"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PackageCard } from "@/components/PackageCard";
import { useRifaConfig } from "@/components/use-rifa-config";
import { formatCOP } from "@/components/utils";
import { rifaConfig as fallbackRifaConfig } from "@/config/rifa";
import { type RifaPackage } from "@/config/rifa";

type RifaStatus = {
  totalTickets: number;
  soldTickets: number;
  availableTickets: number;
  drawDate?: string;
  configured: boolean;
};

export function PackagesSection() {
  const router = useRouter();
  const [status, setStatus] = useState<RifaStatus>({
    totalTickets: fallbackRifaConfig.totalTickets,
    soldTickets: fallbackRifaConfig.fallbackSoldTickets,
    availableTickets: fallbackRifaConfig.totalTickets,
    configured: false,
  });
  const rifaConfig = useRifaConfig();
  const [customTickets, setCustomTickets] = useState(5);
  const [customError, setCustomError] = useState("");

  const boundedCustomTickets = useMemo(() => Math.max(5, Math.min(500, customTickets)), [customTickets]);

  useEffect(() => {
    fetch("/api/rifa/status")
      .then((response) => response.json())
      .then((data) => setStatus(data))
      .catch(() => undefined);
  }, []);

  function handleBuy(pack: RifaPackage) {
    if (pack.rifas > status.availableTickets) return;
    router.push(`/pago/checkout?package=${encodeURIComponent(pack.id)}`);
  }

  function handleBuyCustom() {
    if (!Number.isInteger(customTickets) || customTickets < 5 || customTickets > 500) {
      setCustomError("La cantidad debe estar entre 5 y 500 entradas.");
      return;
    }
    setCustomError("");
    if (boundedCustomTickets > status.availableTickets) return;
    router.push(`/pago/checkout?package=custom&quantity=${encodeURIComponent(String(boundedCustomTickets))}`);
  }

  const drawDateIso = status.drawDate ?? new Date(Date.now() + 1000).toISOString();
  const drawDate = status.drawDate
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(status.drawDate))
    : "Cargando sorteo";
  const soldPercentage = Math.min((status.soldTickets / status.totalTickets) * 100, 100);
  const roundedSoldPercentage = Math.round(soldPercentage);
  const roundedAvailablePercentage = Math.round(Math.max(100 - soldPercentage, 0));

  return (
    <section id="paquetes" className="relative isolate overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(170,255,0,0.16),transparent_28%),linear-gradient(135deg,#0A0A0A_0%,#15110d_48%,#080808_100%)]" />
      <div className="mx-auto grid max-w-7xl gap-8 py-8 sm:py-10 lg:min-h-[88vh] lg:content-center lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div className="min-w-0">
            <h1 className="font-heading text-[clamp(2.7rem,8vw,5.8rem)] font-extrabold uppercase leading-[0.9] tracking-normal text-white">
              {rifaConfig.eventName}
            </h1>
            <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-lime-300/40 bg-lime-300/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-lime-300 sm:text-xs sm:tracking-[0.2em]">
              <CalendarDays className="size-4" />
              <span className="truncate">{drawDate}</span>
            </div>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              Compra tus entradas digitales, recíbelos enumerados en tu correo.
            </p>
          </div>

          <div className="grid gap-3 rounded-[8px] border border-white/12 bg-white/[0.045] p-4 lg:mb-2">
            <CountdownTimer drawDate={drawDateIso} />
            <div>
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-300">Avance</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-white">{roundedSoldPercentage}% reservado</p>
                </div>
                <p className="text-sm font-bold text-white/55">{roundedAvailablePercentage}% disponible</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lime-300 to-yellow-300 shadow-[0_0_20px_rgba(170,255,0,0.42)] transition-[width] duration-1000"
                  style={{ width: `${soldPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Paquetes</p>
              <h2 className="mt-1 font-heading text-2xl font-bold text-white sm:text-3xl">Entrega inmediata</h2>
            </div>
            <p className="text-sm font-bold text-white/55">Elige tu paquete y paga en linea.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rifaConfig.packages.map((pack) => (
              <div key={pack.id} className="min-w-0">
                <PackageCard
                  pack={pack}
                  disabled={pack.rifas > status.availableTickets}
                  disabledReason="Sin cupos"
                  onBuy={handleBuy}
                />
              </div>
            ))}
            <div className="group relative flex h-full min-w-0 flex-col rounded-[8px] border border-white/12 bg-white/[0.045] p-4 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-lime-300/70 hover:shadow-[0_0_34px_rgba(170,255,0,0.22)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-heading text-2xl font-bold leading-tight text-white">{boundedCustomTickets} Entradas</h3>
              </div>
              <p className="font-heading text-3xl font-bold text-lime-300">{formatCOP(boundedCustomTickets * rifaConfig.ticketPrice)}</p>
              <div className="mt-4 space-y-2 text-sm text-white/72">
                <p>Compra entre 5 y 500 entradas</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => { setCustomTickets((v) => Math.max(5, v - 1)); setCustomError(""); }} className="h-11 w-11 rounded-[8px] border border-white/20 text-xl">-</button>
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={customTickets}
                  onChange={(event) => {
                    setCustomTickets(Number(event.target.value));
                    setCustomError("");
                  }}
                  className="h-11 w-full appearance-none rounded-[8px] border border-white/12 bg-black/30 px-3 text-white outline-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:border-lime-300"
                />
                <button type="button" onClick={() => { setCustomTickets((v) => Math.min(500, v + 1)); setCustomError(""); }} className="h-11 w-11 rounded-[8px] border border-white/20 text-xl">+</button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => { setCustomTickets((v) => Math.min(500, v + 5)); setCustomError(""); }} className="rounded-[8px] border border-white/20 py-2 text-xs">+5</button>
                <button type="button" onClick={() => { setCustomTickets((v) => Math.min(500, v + 10)); setCustomError(""); }} className="rounded-[8px] border border-white/20 py-2 text-xs">+10</button>
                <button type="button" onClick={() => { setCustomTickets((v) => Math.min(500, v + 50)); setCustomError(""); }} className="rounded-[8px] border border-white/20 py-2 text-xs">+50</button>
              </div>
              {customError && <p className="mt-1 text-xs text-red-300">{customError}</p>}
              <button
                type="button"
                onClick={handleBuyCustom}
                disabled={boundedCustomTickets > status.availableTickets}
                className="mt-6 w-full rounded-[8px] bg-white px-5 py-3 font-extrabold uppercase text-black transition group-hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-white/18 disabled:text-white/45"
              >
                Comprar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
