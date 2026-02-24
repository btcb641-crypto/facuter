export interface Product {
  id: string;
  name: string;
  nameAr?: string;
  unit: string;
  price: number;
  stock: number;
}

export interface InvoiceItem {
  productId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  clientId: string;
  items: InvoiceItem[];
  totalHT: number;
  paid: number;
  paymentMode: string;
  notes: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  type: string;
  wilaya: string;
  rc?: string;
  nif?: string;
  art?: string;
  phone?: string;
  totalDebt: number;
}

export interface Payment {
  id: string;
  clientId: string;
  invoiceId?: string;
  amount: number;
  date: string;
  note: string;
}
