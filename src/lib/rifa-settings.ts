import { rifaConfig, type RifaConfig, type RifaPackage } from "@/config/rifa";
import { getLotteryOption } from "@/lib/lottery-results";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SETTINGS_ID = "active";
const MISSING_SETTINGS_TABLE_MESSAGE =
  "Falta crear la tabla public.rifa_settings en Supabase. Ejecuta el bloque rifa_settings de supabase/schema.sql y vuelve a guardar.";

function isMissingSettingsTableError(error: { code?: string; message?: string }) {
  return error.code === "PGRST205" || Boolean(error.message?.includes("rifa_settings"));
}

function toPositiveInteger(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
}

function toCifras(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const rounded = Math.round(number);
  if (rounded < 1 || rounded > 6) return fallback;
  return rounded;
}

function normalizeOptionalFutureIsoDate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normalizePackage(pack: Partial<RifaPackage>, index: number): RifaPackage {
  const rifas = toPositiveInteger(pack.rifas, 5);

  return {
    id: String(pack.id || `paquete-${index + 1}`).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    name: String(pack.name || `Paquete ${index + 1}`).trim(),
    entradas: toPositiveInteger(pack.entradas, rifas),
    rifas,
    price: toNonNegativeInteger(pack.price, rifas * rifaConfig.ticketPrice),
    featured: Boolean(pack.featured),
  };
}

export function normalizeRifaConfig(input: Partial<RifaConfig>): RifaConfig {
  const packagesInput = Array.isArray(input.packages) && input.packages.length > 0 ? input.packages : rifaConfig.packages;
  const packages = packagesInput.map(normalizePackage);
  const featuredIndex = packages.findIndex((pack) => pack.featured);
  const lottery = getLotteryOption(input.lotterySlug || input.lotteryName || rifaConfig.lotterySlug);

  const totalCifras = toCifras(input.totalCifras ?? input.ticketDigits, rifaConfig.totalCifras);
  const totalTickets = 10 ** totalCifras;
  const ticketStart = 0;
  const ticketEnd = totalTickets - 1;
  const blessedRegex = new RegExp(`^\\d{${totalCifras}}$`);

  return {
    ...rifaConfig,
    ...input,
    eventName: String(input.eventName || rifaConfig.eventName).trim(),
    totalCifras,
    ticketDigits: totalCifras,
    ticketStart,
    ticketEnd,
    totalTickets,
    ticketPrice: toNonNegativeInteger(input.ticketPrice, rifaConfig.ticketPrice),
    minorPrizeCount: toNonNegativeInteger(input.minorPrizeCount, rifaConfig.minorPrizeCount),
    lotterySlug: lottery.slug,
    lotteryName: lottery.name,
    drawWeekday: toNonNegativeInteger(input.drawWeekday, rifaConfig.drawWeekday),
    drawHour: lottery.drawHour,
    drawMinute: lottery.drawMinute,
    nextDrawDateOverride: normalizeOptionalFutureIsoDate(input.nextDrawDateOverride),
    sellerName: String(input.sellerName || rifaConfig.sellerName).trim(),
    packages: packages.map((pack, index) => ({ ...pack, featured: featuredIndex === -1 ? index === 0 : index === featuredIndex })),
    fallbackSoldTickets: toNonNegativeInteger(input.fallbackSoldTickets, rifaConfig.fallbackSoldTickets),
    socialLinks: {
      instagram: String(input.socialLinks?.instagram || rifaConfig.socialLinks.instagram).trim(),
      whatsapp: String(input.socialLinks?.whatsapp || rifaConfig.socialLinks.whatsapp).trim(),
    },
    previousWinners: Array.isArray(input.previousWinners) ? input.previousWinners : rifaConfig.previousWinners,
    blessedNumbers: Array.isArray(input.blessedNumbers)
      ? input.blessedNumbers
          .map((value) => String(value).replace(/\D/g, "").padStart(totalCifras, "0").slice(-totalCifras))
          .filter((value, index, arr) => blessedRegex.test(value) && arr.indexOf(value) === index)
      : rifaConfig.blessedNumbers,
    blessedPrizes: Array.isArray(input.blessedPrizes)
      ? input.blessedPrizes
          .map((item) => ({
            number: String((item as any)?.number ?? "").replace(/\D/g, "").padStart(totalCifras, "0").slice(-totalCifras),
            prizeCop: toNonNegativeInteger((item as any)?.prizeCop, 0),
          }))
          .filter((item, index, arr) => blessedRegex.test(item.number) && arr.findIndex((x) => x.number === item.number) === index)
      : rifaConfig.blessedPrizes,
    invertedWinnerPrizeCop: toNonNegativeInteger(input.invertedWinnerPrizeCop, rifaConfig.invertedWinnerPrizeCop),
    bulkPrizeThreshold: toPositiveInteger(input.bulkPrizeThreshold, rifaConfig.bulkPrizeThreshold),
    bulkPrizeCop: toNonNegativeInteger(input.bulkPrizeCop, rifaConfig.bulkPrizeCop),
  };
}

export async function getEditableRifaConfig() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { config: rifaConfig, configured: false };
  }

  const { data, error } = await supabase.from("rifa_settings").select("config").eq("id", SETTINGS_ID).maybeSingle();

  if (error) {
    if (!isMissingSettingsTableError(error)) {
      console.error("Error leyendo configuración de rifa", error.message);
    }
    return { config: rifaConfig, configured: false };
  }

  return {
    config: data?.config ? normalizeRifaConfig(data.config as Partial<RifaConfig>) : rifaConfig,
    configured: Boolean(data?.config),
  };
}

export async function saveEditableRifaConfig(input: Partial<RifaConfig>) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const { config: currentConfig } = await getEditableRifaConfig();
  const config = normalizeRifaConfig(input);

  if (config.totalCifras !== currentConfig.totalCifras) {
    const { count, error } = await supabase
      .from("rifa_tickets")
      .select("number", { count: "exact", head: true })
      .eq("status", "sold");

    if (error) {
      throw new Error(error.message);
    }

    if ((count ?? 0) > 0) {
      throw new Error("No se puede cambiar Total cifras mientras haya ventas en la rifa actual.");
    }
  }
  const { error } = await supabase.from("rifa_settings").upsert({
    id: SETTINGS_ID,
    config,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (isMissingSettingsTableError(error)) {
      throw new Error(MISSING_SETTINGS_TABLE_MESSAGE);
    }

    throw new Error(error.message);
  }

  return config;
}
