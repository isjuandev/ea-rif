"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/LoadingSkeleton";
import { useRifaConfigState } from "@/components/use-rifa-config";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const questions = [
  {
    q: "¿Cómo recibo mis entradas?",
    a: "Al registrar la compra, el sistema asigna entradas aleatorias disponibles dentro del rango configurado para esta rifa y las envía al correo registrado.",
  },
  {
    q: "¿Qué estoy comprando exactamente?",
    a: "Cada entrada cuesta $1000 COP e incluye una entrada digital para ser un feliz ganador. Puedes comprar paquetes de 5, 10, 20, 50 o hasta 500 entradas.",
  },
  {
    q: "¿Puedo elegir mis entradas?",
    a: "No. Para mantener el proceso transparente, las entradas se asignan aleatoriamente según la cantidad incluida en tu paquete.",
  },
  {
    q: "¿Cómo se anuncia el ganador?",
    a: "En un directo en Instagram se anuncia el ganador.",
  },
  {
    q: "¿Hay más premios además del mayor?",
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
  const [winnersLoading, setWinnersLoading] = useState(true);
  const { config } = useRifaConfigState();

  useEffect(() => {
    fetch("/api/rifa/winners")
      .then((response) => response.json())
      .then((data) => setWinners(data.winners ?? []))
      .catch(() => setWinners([]))
      .finally(() => setWinnersLoading(false));
  }, []);

  return (
    <section className="border-t border-white/8 bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="self-start w-full rounded-md border border-white/12 bg-white/[0.035]">
              <button
                onClick={() => setWinnersOpen(!winnersOpen)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left font-heading text-xl font-bold text-foreground"
              >
                Últimos 3 ganadores
                <ChevronDown className={`size-5 transition ${winnersOpen ? "rotate-180" : ""}`} />
              </button>
              {winnersOpen && (
                <div className="border-t border-white/10 px-4 py-3">
                  {winnersLoading && (
                    <div className="grid gap-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="rounded-md border border-white/8 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-8 w-16 bg-lime-300/20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!winnersLoading && winners.length === 0 && <p className="text-sm leading-6 text-white/55">Aún no hay ganadores registrados.</p>}
                  <div className="grid gap-3">
                    {!winnersLoading && winners.slice(0, 3).map((winner) => (
                      <div key={`${winner.draw_date}-${winner.major_number}`} className="rounded-md border border-white/8 bg-black/20 p-3">
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

            <div className="flex-1 flex flex-col items-center justify-center rounded-md bg-gradient-to-br from-lime-300/10 via-cyan-300/5 to-fuchsia-500/10 px-4 py-5 text-center">
              <p className="mb-4 text-sm leading-5 text-white/70">
                Entérate de todas las activaciones, números bendecidos y oportunidades exclusivas. Siguenos y sé parte.
              </p>
              <a
                href={config.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-lime-300/60 bg-lime-300/15 px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] text-lime-200 transition hover:bg-lime-300 hover:text-primary-foreground"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                  <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm8.5 1.8h-8.5A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95ZM12 7.6a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8Zm0 1.8a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Zm4.95-2.4a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z" />
                </svg>
                Seguir en Instagram
              </a>
            </div>
          </div>

          <div className="rounded-md border border-white/12 bg-white/[0.035] px-4 py-3">
            <h2 className="font-heading text-2xl font-bold text-foreground">FAQ</h2>
            <Accordion type="single" collapsible className="mt-2 divide-y divide-white/10">
              {questions.map((item, index) => (
                <AccordionItem key={item.q} value={`item-${index}`}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
      </div>
    </section>
  );
}
