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
    <section className="relative isolate overflow-hidden px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(170,255,0,0.16),transparent_30%),linear-gradient(135deg,#0A0A0A_0%,#16110d_46%,#0A0A0A_100%)]" />
      <div className="mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center gap-10">
        <div className="max-w-5xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-300/40 bg-lime-300/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-lime-300">
            <CalendarDays className="size-4" />
            Sorteo: {drawDate}
          </div>
          <h1 className="font-heading text-[3rem] font-extrabold uppercase leading-[0.92] tracking-normal text-white sm:text-7xl lg:text-8xl">
            {rifaConfig.eventName}
            <span className="block text-lime-300">4 CIFRAS</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">
            Compra tu fondo de pantalla por {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(rifaConfig.ticketPrice)} y recibe un numero aleatorio del 0000 al 9999.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,760px)_1fr] lg:items-end">
          <CountdownTimer drawDate={countdownDate} />
          <a
            href="#paquetes"
            className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-[8px] bg-lime-300 px-7 py-4 text-base font-extrabold uppercase text-black shadow-[0_0_34px_rgba(170,255,0,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_0_50px_rgba(170,255,0,0.55)]"
          >
            Comprar ahora
            <ArrowDown className="size-5 transition group-hover:translate-y-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
