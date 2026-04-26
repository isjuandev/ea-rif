"use client";

import { useEffect, useState } from "react";
import { ArrowDown, CalendarDays } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { rifaConfig } from "@/config/rifa";

export function Hero() {
  const [drawDateIso, setDrawDateIso] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rifa/status")
      .then((response) => response.json())
      .then((data) => setDrawDateIso(data.drawDate))
      .catch(() => setDrawDateIso(null));
  }, []);

  const countdownDate = drawDateIso ?? new Date(Date.now() + 1000).toISOString();
  const drawDate = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(countdownDate));

  return (
    <section className="relative isolate overflow-hidden px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(170,255,0,0.16),transparent_30%),linear-gradient(135deg,#0A0A0A_0%,#16110d_46%,#0A0A0A_100%)]" />
      <div className="mx-auto flex max-w-7xl flex-col justify-start gap-8 py-12 sm:min-h-[88vh] sm:justify-center sm:gap-10 sm:py-0">
        <div className="max-w-5xl">
          <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-lime-300/40 bg-lime-300/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-lime-300 sm:text-xs sm:tracking-[0.2em]">
            <CalendarDays className="size-4" />
            <span className="truncate">Sorteo: {drawDate}</span>
          </div>
          <h1 className="font-heading text-[clamp(2.35rem,12vw,4rem)] font-extrabold uppercase leading-[0.92] tracking-normal text-white sm:text-7xl lg:text-8xl">
            {rifaConfig.eventName}
            <span className="block text-lime-300">4 CIFRAS</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">
            Compra paquetes desde 5 wallpapers digitales y recibe numeros aleatorios del 0000 al 9999 para participar.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,760px)_1fr] lg:items-end">
          <CountdownTimer drawDate={countdownDate} />
          <a
            href="#paquetes"
            className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-[8px] bg-lime-300 px-7 py-4 text-base font-extrabold uppercase text-black shadow-[0_0_34px_rgba(170,255,0,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_0_50px_rgba(170,255,0,0.55)] sm:w-auto"
          >
            Comprar ahora
            <ArrowDown className="size-5 transition group-hover:translate-y-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
