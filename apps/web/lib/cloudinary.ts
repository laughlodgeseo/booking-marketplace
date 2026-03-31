/**
 * Cloudinary URL transformation helpers and direct-upload utilities.
 *
 * Transformation helpers inject Cloudinary parameters into upload URLs to
 * enable WebP/AVIF conversion, quality optimization, and responsive resizing
 * served from Cloudinary's CDN. Non-Cloudinary URLs are returned unchanged.
 *
 * Direct-upload helpers let the browser upload images straight to Cloudinary
 * (bypassing the NestJS server), eliminating proxy timeout errors.
 */

import { apiFetch } from "@/lib/http";

// ─── Direct-upload types (mirrors backend DirectUploadParams) ────────────────

type CloudinaryDirectUploadParams = {
  mode: "cloudinary";
  cloudName: string;
  uploadPreset?: string;
  apiKey?: string;
  signature?: string;
  timestamp?: number;
  folder: string;
  publicId: string;
};

type ServerUploadParams = { mode: "server" };
type DirectUploadParams = CloudinaryDirectUploadParams | ServerUploadParams;

/**
 * Fetch signed (or unsigned-preset) upload parameters from the backend.
 * The backend never exposes the API secret — only the derived signature.
 *
 * Returns `{ mode: 'server' }` if Cloudinary is not configured on the server.
 */
export async function getCloudinaryUploadParams(
  propertyId: string,
  scope: "admin" | "vendor",
): Promise<DirectUploadParams> {
  const res = await apiFetch<DirectUploadParams>("/media/upload-signature", {
    query: { propertyId, scope },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to get upload signature (${res.status})`);
  return res.data;
}

/**
 * Upload a single file directly from the browser to Cloudinary.
 * Calls `onProgress(0‥100)` if provided.
 *
 * Returns the `secure_url` of the uploaded image.
 */
export function uploadFileToCloudinary(
  file: File,
  params: CloudinaryDirectUploadParams,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", params.folder);
    form.append("public_id", params.publicId);

    if (params.uploadPreset) {
      form.append("upload_preset", params.uploadPreset);
    }
    if (params.apiKey && params.signature && params.timestamp !== undefined) {
      form.append("api_key", params.apiKey);
      form.append("timestamp", String(params.timestamp));
      form.append("signature", params.signature);
    }

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`,
      true,
    );

    if (onProgress) {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { secure_url?: string };
          const url = data.secure_url?.trim();
          if (!url) {
            reject(new Error("Cloudinary did not return a secure_url."));
          } else {
            resolve(url);
          }
        } catch {
          reject(new Error("Cloudinary returned an unexpected response."));
        }
      } else {
        reject(
          new Error(`Cloudinary upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200)}`),
        );
      }
    };

    xhr.onerror = () => reject(new Error("Network error during Cloudinary upload."));
    xhr.ontimeout = () => reject(new Error("Cloudinary upload timed out."));

    xhr.send(form);
  });
}

const UPLOAD_SEGMENT = "/upload/";

/**
 * Returns true if the URL is a Cloudinary upload URL that can be transformed.
 */
function isCloudinaryUrl(url: string): boolean {
  return url.includes("res.cloudinary.com") && url.includes(UPLOAD_SEGMENT);
}

/**
 * Strip any existing Cloudinary transformations from a URL.
 * Transformations sit between `/upload/` and the version or public_id.
 * e.g. `/upload/f_auto,q_auto/v123/folder/img.jpg` → `/upload/v123/folder/img.jpg`
 */
function stripTransformations(url: string): string {
  // Match /upload/ followed by transformation segments (letters,numbers,commas,underscores)
  // before the version (v + digits) or the public ID path.
  return url.replace(
    /\/upload\/(?:[a-zA-Z][\w,.:]+\/)*(?=v\d|[^/])/,
    "/upload/",
  );
}

/**
 * Get an optimized Cloudinary URL with automatic format, quality, and width.
 *
 * @param url    - Original image URL (Cloudinary or otherwise).
 * @param width  - Target width in pixels (default 800).
 * @param quality - Cloudinary quality setting (default "auto").
 * @returns Transformed URL with `f_auto,q_auto,w_{width}` applied,
 *          or the original URL unchanged if not a Cloudinary URL.
 */
export function getOptimizedImage(
  url: string,
  width = 800,
  quality: string = "auto",
): string {
  if (!url || !isCloudinaryUrl(url)) return url;

  const clean = stripTransformations(url);
  return clean.replace(
    UPLOAD_SEGMENT,
    `${UPLOAD_SEGMENT}f_auto,q_${quality},w_${width}/`,
  );
}

/**
 * Generate a tiny (10px wide) blur placeholder URL for Cloudinary images.
 * Returns an empty string for non-Cloudinary URLs.
 */
export function getBlurPlaceholder(url: string): string {
  if (!url || !isCloudinaryUrl(url)) return "";

  const clean = stripTransformations(url);
  return clean.replace(
    UPLOAD_SEGMENT,
    `${UPLOAD_SEGMENT}f_auto,q_10,w_10,e_blur:1000/`,
  );
}

/**
 * Get responsive image URLs at standard breakpoints.
 */
export function getResponsiveImages(url: string) {
  return {
    thumbnail: getOptimizedImage(url, 400),
    small: getOptimizedImage(url, 640),
    medium: getOptimizedImage(url, 800),
    large: getOptimizedImage(url, 1200),
    full: getOptimizedImage(url, 1600),
  };
}
