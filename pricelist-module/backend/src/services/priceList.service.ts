import { PrismaClient, Prisma } from "@prisma/client";
import { parsePriceListWorkbook, ParseResult } from "./priceListParser";

const prisma = new PrismaClient();

export async function ingestPriceListFile(buffer: Buffer, fileName: string, uploadedBy?: string) {
  const parsed: ParseResult = await parsePriceListWorkbook(buffer);

  const upload = await prisma.priceListUpload.create({
    data: {
      fileName,
      uploadedBy: uploadedBy ?? null,
      priceDate: parsed.priceDate,
      status: parsed.status,
      warnings: JSON.stringify(parsed.warnings),
      rawSnapshot: JSON.stringify(parsed.rawSnapshot),
      items: {
        create: parsed.items.map((it) => ({
          sheetType: it.sheetType,
          mode: it.mode,
          destination: it.destination,
          transitTime: it.transitTime,
          category: it.category,
          price: new Prisma.Decimal(it.price),
        })),
      },
    },
    include: { items: false },
  });

  return {
    uploadId: upload.id,
    status: upload.status,
    priceDate: upload.priceDate,
    itemCount: parsed.items.length,
    warnings: parsed.warnings,
  };
}

export async function listUploads(page = 1, pageSize = 20) {
  const [rows, total] = await Promise.all([
    prisma.priceListUpload.findMany({
      orderBy: { uploadedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fileName: true,
        uploadedBy: true,
        uploadedAt: true,
        priceDate: true,
        status: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.priceListUpload.count(),
  ]);
  return { rows, total, page, pageSize };
}

export async function getUploadDetail(id: number) {
  const upload = await prisma.priceListUpload.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!upload) return null;
  return {
    ...upload,
    warnings: upload.warnings ? JSON.parse(upload.warnings) : [],
  };
}

/** Bandingkan upload ini dengan upload sebelumnya (by priceDate/uploadedAt) untuk report kenaikan/penurunan harga. */
export async function getUploadDiff(id: number) {
  const current = await prisma.priceListUpload.findUnique({ where: { id }, include: { items: true } });
  if (!current) return null;

  const previous = await prisma.priceListUpload.findFirst({
    where: { uploadedAt: { lt: current.uploadedAt } },
    orderBy: { uploadedAt: "desc" },
    include: { items: true },
  });

  const key = (it: { sheetType: string; mode: string; destination: string; category: string }) =>
    `${it.sheetType}||${it.mode}||${it.destination}||${it.category}`;

  const prevMap = new Map<string, number>();
  previous?.items.forEach((it) => prevMap.set(key(it), Number(it.price)));

  const diff = current.items.map((it) => {
    const prevPrice = prevMap.get(key(it));
    const currPrice = Number(it.price);
    return {
      sheetType: it.sheetType,
      mode: it.mode,
      destination: it.destination,
      category: it.category,
      currentPrice: currPrice,
      previousPrice: prevPrice ?? null,
      delta: prevPrice !== undefined ? currPrice - prevPrice : null,
      deltaPct: prevPrice ? ((currPrice - prevPrice) / prevPrice) * 100 : null,
    };
  });

  return {
    currentUploadId: current.id,
    previousUploadId: previous?.id ?? null,
    diff,
  };
}

interface DashboardFilter {
  sheetType?: string;
  mode?: string;
  destination?: string;
  category?: string;
  from?: Date;
  to?: Date;
}

/** Data trend harga per tanggal upload, untuk chart di dashboard. */
export async function getPriceTrend(filter: DashboardFilter) {
  const items = await prisma.priceListItem.findMany({
    where: {
      sheetType: filter.sheetType,
      mode: filter.mode,
      destination: filter.destination,
      category: filter.category,
      upload: {
        uploadedAt: {
          gte: filter.from,
          lte: filter.to,
        },
      },
    },
    include: {
      upload: { select: { id: true, uploadedAt: true, priceDate: true, fileName: true } },
    },
    orderBy: { upload: { uploadedAt: "asc" } },
  });

  return items.map((it) => ({
    uploadId: it.upload.id,
    date: (it.upload.priceDate ?? it.upload.uploadedAt).toISOString().slice(0, 10),
    sheetType: it.sheetType,
    mode: it.mode,
    destination: it.destination,
    category: it.category,
    price: Number(it.price),
  }));
}

/** Daftar nilai distinct untuk mengisi dropdown filter di frontend. */
export async function getFilterOptions() {
  const [sheetTypes, modes, destinations, categories] = await Promise.all([
    prisma.priceListItem.findMany({ distinct: ["sheetType"], select: { sheetType: true } }),
    prisma.priceListItem.findMany({ distinct: ["mode"], select: { mode: true } }),
    prisma.priceListItem.findMany({ distinct: ["destination"], select: { destination: true } }),
    prisma.priceListItem.findMany({ distinct: ["category"], select: { category: true } }),
  ]);
  return {
    sheetTypes: sheetTypes.map((s) => s.sheetType),
    modes: modes.map((m) => m.mode),
    destinations: destinations.map((d) => d.destination),
    categories: categories.map((c) => c.category),
  };
}
