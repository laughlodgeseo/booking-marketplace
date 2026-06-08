import { apiFetchRaw } from "@/lib/http";

export type DocumentBlobMode = "view" | "download";

export type PortalDocumentBlob = {
  blob: Blob;
  filename: string;
  contentType: string;
};

const LEGACY_MESSAGE =
  "This document was uploaded before the current secure document storage system and may need to be re-uploaded.";

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ""));
    } catch {
      return utf8Match[1].trim().replace(/^"|"$/g, "");
    }
  }

  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  return plainMatch?.[1]?.trim() || null;
}

function fallbackFilename(path: string): string {
  const id = path.split("/").filter(Boolean).at(-2) ?? "document";
  return `${id}.bin`;
}

async function errorMessageFromResponse(res: Response): Promise<string> {
  let serverMessage = "";
  try {
    const body = (await res.clone().json()) as { message?: unknown; error?: unknown };
    const raw = body.message ?? body.error;
    serverMessage = Array.isArray(raw) ? raw.join(" ") : typeof raw === "string" ? raw : "";
  } catch {
    try {
      serverMessage = await res.clone().text();
    } catch {
      serverMessage = "";
    }
  }

  if (res.status === 401) return "Please sign in again to open this document.";
  if (res.status === 403) return "You do not have permission to open this document.";
  if (res.status === 404) {
    const lowered = serverMessage.toLowerCase();
    if (lowered.includes("file not found") || lowered.includes("not found")) {
      return LEGACY_MESSAGE;
    }
    return "Document not found.";
  }
  return "We couldn't open this document. Please try again.";
}

async function fetchDocumentBlob(path: string): Promise<PortalDocumentBlob> {
  const res = await apiFetchRaw(path, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/pdf,image/*,*/*" },
  });

  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }

  const blob = await res.blob();
  const contentType =
    res.headers.get("content-type") || blob.type || "application/octet-stream";
  const filename =
    filenameFromDisposition(res.headers.get("content-disposition")) ??
    fallbackFilename(path);

  return { blob, filename, contentType };
}

export function fetchVendorPropertyDocumentBlob(
  propertyId: string,
  documentId: string,
  mode: DocumentBlobMode,
): Promise<PortalDocumentBlob> {
  return fetchDocumentBlob(
    `/vendor/properties/${encodeURIComponent(propertyId)}/documents/${encodeURIComponent(documentId)}/${mode}`,
  );
}

export function fetchAdminPropertyDocumentBlob(
  propertyId: string,
  documentId: string,
  mode: DocumentBlobMode,
): Promise<PortalDocumentBlob> {
  return fetchDocumentBlob(
    `/admin/properties/${encodeURIComponent(propertyId)}/documents/${encodeURIComponent(documentId)}/${mode}`,
  );
}

export function fetchCustomerDocumentBlob(
  documentId: string,
  mode: DocumentBlobMode,
): Promise<PortalDocumentBlob> {
  return fetchDocumentBlob(
    `/portal/user/documents/${encodeURIComponent(documentId)}/${mode}`,
  );
}

export function fetchAdminCustomerDocumentBlob(
  documentId: string,
  mode: DocumentBlobMode,
): Promise<PortalDocumentBlob> {
  return fetchDocumentBlob(
    `/portal/admin/customer-documents/${encodeURIComponent(documentId)}/${mode}`,
  );
}

export function triggerPortalDocumentDownload(result: PortalDocumentBlob) {
  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
