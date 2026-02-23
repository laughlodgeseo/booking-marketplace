import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { API_ROOT_DIR } from '../../../src/common/upload/storage-paths';

type OwnershipProofPdfInput = {
  documentId: string;
  propertyTitle: string;
  ownerName: string;
  unitNumber: string;
  buildingName: string;
  emiratesIdMasked: string;
  issuedAt: Date;
};

type OwnershipProofPdfOutput = {
  storageKey: string;
  absolutePath: string;
  originalName: string;
  mimeType: string;
};

const DOCS_DIR = join(API_ROOT_DIR, 'uploads', 'seed', 'documents');

function sanitizeFilePart(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildPdfBuffer(lines: string[]): Buffer {
  const lineCommands = lines
    .map((line, index) => {
      const y = 790 - index * 24;
      return `BT\n/F1 12 Tf\n50 ${y} Td\n(${escapePdfText(line)}) Tj\nET`;
    })
    .join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(lineCommands, 'utf8')} >>\nstream\n${lineCommands}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += object;
  }

  const xrefOffset = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  body += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body, 'utf8');
}

export function createOwnershipProofPdf(
  input: OwnershipProofPdfInput,
): OwnershipProofPdfOutput {
  mkdirSync(DOCS_DIR, { recursive: true });

  const fileName = `${input.documentId}.pdf`;
  const absolutePath = join(DOCS_DIR, fileName);

  const lines = [
    `Ownership Proof - ${input.propertyTitle}`,
    `Owner / Vendor: ${input.ownerName}`,
    `Unit Number: ${input.unitNumber}`,
    `Building: ${input.buildingName}`,
    `Emirates ID: ${input.emiratesIdMasked}`,
    `Issue Date: ${toIsoDate(input.issuedAt)}`,
    'Issued for demo verification only (non-regulatory sample).',
  ];

  const pdfBuffer = buildPdfBuffer(lines);
  writeFileSync(absolutePath, pdfBuffer);

  return {
    storageKey: `uploads/seed/documents/${fileName}`,
    absolutePath,
    originalName: `ownership-proof-${sanitizeFilePart(input.propertyTitle)}.pdf`,
    mimeType: 'application/pdf',
  };
}
