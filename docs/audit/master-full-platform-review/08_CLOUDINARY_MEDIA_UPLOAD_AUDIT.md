# 08 — Cloudinary & Media Upload Audit

**Audit date:** 2026-05-23

---

## 1. Upload Architecture

The system supports two upload paths:

### Path A: Server-Proxied Upload (`resolvePropertyImageUrl`)
1. NestJS receives multipart file via Multer
2. Server validates MIME type with `imageFileFilter` (NestJS pipe)
3. Server calls Cloudinary API directly using signed parameters or unsigned preset
4. Returns Cloudinary URL to store in DB
5. Local fallback: save to `uploads/properties/images/` if Cloudinary not configured

### Path B: Direct Browser Upload (`getCloudinaryUploadParams`)
1. Frontend requests signed params from backend (`GET /api/media/upload-params/:propertyId`)
2. Backend computes signed params (apiKey, signature, timestamp, folder, publicId)
3. Browser uploads directly to Cloudinary
4. Returns URL to backend to persist in DB

---

## 2. Security Checks

| Check | Status | Evidence |
|-------|--------|---------|
| CLOUDINARY_API_SECRET never sent to client | ✅ PASS | `property-media-storage.ts:57–70` — secret only used to compute SHA-1 signature server-side |
| Signed upload: signature includes folder, publicId, timestamp | ✅ PASS | `cloudinaryUploadSignatureParams()` at line 168–180 |
| Cloudinary URL validation on DB persist | ✅ PASS | `validateCloudinaryUrl()` — allows only `res.cloudinary.com`, `localhost`, `127.0.0.1` |
| Property documents never served publicly | ✅ PASS | `main.ts:129–134` — `/uploads` middleware blocks `/documents/` paths |
| Vendor cannot upload to another vendor's folder | ✅ PASS | `folder = baseFolder/scope/propertyId-segment` — propertyId verified server-side |

---

## 3. Issues Found

### P1 — High Priority

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| MEDIA-01 | If `CLOUDINARY_UPLOAD_PRESET` is set without `CLOUDINARY_API_KEY/SECRET`, uploads are **unsigned** | `property-media-storage.ts:138–148` — preset without keys = no signature | Unsigned preset allows anyone with the preset name to upload to your Cloudinary account | Always use signed uploads in production; require `apiKey + apiSecret` |
| MEDIA-02 | Multer DoS vulnerabilities in `multer ^2.0.2` (HIGH severity CVEs) | `apps/api/package.json` — `"multer": "^2.0.2"` | Denial of service via crafted multipart uploads | Upgrade to `multer@^2.1.1` immediately |
| MEDIA-03 | No file size limit on direct-browser upload path — only server-proxied path has Multer limits | `property-media-storage.ts:270–276` — no size check on browser-direct path | Large file uploads could abuse Cloudinary storage quota | Add size validation in `getCloudinaryUploadParams()` or enforce via Cloudinary upload restrictions |
| MEDIA-04 | Local fallback stores images at `apps/api/uploads/properties/` which is committed to git (30+ files in repo) | File listing shows images in git | Production images in version control | Use Cloudinary in prod; ensure `.gitignore` covers `/uploads/**/*` except `.gitkeep` |

### P2 — Medium Priority

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| MEDIA-05 | SVG MIME type not explicitly blocked | `image-file.filter.ts` (not read, assumed) | SVG can contain embedded scripts | Add `image/svg+xml` to blocked MIME types |
| MEDIA-06 | `extensionForUpload()` allows any extension up to 8 chars | `property-media-storage.ts:213–218` | Non-image files (`.docx`, `.pdf`) might pass if MIME filter is misconfigured | Allowlist only image extensions |
| MEDIA-07 | No maximum image count per property enforced at upload | No schema constraint | Vendor uploads 200 images, expensive Cloudinary storage | Add a `MAX_IMAGES_PER_PROPERTY` guard (e.g., 30) |
| MEDIA-08 | `cleanupLocalUpload()` is best-effort — temporary files might accumulate if Cloudinary call fails | `property-media-storage.ts:203–211` | Disk space usage on Railway | Use a cron to clean stale uploads or use memory storage with multer |

### P3 — Low Priority

| ID | Issue | Evidence | Risk | Fix |
|----|-------|---------|------|-----|
| MEDIA-09 | Property images served from local `/uploads` when Cloudinary not configured — no CDN, no image optimization | `property-media-storage.ts:186–188` — local path returned | Slow image serving, no optimization | Use Cloudinary in all environments |
| MEDIA-10 | No broken image fallback URLs in DB for deleted Cloudinary assets | Schema: `Media.url String` — no fallback | Shows broken images if Cloudinary asset is deleted | Add `fallbackUrl` field or use Cloudinary's default fallback image |

---

## 4. Cloudinary Folder Structure

Current structure: `booking-marketplace/properties/{scope}/{normalized-property-id}/{publicId}`

- `scope` is `vendor` or `admin`
- `normalized-property-id` is slugified UUID
- `publicId` is `{scope}-{propertyId}-{uuid}`

**Assessment:** Folder structure is logical and provides vendor isolation. ✅

---

## 5. Document Storage (Ownership Proof / ID)

Property documents (OWNERSHIP_PROOF, HOLIDAY_HOME_PERMIT, etc.) use a separate storage path:
- Stored in `uploads/properties/documents/` (local) or Cloudinary `document.storage.ts`
- Access blocked via middleware: `if (normalizedPath.includes('/documents/')) { res.status(404).end() }`
- Admin downloads documents via authenticated `GET /portal/admin/properties/{id}/documents/{docId}/download`

**Assessment:** Document protection is correct for the local path. Cloudinary document storage security depends on whether a private delivery type is used (needs verification).

---

## 6. Image Category Enforcement

The `PropertyMediaCategory` enum requires 4 photo types for listing review gating:
- `LIVING_ROOM`, `BEDROOM`, `BATHROOM`, `KITCHEN`

**Assessment:** Categories exist in schema. Whether the admin review flow validates these during approval needs to be verified in `admin-properties.service.ts`.
