import { rifaConfig, type RifaConfig, type RifaPackage } from "@/config/rifa";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SETTINGS_ID = "active";

function toPositiveInteger(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
}

function normalizePackage(pack: Partial<RifaPackage>, index: number): RifaPackage {
  const rifas = toPositiveInteger(pack.rifas, 5);

  return {
    id: String(pack.id || `paquete-${index + 1}`).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    name: String(pack.name || `Paquete ${index + 1}`).trim(),
    wallpapers: toPositiveInteger(pack.wallpapers, rifas),
    rifas,
    price: toNonNegativeInteger(pack.price, rifas * rifaConfig.ticketPrice),
    featured: Boolean(pack.featured),
  };
}

export function normalizeRifaConfig(input: Partial<RifaConfig>): RifaConfig {
  const packagesInput = Array.isArray(input.packages) && input.packages.length > 0 ? input.packages : rifaConfig.packages;
  const packages = packagesInput.map(normalizePackage);
  const featuredIndex = packages.findIndex((pack) => pack.featured);

  return {
    ...rifaConfig,
    ...input,
    eventName: String(input.eventName || rifaConfig.eventName).trim(),
    ticketDigits: toPositiveInteger(input.ticketDigits, rifaConfig.ticketDigits),
    ticketStart: toNonNegativeInteger(input.ticketStart, rifaConfig.ticketStart),
    ticketEnd: toPositiveInteger(input.ticketEnd, rifaConfig.ticketEnd),
    totalTickets: toPositiveInteger(input.totalTickets, rifaConfig.totalTickets),
    ticketPrice: toNonNegativeInteger(input.ticketPrice, rifaConfig.ticketPrice),
    minorPrizeCount: toNonNegativeInteger(input.minorPrizeCount, rifaConfig.minorPrizeCount),
    lotteryName: String(input.lotteryName || rifaConfig.lotteryName).trim(),
    drawWeekday: toNonNegativeInteger(input.drawWeekday, rifaConfig.drawWeekday),
    drawHour: toNonNegativeInteger(input.drawHour, rifaConfig.drawHour),
    drawMinute: toNonNegativeInteger(input.drawMinute, rifaConfig.drawMinute),
    sellerName: String(input.sellerName || rifaConfig.sellerName).trim(),
    packages: packages.map((pack, index) => ({ ...pack, featured: featuredIndex === -1 ? index === 0 : index === featuredIndex })),
    fallbackSoldTickets: toNonNegativeInteger(input.fallbackSoldTickets, rifaConfig.fallbackSoldTickets),
    socialLinks: {
      instagram: String(input.socialLinks?.instagram || rifaConfig.socialLinks.instagram).trim(),
      whatsapp: String(input.socialLinks?.whatsapp || rifaConfig.socialLinks.whatsapp).trim(),
    },
    previousWinners: Array.isArray(input.previousWinners) ? input.previousWinners : rifaConfig.previousWinners,
  };
}

export async function getEditableRifaConfig() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { config: rifaConfig, configured: false };
  }

  const { data, error } = await supabase.from("rifa_settings").select("config").eq("id", SETTINGS_ID).maybeSingle();

  if (error) {
    if (error.code !== "PGRST205" && !error.message.includes("rifa_settings")) {
      console.error("Error leyendo configuracion de rifa", error.message);
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

  const config = normalizeRifaConfig(input);
  const { error } = await supabase.from("rifa_settings").upsert({
    id: SETTINGS_ID,
    config,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return config;
}
