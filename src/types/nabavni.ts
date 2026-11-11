export type Category = string;

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  contactMethod: 'email' | 'sms';
  sortOrder: number;
  category: Category;
}

export type StorageType = string;

export interface StorageTypeEntry {
  id: string;
  category: Category;
  name: string;
  colorHue: number;
  sortOrder: number;
}

export interface Article {
  id: string;
  name: string;
  unit: string;
  targetStock: number;
  supplierId: string;
  supplierArticleName: string;
  note: string;
  storageType: StorageType;
  sortOrder: number;
  storageSortOrder: number;
  category: Category;
}

export interface OrderEntry {
  articleId: string;
  currentStock: number;
  manualOrderQty: number | null;
}

export interface EmailTemplate {
  id: string;
  supplierId: string | null;
  subjectTemplate: string;
  bodyTemplate: string;
}
