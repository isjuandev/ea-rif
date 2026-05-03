"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/LoadingSkeleton";

type Winner = {
  draw_date: string;
  lottery_name: string;
  major_number: string | null;
  minor_numbers: string[];
  source?: string | null;
};

export function PreviousWinners() {
  const [open, setOpen] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rifa/winners")
      .then((response) => response.json())
      .then((data) => setWinners(data.winners ?? []))
      .catch(() => setWinners([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-md border border-white/12 bg-white/[0.035]">
        <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-heading text-xl font-bold text-foreground">
          Numeros ganadores anteriores
          <ChevronDown className={`size-5 transition ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="overflow-x-auto border-t border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="px-5 py-3 font-bold">Fecha</th>
                  <th className="px-5 py-3 font-bold">Numero ganador</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-t border-white/8">
                      <td className="px-5 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-7 w-16 bg-lime-300/20" /></td>
                    </tr>
                  ))
                )}
                {!loading && winners.length === 0 && (
                  <tr className="border-t border-white/8">
                    <td className="px-5 py-3 text-white/55" colSpan={2}>Aun no hay ganadores registrados en Supabase.</td>
                  </tr>
                )}
                {!loading && winners.map((winner) => (
                  <tr key={`${winner.draw_date}-${winner.major_number}`} className="border-t border-white/8">
                    <td className="px-5 py-3 text-white/70">{winner.draw_date}</td>
                    <td className="px-5 py-3">
                      <span className="font-heading text-xl font-bold text-lime-300">{winner.major_number ?? "Pendiente"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
