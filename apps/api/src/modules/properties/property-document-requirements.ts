import { PropertyDocumentType } from '@prisma/client';

export type PropertyDocumentRequirement = {
  id: PropertyDocumentType;
  label: string;
  required: boolean;
  type: 'file';
  accept: string[];
  maxSizeMB: number;
};

const DEFAULT_ACCEPT = ['image/*', 'application/pdf'];
const DEFAULT_MAX_SIZE_MB = 15;

export const PROPERTY_DOCUMENT_REQUIREMENTS: readonly PropertyDocumentRequirement[] =
  [
    {
      id: PropertyDocumentType.OWNER_ID,
      label: 'Owner ID',
      required: true,
      type: 'file',
      accept: DEFAULT_ACCEPT,
      maxSizeMB: DEFAULT_MAX_SIZE_MB,
    },
    {
      id: PropertyDocumentType.OWNERSHIP_PROOF,
      label: 'Ownership proof',
      required: true,
      type: 'file',
      accept: DEFAULT_ACCEPT,
      maxSizeMB: DEFAULT_MAX_SIZE_MB,
    },
    {
      id: PropertyDocumentType.AUTHORIZATION_PROOF,
      label: 'Authorization proof',
      required: true,
      type: 'file',
      accept: DEFAULT_ACCEPT,
      maxSizeMB: DEFAULT_MAX_SIZE_MB,
    },
    {
      id: PropertyDocumentType.ADDRESS_PROOF,
      label: 'Address proof',
      required: false,
      type: 'file',
      accept: DEFAULT_ACCEPT,
      maxSizeMB: DEFAULT_MAX_SIZE_MB,
    },
    {
      id: PropertyDocumentType.HOLIDAY_HOME_PERMIT,
      label: 'Holiday home permit',
      required: false,
      type: 'file',
      accept: DEFAULT_ACCEPT,
      maxSizeMB: DEFAULT_MAX_SIZE_MB,
    },
    {
      id: PropertyDocumentType.OTHER,
      label: 'Other document',
      required: false,
      type: 'file',
      accept: DEFAULT_ACCEPT,
      maxSizeMB: DEFAULT_MAX_SIZE_MB,
    },
  ] as const;

export const REQUIRED_PROPERTY_DOCUMENT_TYPES =
  PROPERTY_DOCUMENT_REQUIREMENTS.filter((item) => item.required).map(
    (item) => item.id,
  );

export function getPropertyDocumentRequirements(): PropertyDocumentRequirement[] {
  return PROPERTY_DOCUMENT_REQUIREMENTS.map((item) => ({
    ...item,
    accept: [...item.accept],
  }));
}
