import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;
const ALLOWED_MIME_TYPES = (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/jpg,application/pdf').split(',');

export const saveFile = async (
  file: File,
  localChargesId: number
): Promise<{ path: string; name: string; savedName: string; type: string; size: number }> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types are: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  const date = new Date();
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // uploads/YYYY/MM/ID/
  const relativeDir = path.join(year, month, localChargesId.toString());
  const absoluteDir = path.join(UPLOAD_DIR, relativeDir);

  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }

  const ext = file.name.split('.').pop() || '';
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const newFileName = `${uuidv4()}-${safeName}`;
  const relativePath = path.join(relativeDir, newFileName).replace(/\\/g, '/');
  const absolutePath = path.join(absoluteDir, newFileName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  fs.writeFileSync(absolutePath, buffer);

  return {
    path: relativePath,
    name: file.name,
    savedName: newFileName,
    type: file.type,
    size: file.size,
  };
};

export const deleteFile = (relativePath: string) => {
  const absolutePath = path.join(UPLOAD_DIR, relativePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

export const saveAvatar = async (file: File): Promise<string> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types are: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  const relativeDir = path.join('avatars');
  const absoluteDir = path.join(UPLOAD_DIR, relativeDir);

  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }

  const ext = file.name.split('.').pop() || '';
  const newFileName = `${uuidv4()}.${ext}`;
  const relativePath = path.join(relativeDir, newFileName).replace(/\\/g, '/');
  const absolutePath = path.join(absoluteDir, newFileName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  fs.writeFileSync(absolutePath, buffer);

  return relativePath;
};
