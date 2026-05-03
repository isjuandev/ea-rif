export type RifaPackage = {
  id: string;
  name: string;
  wallpapers: number;
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
  eventName: "WALLPAPERS 2M",
  ticketDigits: 4,
  ticketStart: 0,
  ticketEnd: 9999,
  totalTickets: 10000,
  ticketPrice: 500,
  minorPrizeCount: 10,
  lotterySlug: "boyaca",
  lotteryName: "Loteria de Boyaca",
  drawWeekday: 6,
  drawHour: 22,
  drawMinute: 30,
  sellerName: "Rifas Wallpapers",
  packages: [
    { id: "starter", name: "XX Entradas", wallpapers: 10, rifas: 10, price: 5000 },
    { id: "popular", name: "XX Entradas", wallpapers: 20, rifas: 20, price: 5000 },
    { id: "pro", name: "XX Entradas", wallpapers: 40, rifas: 40, price: 5000, featured: true },
    { id: "max", name: "XX Entradas", wallpapers: 100, rifas: 100, price: 5000 },
  ],
  fallbackSoldTickets: 0,
  socialLinks: {
    instagram: "https://instagram.com/tucuenta",
    whatsapp: "https://wa.me/573001234567",
  },
  previousWinners: [],
  blessedNumbers: [],
};
