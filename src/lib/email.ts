import { Resend } from "resend";
import { rifaConfig } from "@/config/rifa";
import { formatCOP } from "@/components/utils";

export async function sendTicketEmail({
  to,
  name,
  packageName,
  price,
  numbers,
  lotteryName = rifaConfig.lotteryName,
}: {
  to: string;
  name: string;
  packageName: string;
  price: number;
  numbers: string[];
  lotteryName?: string;
}) {
  if (!process.env.RESEND_API_KEY || !to) return { sent: false, error: "Resend no configurado o destinatario vacio." };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM || "Entradas Elite Club <onboarding@resend.dev>";

  const html = `
    <div style="font-family:Arial,sans-serif;background:#000000;color:#1a1a1a;padding:24px">
      <div style="max-width:760px;margin:0 auto;position:relative">
        <div style="position:absolute;left:-8px;top:26px;width:16px;height:16px;background:#000;border-radius:999px"></div>
        <div style="position:absolute;left:-8px;top:58px;width:16px;height:16px;background:#000;border-radius:999px"></div>
        <div style="position:absolute;left:-8px;top:90px;width:16px;height:16px;background:#000;border-radius:999px"></div>
        <div style="position:absolute;left:-8px;top:122px;width:16px;height:16px;background:#000;border-radius:999px"></div>
        <div style="position:absolute;right:-8px;top:26px;width:16px;height:16px;background:#000;border-radius:999px"></div>
        <div style="position:absolute;right:-8px;top:58px;width:16px;height:16px;background:#000;border-radius:999px"></div>
        <div style="position:absolute;right:-8px;top:90px;width:16px;height:16px;background:#000;border-radius:999px"></div>
        <div style="position:absolute;right:-8px;top:122px;width:16px;height:16px;background:#000;border-radius:999px"></div>
        <div style="border:2px solid #c89b2c;border-radius:18px;padding:20px;background:línear-gradient(120deg,#d7b14a 0%,#f5e2a1 22%,#e0b647 55%,#f1d780 78%,#c99622 100%);box-shadow:inset 0 0 0 2px rgba(255,255,255,0.25)">
          <h1 style="margin:0 0 14px;color:#7a5414;font-size:34px;line-height:1.1;font-weight:900;letter-spacing:0.02em">${rifaConfig.eventName}</h1>
          <p style="margin:0 0 12px;font-size:20px;line-height:1.45">Hola ${name}, tu compra del paquete <strong>${packageName}</strong> fue registrada.</p>
          <p style="margin:0 0 12px;font-size:20px;line-height:1.45">Valor: <strong>${formatCOP(price)}</strong></p>
          <p style="margin:0 0 14px;font-size:20px;line-height:1.45">Tus números de rifa son:</p>
          <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:0 0 18px">
          ${numbers
            .map(
              (number) =>
                `<span style="display:flex;align-items:center;justify-content:center;min-height:42px;border:1px solid #a87718;border-radius:8px;font-weight:800;font-size:20px;color:#402b08;background:rgba(255,255,255,0.38)">${number}</span>`,
            )
            .join("")}
          </div>
          <p style="margin:0;font-size:18px;line-height:1.45">El sorteo juega con ${lotteryName}. La fecha se actualiza con el ultimo resultado oficial públicado.</p>
        </div>
      </div>
    </div>
  `;

  const result = await resend.emails.send({
    from,
    to,
    subject: `Tus números de rifa - ${rifaConfig.eventName}`,
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
}: {
  to: string;
  buyerName: string;
  buyerWhatsapp: string;
  blessedNumbers: string[];
  allNumbers: string[];
}) {
  if (!process.env.RESEND_API_KEY || !to) return { sent: false, error: "Resend no configurado o destinatario vacio." };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM || "Entradas Elite Club <onboarding@resend.dev>";

  const html = `
    <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:20px">
      <h2 style="color:#D4AF37;margin:0 0 10px">Numero bendecido vendido</h2>
      <p><strong>Comprador:</strong> ${buyerName}</p>
      <p><strong>WhatsApp:</strong> ${buyerWhatsapp}</p>
      <p><strong>Numeros bendecidos:</strong> ${blessedNumbers.join(", ")}</p>
      <p><strong>Numeros de la compra:</strong> ${allNumbers.join(", ")}</p>
    </div>
  `;

  const result = await resend.emails.send({
    from,
    to,
    subject: `Alerta número bendecido - ${rifaConfig.eventName}`,
    html,
  });

  if (result.error) return { sent: false, error: result.error.message || "Resend rechazó el envio." };
  return { sent: true, messageId: result.data?.id || null };
}
