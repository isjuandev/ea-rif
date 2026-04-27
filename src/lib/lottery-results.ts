const LOTTERY_RESULTS_API_BASE_URL = "https://api-resultadosloterias.com/api";
const QUINDIO_SLUG = "quindio";
const BOGOTA_TIME_ZONE = "America/Bogota";

export type LotteryResult = {
  lottery: string;
  slug: string;
  date: string;
  result: string;
  series: string;
};

type LotteryResultsResponse = {
  status?: string;
  data?: LotteryResult[];
};

function getBogotaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function formatDateOnly(date: Date) {
  const { year, month, day } = getBogotaDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function subtractDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() - days);
  return nextDate;
}

async function fetchResultsForDate(date: string) {
  const response = await fetch(`${LOTTERY_RESULTS_API_BASE_URL}/results/${date}`, {
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as LotteryResultsResponse;
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getLatestQuindioResult(from = new Date(), daysBack = 14) {
  for (let offset = 0; offset <= daysBack; offset += 1) {
    const date = formatDateOnly(subtractDays(from, offset));
    const results = await fetchResultsForDate(date);
    const result = results.find((item) => item.slug === QUINDIO_SLUG && /^\d{4}$/.test(item.result));

    if (result) {
      return result;
    }
  }

  return null;
}
