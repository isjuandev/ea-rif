import { IdentificationType, MercadoPagoConfig, Payment, PaymentMethod } from "mercadopago";

function getMercadoPagoClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) return null;

  return new MercadoPagoConfig({ accessToken });
}

export function getMercadoPagoPayment() {
  const client = getMercadoPagoClient();
  return client ? new Payment(client) : null;
}

export function getMercadoPagoPaymentMethod() {
  const client = getMercadoPagoClient();
  return client ? new PaymentMethod(client) : null;
}

export function getMercadoPagoIdentificationType() {
  const client = getMercadoPagoClient();
  return client ? new IdentificationType(client) : null;
}
