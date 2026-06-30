import { prisma } from '../db/prisma';

export async function generateFormNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const prefix = `LC-${year}${month}-`;
  
  // Find the last form number with this prefix
  const lastForm = await prisma.tbLocalCharges.findFirst({
    where: {
      fdNomorForm: {
        startsWith: prefix,
      },
    },
    select: {
      fdNomorForm: true,
    },
    orderBy: {
      fdNomorForm: 'desc',
    },
  });

  if (!lastForm) {
    return `${prefix}0001`;
  }

  // Extract the sequence number
  const lastSequenceStr = lastForm.fdNomorForm.replace(prefix, '');
  const nextSequence = parseInt(lastSequenceStr, 10) + 1;
  const nextSequenceStr = String(nextSequence).padStart(4, '0');

  return `${prefix}${nextSequenceStr}`;
}

export async function generateInspectionReportNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const prefix = `IR-${year}${month}-`;
  
  const lastReport = await prisma.tbInspectionReport.findFirst({
    where: {
      fdReportNumber: {
        startsWith: prefix,
      },
    },
    select: {
      fdReportNumber: true,
    },
    orderBy: {
      fdReportNumber: 'desc',
    },
  });

  if (!lastReport) {
    return `${prefix}0001`;
  }

  const lastSequenceStr = lastReport.fdReportNumber.replace(prefix, '');
  const nextSequence = parseInt(lastSequenceStr, 10) + 1;
  const nextSequenceStr = String(nextSequence).padStart(4, '0');

  return `${prefix}${nextSequenceStr}`;
}
