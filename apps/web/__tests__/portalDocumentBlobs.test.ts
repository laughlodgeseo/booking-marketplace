import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminCustomerDocumentBlob,
  fetchAdminPropertyDocumentBlob,
  fetchCustomerDocumentBlob,
  fetchVendorPropertyDocumentBlob,
} from "@/lib/api/portal/documentBlobs";
import { apiFetchRaw } from "@/lib/http";

vi.mock("@/lib/http", () => ({
  apiFetchRaw: vi.fn(),
}));

const mockedApiFetchRaw = vi.mocked(apiFetchRaw);

function response(body: BodyInit, init?: ResponseInit) {
  return new Response(body, init);
}

describe("portal document blob helpers", () => {
  beforeEach(() => {
    mockedApiFetchRaw.mockReset();
  });

  it("extracts filename and content type from Content-Disposition", async () => {
    mockedApiFetchRaw.mockResolvedValue(
      response("pdf-bytes", {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'inline; filename="lease.pdf"',
        },
      }),
    );

    const result = await fetchVendorPropertyDocumentBlob("prop 1", "doc 1", "view");

    expect(mockedApiFetchRaw).toHaveBeenCalledWith(
      "/vendor/properties/prop%201/documents/doc%201/view",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
    expect(result.filename).toBe("lease.pdf");
    expect(result.contentType).toBe("application/pdf");
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it("supports admin property download helper", async () => {
    mockedApiFetchRaw.mockResolvedValue(
      response("image", {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-disposition": "attachment; filename*=UTF-8''permit%20scan.png",
        },
      }),
    );

    const result = await fetchAdminPropertyDocumentBlob("p1", "d1", "download");

    expect(mockedApiFetchRaw).toHaveBeenCalledWith(
      "/admin/properties/p1/documents/d1/download",
      expect.any(Object),
    );
    expect(result.filename).toBe("permit scan.png");
    expect(result.contentType).toBe("image/png");
  });

  it("maps 401/403/404 into friendly errors", async () => {
    mockedApiFetchRaw.mockResolvedValueOnce(
      response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
    );
    await expect(fetchCustomerDocumentBlob("d1", "view")).rejects.toThrow(
      "Please sign in again",
    );

    mockedApiFetchRaw.mockResolvedValueOnce(
      response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
    );
    await expect(fetchAdminCustomerDocumentBlob("d1", "view")).rejects.toThrow(
      "do not have permission",
    );

    mockedApiFetchRaw.mockResolvedValueOnce(
      response(JSON.stringify({ message: "Document file not found." }), {
        status: 404,
      }),
    );
    await expect(fetchCustomerDocumentBlob("d1", "download")).rejects.toThrow(
      "uploaded before the current secure document storage system",
    );
  });
});
