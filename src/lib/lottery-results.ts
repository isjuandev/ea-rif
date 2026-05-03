const LOTTERY_RESULTS_API_BASE_URL = "https://api-resultadosloterias.com/api";
const BOGOTA_TIME_ZONE = "America/Bogota";

export const lotteryOptions = [
  { name: "Lotería de Boyacá", apiName: "BOYACA", slug: "boyaca", fallbackWeekday: 6, drawHour: 22, drawMinute: 30 },
] as const;

export type LotterySlug = (typeof lotteryOptions)[number]["slug"];

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

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function getDateAtBogotaTime(dateOnly: string, hour: number, minute: number) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour + 5, minute, 0, 0));
  return date;
}

function getNextFallbackDate(from: Date, weekday: number, hour: number, minute: number) {
  for (let offset = 0; offset <= 14; offset += 1) {
    const candidateDay = addDays(from, offset);
    const dateOnly = formatDateOnly(candidateDay);
    const candidate = getDateAtBogotaTime(dateOnly, hour, minute);
    const localWeekday = new Intl.DateTimeFormat("en-US", {
      timeZone: BOGOTA_TIME_ZONE,
      weekday: "short",
    }).format(candidate);
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(localWeekday);

    if (day === weekday && candidate.getTime() > from.getTime()) {
      return candidate.toISOString();
    }
  }

  return getDateAtBogotaTime(formatDateOnly(addDays(from, 7)), hour, minute).toISOString();
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

export function getLotteryOption(slugOrName: string | undefined | null) {
  const normalized = String(slugOrName ?? "").trim().toLowerCase();
  return (
    lotteryOptions.find((option) => option.slug === normalized) ??
    lotteryOptions.find((option) => option.name.toLowerCase() === normalized || option.apiName.toLowerCase() === normalized) ??
    lotteryOptions[0]
  );
}

export async function getLatestLotteryResult(slugOrName: string, from = new Date(), daysBack = 21) {
  const lottery = getLotteryOption(slugOrName);

  for (let offset = 0; offset <= daysBack; offset += 1) {
    const date = formatDateOnly(subtractDays(from, offset));
    const results = await fetchResultsForDate(date);
    const result = results.find((item) => item.slug === lottery.slug && /^\d{4}$/.test(item.result));

    if (result) {
      return result;
    }
  }

  return null;
}

export async function getNextLotteryDrawDate(
  slugOrName: string,
  from = new Date(),
) {
  const lottery = getLotteryOption(slugOrName);
  const latestResult = await getLatestLotteryResult(lottery.slug, from);

  if (!latestResult) {
    return getNextFallbackDate(from, lottery.fallbackWeekday, lottery.drawHour, lottery.drawMinute);
  }

  let candidate = getDateAtBogotaTime(latestResult.date, lottery.drawHour, lottery.drawMinute);

  do {
    candidate = addDays(candidate, 7);
  } while (candidate.getTime() <= from.getTime());

  return candidate.toISOString();
}
