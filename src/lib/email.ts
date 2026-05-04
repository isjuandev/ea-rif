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
                <td align="center" bgcolor="#f5f2e9" style="padding:5px;background:#f5f2e9">
                  <table class="ticket-card" role="presentation" cellpadding="0" cellspacing="0" border="0" width="80" bgcolor="#e4bd3d" style="border-collapse:separate;border-spacing:0;width:80px;background:#e4bd3d;background-image:linear-gradient(135deg,#c89919,#fff0a7 48%,#caa12c);border:1px solid #8d6a12;border-radius:10px">
                    <tr>
                      <td align="center" bgcolor="#e4bd3d" style="padding:12px 5px;font-family:Arial,sans-serif;background:#e4bd3d;background-image:linear-gradient(135deg,#c89919,#fff0a7 48%,#caa12c);border-radius:10px">
                        <div class="ticket-crown" style="font-size:12px;line-height:14px;color:#3a2a07!important;-webkit-text-fill-color:#3a2a07;margin-bottom:4px">&#9819;</div>
                        <div class="ticket-number" style="font-size:18px;line-height:22px;font-weight:900;color:#1a1a1a!important;-webkit-text-fill-color:#1a1a1a;text-shadow:0 1px 0 rgba(255,255,255,0.45),0 0 1px #1a1a1a">${escapeHtml(number)}</div>
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
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>Club Elite</title>
      <style>
        :root { color-scheme: light; supported-color-schemes: light; }
        .email-shell { background:#000000!important; }
        .email-card { background:#f5f2e9!important; color:#1a1a1a!important; }
        .email-title { color:#b8962e!important; }
        .email-text { color:#1a1a1a!important; }
        .email-footer { color:#444444!important; }
        .ticket-card { background:#e4bd3d!important; background-image:linear-gradient(135deg,#c89919,#fff0a7 48%,#caa12c)!important; }
        .ticket-number { color:#1a1a1a!important; -webkit-text-fill-color:#1a1a1a!important; }
        .ticket-crown { color:#3a2a07!important; -webkit-text-fill-color:#3a2a07!important; }
        @media (prefers-color-scheme: dark) {
          .email-card { background:#f5f2e9!important; color:#1a1a1a!important; }
          .email-text { color:#1a1a1a!important; }
          .email-footer { color:#444444!important; }
          .ticket-card { background:#e4bd3d!important; background-image:linear-gradient(135deg,#c89919,#fff0a7 48%,#caa12c)!important; }
          .ticket-number { color:#1a1a1a!important; -webkit-text-fill-color:#1a1a1a!important; text-shadow:0 1px 0 rgba(255,255,255,0.45),0 0 1px #1a1a1a!important; }
          .ticket-crown { color:#3a2a07!important; -webkit-text-fill-color:#3a2a07!important; }
        }
        [data-ogsc] * { color:#1a1a1a!important; }
        [data-ogsc] .email-card { background:#f5f2e9!important; color:#1a1a1a!important; }
        [data-ogsc] .email-title { color:#b8962e!important; }
        [data-ogsc] .email-footer { color:#444444!important; }
        [data-ogsc] .ticket-card { background:#e4bd3d!important; }
        [data-ogsc] .ticket-number { color:#1a1a1a!important; -webkit-text-fill-color:#1a1a1a!important; }
        [data-ogsc] .ticket-crown { color:#3a2a07!important; -webkit-text-fill-color:#3a2a07!important; }
      </style>
    </head>
    <body class="email-shell" style="margin:0;padding:0;background:#000000!important;font-family:Arial,sans-serif">
    <div class="email-shell" style="background:#000000!important;margin:0;padding:0">
    <table class="email-shell" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="border-collapse:collapse;background:#000000!important;margin:0;padding:20px 10px">
      <tr>
        <td align="center">
          <table class="email-card" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f2e9" style="border-collapse:separate;border-spacing:0;max-width:600px;background:#f5f2e9!important;color:#1a1a1a!important;border-radius:16px;border:2px solid #d4af37">
            <tr>
              <td align="center" bgcolor="#f5f2e9" style="padding:20px 20px 10px;font-family:Arial,sans-serif;background:#f5f2e9!important">
                <img src="${logoUrl}" width="120" style="display:block;width:120px;max-width:120px;height:auto;margin:0 auto 10px;border:0;outline:none;text-decoration:none" alt="Club Elite">
                <h1 class="email-title" style="margin:0;font-size:28px;line-height:34px;color:#b8962e!important;letter-spacing:1px;font-family:Arial,sans-serif;font-weight:800;text-transform:uppercase">
                  ${safeEventName}
                </h1>
              </td>
            </tr>
            <tr>
              <td class="email-text" bgcolor="#f5f2e9" style="padding:10px 20px 0;background:#f5f2e9!important;color:#1a1a1a!important;font-size:16px;line-height:1.5;font-family:Arial,sans-serif">
                Hola <strong>${safeName}</strong>, tu compra del paquete <strong>${safePackageName}</strong> fue registrada.
              </td>
            </tr>
            <tr>
              <td class="email-text" bgcolor="#f5f2e9" style="padding:10px 20px;background:#f5f2e9!important;color:#1a1a1a!important;font-size:16px;line-height:1.4;font-family:Arial,sans-serif">
                Valor: <strong>${formatCOP(price)}</strong>
              </td>
            </tr>
            <tr>
              <td class="email-text" bgcolor="#f5f2e9" style="padding:10px 20px;background:#f5f2e9!important;color:#1a1a1a!important;font-size:16px;line-height:1.4;font-family:Arial,sans-serif">
                Tus números de rifa son:
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#f5f2e9" style="padding:10px 10px 20px;background:#f5f2e9!important">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0">
                  ${ticketNumberHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-footer" bgcolor="#f5f2e9" style="padding:0 20px 20px;background:#f5f2e9!important;text-align:center;font-size:14px;line-height:1.45;color:#444444!important;font-family:Arial,sans-serif">
                El sorteo juega con ${safeLotteryName}.<br>
                La fecha se actualiza con el último resultado oficial publicado.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    </div>
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
