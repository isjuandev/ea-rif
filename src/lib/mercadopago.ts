import { MercadoPagoConfig, Payment } from "mercadopago";

export function getMercadoPagoPayment() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) return null;

  const client = new MercadoPagoConfig({ accessToken });
  return new Payment(client);
}
