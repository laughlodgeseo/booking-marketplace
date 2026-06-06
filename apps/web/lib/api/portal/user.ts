import { apiFetch } from "@/lib/http";
import type { HttpResult } from "@/lib/http";
import type { PortalCalendarResponse } from "@/lib/api/portal/calendar";

function unwrap<T>(res: HttpResult<T>): T {
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

export type UserPortalOverviewResponse = {
  kpis: {
    bookingsUpcoming: number;
    bookingsTotal: number;
    refundsTotal: number;
  };
  documentCompliance: {
    requiredTypes: CustomerDocumentType[];
    missingTypes: CustomerDocumentType[];
    hasVerifiedRequiredDocuments: boolean;
    requiresUpload: boolean;
    urgent: boolean;
    nextBooking: {
      id: string;
      checkIn: string;
      checkOut: string;
      property: {
        id: string;
        title: string;
        slug: string;
      };
    } | null;
  };
  upcoming: Array<{
    // backend returned [] in your example; keep future-proof and typed
    id?: string;
    propertyId?: string;
    propertyTitle?: string | null;
    propertySlug?: string | null;
    checkIn?: string;
    checkOut?: string;
    status?: string;
  }>;
};

export type UserPortalBookingsResponse = {
  items: Array<{
    id: string;
    propertyId?: string;
    propertyTitle?: string | null;
    propertySlug?: string | null;
    checkIn: string;
    checkOut: string;
    nights?: number;
    status: string;
    totalAmount: number;
    currency?: string | null;
    createdAt: string;
  }>;
  page: number;
  pageSize: number;
  total: number;
};

export type UserBookingDetailResponse = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  nights: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  timeline: Array<{
    key: string;
    label: string;
    at: string;
  }>;
  property: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    city: string;
    area: string | null;
    address: string | null;
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    basePrice: number;
    cleaningFee: number;
    minNights: number;
    maxNights: number | null;
    checkInFromMin: number | null;
    checkInToMax: number | null;
    checkOutMin: number | null;
    isInstantBook: boolean;
    coverUrl: string | null;
    media: Array<{
      id: string;
      url: string;
      alt: string | null;
      sortOrder: number;
      category: string;
    }>;
    cancellationPolicy: {
      version: string;
      isActive: boolean;
      freeCancelBeforeHours: number;
      partialRefundBeforeHours: number;
      noRefundWithinHours: number;
      penaltyType: string;
      penaltyValue: number;
      defaultMode: string;
      chargeFirstNightOnLateCancel: boolean;
    } | null;
  };
  payment: {
    id: string;
    status: string;
    provider: string;
    amount: number;
    currency: string;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    events: Array<{
      id: string;
      type: string;
      label: string;
      providerRef: string | null;
      createdAt: string;
    }>;
  } | null;
  documents: {
    requiredTypes: BookingDocumentType[];
    uploadedTypes: BookingDocumentType[];
    missingTypes: BookingDocumentType[];
    items: Array<{
      id: string;
      bookingId: string;
      uploadedByUserId: string;
      type: BookingDocumentType;
      originalName: string | null;
      mimeType: string | null;
      notes: string | null;
      createdAt: string;
      downloadUrl: string;
    }>;
  };
  messages: {
    threads: Array<{
      id: string;
      subject: string | null;
      topic: string;
      admin: { id: string; email: string; fullName: string | null };
      lastMessageAt: string | null;
      lastMessagePreview: string | null;
      unreadCount: number;
    }>;
  };
};

export type UserPortalRefundsResponse = {
  items: Array<{
    id: string;
    bookingId: string;
    status: string;
    amount: number;
    currency?: string | null;
    createdAt: string;
  }>;
  page: number;
  pageSize: number;
  total: number;
};

export type BookingDocumentType =
  | "PASSPORT"
  | "EMIRATES_ID"
  | "VISA"
  | "ARRIVAL_FORM"
  | "OTHER";

export type CustomerDocumentType =
  | "PASSPORT"
  | "EMIRATES_ID"
  | "VISA"
  | "SELFIE"
  | "OTHER";

export type CustomerDocumentStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type UserBookingDocument = {
  id: string;
  bookingId: string;
  uploadedByUserId: string;
  type: BookingDocumentType;
  notes: string | null;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes?: number;
  createdAt: string;
};

export type UserReview = {
  id: string;
  bookingId: string;
  propertyId: string;
  rating: number;
  cleanlinessRating: number;
  locationRating: number;
  communicationRating: number;
  valueRating: number;
  title: string | null;
  comment: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  property: {
    id: string;
    title: string;
    slug: string;
    city: string;
  };
};

export type UserCustomerDocument = {
  id: string;
  userId: string;
  type: CustomerDocumentType;
  status: CustomerDocumentStatus;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  notes: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl: string;
  viewUrl?: string;
  reviewedByAdmin?: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
};

export type UserCustomerDocumentRequirement = {
  requiredTypes: CustomerDocumentType[];
  missingTypes: CustomerDocumentType[];
  hasVerifiedRequiredDocuments: boolean;
  requiresUpload: boolean;
  urgent: boolean;
  nextBooking: {
    id: string;
    checkIn: string;
    checkOut: string;
    property: {
      id: string;
      title: string;
      slug: string;
    };
  } | null;
};

export async function getUserOverview(): Promise<UserPortalOverviewResponse> {
  const res = await apiFetch<UserPortalOverviewResponse>("/portal/user/overview", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function getUserBookings(params?: {
  page?: number;
  pageSize?: number;
}): Promise<UserPortalBookingsResponse> {
  const res = await apiFetch<UserPortalBookingsResponse>("/portal/user/bookings", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  });
  return unwrap(res);
}

export async function getUserBookingDetail(
  bookingId: string
): Promise<UserBookingDetailResponse> {
  const res = await apiFetch<UserBookingDetailResponse>(
    `/portal/user/bookings/${encodeURIComponent(bookingId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function getUserRefunds(params?: {
  page?: number;
  pageSize?: number;
}): Promise<UserPortalRefundsResponse> {
  const res = await apiFetch<UserPortalRefundsResponse>("/portal/user/refunds", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  });
  return unwrap(res);
}

export async function getUserCalendar(params?: {
  from?: string;
  to?: string;
  propertyId?: string;
}): Promise<PortalCalendarResponse> {
  const res = await apiFetch<PortalCalendarResponse>("/portal/user/calendar", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      from: params?.from ?? "",
      to: params?.to ?? "",
      propertyId: params?.propertyId ?? "",
    },
  });
  return unwrap(res);
}

export async function uploadUserBookingDocument(
  bookingId: string,
  input: {
    file: File;
    type?: BookingDocumentType;
    notes?: string;
  }
): Promise<UserBookingDocument> {
  const form = new FormData();
  form.append("file", input.file);
  if (input.type) form.append("type", input.type);
  if (input.notes?.trim()) form.append("notes", input.notes.trim());

  const res = await apiFetch<UserBookingDocument>(
    `/portal/user/bookings/${encodeURIComponent(bookingId)}/documents`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: form,
    }
  );
  return unwrap(res);
}

export async function listUserBookingDocuments(
  bookingId: string
): Promise<UserBookingDocument[]> {
  const res = await apiFetch<
    UserBookingDocument[] | { items?: UserBookingDocument[] }
  >(
    `/portal/user/bookings/${encodeURIComponent(bookingId)}/documents`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  const data = unwrap(res);
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return items.map((item) => ({
    ...item,
    sizeBytes: typeof item.sizeBytes === "number" ? item.sizeBytes : 0,
  }));
}

export async function downloadUserBookingDocument(
  bookingId: string,
  documentId: string
): Promise<Blob> {
  const res = await apiFetch<Blob>(
    `/portal/user/bookings/${encodeURIComponent(bookingId)}/documents/${encodeURIComponent(documentId)}/download`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      responseType: "blob",
      headers: {
        Accept: "application/octet-stream",
      },
    }
  );
  return unwrap(res);
}

export async function getUserCustomerDocuments(): Promise<{
  requirement: UserCustomerDocumentRequirement;
  items: UserCustomerDocument[];
}> {
  const res = await apiFetch<{
    requirement: UserCustomerDocumentRequirement;
    items: UserCustomerDocument[];
  }>("/portal/user/documents", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function uploadUserCustomerDocument(input: {
  file: File;
  type?: CustomerDocumentType;
  notes?: string;
}): Promise<UserCustomerDocument> {
  const form = new FormData();
  form.append("file", input.file);
  if (input.type) form.append("type", input.type);
  if (input.notes?.trim()) form.append("notes", input.notes.trim());

  const res = await apiFetch<UserCustomerDocument>("/portal/user/documents", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: form,
  });
  return unwrap(res);
}

export async function downloadUserCustomerDocument(documentId: string): Promise<Blob> {
  const res = await apiFetch<Blob>(
    `/portal/user/documents/${encodeURIComponent(documentId)}/download`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      responseType: "blob",
      headers: {
        Accept: "application/octet-stream",
      },
    }
  );
  return unwrap(res);
}

export async function viewUserCustomerDocument(documentId: string): Promise<Blob> {
  const res = await apiFetch<Blob>(
    `/portal/user/documents/${encodeURIComponent(documentId)}/view`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      responseType: "blob",
      headers: {
        Accept: "application/pdf,image/*,*/*",
      },
    }
  );
  return unwrap(res);
}

export async function deleteUserCustomerDocument(
  documentId: string
): Promise<{ ok: true; id: string }> {
  const res = await apiFetch<{ ok: true; id: string }>(
    `/portal/user/documents/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function createUserReview(input: {
  bookingId: string;
  rating?: number;
  cleanlinessRating?: number;
  locationRating?: number;
  communicationRating?: number;
  valueRating?: number;
  title?: string;
  comment?: string;
}): Promise<UserReview> {
  const res = await apiFetch<UserReview>("/portal/user/reviews", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: {
      bookingId: input.bookingId,
      rating: input.rating,
      cleanlinessRating: input.cleanlinessRating,
      locationRating: input.locationRating,
      communicationRating: input.communicationRating,
      valueRating: input.valueRating,
      title: input.title?.trim() || undefined,
      comment: input.comment?.trim() || undefined,
    },
  });
  return unwrap(res);
}

export async function listUserReviews(params?: {
  page?: number;
  pageSize?: number;
}): Promise<{
  items: UserReview[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const res = await apiFetch<{
    items: UserReview[];
    page: number;
    pageSize: number;
    total: number;
  }>("/portal/user/reviews", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
    },
  });
  return unwrap(res);
}
