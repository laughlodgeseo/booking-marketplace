"use client";

import { Download, FileText } from "lucide-react";
import { Modal } from "@/components/portal/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  filename?: string | null;
  contentType?: string | null;
  blobUrl?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onDownload?: () => void;
};

function isPdf(contentType?: string | null, filename?: string | null) {
  return (
    contentType === "application/pdf" ||
    (filename ?? "").toLowerCase().endsWith(".pdf")
  );
}

function isImage(contentType?: string | null) {
  return Boolean(contentType?.startsWith("image/"));
}

export function PortalDocumentViewerModal({
  open,
  onClose,
  title,
  filename,
  contentType,
  blobUrl,
  isLoading,
  error,
  onDownload,
}: Props) {
  const canPreview = Boolean(blobUrl && !error && !isLoading);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? "Document preview"}
      subtitle={filename ?? undefined}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={!onDownload || isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      }
    >
      <div className="min-h-[320px]">
        {isLoading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-line/70 bg-warm-alt text-sm text-secondary">
            <span className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
            Opening document...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5">
            <div className="text-sm font-semibold text-danger">
              We couldn't preview this document.
            </div>
            <div className="mt-1 text-sm text-danger/80">
              {error}
            </div>
          </div>
        ) : canPreview && isImage(contentType) ? (
          <div className="overflow-hidden rounded-2xl border border-line/70 bg-warm-base">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blobUrl ?? ""}
              alt={filename ?? "Document preview"}
              className="max-h-[70vh] w-full object-contain"
            />
          </div>
        ) : canPreview && isPdf(contentType, filename) ? (
          <div className="overflow-hidden rounded-2xl border border-line/70 bg-warm-base">
            <iframe
              src={blobUrl ?? ""}
              title={filename ?? "Document preview"}
              className="h-[70vh] min-h-[420px] w-full"
            />
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-line/70 bg-warm-alt p-6 text-center">
            <FileText className="h-8 w-8 text-secondary" />
            <div className="mt-3 text-sm font-semibold text-primary">
              Preview is not available for this file type.
            </div>
            <div className="mt-1 max-w-md text-sm text-secondary">
              Download the file to open it with an app on your device.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
