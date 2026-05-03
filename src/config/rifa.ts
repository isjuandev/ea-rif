export type RifaPackage = {
  id: string;
  name: string;
  entradas: number;
  rifas: number;
  price: number;
  featured?: boolean;
};

export type RifaConfig = {
  eventName: string;
  ticketDigits: number;
  ticketStart: number;
  ticketEnd: number;
  totalTickets: number;
  ticketPrice: number;
  minorPrizeCount: number;
  lotterySlug: string;
  lotteryName: string;
  drawWeekday: number;
  drawHour: number;
  drawMinute: number;
  sellerName: string;
  packages: RifaPackage[];
  fallbackSoldTickets: number;
  socialLinks: {
    instagram: string;
    whatsapp: string;
  };
  previousWinners: unknown[];
  blessedNumbers: string[];
};

export const rifaConfig: RifaConfig = {
  eventName: "Entradas XX",
  ticketDigits: 4,
  ticketStart: 0,
  ticketEnd: 9999,
  totalTickets: 10000,
  ticketPrice: 1000,
  minorPrizeCount: 10,
  lotterySlug: "boyacá",
  lotteryName: "Loteria de Boyacá",
  drawWeekday: 6,
  drawHour: 22,
  drawMinute: 30,
  sellerName: "Entradas Digitales - Club Élite",
  packages: [
    { id: "starter", name: "XX Entradas", entradas: 10, rifas: 10, price: 5000 },
    { id: "popular", name: "XX Entradas", entradas: 20, rifas: 20, price: 5000 },
    { id: "pro", name: "XX Entradas", entradas: 40, rifas: 40, price: 5000, featured: true },
    { id: "max", name: "XX Entradas", entradas: 100, rifas: 100, price: 5000 },
  ],
  fallbackSoldTickets: 0,
  socialLinks: {
    instagram: "https://instagram.com/Serna_fc",
    whatsapp: "https://wa.me/971508446750?text=Hola%2C%20necesito%20soporte%20con%20mi%20compra%20de%20entradas.",
  },
  previousWinners: [],
  blessedNumbers: [],
};
