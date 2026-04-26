"use client";

import { useEffect, useState } from "react";
import { rifaConfig } from "@/config/rifa";

type RifaStatus = {
  totalTickets: number;
  soldTickets: number;
  availableTickets: number;
  configured: boolean;
};

export function ProgressBar() {
  const [status, setStatus] = useState<RifaStatus>({
    totalTickets: rifaConfig.totalTickets,
    soldTickets: rifaConfig.fallbackSoldTickets,
    availableTickets: rifaConfig.totalTickets,
    configured: false,
  });

  useEffect(() => {
    fetch("/api/rifa/status")
      .then((response) => response.json())
      .then((data) => setStatus(data))
      .catch(() => undefined);
  }, []);

  const percentage = Math.min((status.soldTickets / status.totalTickets) * 100, 100);

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[8px] border border-white/12 bg-white/[0.045] p-5 sm:p-7">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Avance de rifas</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-white sm:text-4xl">
              {status.soldTickets} de {status.totalTickets} numeros vendidos
            </h2>
            <p className="mt-2 text-sm text-white/55">{status.availableTickets} numeros disponibles en tiempo real</p>
          </div>
          <p className="font-heading text-3xl font-bold text-white">{Math.round(percentage)}%</p>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-lime-300 to-yellow-300 shadow-[0_0_24px_rgba(170,255,0,0.45)] transition-[width] duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </section>
  );
}
