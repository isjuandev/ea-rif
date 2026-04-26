import { Resend } from "resend";
import { rifaConfig } from "@/config/rifa";
import { formatCOP } from "@/components/utils";

export async function sendTicketEmail({
  to,
  name,
  packageName,
  price,
  numbers,
}: {
  to: string;
  name: string;
  packageName: string;
  price: number;
  numbers: string[];
}) {
  if (!process.env.RESEND_API_KEY || !to) return { sent: false, error: "Resend no configurado o destinatario vacio." };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM || "Rifas Wallpapers <onboarding@resend.dev>";

  const html = `
    <div style="font-family:Arial,sans-serif;background:#0A0A0A;color:#ffffff;padding:28px">
      <h1 style="margin:0 0 12px;color:#AAFF00">${rifaConfig.eventName}</h1>
      <p>Hola ${name}, tu compra del paquete <strong>${packageName}</strong> fue registrada.</p>
      <p>Valor: <strong>${formatCOP(price)}</strong></p>
      <p>Tus numeros de rifa son:</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:18px 0">
        ${numbers.map((number) => `<span style="border:1px solid #AAFF00;padding:8px 12px;border-radius:6px;font-weight:700">${number}</span>`).join("")}
      </div>
      <p>El sorteo juega con la Loteria del Quindio el jueves habil correspondiente.</p>
    </div>
  `;

  const result = await resend.emails.send({
    from,
    to,
    subject: `Tus numeros de rifa - ${rifaConfig.eventName}`,
    html,
  });

  if (result.error) {
    return { sent: false, error: result.error.message || "Resend rechazo el envio." };
  }

  return { sent: true, messageId: result.data?.id || null };
}
