"use client";

import { FormEvent, useEffect, useState } from "react";
import { LogOut, Plus, Save, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { rifaConfig, type RifaConfig, type RifaPackage } from "@/config/rifa";
import { getLotteryOption, lotteryOptions } from "@/lib/lottery-results";
import { formatCOP } from "@/components/utils";

function emptyPackage(index: number): RifaPackage {
  return {
    id: `paquete-${index + 1}`,
    name: `Paquete ${index + 1}`,
    entradas: 5,
    rifas: 5,
    price: 2500,
    featured: false,
  };
}

function toDateTimeLocalValue(isoDate: string | null | undefined) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminRifaSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<RifaConfig>(rifaConfig);
  const [status, setStatus] = useState("Cargando configuración...");
  const [saving, setSaving] = useState(false);
  const [blessedNumbersInput, setBlessedNumbersInput] = useState("");
  const [blessedPrizeValueInput, setBlessedPrizeValueInput] = useState("");
  const [soldNumbers, setSoldNumbers] = useState<Array<{ number: string; buyer_name: string | null; buyer_whatsapp: string | null; sold_at: string | null; purchase_id: string | null }>>([]);
  const [soldCount, setSoldCount] = useState(0);
  const [soldPercentage, setSoldPercentage] = useState(0);

  useEffect(() => {
    fetch("/api/rifa/config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data?.config) {
          setConfig(data.config);
          setBlessedNumbersInput((data.config.blessedNumbers ?? []).join(","));
          setBlessedPrizeValueInput(String(data.config.blessedPrizes?.[0]?.prizeCop ?? ""));
        }
        setStatus(data?.configured ? "Configuracion cargada desde Supabase." : "Usando configuración base. Guarda para persistir cambios.");
      })
      .catch(() => setStatus("No se pudo leer la configuración. Revisa Supabase."));
  }, []);

  useEffect(() => {
    fetch("/api/admin/sales", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setSoldNumbers(data?.soldNumbers ?? []);
        setSoldCount(data?.soldCount ?? 0);
        setSoldPercentage(data?.soldPercentage ?? 0);
      })
      .catch(() => undefined);
  }, []);

  function updatePackage(index: number, patch: Partial<RifaPackage>) {
    setConfig((current) => ({
      ...current,
      packages: current.packages.map((pack, itemIndex) => (itemIndex === index ? { ...pack, ...patch } : pack)),
    }));
  }

  function markFeatured(index: number) {
    setConfig((current) => ({
      ...current,
      packages: current.packages.map((pack, itemIndex) => ({ ...pack, featured: itemIndex === index })),
    }));
  }

  function removePackage(index: number) {
    setConfig((current) => ({
      ...current,
      packages: current.packages.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateLottery(slug: string) {
    const lottery = getLotteryOption(slug);
    setConfig({ ...config, lotterySlug: lottery.slug, lotteryName: lottery.name, drawHour: lottery.drawHour, drawMinute: lottery.drawMinute });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("Guardando...");

    const normalizedBlessedNumbers = blessedNumbersInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const blessedPrizeValue = Number(blessedPrizeValueInput || 0);
    const blessedPrizes = normalizedBlessedNumbers.map((number) => ({ number: number.replace(/\D/g, "").padStart(4, "0").slice(-4), prizeCop: Number.isFinite(blessedPrizeValue) ? Math.max(0, Math.round(blessedPrizeValue)) : 0 }));

    const response = await fetch("/api/rifa/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: { ...config, blessedNumbers: normalizedBlessedNumbers, blessedPrizes } }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setStatus(data?.error || "No se pudo guardar.");
      return;
    }

    setConfig(data.config);
    setBlessedNumbersInput((data.config.blessedNumbers ?? []).join(","));
    setBlessedPrizeValueInput(String(data.config.blessedPrizes?.[0]?.prizeCop ?? ""));
    setStatus("Cambios guardados. La página pública ya puede leer esta configuración.");
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <form onSubmit={save} className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Admin interno</p>
            <h1 className="mt-3 font-heading text-4xl font-extrabold uppercase leading-none sm:text-6xl">
              Rifa settings
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">{status}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/14 px-5 py-3 font-extrabold uppercase text-foreground transition hover:border-red-200 hover:text-red-100"
            >
              <LogOut className="size-5" />
              Salir
            </button>
            <button
              disabled={saving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-lime-300 px-5 py-3 font-extrabold uppercase text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="size-5" />
              {saving ? "Guardando" : "Guardar cambios"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 py-6 lg:grid-cols-3">
          <label className="block">
            <span className="text-sm font-bold text-white/76">Nombre de la rifa</span>
            <input value={config.eventName} onChange={(event) => setConfig({ ...config, eventName: event.target.value })} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Vendedor / marca</span>
            <input value={config.sellerName} onChange={(event) => setConfig({ ...config, sellerName: event.target.value })} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Lotería</span>
            <select value={config.lotterySlug} onChange={(event) => updateLottery(event.target.value)} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary">
              {lotteryOptions.map((lottery) => (
                <option key={lottery.slug} value={lottery.slug} className="bg-background text-foreground">
                  {lottery.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Total números</span>
            <input type="number" min={1} value={config.totalTickets} onChange={(event) => setConfig({ ...config, totalTickets: Number(event.target.value) })} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Precio base por número</span>
            <input type="number" min={0} value={config.ticketPrice} onChange={(event) => setConfig({ ...config, ticketPrice: Number(event.target.value) })} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Hora del sorteo</span>
            <input readOnly value={`${String(config.drawHour).padStart(2, "0")}:${String(config.drawMinute).padStart(2, "0")}`} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-white/65 outline-none" />
          </label>
          <label className="block lg:col-span-2">
            <span className="text-sm font-bold text-white/76">Próxima fecha de juego (manual)</span>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="datetime-local"
                value={toDateTimeLocalValue(config.nextDrawDateOverride)}
                onChange={(event) => {
                  const value = event.target.value;
                  setConfig({ ...config, nextDrawDateOverride: value ? new Date(value).toISOString() : null });
                }}
                className="w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setConfig({ ...config, nextDrawDateOverride: null })}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/14 px-4 py-2 text-sm font-bold text-foreground transition hover:border-lime-300 hover:text-lime-300"
              >
                Usar automático
              </button>
            </div>
            <p className="mt-1 text-xs text-white/60">
              Si defines una fecha futura, esta se mostrará en la web. Si la limpias o vence, el sistema vuelve al cálculo automático.
            </p>
          </label>
          <label className="block lg:col-span-2">
            <span className="text-sm font-bold text-white/76">Numeros bendecidos (separados por coma)</span>
            <input
              value={blessedNumbersInput}
              onChange={(event) => setBlessedNumbersInput(event.target.value)}
              className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              placeholder="0001,1234,8888"
            />
          </label>
          <label className="block lg:col-span-1">
            <span className="text-sm font-bold text-white/76">Valor premio números bendecidos (COP)</span>
            <input
              type="number"
              min={0}
              value={blessedPrizeValueInput}
              onChange={(event) => setBlessedPrizeValueInput(event.target.value.replace(/\D/g, ""))}
              className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              placeholder="250000"
            />
          </label>
          <label className="block lg:col-span-1">
            <span className="text-sm font-bold text-white/76">Valor número invertido (COP)</span>
            <input type="number" min={0} value={config.invertedWinnerPrizeCop} onChange={(event) => setConfig({ ...config, invertedWinnerPrizeCop: Number(event.target.value) })} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block lg:col-span-1">
            <span className="text-sm font-bold text-white/76">Umbral condición compra</span>
            <input type="number" min={1} value={config.bulkPrizeThreshold} onChange={(event) => setConfig({ ...config, bulkPrizeThreshold: Number(event.target.value) })} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block lg:col-span-1">
            <span className="text-sm font-bold text-white/76">Valor condición compra (COP)</span>
            <input type="number" min={0} value={config.bulkPrizeCop} onChange={(event) => setConfig({ ...config, bulkPrizeCop: Number(event.target.value) })} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
          </label>
        </section>

        <section className="grid gap-4 pb-4 lg:grid-cols-2">
          <article className="rounded-md border border-white/12 bg-white/[0.045] p-4">
            <p className="text-sm font-bold text-white/80">Se ha vendido el {soldPercentage}%</p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-lime-300" style={{ width: `${Math.min(soldPercentage, 100)}%` }} />
            </div>
          </article>
          <article className="rounded-md border border-white/12 bg-white/[0.045] p-4">
            <p className="text-sm font-bold text-white/80">Se han vendido {soldCount} Numeros</p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-yellow-300" style={{ width: `${Math.min(config.totalTickets > 0 ? Math.round((soldCount / config.totalTickets) * 100) : 0, 100)}%` }} />
            </div>
          </article>
        </section>

        <section className="pb-8">
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Ventas</p>
            <h2 className="mt-1 font-heading text-2xl font-bold">Numeros vendidos</h2>
          </div>
          <div className="overflow-x-auto rounded-md border border-white/12 bg-white/[0.03]">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="px-3 py-2 text-left">Numero</th>
                  <th className="px-3 py-2 text-left">Comprador</th>
                  <th className="px-3 py-2 text-left">WhatsApp</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {soldNumbers.map((item) => (
                  <tr key={`${item.purchase_id}-${item.number}`} className="border-t border-white/10">
                    <td className="px-3 py-2 font-bold text-lime-300">{item.number}</td>
                    <td className="px-3 py-2">{item.buyer_name || "-"}</td>
                    <td className="px-3 py-2">{item.buyer_whatsapp || "-"}</td>
                    <td className="px-3 py-2">{item.sold_at ? new Date(item.sold_at).toLocaleString("es-CO") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="py-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Paquetes</p>
              <h2 className="mt-2 font-heading text-3xl font-bold">Precios y Entradas</h2>
            </div>
            <button type="button" onClick={() => setConfig({ ...config, packages: [...config.packages, emptyPackage(config.packages.length)] })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/14 px-4 py-2 font-bold text-foreground transition hover:border-lime-300 hover:text-lime-300">
              <Plus className="size-5" />
              Agregar paquete
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {config.packages.map((pack, index) => (
              <article key={`${pack.id}-${index}`} className="rounded-md border border-white/12 bg-white/[0.045] p-4 shadow-xl shadow-black/20">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-2xl font-bold text-lime-300">{formatCOP(pack.price || 0)}</p>
                    <p className="mt-1 text-sm text-white/55">{pack.rifas} números</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => markFeatured(index)} className={`grid size-10 place-items-center rounded-md border transition ${pack.featured ? "border-lime-300 bg-lime-300 text-primary-foreground" : "border-white/12 text-white/65 hover:text-lime-300"}`} title="Marcar popular">
                      <Star className="size-5" />
                    </button>
                    <button type="button" onClick={() => removePackage(index)} className="grid size-10 place-items-center rounded-md border border-white/12 text-white/65 transition hover:border-red-300 hover:text-red-200" title="Eliminar">
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/48">ID</span>
                    <input value={pack.id} onChange={(event) => updatePackage(index, { id: event.target.value })} className="mt-1 w-full rounded-md border border-white/12 bg-black/30 px-3 py-2 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/48">Nombre</span>
                    <input value={pack.name} onChange={(event) => updatePackage(index, { name: event.target.value })} className="mt-1 w-full rounded-md border border-white/12 bg-black/30 px-3 py-2 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/48">Entradas</span>
                      <input type="number" min={1} value={pack.entradas} onChange={(event) => updatePackage(index, { entradas: Number(event.target.value) })} className="mt-1 w-full rounded-md border border-white/12 bg-black/30 px-3 py-2 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/48">Rifas</span>
                      <input type="number" min={1} value={pack.rifas} onChange={(event) => updatePackage(index, { rifas: Number(event.target.value) })} className="mt-1 w-full rounded-md border border-white/12 bg-black/30 px-3 py-2 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/48">Precio</span>
                      <input type="number" min={0} value={pack.price} onChange={(event) => updatePackage(index, { price: Number(event.target.value) })} className="mt-1 w-full rounded-md border border-white/12 bg-black/30 px-3 py-2 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
                    </label>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </form>
    </main>
  );
}
