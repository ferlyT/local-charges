import { Hono } from "hono";
import {
  ingestPriceListFile,
  listUploads,
  getUploadDetail,
  getUploadDiff,
  getLatestUploadDiff,
  getPriceTrend,
  getFilterOptions,
  getBranchMarkingPairsByEffectiveDate,
} from "../services/priceList.service";

import { authMiddleware } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/permissionMiddleware";

export const priceListRoutes = new Hono();

// Apply auth middleware to all routes in this group
priceListRoutes.use('*', authMiddleware);

// POST /api/pricelist/upload  (multipart/form-data, field name: "file" + "effectiveDate")
priceListRoutes.post("/upload", requirePermission("pricelist:upload"), async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  const effectiveDateStr = body["effectiveDate"];
  const branchesRaw = body["branches"];

  if (!file || !(file instanceof File)) {
    return c.json({ error: "File tidak ditemukan. Kirim sebagai multipart/form-data field 'file'." }, 400);
  }

  if (!effectiveDateStr || typeof effectiveDateStr !== "string") {
    return c.json({ error: "Field 'effectiveDate' wajib diisi (format: YYYY-MM-DD)." }, 400);
  }

  const effectiveDate = new Date(effectiveDateStr);
  if (isNaN(effectiveDate.getTime())) {
    return c.json({ error: "Format 'effectiveDate' tidak valid. Gunakan format YYYY-MM-DD." }, 400);
  }

  const validExt = /\.xlsx?$/i.test(file.name);
  if (!validExt) {
    return c.json({ error: "Format file harus .xlsx atau .xls" }, 400);
  }

  let branches: { branch: string; markingCode?: string }[] = [];
  try {
    branches = branchesRaw && typeof branchesRaw === "string" ? JSON.parse(branchesRaw) : [];
    if (!Array.isArray(branches)) throw new Error("bukan array");
    for (const b of branches) {
      if (typeof b !== "object" || typeof b.branch !== "string") {
        throw new Error("setiap item harus punya field 'branch' bertipe string");
      }
    }
  } catch {
    return c.json({ error: "Field 'branches' harus berupa JSON array of {branch, markingCode}." }, 400);
  }


  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const jwtPayload = c.get('jwtPayload') as any;
  const parsedUserId = jwtPayload?.sub ? parseInt(jwtPayload.sub) : NaN;
  const uploadedBy = !isNaN(parsedUserId) ? parsedUserId : undefined;

  try {
    const result = await ingestPriceListFile(buffer, file.name, effectiveDate, branches, uploadedBy);
    return c.json(result, 201);
  } catch (err: any) {
    // P2003 = FK constraint violation — stale JWT referencing a user that no longer exists (e.g. after DB reset)
    if (err?.code === "P2003" && err?.meta?.modelName === "tbPriceListUpload") {
      try {
        const result = await ingestPriceListFile(buffer, file.name, effectiveDate, branches, undefined);
        return c.json(result, 201);
      } catch (innerErr) {
        console.error("Gagal memproses upload price list (fallback):", innerErr);
        return c.json({ error: "Gagal memproses file. Cek format sheet dan coba lagi." }, 500);
      }
    }
    console.error("Gagal memproses upload price list:", err);
    return c.json({ error: "Gagal memproses file. Cek format sheet dan coba lagi." }, 500);
  }
});

// GET /api/pricelist/uploads?page=1&pageSize=20
priceListRoutes.get("/uploads", requirePermission("pricelist:read"), async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const pageSize = Number(c.req.query("pageSize") ?? 20);
  const result = await listUploads(page, pageSize);
  return c.json(result);
});

// GET /api/pricelist/uploads/latest/diff -> perubahan harga (naik/turun/tetap/baru)
// dari upload aktif terbaru, TIDAK dipengaruhi filter sheetType/mode/category
// dashboard. Dipakai untuk KPI "Perubahan Harga" di Dashboard.
// PENTING: harus didaftarkan sebelum "/uploads/:id" agar "latest" tidak
// tertangkap sebagai :id.
priceListRoutes.get("/uploads/latest/diff", requirePermission("pricelist:read"), async (c) => {
  const diff = await getLatestUploadDiff();
  if (!diff) return c.json({ error: "Belum ada upload price list" }, 404);
  return c.json(diff);
});

priceListRoutes.get("/uploads/by-effective-date", requirePermission("pricelist:view"), async (c) => {
  const dateStr = c.req.query("effectiveDate");
  if (!dateStr) return c.json({ error: "Query param 'effectiveDate' wajib diisi (format: YYYY-MM-DD)." }, 400);

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return c.json({ error: "Format 'effectiveDate' tidak valid." }, 400);

  const result = await getBranchMarkingPairsByEffectiveDate(date);
  if (!result) return c.json({ error: "Tidak ada upload dengan effectiveDate tersebut." }, 404);

  return c.json(result);
});

// GET /api/pricelist/uploads/:id
priceListRoutes.get("/uploads/:id", requirePermission("pricelist:read"), async (c) => {
  const id = Number(c.req.param("id"));
  const detail = await getUploadDetail(id);
  if (!detail) return c.json({ error: "Upload tidak ditemukan" }, 404);
  return c.json(detail);
});

// GET /api/pricelist/uploads/:id/diff  -> perbandingan harga vs upload sebelumnya
priceListRoutes.get("/uploads/:id/diff", requirePermission("pricelist:read"), async (c) => {
  const id = Number(c.req.param("id"));
  const diff = await getUploadDiff(id);
  if (!diff) return c.json({ error: "Upload tidak ditemukan" }, 404);
  return c.json(diff);
});

// GET /api/pricelist/filters?sheetType=CS&mode=BY SEA -> opsi dropdown untuk dashboard
// sheetType/mode opsional: kalau dikirim, `branches` & `categories` disaring
// sesuai kombinasi itu (lihat getFilterOptions di service).
priceListRoutes.get("/filters", requirePermission("pricelist:read"), async (c) => {
  const { sheetType, mode } = c.req.query();
  const options = await getFilterOptions({
    sheetType: sheetType || undefined,
    mode: mode || undefined,
  });
  return c.json(options);
});

// GET /api/pricelist/trend?sheetType=CS&mode=BY SEA&branch=SG&category=General Goods&from=2026-01-01&to=2026-12-31
priceListRoutes.get("/trend", requirePermission("pricelist:read"), async (c) => {
  const { sheetType, mode, branch, category, from, to } = c.req.query();
  const trend = await getPriceTrend({
    sheetType: sheetType || undefined,
    mode: mode || undefined,
    branch: branch || undefined,
    category: category || undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });
  return c.json(trend);
});
