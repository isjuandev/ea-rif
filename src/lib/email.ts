import { Resend } from "resend";
import { rifaConfig } from "@/config/rifa";
import { formatCOP } from "@/components/utils";

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPublicUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.nexobite.com");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function buildTicketNumberHtml(numbers: string[]) {
  const rows = Array.from({ length: Math.ceil(numbers.length / 5) }, (_, rowIndex) => numbers.slice(rowIndex * 5, rowIndex * 5 + 5));

  return rows
    .map(
      (row) => `
        <tr>
          ${row
            .map(
              (number) => `
                <td align="center" style="padding:5px">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="80" style="border-collapse:separate;border-spacing:0;width:80px;background:#d4af37;background-image:linear-gradient(135deg,#d4af37,#f7e7a1,#caa12c);border:1px solid #b8962e;border-radius:10px">
                    <tr>
                      <td align="center" style="padding:12px 5px;font-family:Arial,sans-serif">
                        <div style="font-size:12px;line-height:14px;color:#6b4e16;margin-bottom:4px">&#9819;</div>
                        <div style="font-size:18px;line-height:22px;font-weight:bold;color:#3a2a07">${escapeHtml(number)}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              `,
            )
            .join("")}
        </tr>
      `,
    )
    .join("");
}

export async function sendTicketEmail({
  to,
  name,
  packageName,
  price,
  numbers,
  eventName = rifaConfig.eventName,
  lotteryName = rifaConfig.lotteryName,
}: {
  to: string;
  name: string;
  packageName: string;
  price: number;
  numbers: string[];
  eventName?: string;
  lotteryName?: string;
}) {
  if (!process.env.RESEND_API_KEY || !to) return { sent: false, error: "Resend no configurado o destinatario vacio." };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM || "Entradas Elite Club <onboarding@resend.dev>";
  const safeEventName = escapeHtml(eventName);
  const safeName = escapeHtml(name);
  const safePackageName = escapeHtml(packageName);
  const safeLotteryName = escapeHtml(lotteryName);
  const ticketNumberHtml = buildTicketNumberHtml(numbers);
  const logoUrl = getPublicUrl("/images/Club%20Elite.png");

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Club Elite</title>
    </head>
    <body style="margin:0;padding:0;background:#000000;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#000000;margin:0;padding:20px 10px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;max-width:600px;background:#f5f2e9;border-radius:16px;border:2px solid #d4af37">
            <tr>
              <td align="center" style="padding:20px 20px 10px;font-family:Arial,sans-serif">
                <img src="${logoUrl}" width="120" style="display:block;width:120px;max-width:120px;height:auto;margin:0 auto 10px;border:0;outline:none;text-decoration:none" alt="Club Elite">
                <h1 style="margin:0;font-size:28px;line-height:34px;color:#b8962e;letter-spacing:1px;font-family:Arial,sans-serif;font-weight:800;text-transform:uppercase">
                  ${safeEventName}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 20px 0;color:#222222;font-size:16px;line-height:1.5;font-family:Arial,sans-serif">
                Hola <strong>${safeName}</strong>, tu compra del paquete <strong>${safePackageName}</strong> fue registrada.
              </td>
            </tr>
            <tr>
              <td style="padding:10px 20px;color:#222222;font-size:16px;line-height:1.4;font-family:Arial,sans-serif">
                Valor: <strong>${formatCOP(price)}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 20px;color:#222222;font-size:16px;line-height:1.4;font-family:Arial,sans-serif">
                Tus números de rifa son:
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:10px 10px 20px">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0">
                  ${ticketNumberHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 20px;text-align:center;font-size:14px;line-height:1.45;color:#444444;font-family:Arial,sans-serif">
                El sorteo juega con ${safeLotteryName}.<br>
                La fecha se actualiza con el último resultado oficial publicado.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    </body>
    </html>
  `;

  const result = await resend.emails.send({
    from,
    to,
    subject: `Tus números de rifa - ${eventName}`,
    html,
  });

  if (result.error) {
    return { sent: false, error: result.error.message || "Resend rechazó el envio." };
  }

  return { sent: true, messageId: result.data?.id || null };
}

export async function sendBlessedNumberAlertEmail({
  to,
  buyerName,
  buyerWhatsapp,
  blessedNumbers,
  allNumbers,
  eventName = rifaConfig.eventName,
}: {
  to: string;
  buyerName: string;
  buyerWhatsapp: string;
  blessedNumbers: string[];
  allNumbers: string[];
  eventName?: string;
}) {
  if (!process.env.RESEND_API_KEY || !to) return { sent: false, error: "Resend no configurado o destinatario vacio." };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM || "Entradas Elite Club <onboarding@resend.dev>";

  const html = `
    <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:20px">
      <h2 style="color:#D4AF37;margin:0 0 10px">Numero bendecido vendido</h2>
      <p><strong>Comprador:</strong> ${escapeHtml(buyerName)}</p>
      <p><strong>WhatsApp:</strong> ${escapeHtml(buyerWhatsapp)}</p>
      <p><strong>Numeros bendecidos:</strong> ${blessedNumbers.map(escapeHtml).join(", ")}</p>
      <p><strong>Numeros de la compra:</strong> ${allNumbers.map(escapeHtml).join(", ")}</p>
    </div>
  `;

  const result = await resend.emails.send({
    from,
    to,
    subject: `Alerta número bendecido - ${eventName}`,
    html,
  });

  if (result.error) return { sent: false, error: result.error.message || "Resend rechazó el envio." };
  return { sent: true, messageId: result.data?.id || null };
}
