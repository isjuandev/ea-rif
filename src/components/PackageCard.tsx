"use client";

import { Ticket } from "lucide-react";
import { type RifaPackage } from "@/config/rifa";
import { cn, formatCOP } from "@/components/utils";

export function PackageCard({
  pack,
  disabled = false,
  disabledReason = "Agotado",
  onBuy,
}: {
  pack: RifaPackage;
  disabled?: boolean;
  disabledReason?: string;
  onBuy: (pack: RifaPackage) => void;
}) {
  return (
    <article
      className={cn(
        "card card--elevated group relative min-w-0 overflow-visible p-4 hover:border-primary hover:shadow-glow",
        pack.featured && "border-primary shadow-glow",
        disabled && "opacity-55 hover:translate-y-0 hover:border-border hover:shadow-md",
      )}
    >
      {pack.featured && (
        <div className="absolute -top-2 left-4 z-10 rounded-full bg-primary px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary-foreground">
          Mas popular
        </div>
      )}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-heading text-2xl font-bold leading-tight text-foreground">{pack.name}</h3>
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
          <Ticket className="size-5" />
        </div>
      </div>
      <p className="font-heading text-3xl font-bold text-primary">{formatCOP(pack.price)}</p>
      <div className="mt-4 space-y-2 text-sm text-muted">
        <p>{pack.entradas} entrada{pack.entradas > 1 ? "s" : ""} digital{pack.entradas > 1 ? "es" : ""}</p>
      </div>
      <button
        disabled={disabled}
        onClick={() => onBuy(pack)}
        className="btn btn-primary mt-5 w-full bg-white group-hover:bg-primary disabled:bg-white/18 disabled:text-white/45"
      >
        {disabled ? disabledReason : "Comprar"}
      </button>
    </article>
  );
}
