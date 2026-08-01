import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { DEVICE_STATUS_LABELS, type DeviceStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

// GET /api/export/devices?status=&supplierId=&q=  → downloads the (filtered) inventory as .xlsx
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") || "";
  const supplierId = req.nextUrl.searchParams.get("supplierId") || "";
  const q = req.nextUrl.searchParams.get("q") || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (supplierId) where.supplierId = supplierId;
  if (q) {
    where.OR = [
      { serialNo: { contains: q, mode: "insensitive" } },
      { imei: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { make: { contains: q, mode: "insensitive" } },
      { assetTag: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  const devices = await prisma.device.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { supplier: true },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "roqit Billing";
  wb.created = new Date();
  const ws = wb.addWorksheet("Devices");

  ws.columns = [
    { header: "Category", key: "category", width: 16 },
    { header: "Make", key: "make", width: 14 },
    { header: "Model", key: "model", width: 16 },
    { header: "Serial No.", key: "serial", width: 20 },
    { header: "IMEI", key: "imei", width: 18 },
    { header: "Asset Tag", key: "assetTag", width: 14 },
    { header: "Supplier", key: "supplier", width: 18 },
    { header: "Status", key: "status", width: 12 },
    { header: "Location", key: "location", width: 18 },
    { header: "Assigned To", key: "assignedTo", width: 16 },
    { header: "Cost", key: "cost", width: 12 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Purchase Date", key: "purchaseDate", width: 16 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  });

  for (const d of devices) {
    ws.addRow({
      category: d.category,
      make: d.make ?? "",
      model: d.model ?? "",
      serial: d.serialNo ?? "",
      imei: d.imei ?? "",
      assetTag: d.assetTag ?? "",
      supplier: d.supplier?.name ?? "",
      status: DEVICE_STATUS_LABELS[d.status as DeviceStatus] ?? d.status,
      location: d.location ?? "",
      assignedTo: d.assignedTo ?? "",
      cost: d.costMinor ? d.costMinor / 100 : "",
      currency: d.currency,
      purchaseDate: fmtDate(d.purchaseDate),
    });
  }

  ws.getColumn("cost").numFmt = "#,##0.00";
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="roqit-devices-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
