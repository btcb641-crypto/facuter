import { useState } from "react";
import { useStore } from "./store";
import { Client, Invoice, InvoiceItem, Payment, Product } from "./types";
import { InvoicePrint, InvoicePaper } from "./components/InvoicePrint";
import { formatAmount } from "./utils/numbers";

type Tab = "dashboard" | "invoices" | "clients" | "inventory" | "debts";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

const emptyItem = (): InvoiceItem => ({
  productId: "", description: "", quantity: 1, unit: "u", unitPrice: 0, total: 0,
});

export function App() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ─── Invoice Form ───
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [invClientId, setInvClientId] = useState(store.clients[0]?.id || "");
  const [invDate, setInvDate] = useState(today());
  const [invNumber, setInvNumber] = useState(() => {
    const n = store.invoices.length + 1;
    return `${String(n).padStart(2, "0")}/${new Date().getFullYear()}`;
  });
  const [invItems, setInvItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [invPaid, setInvPaid] = useState(0);
  const [invPayMode, setInvPayMode] = useState("À TERME");
  const [invNotes, setInvNotes] = useState("");

  // ─── Client Form ───
  const [showClientForm, setShowClientForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [cName, setCName] = useState("");
  const [cType, setCType] = useState("Commerçant");
  const [cWilaya, setCWilaya] = useState("");
  const [cRC, setCRC] = useState("");
  const [cNIF, setCNIF] = useState("");
  const [cART, setCART] = useState("");
  const [cPhone, setCPhone] = useState("");

  // ─── Product Form ───
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [pName, setPName] = useState("");
  const [pNameAr, setPNameAr] = useState("");
  const [pUnit, setPUnit] = useState("u");
  const [pPrice, setPPrice] = useState(0);
  const [pStock, setPStock] = useState(0);

  // ─── Payment Form ───
  const [showPayForm, setShowPayForm] = useState(false);
  const [payClientId, setPayClientId] = useState("");
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(today());
  const [payNote, setPayNote] = useState("");

  // ─── Helpers ───
  const calcTotals = (items: InvoiceItem[]) => items.reduce((s, it) => s + it.total, 0);

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setInvItems((prev) => {
      const next = prev.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [field]: value };
        if (field === "productId") {
          const prod = store.products.find((p) => p.id === value);
          if (prod) {
            updated.description = prod.name;
            updated.unitPrice = prod.price;
            updated.unit = prod.unit;
            updated.total = Number(updated.quantity) * prod.price;
          }
        }
        if (field === "quantity" || field === "unitPrice") {
          updated.total = Number(updated.quantity) * Number(updated.unitPrice);
        }
        return updated;
      });
      const last = next[next.length - 1];
      const isLastFilled = last.description.trim() !== "" || last.unitPrice > 0 || last.productId !== "";
      if (idx === prev.length - 1 && isLastFilled) {
        return [...next, emptyItem()];
      }
      return next;
    });
  };

  const openNewInvoice = () => {
    setEditInvoiceId(null);
    setInvClientId(store.clients[0]?.id || "");
    setInvDate(today());
    const n = store.invoices.length + 1;
    setInvNumber(`${String(n).padStart(2, "0")}/${new Date().getFullYear()}`);
    setInvItems([emptyItem()]);
    setInvPaid(0);
    setInvPayMode("À TERME");
    setInvNotes("");
    setShowInvoiceForm(true);
  };

  const openEditInvoice = (inv: Invoice) => {
    setEditInvoiceId(inv.id);
    setInvClientId(inv.clientId);
    setInvDate(inv.date);
    setInvNumber(inv.number);
    setInvItems(inv.items.length > 0 ? [...inv.items, emptyItem()] : [emptyItem()]);
    setInvPaid(inv.paid);
    setInvPayMode(inv.paymentMode);
    setInvNotes(inv.notes);
    setShowInvoiceForm(true);
  };

  const validItems = (items: InvoiceItem[]) =>
    items.filter((it) => it.description.trim() !== "" || it.unitPrice > 0 || it.productId !== "");

  const buildInvoice = (id: string): Invoice => {
    const filtered = validItems(invItems);
    return {
      id,
      number: invNumber,
      date: invDate,
      clientId: invClientId,
      items: filtered,
      totalHT: filtered.reduce((s, it) => s + it.total, 0),
      paid: invPaid,
      paymentMode: invPayMode,
      notes: invNotes,
      createdAt: new Date().toISOString(),
    };
  };

  const handleSaveInvoice = (andPrint = false) => {
    if (!invClientId) return;
    if (editInvoiceId) {
      const updated = buildInvoice(editInvoiceId);
      store.setInvoices((prev) => prev.map((i) => (i.id === editInvoiceId ? updated : i)));
      setShowInvoiceForm(false);
      if (andPrint) setPrintInvoice(updated);
    } else {
      const invoice = buildInvoice(uid());
      store.addInvoice(invoice);
      setShowInvoiceForm(false);
      const n = store.invoices.length + 2;
      setInvNumber(`${String(n).padStart(2, "0")}/${new Date().getFullYear()}`);
      if (andPrint) setPrintInvoice(invoice);
    }
  };

  // ─── Client helpers ───
  const openClientForm = (client?: Client) => {
    if (client) {
      setEditClient(client); setCName(client.name); setCType(client.type);
      setCWilaya(client.wilaya); setCRC(client.rc || ""); setCNIF(client.nif || "");
      setCART(client.art || ""); setCPhone(client.phone || "");
    } else {
      setEditClient(null); setCName(""); setCType("Commerçant"); setCWilaya("");
      setCRC(""); setCNIF(""); setCART(""); setCPhone("");
    }
    setShowClientForm(true);
  };
  const submitClient = () => {
    const data: Client = {
      id: editClient?.id || uid(), name: cName, type: cType, wilaya: cWilaya,
      rc: cRC, nif: cNIF, art: cART, phone: cPhone, totalDebt: editClient?.totalDebt || 0,
    };
    if (editClient) store.setClients((p) => p.map((c) => (c.id === editClient.id ? data : c)));
    else store.setClients((p) => [...p, data]);
    setShowClientForm(false);
  };
  const deleteClient = (id: string) => {
    if (confirm("هل تريد حذف هذا الزبون؟")) store.setClients((p) => p.filter((c) => c.id !== id));
  };

  // ─── Product helpers ───
  const openProductForm = (product?: Product) => {
    if (product) {
      setEditProduct(product); setPName(product.name); setPNameAr(product.nameAr || "");
      setPUnit(product.unit); setPPrice(product.price); setPStock(product.stock);
    } else {
      setEditProduct(null); setPName(""); setPNameAr(""); setPUnit("u"); setPPrice(0); setPStock(0);
    }
    setShowProductForm(true);
  };
  const submitProduct = () => {
    const data: Product = { id: editProduct?.id || uid(), name: pName, nameAr: pNameAr, unit: pUnit, price: pPrice, stock: pStock };
    if (editProduct) store.setProducts((p) => p.map((pr) => (pr.id === editProduct.id ? data : pr)));
    else store.setProducts((p) => [...p, data]);
    setShowProductForm(false);
  };
  const deleteProduct = (id: string) => {
    if (confirm("هل تريد حذف هذا المنتج؟")) store.setProducts((p) => p.filter((pr) => pr.id !== id));
  };

  // ─── Payment helpers ───
  const submitPayment = () => {
    const payment: Payment = { id: uid(), clientId: payClientId, amount: payAmount, date: payDate, note: payNote };
    store.setPayments((p) => [...p, payment]);
    setShowPayForm(false); setPayAmount(0); setPayNote("");
  };

  // ─── Totals ───
  const totalRevenue = store.invoices.reduce((s, inv) => s + inv.totalHT, 0);
  const totalDebt = store.clients.reduce((s, c) => s + store.getClientDebt(c.id), 0);
  const totalCollected =
    store.invoices.reduce((s, inv) => s + inv.paid, 0) +
    store.payments.filter((p) => !p.invoiceId).reduce((s, p) => s + p.amount, 0);

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "لوحة التحكم", icon: "📊" },
    { id: "invoices", label: "الفواتير", icon: "🧾" },
    { id: "clients", label: "الزبائن", icon: "👥" },
    { id: "inventory", label: "المخزون", icon: "📦" },
    { id: "debts", label: "الديون", icon: "💰" },
  ];

  const handleNav = (id: Tab) => { setTab(id); setSidebarOpen(false); };

  const selClient = store.clients.find((c) => c.id === invClientId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">

      {/* ─── Top Mobile Header ─── */}
      <header className="bg-blue-900 text-white flex items-center justify-between px-4 py-3 shadow-lg md:hidden sticky top-0 z-30">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-blue-800 hover:bg-blue-700 transition-colors" aria-label="القائمة">
          <div className="space-y-1">
            <span className={`block w-5 h-0.5 bg-white transition-all ${sidebarOpen ? "rotate-45 translate-y-1.5" : ""}`}></span>
            <span className={`block w-5 h-0.5 bg-white transition-all ${sidebarOpen ? "opacity-0" : ""}`}></span>
            <span className={`block w-5 h-0.5 bg-white transition-all ${sidebarOpen ? "-rotate-45 -translate-y-1.5" : ""}`}></span>
          </div>
        </button>
        <div className="text-center">
          <div className="font-bold text-sm">🏭 نظام الفواتير</div>
          <div className="text-blue-300 text-xs">حرفي صانع أفرشة الأسرة</div>
        </div>
        <div className="w-9" />
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* ─── Sidebar ─── */}
        <aside className={`fixed top-0 right-0 h-full w-64 bg-blue-900 text-white flex flex-col shadow-xl z-30 transition-transform duration-300
          md:static md:translate-x-0 md:z-auto md:flex md:h-auto ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="p-5 border-b border-blue-700 hidden md:block">
            <div className="text-xl font-bold">🏭 نظام الفواتير</div>
            <div className="text-blue-300 text-sm mt-1">حرفي صانع أفرشة الأسرة</div>
          </div>
          <div className="h-14 md:hidden" />
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all ${tab === item.id ? "bg-blue-600 text-white shadow" : "text-blue-200 hover:bg-blue-800"}`}>
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-blue-700">
            <div className="text-blue-500 text-[10px] text-center">MF N°: 185261800357101</div>
          </div>
        </aside>

        {/* ─── Main Content ─── */}
        <main className="flex-1 overflow-auto min-w-0">

          {/* ══════════════════ DASHBOARD ══════════════════ */}
          {tab === "dashboard" && (
            <div className="p-4 md:p-8">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-5">لوحة التحكم</h1>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6">
                {[
                  { label: "إجمالي الفواتير", value: store.invoices.length, unit: "فاتورة", color: "bg-blue-500", icon: "🧾" },
                  { label: "إجمالي المبيعات", value: formatAmount(totalRevenue), unit: "دج", color: "bg-green-500", icon: "💵" },
                  { label: "إجمالي الديون", value: formatAmount(totalDebt), unit: "دج", color: "bg-red-500", icon: "⚠️" },
                  { label: "المبالغ المحصلة", value: formatAmount(totalCollected), unit: "دج", color: "bg-purple-500", icon: "✅" },
                ].map((card) => (
                  <div key={card.label} className={`${card.color} text-white rounded-2xl p-4 shadow-lg`}>
                    <div className="text-2xl mb-1">{card.icon}</div>
                    <div className="text-lg md:text-2xl font-bold truncate">{card.value}</div>
                    <div className="text-xs opacity-80">{card.unit}</div>
                    <div className="text-xs opacity-70 mt-1 hidden sm:block">{card.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl shadow p-4 md:p-6">
                <h2 className="text-base md:text-lg font-bold mb-4 text-gray-700">آخر الفواتير</h2>
                {store.invoices.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">لا توجد فواتير بعد</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[420px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="p-2 text-right">رقم</th>
                          <th className="p-2 text-right">التاريخ</th>
                          <th className="p-2 text-right">الزبون</th>
                          <th className="p-2 text-right">المبلغ</th>
                          <th className="p-2 text-right">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {store.invoices.slice(-5).reverse().map((inv) => {
                          const client = store.clients.find((c) => c.id === inv.clientId);
                          const remaining = inv.totalHT - inv.paid;
                          return (
                            <tr key={inv.id} className="border-t hover:bg-gray-50">
                              <td className="p-2 font-mono text-blue-700">{inv.number}</td>
                              <td className="p-2 text-gray-500 text-xs">{inv.date}</td>
                              <td className="p-2 font-medium text-xs">{client?.name || "—"}</td>
                              <td className="p-2 font-bold text-green-700 text-xs">{formatAmount(inv.totalHT)}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${remaining <= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                  {remaining <= 0 ? "مدفوعة" : formatAmount(remaining)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════ INVOICES ══════════════════ */}
          {tab === "invoices" && (
            <div className="p-4 md:p-8">
              <div className="flex justify-between items-center mb-5">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">الفواتير</h1>
                <button onClick={openNewInvoice}
                  className="bg-blue-600 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-medium hover:bg-blue-700 shadow text-sm flex items-center gap-1">
                  <span className="text-base">+</span>
                  <span className="hidden sm:inline">فاتورة جديدة</span>
                  <span className="sm:hidden">جديدة</span>
                </button>
              </div>

              {store.invoices.length === 0 ? (
                <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
                  <div className="text-5xl mb-3">🧾</div>
                  <p>لا توجد فواتير بعد. أنشئ فاتورتك الأولى!</p>
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="space-y-3 md:hidden">
                    {store.invoices.slice().reverse().map((inv) => {
                      const client = store.clients.find((c) => c.id === inv.clientId);
                      const remaining = inv.totalHT - inv.paid;
                      return (
                        <div key={inv.id} className="bg-white rounded-2xl shadow p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-blue-700 font-bold text-sm">#{inv.number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${remaining <= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {remaining <= 0 ? "مدفوعة" : `متبقي: ${formatAmount(remaining)} دج`}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-800 text-sm">{client?.name || "—"}</p>
                          <p className="text-gray-400 text-xs mb-2">{inv.date}</p>
                          <div className="flex justify-between items-center border-t pt-2">
                            <span className="text-green-700 font-bold text-sm">{formatAmount(inv.totalHT)} دج</span>
                            <div className="flex gap-3">
                              <button onClick={() => openEditInvoice(inv)} className="text-yellow-500 text-lg" title="تعديل">✏️</button>
                              <button onClick={() => setPrintInvoice(inv)} className="text-blue-500 text-lg" title="طباعة / PDF">🖨️</button>
                              <button onClick={() => store.deleteInvoice(inv.id)} className="text-red-400 text-lg" title="حذف">🗑️</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block bg-white rounded-2xl shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-600 text-right">
                            <th className="p-3">رقم الفاتورة</th>
                            <th className="p-3">التاريخ</th>
                            <th className="p-3">الزبون</th>
                            <th className="p-3">المبلغ الإجمالي</th>
                            <th className="p-3">المدفوع</th>
                            <th className="p-3">المتبقي</th>
                            <th className="p-3">طريقة الدفع</th>
                            <th className="p-3">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {store.invoices.slice().reverse().map((inv) => {
                            const client = store.clients.find((c) => c.id === inv.clientId);
                            const remaining = inv.totalHT - inv.paid;
                            return (
                              <tr key={inv.id} className="border-t hover:bg-gray-50">
                                <td className="p-3 font-mono text-blue-700 font-bold">{inv.number}</td>
                                <td className="p-3 text-gray-500">{inv.date}</td>
                                <td className="p-3 font-medium">{client?.name || "—"}</td>
                                <td className="p-3 font-bold text-green-700">{formatAmount(inv.totalHT)} دج</td>
                                <td className="p-3 text-blue-600">{formatAmount(inv.paid)} دج</td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${remaining <= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                    {formatAmount(remaining)} دج
                                  </span>
                                </td>
                                <td className="p-3 text-gray-500 text-xs">{inv.paymentMode}</td>
                                <td className="p-3">
                                  <div className="flex gap-2 items-center">
                                    <button onClick={() => openEditInvoice(inv)} className="text-yellow-500 hover:text-yellow-600 text-lg" title="تعديل">✏️</button>
                                    <button onClick={() => setPrintInvoice(inv)} className="text-blue-500 hover:text-blue-700 text-lg" title="طباعة / PDF">🖨️</button>
                                    <button onClick={() => store.deleteInvoice(inv.id)} className="text-red-400 hover:text-red-600 text-lg" title="حذف">🗑️</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* ══ Invoice Form — Split View ══ */}
              {showInvoiceForm && (
                <div className="fixed inset-0 bg-black/60 z-40 flex flex-col overflow-hidden">

                  {/* ── Top bar ── */}
                  <div className="bg-gradient-to-l from-blue-700 to-blue-900 text-white px-4 py-3 flex justify-between items-center shrink-0 print:hidden">
                    <div>
                      <span className="font-bold text-base">{editInvoiceId ? "✏️ تعديل الفاتورة" : "➕ فاتورة جديدة"}</span>
                      <span className="text-blue-300 text-xs mr-3 hidden sm:inline">• المعاينة تتحدث تلقائياً</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => handleSaveInvoice(false)}
                        className="bg-green-500 hover:bg-green-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition">
                        💾 حفظ
                      </button>
                      <button onClick={() => handleSaveInvoice(true)}
                        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition">
                        🖨️ حفظ وطباعة
                      </button>
                      <button onClick={() => setShowInvoiceForm(false)}
                        className="text-white/70 hover:text-white text-xl leading-none ml-1">✕</button>
                    </div>
                  </div>

                  {/* ── Body: form left + preview right ── */}
                  <div className="flex flex-1 overflow-hidden">

                    {/* ════ LEFT: Form inputs ════ */}
                    <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 overflow-y-auto bg-gray-50 p-4 space-y-4 border-l border-gray-200">

                      {/* رقم + تاريخ */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">رقم الفاتورة</label>
                          <input value={invNumber} onChange={(e) => setInvNumber(e.target.value)}
                            className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm font-mono outline-none bg-white transition" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">التاريخ</label>
                          <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)}
                            className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm outline-none bg-white transition" />
                        </div>
                      </div>

                      {/* الزبون */}
                      <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
                        <label className="block text-[11px] font-semibold text-blue-700 mb-2 uppercase tracking-wide">👤 الزبون</label>
                        <select value={invClientId} onChange={(e) => setInvClientId(e.target.value)}
                          className="w-full border-2 border-blue-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm font-semibold outline-none bg-white mb-2 transition">
                          {store.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {selClient && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-blue-100">
                            {[
                              ["Qualité", selClient.type],
                              ["Wilaya", selClient.wilaya],
                              selClient.rc ? ["RC N°", selClient.rc] : null,
                              selClient.nif ? ["IF N°", selClient.nif] : null,
                              selClient.art ? ["ART N°", selClient.art] : null,
                              selClient.phone ? ["Tél", selClient.phone] : null,
                            ].filter(Boolean).map((row, i) => row && (
                              <div key={row[0]}
                                className={`flex justify-between items-center px-3 py-1.5 text-[11px] ${i % 2 === 0 ? "bg-white" : "bg-blue-50/50"}`}>
                                <span className="text-blue-500 font-semibold uppercase tracking-wide text-[10px] w-16 shrink-0">{row[0]}</span>
                                <span className="font-bold text-gray-800 text-right flex-1 truncate">{row[1]}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ════ بنود الفاتورة ════ */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">📦 بنود الفاتورة</span>
                          <span className="text-[9px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">✦ سطر جديد يُضاف تلقائياً</span>
                        </div>

                        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                          {/* رأس الجدول */}
                          <div className="grid bg-blue-900 text-white text-[10px] font-bold uppercase tracking-wider"
                            style={{ gridTemplateColumns: "28px 1fr 1.4fr 52px 44px 68px 68px 28px" }}>
                            <div className="px-1 py-2 text-center">#</div>
                            <div className="px-1 py-2">المنتج</div>
                            <div className="px-1 py-2">الوصف</div>
                            <div className="px-1 py-2 text-center">الكمية</div>
                            <div className="px-1 py-2 text-center">وحدة</div>
                            <div className="px-1 py-2 text-center">السعر</div>
                            <div className="px-1 py-2 text-center">الإجمالي</div>
                            <div className="px-1 py-2"></div>
                          </div>

                          {/* صفوف البنود */}
                          {invItems.map((item, idx) => {
                            const isLast = idx === invItems.length - 1;
                            const isEmpty = item.description.trim() === "" && item.unitPrice === 0 && item.productId === "";
                            const isNewRow = isLast && isEmpty;
                            return (
                              <div key={idx}
                                className={`grid items-center border-t transition-all ${isNewRow
                                  ? "bg-blue-50/60 border-blue-100"
                                  : idx % 2 === 0 ? "bg-white border-gray-100" : "bg-gray-50/60 border-gray-100"
                                }`}
                                style={{ gridTemplateColumns: "28px 1fr 1.4fr 52px 44px 68px 68px 28px" }}>

                                <div className="flex items-center justify-center py-1.5">
                                  {isNewRow
                                    ? <span className="text-blue-300 text-[10px]">✦</span>
                                    : <span className="text-[10px] font-bold text-blue-700 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center">{idx + 1}</span>
                                  }
                                </div>

                                <div className="py-1 pl-1">
                                  <select
                                    value={item.productId}
                                    onChange={(e) => updateItem(idx, "productId", e.target.value)}
                                    className={`w-full text-[11px] outline-none bg-transparent border-b py-0.5 transition-colors cursor-pointer
                                      ${isNewRow ? "border-dashed border-blue-200 text-blue-400" : "border-gray-200 text-gray-800 hover:border-blue-400 focus:border-blue-500"}`}>
                                    <option value="">{isNewRow ? "اختر..." : "—"}</option>
                                    {store.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                </div>

                                <div className="py-1 pl-1">
                                  <input
                                    value={item.description}
                                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                                    placeholder={isNewRow ? "اكتب وصفاً..." : ""}
                                    className={`w-full text-[11px] outline-none bg-transparent border-b py-0.5 transition-colors
                                      ${isNewRow ? "border-dashed border-blue-200 placeholder:text-blue-300" : "border-gray-200 text-gray-800 hover:border-blue-400 focus:border-blue-500"}`}
                                  />
                                </div>

                                <div className="py-1 px-1">
                                  <input
                                    type="number" min={1} value={item.quantity}
                                    onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                                    className={`w-full text-[11px] text-center outline-none bg-transparent border-b py-0.5 transition-colors
                                      ${isNewRow ? "border-dashed border-blue-200 text-blue-300" : "border-gray-200 text-gray-800 hover:border-blue-400 focus:border-blue-500"}`}
                                  />
                                </div>

                                <div className="py-1 px-0.5">
                                  <input
                                    value={item.unit}
                                    onChange={(e) => updateItem(idx, "unit", e.target.value)}
                                    className={`w-full text-[11px] text-center outline-none bg-transparent border-b py-0.5 transition-colors
                                      ${isNewRow ? "border-dashed border-blue-200 text-blue-300" : "border-gray-200 text-gray-700 hover:border-blue-400 focus:border-blue-500"}`}
                                  />
                                </div>

                                <div className="py-1 px-1">
                                  <input
                                    type="number" min={0} value={item.unitPrice}
                                    onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                                    className={`w-full text-[11px] text-center outline-none bg-transparent border-b py-0.5 transition-colors
                                      ${isNewRow ? "border-dashed border-blue-200 text-blue-300" : "border-gray-200 text-gray-800 hover:border-blue-400 focus:border-blue-500"}`}
                                  />
                                </div>

                                <div className="py-1 px-1 text-center">
                                  {isNewRow
                                    ? <span className="text-blue-200 text-[10px]">—</span>
                                    : <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded-md">{formatAmount(item.total)}</span>
                                  }
                                </div>

                                <div className="flex items-center justify-center py-1">
                                  {!isNewRow && (
                                    <button
                                      onClick={() => setInvItems((p) => p.filter((_, i) => i !== idx))}
                                      className="w-4 h-4 rounded-full bg-red-100 text-red-400 hover:bg-red-500 hover:text-white text-[9px] font-bold flex items-center justify-center transition">
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* صف الإجمالي */}
                          <div className="bg-blue-900 text-white flex justify-between items-center px-4 py-2 border-t-2 border-blue-700">
                            <span className="text-[11px] font-bold uppercase tracking-wide">Total HT</span>
                            <span className="text-sm font-black">{formatAmount(calcTotals(invItems))} دج</span>
                          </div>
                        </div>
                      </div>

                      {/* الدفع */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase">الدفع المسبق (دج)</label>
                          <input type="number" min={0} value={invPaid} onChange={(e) => setInvPaid(Number(e.target.value))}
                            className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm outline-none bg-white transition" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase">طريقة الدفع</label>
                          <select value={invPayMode} onChange={(e) => setInvPayMode(e.target.value)}
                            className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm outline-none bg-white transition">
                            <option>À TERME</option>
                            <option>ESPÈCES</option>
                            <option>VIREMENT</option>
                            <option>CHÈQUE</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase">ملاحظات</label>
                          <input value={invNotes} onChange={(e) => setInvNotes(e.target.value)}
                            className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm outline-none bg-white transition"
                            placeholder="ملاحظات إضافية..." />
                        </div>
                      </div>

                      {/* أزرار الهاتف */}
                      <div className="flex gap-2 lg:hidden pt-1 border-t">
                        <button onClick={() => setShowInvoiceForm(false)}
                          className="flex-1 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm">إلغاء</button>
                        <button onClick={() => handleSaveInvoice(false)}
                          className="flex-1 px-3 py-2 rounded-xl bg-green-600 text-white font-medium shadow text-sm">💾 حفظ</button>
                        <button onClick={() => handleSaveInvoice(true)}
                          className="flex-1 px-3 py-2 rounded-xl bg-blue-600 text-white font-medium shadow text-sm">🖨️ طباعة</button>
                      </div>
                    </div>

                    {/* ════ RIGHT: Live Invoice Preview ════ */}
                    <div className="hidden lg:flex flex-1 overflow-y-auto bg-gray-200 p-6 items-start justify-center">
                      <div className="w-full">
                        <div className="text-center mb-3">
                          <span className="bg-blue-900 text-white text-xs px-4 py-1.5 rounded-full font-medium">
                            👁️ معاينة حية للفاتورة
                          </span>
                        </div>
                        <InvoicePaper
                          invoice={{
                            number: invNumber,
                            date: invDate,
                            items: validItems(invItems),
                            totalHT: calcTotals(validItems(invItems)),
                            paid: invPaid,
                            paymentMode: invPayMode,
                            notes: invNotes,
                          }}
                          client={selClient}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ CLIENTS ══════════════════ */}
          {tab === "clients" && (
            <div className="p-4 md:p-8">
              <div className="flex justify-between items-center mb-5">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">الزبائن</h1>
                <button onClick={() => openClientForm()}
                  className="bg-blue-600 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-medium hover:bg-blue-700 shadow text-sm">
                  + زبون جديد
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {store.clients.map((client) => {
                  const debt = store.getClientDebt(client.id);
                  const clientInvoices = store.invoices.filter((i) => i.clientId === client.id);
                  return (
                    <div key={client.id} className="bg-white rounded-2xl shadow p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-800 text-sm truncate">{client.name}</h3>
                          <p className="text-gray-500 text-xs">{client.type} | {client.wilaya}</p>
                        </div>
                        <div className="text-right mr-2 shrink-0">
                          <div className={`text-base font-bold ${debt > 0 ? "text-red-600" : "text-green-600"}`}>{formatAmount(debt)} دج</div>
                          <div className="text-xs text-gray-400">{debt > 0 ? "دين" : "لا دين"}</div>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-400 mb-3 flex-wrap">
                        {client.phone && <span>📞 {client.phone}</span>}
                        {client.rc && <span>RC: {client.rc}</span>}
                        <span>📄 {clientInvoices.length} فاتورة</span>
                      </div>
                      <div className="flex gap-2 border-t pt-3 flex-wrap">
                        <button onClick={() => openClientForm(client)} className="text-blue-500 text-xs hover:underline">✏️ تعديل</button>
                        <button onClick={() => deleteClient(client.id)} className="text-red-400 text-xs hover:underline">🗑️ حذف</button>
                        <button onClick={() => { setPayClientId(client.id); setShowPayForm(true); }} className="text-green-600 text-xs hover:underline mr-auto">💳 تسجيل دفعة</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {showClientForm && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-3 py-4 overflow-auto">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5">
                    <h2 className="text-lg font-bold mb-4 border-b pb-3">{editClient ? "✏️ تعديل الزبون" : "➕ زبون جديد"}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: "الاسم", val: cName, set: setCName, col: 2 },
                        { label: "النوع", val: cType, set: setCType, col: 1 },
                        { label: "الولاية", val: cWilaya, set: setCWilaya, col: 1 },
                        { label: "رقم السجل التجاري", val: cRC, set: setCRC, col: 2 },
                        { label: "رقم التعريف الجبائي", val: cNIF, set: setCNIF, col: 1 },
                        { label: "رقم ART", val: cART, set: setCART, col: 1 },
                        { label: "الهاتف", val: cPhone, set: setCPhone, col: 2 },
                      ].map((f) => (
                        <div key={f.label} className={f.col === 2 ? "sm:col-span-2" : ""}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                          <input value={f.val} onChange={(e) => f.set(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 justify-end mt-4">
                      <button onClick={() => setShowClientForm(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm">إلغاء</button>
                      <button onClick={submitClient} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow text-sm">💾 حفظ</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ INVENTORY ══════════════════ */}
          {tab === "inventory" && (
            <div className="p-4 md:p-8">
              <div className="flex justify-between items-center mb-5">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">المخزون</h1>
                <button onClick={() => openProductForm()} className="bg-blue-600 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-medium hover:bg-blue-700 shadow text-sm">+ منتج جديد</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {store.products.map((prod) => (
                  <div key={prod.id} className={`bg-white rounded-2xl shadow p-4 border-r-4 ${prod.stock < 20 ? "border-red-400" : prod.stock < 50 ? "border-yellow-400" : "border-green-400"}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-sm">{prod.name}</h3>
                        {prod.nameAr && <p className="text-gray-500 text-xs">{prod.nameAr}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 mr-2 ${prod.stock < 20 ? "bg-red-100 text-red-700" : prod.stock < 50 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                        {prod.stock < 20 ? "⚠️ منخفض" : prod.stock < 50 ? "متوسط" : "✅ كافٍ"}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600 mb-3">
                      <div className="flex justify-between"><span>المخزون:</span><span className="font-bold text-gray-800">{prod.stock} {prod.unit}</span></div>
                      <div className="flex justify-between"><span>السعر:</span><span className="font-bold text-blue-700">{formatAmount(prod.price)} دج</span></div>
                      <div className="flex justify-between"><span>قيمة المخزون:</span><span className="font-bold text-green-700">{formatAmount(prod.stock * prod.price)} دج</span></div>
                    </div>
                    <div className="flex gap-2 border-t pt-2">
                      <button onClick={() => openProductForm(prod)} className="text-blue-500 text-xs hover:underline">✏️ تعديل</button>
                      <button onClick={() => deleteProduct(prod.id)} className="text-red-400 text-xs hover:underline">🗑️ حذف</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl shadow p-4 md:p-5">
                <h2 className="font-bold text-gray-700 mb-3 text-sm">ملخص المخزون</h2>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 rounded-xl p-3"><div className="text-xl font-bold text-blue-700">{store.products.length}</div><div className="text-xs text-gray-500">عدد المنتجات</div></div>
                  <div className="bg-green-50 rounded-xl p-3"><div className="text-sm md:text-xl font-bold text-green-700">{formatAmount(store.products.reduce((s, p) => s + p.stock * p.price, 0))}</div><div className="text-xs text-gray-500">القيمة الإجمالية (دج)</div></div>
                  <div className="bg-red-50 rounded-xl p-3"><div className="text-xl font-bold text-red-700">{store.products.filter((p) => p.stock < 20).length}</div><div className="text-xs text-gray-500">تحتاج تجديد</div></div>
                </div>
              </div>
              {showProductForm && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-3 py-4 overflow-auto">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
                    <h2 className="text-lg font-bold mb-4 border-b pb-3">{editProduct ? "✏️ تعديل المنتج" : "➕ منتج جديد"}</h2>
                    <div className="space-y-3">
                      {[
                        { label: "الاسم (FR)", val: pName, set: setPName, type: "text" },
                        { label: "الاسم (AR)", val: pNameAr, set: setPNameAr, type: "text" },
                        { label: "الوحدة", val: pUnit, set: setPUnit, type: "text" },
                        { label: "السعر (دج)", val: pPrice, set: (v: string) => setPPrice(Number(v)), type: "number" },
                        { label: "الكمية في المخزون", val: pStock, set: (v: string) => setPStock(Number(v)), type: "number" },
                      ].map((f) => (
                        <div key={f.label}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                          <input type={f.type} value={f.val} onChange={(e) => f.set(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" min={0} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 justify-end mt-4">
                      <button onClick={() => setShowProductForm(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm">إلغاء</button>
                      <button onClick={submitProduct} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow text-sm">💾 حفظ</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ DEBTS ══════════════════ */}
          {tab === "debts" && (
            <div className="p-4 md:p-8">
              <div className="flex justify-between items-center mb-5">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">ديون الزبائن</h1>
                <button onClick={() => { setPayClientId(store.clients[0]?.id || ""); setShowPayForm(true); }}
                  className="bg-green-600 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-medium hover:bg-green-700 shadow text-sm">
                  + دفعة
                </button>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-center gap-4">
                <div className="text-3xl">⚠️</div>
                <div>
                  <div className="text-xl font-bold text-red-700">{formatAmount(totalDebt)} دج</div>
                  <div className="text-red-500 text-sm">إجمالي الديون على {store.clients.filter((c) => store.getClientDebt(c.id) > 0).length} زبون</div>
                </div>
              </div>
              <div className="space-y-4">
                {store.clients.map((client) => {
                  const debt = store.getClientDebt(client.id);
                  const clientInvoices = store.invoices.filter((i) => i.clientId === client.id);
                  const clientPayments = store.payments.filter((p) => p.clientId === client.id);
                  return (
                    <div key={client.id} className="bg-white rounded-2xl shadow p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div><h3 className="font-bold text-gray-800 text-sm">{client.name}</h3><p className="text-gray-400 text-xs">{client.wilaya}</p></div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${debt > 0 ? "text-red-600" : "text-green-600"}`}>{formatAmount(debt)} دج</div>
                          {debt > 0 && (
                            <button onClick={() => { setPayClientId(client.id); setShowPayForm(true); }}
                              className="mt-1 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full hover:bg-green-600">💳 دفع</button>
                          )}
                        </div>
                      </div>
                      {clientInvoices.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-xs font-semibold text-gray-500 mb-2">الفواتير:</p>
                          <div className="space-y-1">
                            {clientInvoices.map((inv) => {
                              const rem = inv.totalHT - inv.paid;
                              return (
                                <div key={inv.id} className="flex justify-between text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg flex-wrap gap-1">
                                  <span>#{inv.number} — {inv.date}</span>
                                  <span>{formatAmount(inv.totalHT)} دج {rem > 0 && <span className="text-red-500 mr-1">/ {formatAmount(rem)} دج</span>}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {clientPayments.length > 0 && (
                        <div className="border-t pt-3 mt-2">
                          <p className="text-xs font-semibold text-gray-500 mb-2">الدفعات:</p>
                          <div className="space-y-1">
                            {clientPayments.map((pay) => (
                              <div key={pay.id} className="flex justify-between text-xs text-gray-600 bg-green-50 px-3 py-1.5 rounded-lg flex-wrap gap-1">
                                <span>{pay.date} {pay.note && `— ${pay.note}`}</span>
                                <span className="text-green-600 font-bold">+{formatAmount(pay.amount)} دج</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {showPayForm && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-3 py-4 overflow-auto">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
                    <h2 className="text-lg font-bold mb-4 border-b pb-3">💳 تسجيل دفعة</h2>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">الزبون</label>
                        <select value={payClientId} onChange={(e) => setPayClientId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                          {store.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">المبلغ (دج)</label>
                        <input type="number" min={0} value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">التاريخ</label>
                        <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">ملاحظة</label>
                        <input value={payNote} onChange={(e) => setPayNote(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="تفصيل الدفعة..." />
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-4">
                      <button onClick={() => setShowPayForm(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm">إلغاء</button>
                      <button onClick={submitPayment} className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 shadow text-sm">💾 حفظ</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ─── Bottom Mobile Navigation ─── */}
      <nav className="md:hidden bg-white border-t border-gray-200 flex justify-around items-center py-2 sticky bottom-0 z-20 shadow-lg">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => handleNav(item.id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${tab === item.id ? "text-blue-600" : "text-gray-400"}`}>
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Print / PDF Modal */}
      {printInvoice && (
        <InvoicePrint
          invoice={printInvoice}
          client={store.clients.find((c) => c.id === printInvoice.clientId)}
          onClose={() => setPrintInvoice(null)}
        />
      )}
    </div>
  );
}
