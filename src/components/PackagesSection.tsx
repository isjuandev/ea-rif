"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PackageCard } from "@/components/PackageCard";
import { PurchaseModal } from "@/components/PurchaseModal";
import { useRifaConfig } from "@/components/use-rifa-config";
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
  const [selectedPackage, setSelectedPackage] = useState<RifaPackage | null>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RifaStatus>({
    totalTickets: fallbackRifaConfig.totalTickets,
    soldTickets: fallbackRifaConfig.fallbackSoldTickets,
    availableTickets: fallbackRifaConfig.totalTickets,
    configured: false,
  });
  const rifaConfig = useRifaConfig();

  useEffect(() => {
    fetch("/api/rifa/status")
      .then((response) => response.json())
      .then((data) => setStatus(data))
      .catch(() => undefined);
  }, []);

  function handleBuy(pack: RifaPackage) {
    setSelectedPackage(pack);
    setOpen(true);
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
              Compra wallpapers digitales, recibelos enumerados en tu correo.
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
                <PackageCard pack={pack} onBuy={handleBuy} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <PurchaseModal selectedPackage={selectedPackage} open={open} onOpenChange={setOpen} />
    </section>
  );
}
