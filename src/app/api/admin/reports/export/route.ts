import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const marginX = 36;
  const pageTop = 805;
  const lineHeight = 14;
  let y = pageTop;

  const drawLine = (text: string, size = 10, isTitle = false) => {
    if (y < 50) {
      page = pdf.addPage([595.28, 841.89]);
      y = pageTop;
    }
    page.drawText(text, {
      x: marginX,
      y,
      size,
      font,
      color: isTitle ? rgb(0.1, 0.1, 0.1) : rgb(0, 0, 0),
    });
    y -= size + (size >= 16 ? 8 : lineHeight - 10);
  };

  drawLine("Reporte financiero", 18, true);
  drawLine(`Ciclo: ${summary.cycleId}`);
  drawLine(`Descargas del ciclo: ${summary.cycleReportDownloads}`);
  if (summary.lastReportDownloadAt) {
    drawLine(`Última descarga: ${new Date(summary.lastReportDownloadAt).toLocaleString("es-CO")}`);
  }
  y -= 6;
  drawLine("Resumen", 12, true);
  drawLine(`Números vendidos: ${summary.reportTotals.soldNumbersCount.toLocaleString("es-CO")}`);
  drawLine(`Transacciones: ${summary.reportTotals.transactionsCount.toLocaleString("es-CO")}`);
  drawLine(`Bruto: ${formatCOP(summary.reportTotals.grossCop)}`);
  drawLine(`Comisión: ${formatCOP(summary.reportTotals.feeCop)}`);
  drawLine(`Neto: ${formatCOP(summary.reportTotals.netCop)}`);
  y -= 6;
  drawLine("Detalle diario", 12, true);

  if (summary.reportByDay.length === 0) {
    drawLine("Sin ventas registradas.");
  } else {
    for (const row of summary.reportByDay) {
      drawLine(
        `${row.date} | Vendidos ${row.soldNumbersCount} | Trans ${row.transactionsCount} | Bruto ${formatCOP(row.grossCop)} | Comisión ${formatCOP(row.feeCop)} | Neto ${formatCOP(row.netCop)}`,
        9,
      );
    }
  }

  return Buffer.from(await pdf.save());
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
