import { Hono } from "hono";
import {
  ingestPriceListFile,
  listUploads,
  getUploadDetail,
  getUploadDiff,
  getPriceTrend,
  getFilterOptions,
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

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const jwtPayload = c.get('jwtPayload') as any;
  const uploadedBy = jwtPayload ? parseInt(jwtPayload.sub) : undefined;

  try {
    const result = await ingestPriceListFile(buffer, file.name, effectiveDate, uploadedBy);
    return c.json(result, 201);
  } catch (err) {
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

// GET /api/pricelist/filters -> opsi dropdown untuk dashboard
priceListRoutes.get("/filters", requirePermission("pricelist:read"), async (c) => {
  const options = await getFilterOptions();
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
