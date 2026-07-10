import { Prisma } from "@prisma/client";
import type { ParseResult } from "./priceListParser";
import { parsePriceListWorkbook } from "./priceListParser";
import { prisma } from "../db/prisma";

export async function ingestPriceListFile(
  buffer: Buffer,
  fileName: string,
  effectiveDate: Date,
  uploadedBy?: number,
) {
  const parsed: ParseResult = await parsePriceListWorkbook(buffer);

  const upload = await prisma.priceListUpload.create({
    data: {
      fileName,
      uploadedBy: uploadedBy ?? null,
      effectiveDate,
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

  // Cek apakah ada upload lain dengan effectiveDate yang sama (multi-version)
  const siblingCount = await prisma.priceListUpload.count({
    where: {
      effectiveDate,
      id: { not: upload.id },
    },
  });

  return {
    uploadId: upload.id,
    status: upload.status,
    effectiveDate: upload.effectiveDate,
    priceDate: upload.priceDate,
    itemCount: parsed.items.length,
    warnings: parsed.warnings,
    hasOlderVersions: siblingCount > 0,
  };
}

export async function listUploads(page = 1, pageSize = 20) {
  // Ambil semua upload, urutkan terbaru dulu
  const [allRows, total] = await Promise.all([
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
        effectiveDate: true,
        status: true,
        _count: { select: { items: true } },
        user: { select: { fdNama: true } },
      },
    }),
    prisma.priceListUpload.count(),
  ]);

  // Tentukan upload mana yang "aktif" per effectiveDate (yang paling baru = terbaru uploadedAt)
  // Kita butuh set dari seluruh uploadId aktif untuk range halaman ini
  const effectiveDatesOnPage = [...new Set(allRows.map((r) => r.effectiveDate.toISOString()))];

  // Untuk setiap effectiveDate unik di halaman ini, cari upload ID terbaru
  const activeIds = new Set<number>();
  if (effectiveDatesOnPage.length > 0) {
    const latestPerDate = await prisma.priceListUpload.findMany({
      where: { effectiveDate: { in: allRows.map((r) => r.effectiveDate) } },
      orderBy: { uploadedAt: "desc" },
      select: { id: true, effectiveDate: true },
    });
    // Ambil ID pertama per effectiveDate (yang paling baru karena sudah diurutkan desc)
    const seen = new Set<string>();
    for (const row of latestPerDate) {
      const key = row.effectiveDate.toISOString();
      if (!seen.has(key)) {
        seen.add(key);
        activeIds.add(row.id);
      }
    }
  }

  return {
    rows: allRows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      uploadedBy: r.user?.fdNama ?? null,
      uploadedAt: r.uploadedAt,
      priceDate: r.priceDate,
      effectiveDate: r.effectiveDate,
      status: r.status,
      _count: r._count,
      isSuperseded: !activeIds.has(r.id),  // true jika ada versi lebih baru dengan effectiveDate sama
    })),
    total,
    page,
    pageSize,
  };
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

/**
 * Bandingkan upload ini dengan upload sebelumnya dengan effectiveDate lebih awal.
 * "Sebelumnya" = upload terbaru (by uploadedAt) dari effectiveDate yang lebih kecil.
 */
export async function getUploadDiff(id: number) {
  const current = await prisma.priceListUpload.findUnique({ where: { id }, include: { items: true } });
  if (!current) return null;

  // Cari upload "aktif" (terbaru per effectiveDate) dengan effectiveDate lebih kecil
  const candidatePrevious = await prisma.priceListUpload.findMany({
    where: { effectiveDate: { lt: current.effectiveDate } },
    orderBy: [{ effectiveDate: "desc" }, { uploadedAt: "desc" }],
    include: { items: true },
    take: 50, // ambil kandidat, lalu filter aktif
  });

  // Ambil yang paling baru (uploadedAt) per effectiveDate sebelumnya
  const seen = new Set<string>();
  let previousRow: typeof candidatePrevious[number] | undefined;
  for (const row of candidatePrevious) {
    const dateKey = row.effectiveDate.toISOString();
    if (!seen.has(dateKey)) {
      seen.add(dateKey);
      if (!previousRow) previousRow = row; // effectiveDate terbesar yang lebih kecil dari current
    }
  }
  const previous = previousRow ?? null;

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
    currentEffectiveDate: current.effectiveDate,
    previousUploadId: previous?.id ?? null,
    previousEffectiveDate: previous?.effectiveDate ?? null,
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

/**
 * Data trend harga per effectiveDate untuk chart timeline di dashboard.
 * Untuk setiap effectiveDate, hanya menggunakan upload terbaru (multi-version aware).
 */
export async function getPriceTrend(filter: DashboardFilter) {
  // Step 1: Ambil semua upload yang memenuhi filter rentang tanggal
  const uploads = await prisma.priceListUpload.findMany({
    where: {
      effectiveDate: {
        gte: filter.from,
        lte: filter.to,
      },
    },
    orderBy: [{ effectiveDate: "asc" }, { uploadedAt: "desc" }],
    select: { id: true, effectiveDate: true, uploadedAt: true },
  });

  // Step 2: Deduplikasi — ambil ID upload terbaru per effectiveDate
  const seen = new Set<string>();
  const activeUploadIds: number[] = [];
  for (const u of uploads) {
    const key = u.effectiveDate.toISOString();
    if (!seen.has(key)) {
      seen.add(key);
      activeUploadIds.push(u.id);
    }
  }

  if (activeUploadIds.length === 0) return [];

  // Step 3: Ambil items dari upload-upload aktif tersebut, dengan filter kategori
  const items = await prisma.priceListItem.findMany({
    where: {
      uploadId: { in: activeUploadIds },
      ...(filter.sheetType && { sheetType: filter.sheetType }),
      ...(filter.mode && { mode: filter.mode }),
      ...(filter.destination && { destination: filter.destination }),
      ...(filter.category && { category: filter.category }),
    },
    include: {
      upload: { select: { id: true, effectiveDate: true, uploadedAt: true } },
    },
    orderBy: { upload: { effectiveDate: "asc" } },
  });

  return items.map((it) => ({
    uploadId: it.upload.id,
    date: it.upload.effectiveDate.toISOString().slice(0, 10),
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
