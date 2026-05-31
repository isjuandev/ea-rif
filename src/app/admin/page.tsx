"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, LogOut, Plus, RotateCcw, Save, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { rifaConfig, type RifaConfig, type RifaPackage } from "@/config/rifa";
import { getLotteryOption, lotteryOptions } from "@/lib/lottery-results";
import { Skeleton } from "@/components/LoadingSkeleton";
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

function AdminSettingsSkeleton() {
  return (
    <>
      <section className="grid gap-4 py-6 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className={index === 6 || index === 7 ? "lg:col-span-2" : ""}>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-12 w-full rounded-md" />
          </div>
        ))}
      </section>
      <section className="grid gap-4 pb-4 lg:grid-cols-2">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
      </section>
      <section className="py-4">
        <Skeleton className="h-4 w-24 bg-lime-300/20" />
        <Skeleton className="mt-3 h-9 w-64" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-md" />
          ))}
        </div>
      </section>
    </>
  );
}

export default function AdminRifaSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<RifaConfig>(rifaConfig);
  const [configLoading, setConfigLoading] = useState(true);
  const [status, setStatus] = useState("Cargando configuración...");
  const [saving, setSaving] = useState(false);
  const [blessedNumbersInput, setBlessedNumbersInput] = useState("");
  const [blessedPrizeValueInput, setBlessedPrizeValueInput] = useState("");

  useEffect(() => {
    fetch("/api/rifa/config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data?.config) {
          setConfig(data.config);
          setBlessedNumbersInput((data.config.blessedNumbers ?? []).join(","));
          setBlessedPrizeValueInput(String(data.config.blessedPrizes?.[0]?.prizeCop ?? ""));
        }
        setStatus(data?.configured ? "Configuración cargada desde Supabase." : "Usando configuración base. Guarda para persistir cambios.");
      })
      .catch(() => setStatus("No se pudo leer la configuración. Revisa Supabase."))
      .finally(() => setConfigLoading(false));
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
    const blessedPrizes = normalizedBlessedNumbers.map((number) => ({
      number: number.replace(/\D/g, "").padStart(config.totalCifras, "0").slice(-config.totalCifras),
      prizeCop: Number.isFinite(blessedPrizeValue) ? Math.max(0, Math.round(blessedPrizeValue)) : 0,
    }));

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

  async function resetRifa() {
    const confirmed = window.confirm(
      "Esta acción reinicia toda la rifa (ventas, ganadores y configuración base). Debes haber descargado al menos un reporte del ciclo actual. ¿Deseas continuar?",
    );
    if (!confirmed) return;

    setStatus("Reiniciando rifa...");
    const response = await fetch("/api/admin/rifa/reset", { method: "POST" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data?.error || "No se pudo reiniciar la rifa.");
      return;
    }

    setStatus("Rifa reiniciada. Configura nuevamente para iniciar el nuevo ciclo.");
    if (data?.config) {
      setConfig(data.config);
      setBlessedNumbersInput((data.config.blessedNumbers ?? []).join(","));
      setBlessedPrizeValueInput(String(data.config.blessedPrizes?.[0]?.prizeCop ?? ""));
    }
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
            <Link
              href="/admin/reportes"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-cyan-300/45 px-5 py-3 font-extrabold uppercase text-cyan-200 transition hover:bg-cyan-300 hover:text-primary-foreground"
            >
              <BarChart3 className="size-5" />
              Reportes
            </Link>
            <button
              type="button"
              onClick={resetRifa}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-orange-300/45 px-5 py-3 font-extrabold uppercase text-orange-200 transition hover:bg-orange-300 hover:text-primary-foreground"
            >
              <RotateCcw className="size-5" />
              Reiniciar rifa
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/14 px-5 py-3 font-extrabold uppercase text-foreground transition hover:border-red-200 hover:text-red-100"
            >
              <LogOut className="size-5" />
              Salir
            </button>
            <button
              disabled={saving || configLoading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-lime-300 px-5 py-3 font-extrabold uppercase text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="size-5" />
              {saving ? "Guardando" : "Guardar cambios"}
            </button>
          </div>
        </header>

        {configLoading ? (
          <AdminSettingsSkeleton />
        ) : (
          <>
        <section className="grid gap-4 py-6 lg:grid-cols-3">
          <label className="block rounded-md border border-white/12 bg-white/[0.03] p-4 lg:col-span-3">
            <span className="text-sm font-bold text-white/90">Actividad finalizada (bloquear sitio público)</span>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.activityClosed}
                onChange={(event) => setConfig({ ...config, activityClosed: event.target.checked })}
                className="size-5 rounded border border-white/25 bg-black/30 accent-lime-300"
              />
              <p className="text-sm text-white/70">Si está activo, el público verá “esta actividad finalizó” y no podrá interactuar.</p>
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Nombre de la rifa</span>
            <input value={config.eventName} onChange={(event) => setConfig({ ...config, eventName: event.target.value })} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Vendedor / marca</span>
            <input value={config.sellerName} onChange={(event) => setConfig({ ...config, sellerName: event.target.value })} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">Instagram</span>
            <input
              value={config.socialLinks.instagram}
              onChange={(event) =>
                setConfig({
                  ...config,
                  socialLinks: {
                    ...config.socialLinks,
                    instagram: event.target.value,
                  },
                })
              }
              className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              placeholder="https://www.instagram.com/eliteclubcol_"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-white/76">WhatsApp soporte</span>
            <input
              value={config.socialLinks.whatsapp}
              onChange={(event) =>
                setConfig({
                  ...config,
                  socialLinks: {
                    ...config.socialLinks,
                    whatsapp: event.target.value,
                  },
                })
              }
              className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              placeholder="https://wa.me/57..."
            />
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
            <span className="text-sm font-bold text-white/76">Total cifras</span>
            <input type="number" min={1} max={6} value={config.totalCifras} onChange={(event) => setConfig({ ...config, totalCifras: Number(event.target.value) })} className="mt-2 w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary" />
            <p className="mt-1 text-xs text-white/60">Total tickets se calcula automáticamente: {(10 ** Math.min(6, Math.max(1, Number(config.totalCifras) || 1))).toLocaleString("es-CO")}.</p>
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
                className="admin-datetime-input w-full rounded-md border border-white/12 bg-white/[0.045] px-4 py-3 text-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
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
            <span className="text-sm font-bold text-white/76">Números bendecidos (separados por coma)</span>
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
          <label className="block rounded-md border border-white/12 bg-white/[0.03] p-4 lg:col-span-3">
            <span className="text-sm font-bold text-white/90">Tarjetas visibles en la web</span>
            <div className="mt-3 flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showBlessedCard}
                  onChange={(event) => setConfig({ ...config, showBlessedCard: event.target.checked })}
                  className="size-5 rounded border border-white/25 bg-black/30 accent-lime-300"
                />
                <span className="text-sm text-white/70">Números bendecidos</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showInvertedCard}
                  onChange={(event) => setConfig({ ...config, showInvertedCard: event.target.checked })}
                  className="size-5 rounded border border-white/25 bg-black/30 accent-lime-300"
                />
                <span className="text-sm text-white/70">Número invertido</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showBulkCard}
                  onChange={(event) => setConfig({ ...config, showBulkCard: event.target.checked })}
                  className="size-5 rounded border border-white/25 bg-black/30 accent-lime-300"
                />
                <span className="text-sm text-white/70">Condición compra</span>
              </label>
            </div>
          </label>
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
          </>
        )}
      </form>
    </main>
  );
}
