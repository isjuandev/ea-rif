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
};

export const rifaConfig: RifaConfig = {
  eventName: "WALLPAPERS 2M",
  ticketDigits: 4,
  ticketStart: 0,
  ticketEnd: 9999,
  totalTickets: 10000,
  ticketPrice: 500,
  minorPrizeCount: 10,
  lotteryName: "Loteria del Quindio",
  drawWeekday: 4,
  drawHour: 22,
  drawMinute: 30,
  sellerName: "Rifas Wallpapers",
  packages: [
    { id: "starter", name: "10 Wallpapers", wallpapers: 10, rifas: 10, price: 5000 },
    { id: "popular", name: "20 Wallpapers", wallpapers: 20, rifas: 20, price: 10000 },
    { id: "pro", name: "40 Wallpapers", wallpapers: 40, rifas: 40, price: 20000, featured: true },
    { id: "max", name: "100 Wallpapers", wallpapers: 100, rifas: 100, price: 50000 },
  ],
  fallbackSoldTickets: 0,
  socialLinks: {
    instagram: "https://instagram.com/tucuenta",
    whatsapp: "https://wa.me/573001234567",
  },
  previousWinners: [],
};
