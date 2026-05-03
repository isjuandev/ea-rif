"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/LoadingSkeleton";

type RifaStatus = {
  totalTickets: number;
  soldTickets: number;
  availableTickets: number;
  configured: boolean;
};

export function ProgressBar() {
  const [status, setStatus] = useState<RifaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rifa/status")
      .then((response) => response.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  const soldPercentage = status ? Math.min((status.soldTickets / status.totalTickets) * 100, 100) : 0;
  const availablePercentage = Math.max(100 - soldPercentage, 0);
  const roundedSoldPercentage = Math.round(soldPercentage);
  const roundedAvailablePercentage = Math.round(availablePercentage);

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-md border border-white/12 bg-white/[0.045] p-5 sm:p-7">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Avance de rifas</p>
            {loading ? <Skeleton className="mt-3 h-9 w-full max-w-md" /> : <h2 className="mt-2 font-heading text-2xl font-bold text-foreground sm:text-4xl">
              {roundedSoldPercentage}% de la rifa ya esta reservado
            </h2>}
            {loading ? <Skeleton className="mt-3 h-4 w-56" /> : <p className="mt-2 text-sm text-white/55">{roundedAvailablePercentage}% disponible para nuevas compras</p>}
          </div>
          {loading ? <Skeleton className="h-9 w-16" /> : <p className="font-heading text-3xl font-bold text-foreground">{roundedSoldPercentage}%</p>}
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-lime-300 to-yellow-300 shadow-glow transition-[width] duration-1000"
            style={{ width: `${soldPercentage}%` }}
          />
        </div>
      </div>
    </section>
  );
}
