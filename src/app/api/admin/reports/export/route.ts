import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { isAdminSessionAuthorized } from "@/lib/admin-auth";
import { getAdminReportSummary, registerReportDownload } from "@/lib/admin-reports";
import { formatCOP } from "@/components/utils";

export const dynamic = "force-dynamic";

function buildExcel(summary: Awaited<ReturnType<typeof getAdminReportSummary>>) {
  const rows: Array<Array<string | number>> = [
    ["Resumen financiero"],
    ["Ciclo", summary.cycleId],
    ["Descargas del ciclo", summary.cycleReportDownloads],
    ["Números vendidos", summary.reportTotals.soldNumbersCount],
    ["Transacciones", summary.reportTotals.transactionsCount],
    ["Total bruto (COP)", summary.reportTotals.grossCop],
    ["Comisión total (COP)", summary.reportTotals.feeCop],
    ["Total neto (COP)", summary.reportTotals.netCop],
    [],
    ["Fecha", "Números vendidos", "Transacciones", "Bruto (COP)", "Comisión (COP)", "Neto (COP)"],
    ...summary.reportByDay.map((item) => [item.date, item.soldNumbersCount, item.transactionsCount, item.grossCop, item.feeCop, item.netCop]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}

async function buildPdf(summary: Awaited<ReturnType<typeof getAdminReportSummary>>) {
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Reporte financiero", { align: "left" });
    doc.moveDown(0.4);
    doc.fontSize(10).text(`Ciclo: ${summary.cycleId}`);
    doc.text(`Descargas del ciclo: ${summary.cycleReportDownloads}`);
    if (summary.lastReportDownloadAt) doc.text(`Ultima descarga: ${new Date(summary.lastReportDownloadAt).toLocaleString("es-CO")}`);

    doc.moveDown(0.8);
    doc.fontSize(12).text("Resumen");
    doc.fontSize(10);
    doc.text(`Numeros vendidos: ${summary.reportTotals.soldNumbersCount.toLocaleString("es-CO")}`);
    doc.text(`Transacciones: ${summary.reportTotals.transactionsCount.toLocaleString("es-CO")}`);
    doc.text(`Bruto: ${formatCOP(summary.reportTotals.grossCop)}`);
    doc.text(`Comision: ${formatCOP(summary.reportTotals.feeCop)}`);
    doc.text(`Neto: ${formatCOP(summary.reportTotals.netCop)}`);

    doc.moveDown(0.8);
    doc.fontSize(12).text("Detalle diario");
    doc.moveDown(0.4);
    doc.fontSize(9);

    for (const row of summary.reportByDay) {
      const line = `${row.date} | Vendidos ${row.soldNumbersCount} | Trans ${row.transactionsCount} | Bruto ${formatCOP(row.grossCop)} | Comisión ${formatCOP(row.feeCop)} | Neto ${formatCOP(row.netCop)}`;
      doc.text(line, { lineGap: 2 });
    }

    doc.end();
  });
}

export async function GET(request: Request) {
  if (!(await isAdminSessionAuthorized(request.headers.get("cookie")))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "").toLowerCase();

  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json({ error: "Formato inválido. Usa xlsx o pdf." }, { status: 400 });
  }

  try {
    const summary = await getAdminReportSummary();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (format === "xlsx") {
      const file = buildExcel(summary);
      await registerReportDownload();
      return new NextResponse(new Uint8Array(file), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="reporte-financiero-${timestamp}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const file = await buildPdf(summary);
    await registerReportDownload();
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reporte-financiero-${timestamp}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "No se pudo exportar el reporte." }, { status: 500 });
  }
}
