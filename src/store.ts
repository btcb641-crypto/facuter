import { useState } from "react";
import { Client, Invoice, Payment, Product } from "./types";

const STORAGE_KEYS = {
  clients: "inv_clients",
  invoices: "inv_invoices",
  payments: "inv_payments",
  products: "inv_products",
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

const defaultProducts: Product[] = [
  { id: "p1", name: "Bessatين 2 pièces", nameAr: "بساط زوج", unit: "u", price: 800, stock: 200 },
  { id: "p2", name: "Couette", nameAr: "كوات", unit: "u", price: 650, stock: 150 },
  { id: "p3", name: "Ridou", nameAr: "رديو", unit: "u", price: 800, stock: 100 },
  { id: "p4", name: "Tefricha", nameAr: "تفريشة", unit: "u", price: 400, stock: 300 },
];

const defaultClients: Client[] = [
  {
    id: "c1",
    name: "OULD BOUZIDI LAID",
    type: "Commerçant",
    wilaya: "W DE MEDEA",
    rc: "26/00 1760198 D 17",
    nif: "79926189003603",
    art: "26230062030",
    phone: "",
    totalDebt: 0,
  },
];

export function useStore() {
  const [clients, setClientsState] = useState<Client[]>(() =>
    load(STORAGE_KEYS.clients, defaultClients)
  );
  const [invoices, setInvoicesState] = useState<Invoice[]>(() =>
    load(STORAGE_KEYS.invoices, [])
  );
  const [payments, setPaymentsState] = useState<Payment[]>(() =>
    load(STORAGE_KEYS.payments, [])
  );
  const [products, setProductsState] = useState<Product[]>(() =>
    load(STORAGE_KEYS.products, defaultProducts)
  );

  const setClients = (val: Client[] | ((prev: Client[]) => Client[])) => {
    setClientsState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      save(STORAGE_KEYS.clients, next);
      return next;
    });
  };

  const setInvoices = (val: Invoice[] | ((prev: Invoice[]) => Invoice[])) => {
    setInvoicesState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      save(STORAGE_KEYS.invoices, next);
      return next;
    });
  };

  const setPayments = (val: Payment[] | ((prev: Payment[]) => Payment[])) => {
    setPaymentsState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      save(STORAGE_KEYS.payments, next);
      return next;
    });
  };

  const setProducts = (val: Product[] | ((prev: Product[]) => Product[])) => {
    setProductsState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      save(STORAGE_KEYS.products, next);
      return next;
    });
  };

  // Compute client debts from invoices and payments
  const getClientDebt = (clientId: string) => {
    const totalInvoiced = invoices
      .filter((inv) => inv.clientId === clientId)
      .reduce((sum, inv) => sum + inv.totalHT - inv.paid, 0);
    const totalPaid = payments
      .filter((p) => p.clientId === clientId && !p.invoiceId)
      .reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, totalInvoiced - totalPaid);
  };

  const addInvoice = (invoice: Invoice) => {
    setInvoices((prev) => [...prev, invoice]);
    // Deduct stock
    invoice.items.forEach((item) => {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === item.productId
            ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
            : p
        )
      );
    });
  };

  const deleteInvoice = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      // Restore stock
      inv.items.forEach((item) => {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === item.productId
              ? { ...p, stock: p.stock + item.quantity }
              : p
          )
        );
      });
    }
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  };

  return {
    clients,
    setClients,
    invoices,
    setInvoices,
    addInvoice,
    deleteInvoice,
    payments,
    setPayments,
    products,
    setProducts,
    getClientDebt,
  };
}
