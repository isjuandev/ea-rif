"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const entradas = [
  "from-lime-300 via-cyan-300 to-fuchsia-500",
  "from-orange-300 via-lime-300 to-emerald-500",
  "from-white via-lime-200 to-yellow-300",
  "from-rose-500 via-purple-500 to-lime-300",
  "from-sky-300 via-lime-300 to-black",
  "from-amber-200 via-red-400 to-lime-300",
];

const questions = [
  {
    q: "Como recibo mis entradas?",
    a: "Al registrar la compra, el sistema asigna entradas aleatorias disponibles del 0000 al 9999 y las envía al correo registrado.",
  },
  {
    q: "Que estoy comprando exactamente?",
    a: "Cada entrada cuesta $1000 COP e incluye una entrada digital. Puedes comprar paquetes de 5, 10, 20 o 50 entradas.",
  },
  {
    q: "Puedo elegir mis entradas?",
    a: "No. Para mantener el proceso transparente, las entradas se asignan aleatoriamente segun la cantidad incluida en tu paquete.",
  },
  {
    q: "Como se anuncia el ganador?",
    a: "En un directo en Instagram se anuncia el ganador.",
  },
  {
    q: "Hay más premios además del mayor?",
    a: "Sí. En cada sorteo se registran números bendecidos premiados aleatorios con recompensas menores.",
  },
];

type Winner = {
  draw_date: string;
  lottery_name: string;
  major_number: string | null;
  minor_numbers: string[];
};

export function CompactInfoSection() {
  const [winnersOpen, setWinnersOpen] = useState(true);
  const [winners, setWinners] = useState<Winner[]>([]);

  useEffect(() => {
    fetch("/api/rifa/winners")
      .then((response) => response.json())
      .then((data) => setWinners(data.winners ?? []))
      .catch(() => setWinners([]));
  }, []);

  return (
    <section className="border-t border-white/8 bg-[#070707] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="min-w-0">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Entradas incluidas</p>
            <h2 className="mt-2 max-w-2xl font-heading text-3xl font-bold leading-tight text-white sm:text-4xl">
              Previews listos para desbloquear
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {entradas.map((gradient, index) => (
              <div key={gradient} className="aspect-[4/3] overflow-hidden rounded-[8px] border border-white/12 bg-white/[0.04] p-2">
                <div className={`relative h-full rounded-[6px] bg-gradient-to-br ${gradient}`}>
                  <div className="absolute inset-0 bg-[línear-gradient(135deg,rgba(0,0,0,0.04),rgba(0,0,0,0.38)),repeating-línear-gradient(90deg,rgba(255,255,255,0.12)_0_1px,transparent_1px_24px)]" />
                  <div className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                    Drop {String(index + 1).padStart(2, "0")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-[8px] border border-white/12 bg-white/[0.035]">
            <button
              onClick={() => setWinnersOpen(!winnersOpen)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left font-heading text-xl font-bold text-white"
            >
              Numeros ganadores
              <ChevronDown className={`size-5 transition ${winnersOpen ? "rotate-180" : ""}`} />
            </button>
            {winnersOpen && (
              <div className="border-t border-white/10 px-4 py-3">
                {winners.length === 0 && <p className="text-sm leading-6 text-white/55">Aun no hay ganadores registrados.</p>}
                <div className="grid gap-3">
                  {winners.slice(0, 4).map((winner) => (
                    <div key={`${winner.draw_date}-${winner.major_number}`} className="rounded-[8px] border border-white/8 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">{winner.draw_date}</p>
                        <p className="font-heading text-2xl font-bold text-lime-300">{winner.major_number ?? "Pendiente"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[8px] border border-white/12 bg-white/[0.035] px-4 py-3">
            <h2 className="font-heading text-2xl font-bold text-white">FAQ</h2>
            <Accordion type="single" collapsible className="mt-2 divide-y divide-white/10">
              {questions.map((item, index) => (
                <AccordionItem key={item.q} value={`item-${index}`}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </aside>
      </div>
    </section>
  );
}
