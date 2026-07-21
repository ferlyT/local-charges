import { Prisma } from "@prisma/client";
import type { ParseResult } from "./priceListParser";
import { parsePriceListWorkbook } from "./priceListParser";
import { prisma } from "../db/prisma";

// Mapper: hasil query Prisma (fdXxx) -> shape API response (camelCase)
function mapUploadToApi(upload: {
  fdId: number;
  fdFileName: string;
  fdUploadedBy: number | null;
  fdUploadedAt: Date;
  fdPriceDate: Date | null;
  fdEffectiveDate: Date;
  fdStatus: string;
  fdWarnings: string | null;
  fdRawSnapshot: string | null;
}) {
  return {
    id: upload.fdId,
    fileName: upload.fdFileName,
    uploadedBy: upload.fdUploadedBy,
    uploadedAt: upload.fdUploadedAt,
    priceDate: upload.fdPriceDate,
    effectiveDate: upload.fdEffectiveDate,
    status: upload.fdStatus,
    warnings: upload.fdWarnings,
    rawSnapshot: upload.fdRawSnapshot,
  };
}

function mapItemToApi(item: {
  fdId: number;
  fdUploadId: number;
  fdSheetType: string;
  fdMode: string;
  fdBranch: string;
  fdTransitTime: string | null;
  fdCategory: string;
  fdPrice: Prisma.Decimal;
}) {
  return {
    id: item.fdId,
    uploadId: item.fdUploadId,
    sheetType: item.fdSheetType,
    mode: item.fdMode,
    branch: item.fdBranch,
    transitTime: item.fdTransitTime,
    category: item.fdCategory,
    price: item.fdPrice,
  };
}

export async function ingestPriceListFile(
  buffer: Buffer,
  fileName: string,
  effectiveDate: Date,
  branchMarkingPairs: { branch: string; markingCode?: string | null }[],
  uploadedBy?: number,
) {
  const parsed: ParseResult = await parsePriceListWorkbook(buffer);

  const seen = new Set<string>();
  const cleanPairs: { branch: string; markingCode: string | null }[] = [];
  for (const p of branchMarkingPairs) {
    const branch = p.branch.trim().toUpperCase();
    if (!branch || seen.has(branch)) continue;
    seen.add(branch);
    const markingCode = p.markingCode?.trim().toUpperCase() || null;
    cleanPairs.push({ branch, markingCode });
  }

  const upload = await prisma.tbPriceListUpload.create({
    data: {
      fdFileName: fileName,
      fdUploadedBy: uploadedBy ?? null,
      fdEffectiveDate: effectiveDate,
      fdPriceDate: parsed.priceDate,
      fdStatus: parsed.status,
      fdWarnings: JSON.stringify(parsed.warnings),
      fdRawSnapshot: JSON.stringify(parsed.rawSnapshot),
      items: {
        create: parsed.items.map((it) => ({
          fdSheetType: it.sheetType,
          fdMode: it.mode,
          fdBranch: it.branch,
          fdTransitTime: it.transitTime,
          fdCategory: it.category,
          fdPrice: new Prisma.Decimal(it.price),
        })),
      },
      branches: {
        create: cleanPairs.map((p) => ({
          fdBranch: p.branch,
          fdMarkingCode: p.markingCode,
        })),
      },
    },
    include: { items: false },
  });

  // Cek apakah ada upload lain dengan effectiveDate yang sama (multi-version)
  const siblingCount = await prisma.tbPriceListUpload.count({
    where: {
      fdEffectiveDate: effectiveDate,
      fdId: { not: upload.fdId },
    },
  });

  const apiUpload = mapUploadToApi(upload);

  return {
    uploadId: apiUpload.id,
    status: apiUpload.status,
    effectiveDate: apiUpload.effectiveDate,
    priceDate: apiUpload.priceDate,
    itemCount: parsed.items.length,
    warnings: parsed.warnings,
    hasOlderVersions: siblingCount > 0,
    branches: cleanPairs,
  };
}

export async function listUploads(page = 1, pageSize = 20) {
  // Ambil semua upload, urutkan terbaru dulu
  const [allRows, total] = await Promise.all([
    prisma.tbPriceListUpload.findMany({
      orderBy: { fdUploadedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        fdId: true,
        fdFileName: true,
        fdUploadedBy: true,
        fdUploadedAt: true,
        fdPriceDate: true,
        fdEffectiveDate: true,
        fdStatus: true,
        _count: { select: { items: true } },
        user: { select: { fdNama: true } },
        branches: { select: { fdBranch: true, fdMarkingCode: true } },
      },
    }),
    prisma.tbPriceListUpload.count(),
  ]);

  // Tentukan upload mana yang "aktif" per effectiveDate (yang paling baru = terbaru uploadedAt)
  // Kita butuh set dari seluruh uploadId aktif untuk range halaman ini
  const effectiveDatesOnPage = [...new Set(allRows.map((r) => r.fdEffectiveDate.toISOString()))];

  // Untuk setiap effectiveDate unik di halaman ini, cari upload ID terbaru
  const activeIds = new Set<number>();
  if (effectiveDatesOnPage.length > 0) {
    const latestPerDate = await prisma.tbPriceListUpload.findMany({
      where: { fdEffectiveDate: { in: allRows.map((r) => r.fdEffectiveDate) } },
      orderBy: { fdUploadedAt: "desc" },
      select: { fdId: true, fdEffectiveDate: true },
    });
    // Ambil ID pertama per effectiveDate (yang paling baru karena sudah diurutkan desc)
    const seen = new Set<string>();
    for (const row of latestPerDate) {
      const key = row.fdEffectiveDate.toISOString();
      if (!seen.has(key)) {
        seen.add(key);
        activeIds.add(row.fdId);
      }
    }
  }

  return {
    rows: allRows.map((r) => ({
      id: r.fdId,
      fileName: r.fdFileName,
      uploadedBy: r.user?.fdNama ?? null,
      uploadedAt: r.fdUploadedAt,
      priceDate: r.fdPriceDate,
      effectiveDate: r.fdEffectiveDate,
      status: r.fdStatus,
      _count: r._count,
      isSuperseded: !activeIds.has(r.fdId),  // true jika ada versi lebih baru dengan effectiveDate sama
      branches: r.branches.map((b) => ({ branch: b.fdBranch, markingCode: b.fdMarkingCode })),
    })),
    total,
    page,
    pageSize,
  };
}

export async function getUploadDetail(id: number) {
  const upload = await prisma.tbPriceListUpload.findUnique({
    where: { fdId: id },
    include: {
      items: true,
      branches: true,
    },
  });
  if (!upload) return null;
  
  const apiUpload = mapUploadToApi(upload);
  const apiItems = upload.items.map(mapItemToApi);
  
  return {
    ...apiUpload,
    items: apiItems,
    warnings: apiUpload.warnings ? JSON.parse(apiUpload.warnings) : [],
    branches: upload.branches.map((b) => ({ branch: b.fdBranch, markingCode: b.fdMarkingCode })),
  };
}

/**
 * Bandingkan upload ini dengan upload sebelumnya dengan effectiveDate lebih awal.
 * "Sebelumnya" = upload terbaru (by uploadedAt) dari effectiveDate yang lebih kecil.
 */
export async function getUploadDiff(id: number) {
  const current = await prisma.tbPriceListUpload.findUnique({ where: { fdId: id }, include: { items: true } });
  if (!current) return null;

  // Cari upload "aktif" (terbaru per effectiveDate) dengan effectiveDate lebih kecil
  const candidatePrevious = await prisma.tbPriceListUpload.findMany({
    where: { fdEffectiveDate: { lt: current.fdEffectiveDate } },
    orderBy: [{ fdEffectiveDate: "desc" }, { fdUploadedAt: "desc" }],
    include: { items: true },
    take: 50, // ambil kandidat, lalu filter aktif
  });

  // Ambil yang paling baru (uploadedAt) per effectiveDate sebelumnya
  const seen = new Set<string>();
  let previousRow: typeof candidatePrevious[number] | undefined;
  for (const row of candidatePrevious) {
    const dateKey = row.fdEffectiveDate.toISOString();
    if (!seen.has(dateKey)) {
      seen.add(dateKey);
      if (!previousRow) previousRow = row; // effectiveDate terbesar yang lebih kecil dari current
    }
  }
  const previous = previousRow ?? null;

  const key = (it: { fdSheetType: string; fdMode: string; fdBranch: string; fdCategory: string }) =>
    `${it.fdSheetType}||${it.fdMode}||${it.fdBranch}||${it.fdCategory}`;

  const prevMap = new Map<string, number>();
  previous?.items.forEach((it) => prevMap.set(key(it), Number(it.fdPrice)));

  const diff = current.items.map((it) => {
    const prevPrice = prevMap.get(key(it));
    const currPrice = Number(it.fdPrice);
    return {
      sheetType: it.fdSheetType,
      mode: it.fdMode,
      branch: it.fdBranch,
      category: it.fdCategory,
      currentPrice: currPrice,
      previousPrice: prevPrice ?? null,
      delta: prevPrice !== undefined ? currPrice - prevPrice : null,
      deltaPct: prevPrice ? ((currPrice - prevPrice) / prevPrice) * 100 : null,
    };
  });

  return {
    currentUploadId: current.fdId,
    currentEffectiveDate: current.fdEffectiveDate,
    previousUploadId: previous?.fdId ?? null,
    previousEffectiveDate: previous?.fdEffectiveDate ?? null,
    diff,
  };
}

/**
 * Sama seperti getUploadDiff, tapi otomatis memakai upload AKTIF terbaru
 * (bukan upload yang dipilih user). Dipakai untuk KPI "Perubahan Harga"
 * di Dashboard, supaya tidak bergantung pada filter sheetType/mode/category
 * yang sedang aktif di dropdown — jadi mencakup SEMUA tipe/mode/kategori.
 */
export async function getLatestUploadDiff() {
  // Upload aktif terbaru = effectiveDate terbesar, lalu uploadedAt terbaru
  // untuk effectiveDate itu (menangani kasus multi-version di tanggal yang sama).
  const latest = await prisma.tbPriceListUpload.findFirst({
    orderBy: [{ fdEffectiveDate: "desc" }, { fdUploadedAt: "desc" }],
    select: { fdId: true },
  });
  if (!latest) return null;
  return getUploadDiff(latest.fdId);
}

interface DashboardFilter {
  sheetType?: string;
  mode?: string;
  branch?: string;
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
  const uploads = await prisma.tbPriceListUpload.findMany({
    where: {
      fdEffectiveDate: {
        gte: filter.from,
        lte: filter.to,
      },
    },
    orderBy: [{ fdEffectiveDate: "asc" }, { fdUploadedAt: "desc" }],
    select: { fdId: true, fdEffectiveDate: true, fdUploadedAt: true },
  });

  // Step 2: Deduplikasi — ambil ID upload terbaru per effectiveDate
  const seen = new Set<string>();
  const activeUploadIds: number[] = [];
  for (const u of uploads) {
    const key = u.fdEffectiveDate.toISOString();
    if (!seen.has(key)) {
      seen.add(key);
      activeUploadIds.push(u.fdId);
    }
  }

  if (activeUploadIds.length === 0) return [];

  // Step 3: Ambil items dari upload-upload aktif tersebut, dengan filter kategori
  const items = await prisma.tbPriceListItem.findMany({
    where: {
      fdUploadId: { in: activeUploadIds },
      ...(filter.sheetType && { fdSheetType: filter.sheetType }),
      ...(filter.mode && { fdMode: filter.mode }),
      ...(filter.branch && { fdBranch: filter.branch }),
      ...(filter.category && { fdCategory: filter.category }),
    },
    include: {
      upload: { select: { fdId: true, fdEffectiveDate: true, fdUploadedAt: true } },
    },
    orderBy: { upload: { fdEffectiveDate: "asc" } },
  });

  return items.map((it) => ({
    uploadId: it.upload.fdId,
    date: it.upload.fdEffectiveDate.toISOString().slice(0, 10),
    sheetType: it.fdSheetType,
    mode: it.fdMode,
    branch: it.fdBranch,
    category: it.fdCategory,
    price: Number(it.fdPrice),
  }));
}

interface FilterOptionsQuery {
  sheetType?: string;
  mode?: string;
}

/**
 * Daftar nilai distinct untuk mengisi dropdown filter di frontend.
 *
 * `sheetType`/`mode` bersifat opsional dan hanya dipakai untuk menyaring
 * `categories` & `branches` — bukan `sheetTypes`/`modes` itu sendiri,
 * karena keduanya adalah selector tingkat atas yang harus selalu
 * menampilkan semua pilihan. Ini yang bikin dropdown "Kategori Barang"
 * di dashboard otomatis menyesuaikan Mode yang sedang aktif (mis. kategori
 * yang cuma ada di BY SEA tidak akan muncul saat user memilih BY AIR).
 */
export async function getFilterOptions(filter: FilterOptionsQuery = {}) {
  const scopedWhere: Prisma.tbPriceListItemWhereInput = {
    ...(filter.sheetType && { fdSheetType: filter.sheetType }),
    ...(filter.mode && { fdMode: filter.mode }),
  };

  const [sheetTypes, modes, branches, categories] = await Promise.all([
    prisma.tbPriceListItem.findMany({ distinct: ["fdSheetType"], select: { fdSheetType: true } }),
    prisma.tbPriceListItem.findMany({ distinct: ["fdMode"], select: { fdMode: true } }),
    prisma.tbPriceListItem.findMany({ where: scopedWhere, distinct: ["fdBranch"], select: { fdBranch: true } }),
    prisma.tbPriceListItem.findMany({ where: scopedWhere, distinct: ["fdCategory"], select: { fdCategory: true } }),
  ]);
  return {
    sheetTypes: sheetTypes.map((s) => s.fdSheetType),
    modes: modes.map((m) => m.fdMode),
    branches: branches.map((d) => d.fdBranch),
    categories: categories.map((c) => c.fdCategory),
  };
}

export async function getBranchMarkingPairsByEffectiveDate(dateOnly: Date) {
  const startOfDay = new Date(dateOnly);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateOnly);
  endOfDay.setHours(23, 59, 59, 999);

  const upload = await prisma.tbPriceListUpload.findFirst({
    where: { fdEffectiveDate: { gte: startOfDay, lte: endOfDay } },
    select: {
      fdId: true,
      fdEffectiveDate: true,
      branches: { select: { fdBranch: true, fdMarkingCode: true } },
    },
    orderBy: { fdUploadedAt: "desc" },
  });

  if (!upload) return null;

  return {
    uploadId: upload.fdId,
    effectiveDate: upload.fdEffectiveDate,
    pairs: upload.branches.map((b) => ({ branch: b.fdBranch, markingCode: b.fdMarkingCode })),
  };
}
