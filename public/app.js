/* ══════════════════════════════════════════════════════════
   نظام إدارة الفواتير والمخزون - Pure JavaScript + PWA
   ══════════════════════════════════════════════════════════ */

// ─── Storage ───
const DB = {
  get: (k, d) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
const KEYS = { clients: 'inv_clients', invoices: 'inv_invoices', payments: 'inv_payments', products: 'inv_products' };

// ─── Defaults ───
const DEF_PRODUCTS = [
  { id: 'p1', name: 'Bessat 2 pièces', nameAr: 'بساط زوج', unit: 'u', price: 800, stock: 200 },
  { id: 'p2', name: 'Couette', nameAr: 'كوات', unit: 'u', price: 650, stock: 150 },
  { id: 'p3', name: 'Ridou', nameAr: 'رديو', unit: 'u', price: 800, stock: 100 },
  { id: 'p4', name: 'Tefricha', nameAr: 'تفريشة', unit: 'u', price: 400, stock: 300 },
];
const DEF_CLIENTS = [
  { id: 'c1', name: 'OULD BOUZIDI LAID', type: 'Commerçant', wilaya: 'W DE MEDEA', rc: '26/00 1760198 D 17', nif: '79926189003603', art: '26230062030', phone: '', totalDebt: 0 },
];

// ─── State ───
const S = {
  clients: DB.get(KEYS.clients, DEF_CLIENTS),
  invoices: DB.get(KEYS.invoices, []),
  payments: DB.get(KEYS.payments, []),
  products: DB.get(KEYS.products, DEF_PRODUCTS),
  tab: 'dashboard',
  sidebarOpen: false,
  // invoice form
  showInvForm: false, editInvId: null,
  invNum: '', invDate: today(), invClientId: '', invItems: [emptyItem()],
  invPaid: 0, invPayMode: 'À TERME', invNotes: '',
  // client form
  showClientForm: false, editClientId: null,
  // product form
  showProdForm: false, editProdId: null,
  // payment form
  showPayForm: false, payClientId: '',
  // print
  showPrint: false, printInvId: null,
};

function persist() {
  DB.set(KEYS.clients, S.clients);
  DB.set(KEYS.invoices, S.invoices);
  DB.set(KEYS.payments, S.payments);
  DB.set(KEYS.products, S.products);
}

// ─── Utils ───
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function today() { return new Date().toISOString().slice(0, 10); }
function emptyItem() { return { productId: '', description: '', quantity: 1, unit: 'u', unitPrice: 0, total: 0 }; }
function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function nextInvNum() {
  return String(S.invoices.length + 1).padStart(2, '0') + '/' + new Date().getFullYear();
}

// ─── Number to Words French ───
function numWords(n) {
  const ones = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
  const tens = ['','dix','vingt','trente','quarante','cinquante','soixante','soixante-dix','quatre-vingt','quatre-vingt-dix'];
  if (n === 0) return 'zéro';
  let r = '';
  if (n >= 1000000) { r += numWords(Math.floor(n / 1000000)) + ' million '; n %= 1000000; }
  if (n >= 1000) { const t = Math.floor(n / 1000); r += (t === 1 ? '' : numWords(t) + ' ') + 'mille '; n %= 1000; }
  if (n >= 100) { const h = Math.floor(n / 100); r += (h === 1 ? 'cent' : numWords(h) + ' cent') + ' '; n %= 100; }
  if (n >= 20) {
    const t = Math.floor(n / 10), o = n % 10;
    if (t === 7 || t === 9) r += tens[t - 1] + (o === 1 && t === 7 ? ' et ' : '-') + ones[10 + o] + ' ';
    else if (t === 8) r += 'quatre-vingt' + (o > 0 ? '-' + ones[o] : 's') + ' ';
    else r += tens[t] + (o === 1 ? ' et ' : o > 0 ? '-' : '') + (o > 0 ? ones[o] : '') + ' ';
  } else if (n > 0) r += ones[n] + ' ';
  return r.trim();
}
function amtWords(n) { const w = numWords(Math.floor(n)); return w.charAt(0).toUpperCase() + w.slice(1) + ' dinar(s) algérien(s)'; }

// ─── Computed ───
function clientDebt(cid) {
  const inv = S.invoices.filter(i => i.clientId === cid).reduce((s, i) => s + i.totalHT - i.paid, 0);
  const paid = S.payments.filter(p => p.clientId === cid && !p.invoiceId).reduce((s, p) => s + p.amount, 0);
  return Math.max(0, inv - paid);
}
function calcTotal(items) { return items.reduce((s, it) => s + (it.total || 0), 0); }
function validItems(items) { return items.filter(it => it.description.trim() !== '' || it.unitPrice > 0 || it.productId !== ''); }

// ══════════════════════════════════════════════════════════
//  RENDER ENGINE
// ══════════════════════════════════════════════════════════
function render() {
  document.getElementById('app').innerHTML = buildShell();
}

function buildShell() {
  const totalRev = S.invoices.reduce((s, i) => s + i.totalHT, 0);
  const totalDebt = S.clients.reduce((s, c) => s + clientDebt(c.id), 0);
  const totalColl = S.invoices.reduce((s, i) => s + i.paid, 0) + S.payments.filter(p => !p.invoiceId).reduce((s, p) => s + p.amount, 0);

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
    { id: 'invoices', label: 'الفواتير', icon: '🧾' },
    { id: 'clients', label: 'الزبائن', icon: '👥' },
    { id: 'inventory', label: 'المخزون', icon: '📦' },
    { id: 'debts', label: 'الديون', icon: '💰' },
  ];

  return `
<div class="app-shell" dir="rtl">

  <!-- Mobile Header -->
  <header class="mob-hdr">
    <button class="hamburger ${S.sidebarOpen ? 'open' : ''}" onclick="toggleSidebar()">
      <span></span><span></span><span></span>
    </button>
    <div class="mob-title">🏭 نظام الفواتير<div class="mob-sub">حرفي صانع أفرشة الأسرة</div></div>
    <div style="width:36px"></div>
  </header>

  ${S.sidebarOpen ? '<div class="overlay" onclick="toggleSidebar()"></div>' : ''}

  <div class="layout">

    <!-- Sidebar -->
    <aside class="sidebar ${S.sidebarOpen ? 'open' : ''}">
      <div class="sb-brand">
        <div class="sb-icon">🏭</div>
        <div>
          <div class="sb-title">نظام الفواتير</div>
          <div class="sb-sub">حرفي صانع أفرشة الأسرة</div>
        </div>
      </div>
      <nav class="sb-nav">
        ${navItems.map(n => `
          <button class="nav-item ${S.tab === n.id ? 'active' : ''}" onclick="setTab('${n.id}')">
            <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
          </button>
        `).join('')}
      </nav>
      <div class="sb-footer"><div class="mf-txt">MF N°: 185261800357101</div></div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      ${S.tab === 'dashboard' ? pageDashboard(totalRev, totalDebt, totalColl) : ''}
      ${S.tab === 'invoices'  ? pageInvoices() : ''}
      ${S.tab === 'clients'   ? pageClients() : ''}
      ${S.tab === 'inventory' ? pageInventory() : ''}
      ${S.tab === 'debts'     ? pageDebts(totalDebt) : ''}
    </main>
  </div>

  <!-- Bottom Nav -->
  <nav class="bot-nav">
    ${navItems.map(n => `
      <button class="bn-item ${S.tab === n.id ? 'active' : ''}" onclick="setTab('${n.id}')">
        <span>${n.icon}</span><span>${n.label}</span>
      </button>
    `).join('')}
  </nav>

  <!-- Modals -->
  ${S.showInvForm ? modalInvoiceForm() : ''}
  ${S.showClientForm ? modalClientForm() : ''}
  ${S.showProdForm ? modalProductForm() : ''}
  ${S.showPayForm ? modalPayForm() : ''}
  ${S.showPrint && S.printInvId ? modalPrint() : ''}
</div>`;
}

// ══════════════════════════════════════════════════════════
//  PAGES
// ══════════════════════════════════════════════════════════

function pageDashboard(totalRev, totalDebt, totalColl) {
  return `
<div class="page">
  <h1 class="page-title">لوحة التحكم</h1>
  <div class="stats-grid">
    ${[
      { lbl: 'إجمالي الفواتير', val: S.invoices.length, unit: 'فاتورة', color: '#3b82f6', icon: '🧾' },
      { lbl: 'إجمالي المبيعات', val: fmt(totalRev), unit: 'دج', color: '#10b981', icon: '💵' },
      { lbl: 'إجمالي الديون', val: fmt(totalDebt), unit: 'دج', color: '#ef4444', icon: '⚠️' },
      { lbl: 'المبالغ المحصلة', val: fmt(totalColl), unit: 'دج', color: '#8b5cf6', icon: '✅' },
    ].map(c => `
      <div class="stat-card" style="background:${c.color}">
        <div class="stat-icon">${c.icon}</div>
        <div class="stat-value">${c.val}</div>
        <div class="stat-unit">${c.unit}</div>
        <div class="stat-label">${c.lbl}</div>
      </div>
    `).join('')}
  </div>
  <div class="card">
    <h2 class="card-title">آخر الفواتير</h2>
    ${S.invoices.length === 0 ? '<p class="empty-msg">لا توجد فواتير بعد</p>' : `
    <div class="tbl-wrap">
      <table class="data-tbl">
        <thead><tr><th>رقم</th><th>التاريخ</th><th>الزبون</th><th>المبلغ</th><th>الحالة</th></tr></thead>
        <tbody>
          ${S.invoices.slice(-5).reverse().map(inv => {
            const cl = S.clients.find(c => c.id === inv.clientId);
            const rem = inv.totalHT - inv.paid;
            return `<tr>
              <td><span class="inv-num">${esc(inv.number)}</span></td>
              <td>${esc(inv.date)}</td>
              <td>${esc(cl?.name || '—')}</td>
              <td><strong style="color:#10b981">${fmt(inv.totalHT)} دج</strong></td>
              <td><span class="badge ${rem <= 0 ? 'badge-green' : 'badge-red'}">${rem <= 0 ? 'مدفوعة' : fmt(rem) + ' دج'}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`}
  </div>
</div>`;
}

function pageInvoices() {
  return `
<div class="page">
  <div class="page-hdr">
    <h1 class="page-title">الفواتير</h1>
    <button class="btn btn-primary" onclick="openNewInv()">+ فاتورة جديدة</button>
  </div>
  ${S.invoices.length === 0
    ? '<div class="empty-card"><div style="font-size:48px;margin-bottom:12px">🧾</div><p>لا توجد فواتير. أنشئ فاتورتك الأولى!</p></div>'
    : `
  <!-- Mobile -->
  <div class="mob-cards">
    ${S.invoices.slice().reverse().map(inv => {
      const cl = S.clients.find(c => c.id === inv.clientId);
      const rem = inv.totalHT - inv.paid;
      return `
      <div class="inv-card">
        <div class="inv-card-top">
          <span class="inv-num">#${esc(inv.number)}</span>
          <span class="badge ${rem <= 0 ? 'badge-green' : 'badge-red'}">${rem <= 0 ? 'مدفوعة' : 'متبقي: ' + fmt(rem) + ' دج'}</span>
        </div>
        <div class="inv-card-client">${esc(cl?.name || '—')}</div>
        <div class="inv-card-date">${esc(inv.date)}</div>
        <div class="inv-card-bottom">
          <strong style="color:#10b981">${fmt(inv.totalHT)} دج</strong>
          <div class="act-btns">
            <button class="icon-btn" onclick="openEditInv('${inv.id}')" title="تعديل">✏️</button>
            <button class="icon-btn" onclick="openPrint('${inv.id}')" title="طباعة">🖨️</button>
            <button class="icon-btn" onclick="deleteInv('${inv.id}')" title="حذف">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>
  <!-- Desktop -->
  <div class="card dsk-only">
    <div class="tbl-wrap">
      <table class="data-tbl">
        <thead><tr>
          <th>رقم الفاتورة</th><th>التاريخ</th><th>الزبون</th>
          <th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th>
          <th>طريقة الدفع</th><th>إجراءات</th>
        </tr></thead>
        <tbody>
          ${S.invoices.slice().reverse().map(inv => {
            const cl = S.clients.find(c => c.id === inv.clientId);
            const rem = inv.totalHT - inv.paid;
            return `<tr>
              <td><span class="inv-num">${esc(inv.number)}</span></td>
              <td>${esc(inv.date)}</td>
              <td>${esc(cl?.name || '—')}</td>
              <td><strong style="color:#10b981">${fmt(inv.totalHT)} دج</strong></td>
              <td style="color:#3b82f6">${fmt(inv.paid)} دج</td>
              <td><span class="badge ${rem <= 0 ? 'badge-green' : 'badge-red'}">${fmt(rem)} دج</span></td>
              <td style="color:#6b7280;font-size:12px">${esc(inv.paymentMode)}</td>
              <td>
                <div class="act-btns">
                  <button class="icon-btn" onclick="openEditInv('${inv.id}')">✏️</button>
                  <button class="icon-btn" onclick="openPrint('${inv.id}')">🖨️</button>
                  <button class="icon-btn" onclick="deleteInv('${inv.id}')">🗑️</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`}
</div>`;
}

function pageClients() {
  return `
<div class="page">
  <div class="page-hdr">
    <h1 class="page-title">الزبائن</h1>
    <button class="btn btn-primary" onclick="openClientForm(null)">+ زبون جديد</button>
  </div>
  <div class="cards-grid">
    ${S.clients.map(cl => {
      const debt = clientDebt(cl.id);
      const cnt = S.invoices.filter(i => i.clientId === cl.id).length;
      return `
      <div class="client-card">
        <div class="cc-top">
          <div>
            <div class="cc-name">${esc(cl.name)}</div>
            <div class="cc-sub">${esc(cl.type)} | ${esc(cl.wilaya)}</div>
          </div>
          <div class="cc-debt ${debt > 0 ? 'c-debt-red' : 'c-debt-green'}">${fmt(debt)} دج</div>
        </div>
        <div class="cc-meta">
          ${cl.phone ? `<span>📞 ${esc(cl.phone)}</span>` : ''}
          ${cl.rc ? `<span>RC: ${esc(cl.rc)}</span>` : ''}
          <span>📄 ${cnt} فاتورة</span>
        </div>
        <div class="cc-actions">
          <button class="lnk-btn blue" onclick="openClientForm('${cl.id}')">✏️ تعديل</button>
          <button class="lnk-btn red" onclick="deleteClient('${cl.id}')">🗑️ حذف</button>
          <button class="lnk-btn green" onclick="openPayForm('${cl.id}')">💳 دفعة</button>
        </div>
      </div>`;
    }).join('')}
  </div>
</div>`;
}

function pageInventory() {
  return `
<div class="page">
  <div class="page-hdr">
    <h1 class="page-title">المخزون</h1>
    <button class="btn btn-primary" onclick="openProdForm(null)">+ منتج جديد</button>
  </div>
  <div class="cards-grid">
    ${S.products.map(p => {
      const lvl = p.stock < 20 ? 'low' : p.stock < 50 ? 'mid' : 'ok';
      return `
      <div class="prod-card lvl-${lvl}">
        <div class="pc-top">
          <div>
            <div class="pc-name">${esc(p.name)}</div>
            ${p.nameAr ? `<div class="pc-name-ar">${esc(p.nameAr)}</div>` : ''}
          </div>
          <span class="stk-badge ${lvl}">${lvl === 'low' ? '⚠️ منخفض' : lvl === 'mid' ? 'متوسط' : '✅ كافٍ'}</span>
        </div>
        <div class="pc-stats">
          <div class="pc-stat"><span>المخزون:</span><strong>${p.stock} ${esc(p.unit)}</strong></div>
          <div class="pc-stat"><span>السعر:</span><strong style="color:#3b82f6">${fmt(p.price)} دج</strong></div>
          <div class="pc-stat"><span>القيمة:</span><strong style="color:#10b981">${fmt(p.stock * p.price)} دج</strong></div>
        </div>
        <div class="pc-actions">
          <button class="lnk-btn blue" onclick="openProdForm('${p.id}')">✏️ تعديل</button>
          <button class="lnk-btn red" onclick="deleteProd('${p.id}')">🗑️ حذف</button>
        </div>
      </div>`;
    }).join('')}
  </div>
  <div class="card" style="margin-top:16px">
    <h2 class="card-title">ملخص المخزون</h2>
    <div class="sum-grid">
      <div class="sum-card blue"><div class="sum-val">${S.products.length}</div><div class="sum-lbl">عدد المنتجات</div></div>
      <div class="sum-card green"><div class="sum-val">${fmt(S.products.reduce((s, p) => s + p.stock * p.price, 0))}</div><div class="sum-lbl">القيمة الإجمالية (دج)</div></div>
      <div class="sum-card red"><div class="sum-val">${S.products.filter(p => p.stock < 20).length}</div><div class="sum-lbl">تحتاج تجديد</div></div>
    </div>
  </div>
</div>`;
}

function pageDebts(totalDebt) {
  return `
<div class="page">
  <div class="page-hdr">
    <h1 class="page-title">ديون الزبائن</h1>
    <button class="btn btn-success" onclick="openPayForm(null)">+ دفعة</button>
  </div>
  <div class="debt-sum">
    <div style="font-size:28px">⚠️</div>
    <div>
      <div class="debt-total">${fmt(totalDebt)} دج</div>
      <div class="debt-sub">إجمالي الديون على ${S.clients.filter(c => clientDebt(c.id) > 0).length} زبون</div>
    </div>
  </div>
  <div class="debt-list">
    ${S.clients.map(cl => {
      const debt = clientDebt(cl.id);
      const clInvs = S.invoices.filter(i => i.clientId === cl.id);
      const clPays = S.payments.filter(p => p.clientId === cl.id);
      return `
      <div class="debt-card">
        <div class="dc-top">
          <div><div class="dc-name">${esc(cl.name)}</div><div class="dc-wilaya">${esc(cl.wilaya)}</div></div>
          <div style="text-align:right">
            <div class="dc-amount ${debt > 0 ? 'c-debt-red' : 'c-debt-green'}">${fmt(debt)} دج</div>
            ${debt > 0 ? `<button class="pay-sm-btn" onclick="openPayForm('${cl.id}')">💳 دفع</button>` : ''}
          </div>
        </div>
        ${clInvs.length > 0 ? `
          <div class="debt-detail">
            <p class="dt-title">الفواتير:</p>
            ${clInvs.map(inv => {
              const rem = inv.totalHT - inv.paid;
              return `<div class="dt-row">
                <span>#${esc(inv.number)} — ${esc(inv.date)}</span>
                <span>${fmt(inv.totalHT)} دج ${rem > 0 ? `<span style="color:#ef4444"> / ${fmt(rem)} دج</span>` : ''}</span>
              </div>`;
            }).join('')}
          </div>` : ''}
        ${clPays.length > 0 ? `
          <div class="debt-detail">
            <p class="dt-title">الدفعات:</p>
            ${clPays.map(p => `
              <div class="dt-row green">
                <span>${esc(p.date)}${p.note ? ' — ' + esc(p.note) : ''}</span>
                <span>+${fmt(p.amount)} دج</span>
              </div>
            `).join('')}
          </div>` : ''}
      </div>`;
    }).join('')}
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════
//  MODALS
// ══════════════════════════════════════════════════════════

function modalInvoiceForm() {
  const selClient = S.clients.find(c => c.id === S.invClientId);
  const valid = validItems(S.invItems);
  const total = calcTotal(valid);

  return `
<div class="modal-fs">
  <!-- Top Bar -->
  <div class="fs-topbar">
    <div>
      <span class="fs-tb-title">${S.editInvId ? '✏️ تعديل الفاتورة' : '➕ فاتورة جديدة'}</span>
      <span class="fs-tb-sub">• المعاينة تتحدث تلقائياً</span>
    </div>
    <div class="fs-tb-actions">
      <button class="btn btn-success btn-sm" onclick="saveInv(false)">💾 حفظ</button>
      <button class="btn btn-info btn-sm" onclick="saveInv(true)">🖨️ حفظ وطباعة</button>
      <button class="btn-close" onclick="closeInvForm()">✕</button>
    </div>
  </div>

  <!-- Split -->
  <div class="form-split">

    <!-- LEFT: Inputs -->
    <div class="form-panel">

      <!-- رقم + تاريخ -->
      <div class="form-r2">
        <div class="form-grp">
          <label class="form-lbl">رقم الفاتورة</label>
          <input class="form-inp" id="fi-num" value="${esc(S.invNum)}" oninput="S.invNum=this.value;updatePreview()">
        </div>
        <div class="form-grp">
          <label class="form-lbl">التاريخ</label>
          <input type="date" class="form-inp" id="fi-date" value="${esc(S.invDate)}" oninput="S.invDate=this.value;updatePreview()">
        </div>
      </div>

      <!-- الزبون -->
      <div class="form-sec" style="background:#eff6ff;border-radius:14px;padding:12px;border:1px solid #bfdbfe">
        <label class="form-lbl-sec">👤 الزبون</label>
        <select class="form-sel" id="fi-client" onchange="S.invClientId=this.value;updatePreview()">
          ${S.clients.map(c => `<option value="${c.id}" ${c.id === S.invClientId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
        ${selClient ? `
        <div class="ci-grid">
          ${[
            ['Qualité', selClient.type],
            ['Wilaya', selClient.wilaya],
            selClient.rc ? ['RC N°', selClient.rc] : null,
            selClient.nif ? ['IF N°', selClient.nif] : null,
            selClient.art ? ['ART N°', selClient.art] : null,
            selClient.phone ? ['Tél', selClient.phone] : null,
          ].filter(Boolean).map((r, i) => `
            <div class="ci-row ${i % 2 ? 'alt' : ''}">
              <span class="ci-lbl">${r[0]}</span>
              <span class="ci-val">${esc(r[1])}</span>
            </div>
          `).join('')}
        </div>` : ''}
      </div>

      <!-- بنود الفاتورة -->
      <div class="form-sec">
        <div class="sec-hdr">
          <span class="form-lbl-sec">📦 بنود الفاتورة</span>
          <span class="auto-hint">✦ سطر جديد يُضاف تلقائياً</span>
        </div>
        ${buildItemsTable()}
      </div>

      <!-- دفع -->
      <div class="form-r2">
        <div class="form-grp">
          <label class="form-lbl">الدفع المسبق (دج)</label>
          <input type="number" class="form-inp" id="fi-paid" value="${S.invPaid}" min="0" oninput="S.invPaid=Number(this.value);updatePreview()">
        </div>
        <div class="form-grp">
          <label class="form-lbl">طريقة الدفع</label>
          <select class="form-sel" id="fi-mode" onchange="S.invPayMode=this.value;updatePreview()">
            ${['À TERME','ESPÈCES','VIREMENT','CHÈQUE'].map(m => `<option ${m === S.invPayMode ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-grp span-2">
          <label class="form-lbl">ملاحظات</label>
          <input class="form-inp" id="fi-notes" value="${esc(S.invNotes)}" placeholder="ملاحظات إضافية..." oninput="S.invNotes=this.value;updatePreview()">
        </div>
      </div>

      <!-- Mobile Buttons -->
      <div class="form-btns-mob">
        <button class="btn btn-gray" onclick="closeInvForm()">إلغاء</button>
        <button class="btn btn-success" onclick="saveInv(false)">💾 حفظ</button>
        <button class="btn btn-primary" onclick="saveInv(true)">🖨️ طباعة</button>
      </div>
    </div>

    <!-- RIGHT: Live Preview -->
    <div class="preview-panel">
      <div class="preview-badge">👁️ معاينة حية للفاتورة</div>
      <div id="inv-preview">
        ${buildInvPaper({ number: S.invNum, date: S.invDate, items: valid, totalHT: total, paid: S.invPaid, paymentMode: S.invPayMode, notes: S.invNotes }, selClient)}
      </div>
    </div>
  </div>
</div>`;
}

function buildItemsTable() {
  return `
<div class="itms-wrap" id="itms-wrap">
  <div class="itms-hdr">
    <div style="width:24px;flex-shrink:0">#</div>
    <div style="flex:1.2">المنتج</div>
    <div style="flex:1.5">الوصف</div>
    <div style="width:52px;flex-shrink:0">الكمية</div>
    <div style="width:42px;flex-shrink:0">وحدة</div>
    <div style="width:70px;flex-shrink:0">السعر</div>
    <div style="width:68px;flex-shrink:0">الإجمالي</div>
    <div style="width:22px;flex-shrink:0"></div>
  </div>
  ${S.invItems.map((item, idx) => {
    const isLast = idx === S.invItems.length - 1;
    const empty = item.description.trim() === '' && item.unitPrice === 0 && item.productId === '';
    const isNew = isLast && empty;
    return `
    <div class="item-row ${isNew ? 'newrow' : idx % 2 === 0 ? 'even' : 'odd'}">
      <div style="width:24px;flex-shrink:0;text-align:center">
        ${isNew ? '<span style="color:#93c5fd;font-size:10px">✦</span>' : `<span class="row-num">${idx + 1}</span>`}
      </div>
      <div style="flex:1.2;min-width:0">
        <select class="cell-inp ${isNew ? 'cnew' : ''}" onchange="updItem(${idx},'productId',this.value)">
          <option value="">${isNew ? 'اختر...' : '—'}</option>
          ${S.products.map(p => `<option value="${p.id}" ${p.id === item.productId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
      </div>
      <div style="flex:1.5;min-width:0">
        <input class="cell-inp ${isNew ? 'cnew' : ''}" value="${esc(item.description)}"
          placeholder="${isNew ? 'اكتب وصفاً...' : ''}"
          oninput="updItem(${idx},'description',this.value)">
      </div>
      <div style="width:52px;flex-shrink:0">
        <input type="number" class="cell-inp tc ${isNew ? 'cnew' : ''}" value="${item.quantity}" min="1"
          oninput="updItem(${idx},'quantity',Number(this.value))">
      </div>
      <div style="width:42px;flex-shrink:0">
        <input class="cell-inp tc ${isNew ? 'cnew' : ''}" value="${esc(item.unit)}"
          oninput="updItem(${idx},'unit',this.value)">
      </div>
      <div style="width:70px;flex-shrink:0">
        <input type="number" class="cell-inp tc ${isNew ? 'cnew' : ''}" value="${item.unitPrice}" min="0"
          oninput="updItem(${idx},'unitPrice',Number(this.value))">
      </div>
      <div style="width:68px;flex-shrink:0;text-align:center">
        ${isNew ? '<span style="color:#93c5fd;font-size:10px">—</span>' : `<span class="itm-total">${fmt(item.total)}</span>`}
      </div>
      <div style="width:22px;flex-shrink:0;display:flex;align-items:center;justify-content:center">
        ${!isNew ? `<button class="del-row" onclick="removeItem(${idx})">✕</button>` : ''}
      </div>
    </div>`;
  }).join('')}
  <div class="itms-total">
    <span>Total HT</span>
    <span>${fmt(calcTotal(S.invItems))} دج</span>
  </div>
</div>`;
}

function modalClientForm() {
  const ec = S.editClientId ? S.clients.find(c => c.id === S.editClientId) : null;
  const v = ec || { name: '', type: 'Commerçant', wilaya: '', rc: '', nif: '', art: '', phone: '' };
  return `
<div class="modal-overlay" onclick="if(event.target===this)closeClientForm()">
  <div class="modal-box">
    <h2 class="modal-title">${ec ? '✏️ تعديل الزبون' : '➕ زبون جديد'}</h2>
    <div class="form-g2">
      <div class="form-grp span-2"><label class="form-lbl">الاسم</label><input class="form-inp" id="c-name" value="${esc(v.name)}"></div>
      <div class="form-grp"><label class="form-lbl">النوع</label><input class="form-inp" id="c-type" value="${esc(v.type)}"></div>
      <div class="form-grp"><label class="form-lbl">الولاية</label><input class="form-inp" id="c-wilaya" value="${esc(v.wilaya)}"></div>
      <div class="form-grp span-2"><label class="form-lbl">رقم السجل التجاري</label><input class="form-inp" id="c-rc" value="${esc(v.rc || '')}"></div>
      <div class="form-grp"><label class="form-lbl">رقم التعريف الجبائي</label><input class="form-inp" id="c-nif" value="${esc(v.nif || '')}"></div>
      <div class="form-grp"><label class="form-lbl">رقم ART</label><input class="form-inp" id="c-art" value="${esc(v.art || '')}"></div>
      <div class="form-grp span-2"><label class="form-lbl">الهاتف</label><input class="form-inp" id="c-phone" value="${esc(v.phone || '')}"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-gray" onclick="closeClientForm()">إلغاء</button>
      <button class="btn btn-primary" onclick="submitClient()">💾 حفظ</button>
    </div>
  </div>
</div>`;
}

function modalProductForm() {
  const ep = S.editProdId ? S.products.find(p => p.id === S.editProdId) : null;
  const v = ep || { name: '', nameAr: '', unit: 'u', price: 0, stock: 0 };
  return `
<div class="modal-overlay" onclick="if(event.target===this)closeProdForm()">
  <div class="modal-box">
    <h2 class="modal-title">${ep ? '✏️ تعديل المنتج' : '➕ منتج جديد'}</h2>
    <div class="form-stk">
      <div class="form-grp"><label class="form-lbl">الاسم (FR)</label><input class="form-inp" id="p-name" value="${esc(v.name)}"></div>
      <div class="form-grp"><label class="form-lbl">الاسم (AR)</label><input class="form-inp" id="p-name-ar" value="${esc(v.nameAr || '')}"></div>
      <div class="form-grp"><label class="form-lbl">الوحدة</label><input class="form-inp" id="p-unit" value="${esc(v.unit)}"></div>
      <div class="form-grp"><label class="form-lbl">السعر (دج)</label><input type="number" class="form-inp" id="p-price" value="${v.price}" min="0"></div>
      <div class="form-grp"><label class="form-lbl">الكمية في المخزون</label><input type="number" class="form-inp" id="p-stock" value="${v.stock}" min="0"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-gray" onclick="closeProdForm()">إلغاء</button>
      <button class="btn btn-primary" onclick="submitProd()">💾 حفظ</button>
    </div>
  </div>
</div>`;
}

function modalPayForm() {
  return `
<div class="modal-overlay" onclick="if(event.target===this)closePayForm()">
  <div class="modal-box">
    <h2 class="modal-title">💳 تسجيل دفعة</h2>
    <div class="form-stk">
      <div class="form-grp">
        <label class="form-lbl">الزبون</label>
        <select class="form-sel" id="pay-client">
          ${S.clients.map(c => `<option value="${c.id}" ${c.id === S.payClientId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-grp"><label class="form-lbl">المبلغ (دج)</label><input type="number" class="form-inp" id="pay-amount" value="0" min="0"></div>
      <div class="form-grp"><label class="form-lbl">التاريخ</label><input type="date" class="form-inp" id="pay-date" value="${today()}"></div>
      <div class="form-grp"><label class="form-lbl">ملاحظة</label><input class="form-inp" id="pay-note" value="" placeholder="تفصيل الدفعة..."></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-gray" onclick="closePayForm()">إلغاء</button>
      <button class="btn btn-success" onclick="submitPay()">💾 حفظ</button>
    </div>
  </div>
</div>`;
}

function modalPrint() {
  const inv = S.invoices.find(i => i.id === S.printInvId);
  if (!inv) return '';
  const cl = S.clients.find(c => c.id === inv.clientId);
  return `
<div class="print-modal">
  <div class="print-toolbar">
    <button class="btn btn-primary" onclick="window.print()">🖨️ طباعة</button>
    <button class="btn btn-danger" id="pdf-btn" onclick="downloadPDF()">📄 تحميل PDF</button>
    <button class="btn btn-gray" onclick="closePrint()">✕ إغلاق</button>
  </div>
  <div id="print-area">
    ${buildInvPaper(inv, cl)}
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════
//  INVOICE PAPER HTML
// ══════════════════════════════════════════════════════════
function buildInvPaper(inv, client) {
  const items = inv.items || [];
  return `
<div class="inv-paper">

  <!-- SELLER HEADER -->
  <div class="seller-box">
    <div class="seller-content">
      <!-- Logo SVG -->
      <div class="logo-wrap">
        <svg width="88" height="88" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="sbg" cx="38%" cy="28%" r="78%">
              <stop offset="0%" stop-color="#1e40af"/>
              <stop offset="100%" stop-color="#0a1540"/>
            </radialGradient>
            <linearGradient id="sgld" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fef3c7"/>
              <stop offset="40%" stop-color="#f59e0b"/>
              <stop offset="100%" stop-color="#b45309"/>
            </linearGradient>
            <linearGradient id="smat" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#f0f9ff"/>
              <stop offset="100%" stop-color="#bae6fd"/>
            </linearGradient>
            <linearGradient id="spil" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="100%" stop-color="#dbeafe"/>
            </linearGradient>
          </defs>
          <circle cx="48" cy="48" r="47" fill="#0a1540"/>
          <circle cx="48" cy="48" r="45" fill="url(#sbg)"/>
          <circle cx="48" cy="48" r="44" fill="none" stroke="#f59e0b" stroke-width="1.8"/>
          <circle cx="48" cy="48" r="41" fill="none" stroke="#fde68a" stroke-width="0.6" stroke-dasharray="4 3"/>
          <rect x="10" y="38" width="76" height="36" rx="6" fill="#0c1e5c" stroke="#3b82f6" stroke-width="1.2"/>
          <rect x="12" y="40" width="72" height="26" rx="5" fill="url(#smat)" stroke="#93c5fd" stroke-width="0.8"/>
          <line x1="16" y1="46" x2="80" y2="46" stroke="#7dd3fc" stroke-width="1"/>
          <line x1="16" y1="50" x2="80" y2="50" stroke="#7dd3fc" stroke-width="0.7"/>
          <line x1="16" y1="54" x2="80" y2="54" stroke="#7dd3fc" stroke-width="0.7"/>
          <line x1="16" y1="58" x2="80" y2="58" stroke="#7dd3fc" stroke-width="0.5"/>
          <line x1="32" y1="41" x2="32" y2="65" stroke="#bae6fd" stroke-width="0.7"/>
          <line x1="48" y1="41" x2="48" y2="65" stroke="#bae6fd" stroke-width="0.7"/>
          <line x1="64" y1="41" x2="64" y2="65" stroke="#bae6fd" stroke-width="0.7"/>
          <circle cx="48" cy="53" r="2.2" fill="#1e3a8a" stroke="#60a5fa" stroke-width="0.8"/>
          <circle cx="28" cy="53" r="1.5" fill="#2563eb" opacity="0.5"/>
          <circle cx="68" cy="53" r="1.5" fill="#2563eb" opacity="0.5"/>
          <rect x="13" y="24" width="28" height="17" rx="6" fill="url(#spil)" stroke="#60a5fa" stroke-width="1.2"/>
          <rect x="17" y="28" width="20" height="3" rx="1.5" fill="#93c5fd" opacity="0.8"/>
          <rect x="17" y="33" width="16" height="2.5" rx="1.2" fill="#93c5fd" opacity="0.5"/>
          <rect x="55" y="24" width="28" height="17" rx="6" fill="url(#spil)" stroke="#60a5fa" stroke-width="1.2"/>
          <rect x="59" y="28" width="20" height="3" rx="1.5" fill="#93c5fd" opacity="0.8"/>
          <rect x="59" y="33" width="16" height="2.5" rx="1.2" fill="#93c5fd" opacity="0.5"/>
          <rect x="8" y="22" width="6" height="52" rx="3" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1"/>
          <rect x="82" y="30" width="6" height="44" rx="3" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1"/>
          <rect x="13" y="73" width="8" height="13" rx="4" fill="#1e40af" stroke="#3b82f6" stroke-width="0.7"/>
          <rect x="75" y="73" width="8" height="13" rx="4" fill="#1e40af" stroke="#3b82f6" stroke-width="0.7"/>
          <polygon points="48,8 49.8,14 56,14 51,17.6 53,23.5 48,20 43,23.5 45,17.6 40,14 46.2,14" fill="url(#sgld)"/>
          <circle cx="24" cy="13" r="2.5" fill="url(#sgld)"/>
          <circle cx="72" cy="13" r="2.5" fill="url(#sgld)"/>
          <circle cx="48" cy="88" r="2" fill="url(#sgld)"/>
        </svg>
      </div>
      <!-- Seller Info -->
      <div class="seller-info">
        <div class="seller-name">وَلد بُوزِيدِي عُمَر</div>
        <div class="seller-badge">✦ صناعة الأفرشة ✦</div>
        <div class="seller-activity">حرفي صانع أفرشة الأسرة</div>
        <div class="seller-address">📍 بلدية شلالة العذاورة — ولاية المدية</div>
      </div>
      <!-- IDs -->
      <div class="seller-ids">
        <div class="sid-row"><span class="sid-lbl">N° CARTE :</span><span class="sid-val">22260013954</span></div>
        <div class="sid-row"><span class="sid-lbl">MF N° :</span><span class="sid-val">185261800357101</span></div>
      </div>
    </div>
    <div class="seller-stripe"></div>
  </div>

  <!-- DIVIDER -->
  <div class="inv-div"></div>

  <!-- META + CLIENT -->
  <div class="inv-meta">
    <div class="inv-badge-box">
      <div class="ibb-lbl">Facture</div>
      <div class="ibb-num">N° ${esc(inv.number || '—')}</div>
      <div class="ibb-date">FAIT LE : ${esc(inv.date || '—')}</div>
    </div>
    <div class="inv-client-sec">
      <div class="client-name-big">${esc(client?.name || '—')}</div>
      <table class="client-tbl">
        ${[
          ['Qualité', client?.type, 'Wilaya', client?.wilaya],
          (client?.rc || client?.nif) ? ['RC N°', client?.rc, 'IF N°', client?.nif] : null,
          client?.art ? ['ART N°', client?.art, '', ''] : null,
          client?.phone ? ['Tél', client?.phone, '', ''] : null,
        ].filter(Boolean).map(row => `
          <tr>
            <td class="ctd-lbl">${esc(row[0])} :</td>
            <td class="ctd-val">${esc(row[1] || '—')}</td>
            ${row[2] ? `<td class="ctd-lbl">${esc(row[2])} :</td><td class="ctd-val">${esc(row[3] || '—')}</td>` : '<td></td><td></td>'}
          </tr>
        `).join('')}
      </table>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <table class="inv-tbl">
    <thead>
      <tr>
        <th style="width:6%;text-align:center">N°</th>
        <th style="width:36%;text-align:left"><u>DESCRIPTION</u></th>
        <th style="width:10%;text-align:center">QTÉ</th>
        <th style="width:10%;text-align:center"><u>UNITÉ</u></th>
        <th style="width:16%;text-align:right">P.U</th>
        <th style="width:16%;text-align:right"><u>MONTANT</u></th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f4f7ff'}">
          <td style="text-align:center;font-weight:800">${i + 1}</td>
          <td style="font-weight:700">${esc(item.description)}</td>
          <td style="text-align:center;font-weight:800">${item.quantity}</td>
          <td style="text-align:center;font-weight:700">${esc(item.unit)}</td>
          <td style="text-align:right;font-weight:800">${fmt(item.unitPrice)}</td>
          <td style="text-align:right;font-weight:900">${fmt(item.total)}</td>
        </tr>
      `).join('')}
      <tr class="inv-total-row">
        <td colspan="5" style="text-align:right;font-weight:900;font-size:14px;letter-spacing:1px;text-decoration:underline;padding:10px 8px">Total HT</td>
        <td style="text-align:right;font-weight:900;font-size:14px;padding:10px 6px">${fmt(inv.totalHT)}</td>
      </tr>
      ${(inv.paid || 0) > 0 ? `
        <tr>
          <td colspan="5" style="text-align:right;font-weight:700;border:1px solid #cbd5e1;padding:7px 8px">Versement</td>
          <td style="border:1px solid #cbd5e1;padding:7px 6px;text-align:right;font-weight:800">- ${fmt(inv.paid)}</td>
        </tr>
        <tr style="background:#fffbeb">
          <td colspan="5" style="text-align:right;font-weight:900;border:1px solid #cbd5e1;padding:7px 8px">Reste à payer</td>
          <td style="border:1px solid #cbd5e1;padding:7px 6px;text-align:right;font-weight:900;color:#92400e">${fmt(inv.totalHT - inv.paid)}</td>
        </tr>
      ` : ''}
    </tbody>
  </table>

  <!-- Amount in Words -->
  <div class="amt-words">
    <span class="aw-lbl">Arrêtée la présente facture à la somme de :</span><br>
    <strong class="aw-val">${amtWords(inv.totalHT || 0)}</strong>
  </div>

  <!-- Footer -->
  <div class="inv-footer">
    <div style="line-height:1.9">
      <div style="font-weight:700">⚡ Ne relève pas TVA 19% + taxe de timbre</div>
      <div><span style="font-weight:900">MODE DE PAIEMENT : </span><span style="font-weight:800">${esc(inv.paymentMode || 'À TERME')}</span></div>
      ${inv.notes ? `<div><span style="font-weight:900">Notes : </span>${esc(inv.notes)}</div>` : ''}
    </div>
    <div class="inv-sig">Le fournisseur</div>
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════
//  EVENT HANDLERS (global functions)
// ══════════════════════════════════════════════════════════

window.toggleSidebar = () => { S.sidebarOpen = !S.sidebarOpen; render(); };
window.setTab = (tab) => { S.tab = tab; S.sidebarOpen = false; render(); };

// ─── Preview Update (without full re-render) ───
window.updatePreview = () => {
  const el = document.getElementById('inv-preview');
  if (!el) return;
  const selClient = S.clients.find(c => c.id === S.invClientId);
  const valid = validItems(S.invItems);
  el.innerHTML = buildInvPaper({ number: S.invNum, date: S.invDate, items: valid, totalHT: calcTotal(valid), paid: S.invPaid, paymentMode: S.invPayMode, notes: S.invNotes }, selClient);
};

// ─── Items ───
window.updItem = (idx, field, value) => {
  const items = S.invItems.map((it, i) => {
    if (i !== idx) return it;
    const upd = { ...it, [field]: value };
    if (field === 'productId') {
      const prod = S.products.find(p => p.id === value);
      if (prod) { upd.description = prod.name; upd.unitPrice = prod.price; upd.unit = prod.unit; }
    }
    if (field === 'quantity' || field === 'unitPrice' || field === 'productId') {
      upd.total = Number(upd.quantity) * Number(upd.unitPrice);
    }
    return upd;
  });
  const last = items[items.length - 1];
  const lastFilled = last.description.trim() !== '' || last.unitPrice > 0 || last.productId !== '';
  if (idx === S.invItems.length - 1 && lastFilled) items.push(emptyItem());
  S.invItems = items;

  // Update items table + preview without full re-render
  const wrap = document.getElementById('itms-wrap');
  if (wrap) wrap.outerHTML = buildItemsTable();
  updatePreview();
};

window.removeItem = (idx) => {
  if (S.invItems.length > 1) {
    S.invItems = S.invItems.filter((_, i) => i !== idx);
    const wrap = document.getElementById('itms-wrap');
    if (wrap) wrap.outerHTML = buildItemsTable();
    updatePreview();
  }
};

// ─── Invoice CRUD ───
window.openNewInv = () => {
  S.editInvId = null;
  S.invClientId = S.clients[0]?.id || '';
  S.invDate = today();
  S.invNum = nextInvNum();
  S.invItems = [emptyItem()];
  S.invPaid = 0;
  S.invPayMode = 'À TERME';
  S.invNotes = '';
  S.showInvForm = true;
  render();
};

window.openEditInv = (id) => {
  const inv = S.invoices.find(i => i.id === id);
  if (!inv) return;
  S.editInvId = id;
  S.invClientId = inv.clientId;
  S.invDate = inv.date;
  S.invNum = inv.number;
  S.invItems = inv.items.length > 0 ? [...inv.items, emptyItem()] : [emptyItem()];
  S.invPaid = inv.paid;
  S.invPayMode = inv.paymentMode;
  S.invNotes = inv.notes;
  S.showInvForm = true;
  render();
};

window.closeInvForm = () => { S.showInvForm = false; render(); };

window.saveInv = (andPrint) => {
  if (!S.invClientId) { alert('اختر زبوناً'); return; }
  const filtered = validItems(S.invItems);
  if (filtered.length === 0) { alert('أضف بنداً واحداً على الأقل'); return; }
  const invoice = {
    id: S.editInvId || uid(),
    number: S.invNum,
    date: S.invDate,
    clientId: S.invClientId,
    items: filtered,
    totalHT: calcTotal(filtered),
    paid: S.invPaid,
    paymentMode: S.invPayMode,
    notes: S.invNotes,
    createdAt: new Date().toISOString(),
  };
  if (S.editInvId) {
    S.invoices = S.invoices.map(i => i.id === S.editInvId ? invoice : i);
  } else {
    S.invoices.push(invoice);
    filtered.forEach(item => {
      S.products = S.products.map(p => p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p);
    });
  }
  persist();
  S.showInvForm = false;
  if (andPrint) { S.printInvId = invoice.id; S.showPrint = true; }
  render();
};

window.openPrint = (id) => { S.printInvId = id; S.showPrint = true; render(); };
window.closePrint = () => { S.showPrint = false; S.printInvId = null; render(); };

window.deleteInv = (id) => {
  if (!confirm('هل تريد حذف هذه الفاتورة؟')) return;
  const inv = S.invoices.find(i => i.id === id);
  if (inv) {
    inv.items.forEach(item => {
      S.products = S.products.map(p => p.id === item.productId ? { ...p, stock: p.stock + item.quantity } : p);
    });
  }
  S.invoices = S.invoices.filter(i => i.id !== id);
  persist(); render();
};

// ─── Client CRUD ───
window.openClientForm = (id) => { S.editClientId = id || null; S.showClientForm = true; render(); };
window.closeClientForm = () => { S.showClientForm = false; S.editClientId = null; render(); };
window.submitClient = () => {
  const name = document.getElementById('c-name')?.value.trim();
  if (!name) { alert('أدخل اسم الزبون'); return; }
  const cl = {
    id: S.editClientId || uid(), name,
    type: document.getElementById('c-type')?.value || '',
    wilaya: document.getElementById('c-wilaya')?.value || '',
    rc: document.getElementById('c-rc')?.value || '',
    nif: document.getElementById('c-nif')?.value || '',
    art: document.getElementById('c-art')?.value || '',
    phone: document.getElementById('c-phone')?.value || '',
    totalDebt: 0,
  };
  if (S.editClientId) S.clients = S.clients.map(c => c.id === S.editClientId ? cl : c);
  else S.clients.push(cl);
  persist(); S.showClientForm = false; S.editClientId = null; render();
};
window.deleteClient = (id) => {
  if (!confirm('هل تريد حذف هذا الزبون؟')) return;
  S.clients = S.clients.filter(c => c.id !== id);
  persist(); render();
};

// ─── Product CRUD ───
window.openProdForm = (id) => { S.editProdId = id || null; S.showProdForm = true; render(); };
window.closeProdForm = () => { S.showProdForm = false; S.editProdId = null; render(); };
window.submitProd = () => {
  const name = document.getElementById('p-name')?.value.trim();
  if (!name) { alert('أدخل اسم المنتج'); return; }
  const pr = {
    id: S.editProdId || uid(), name,
    nameAr: document.getElementById('p-name-ar')?.value || '',
    unit: document.getElementById('p-unit')?.value || 'u',
    price: Number(document.getElementById('p-price')?.value) || 0,
    stock: Number(document.getElementById('p-stock')?.value) || 0,
  };
  if (S.editProdId) S.products = S.products.map(p => p.id === S.editProdId ? pr : p);
  else S.products.push(pr);
  persist(); S.showProdForm = false; S.editProdId = null; render();
};
window.deleteProd = (id) => {
  if (!confirm('هل تريد حذف هذا المنتج؟')) return;
  S.products = S.products.filter(p => p.id !== id);
  persist(); render();
};

// ─── Payment ───
window.openPayForm = (cid) => { S.payClientId = cid || S.clients[0]?.id || ''; S.showPayForm = true; render(); };
window.closePayForm = () => { S.showPayForm = false; render(); };
window.submitPay = () => {
  const cid = document.getElementById('pay-client')?.value;
  const amt = Number(document.getElementById('pay-amount')?.value);
  if (!cid || amt <= 0) { alert('أدخل الزبون والمبلغ'); return; }
  S.payments.push({
    id: uid(), clientId: cid, amount: amt,
    date: document.getElementById('pay-date')?.value || today(),
    note: document.getElementById('pay-note')?.value || '',
  });
  persist(); S.showPayForm = false; render();
};

// ─── PDF Download ───
window.downloadPDF = async () => {
  const btn = document.getElementById('pdf-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الإنشاء...'; }
  try {
    const el = document.getElementById('print-area');
    if (!el) return;
    const h2c = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js')).default;
    const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.esm.min.js');
    const canvas = await h2c(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const ih = pw * canvas.height / canvas.width;
    if (ih <= ph) {
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, ih);
    } else {
      let y = 0, rem = canvas.height;
      while (rem > 0) {
        const sh = Math.min(canvas.width * (ph / pw), rem);
        const sc = document.createElement('canvas');
        sc.width = canvas.width; sc.height = sh;
        sc.getContext('2d').drawImage(canvas, 0, y, canvas.width, sh, 0, 0, canvas.width, sh);
        if (y > 0) pdf.addPage();
        pdf.addImage(sc.toDataURL('image/png'), 'PNG', 0, 0, pw, ph);
        y += sh; rem -= sh;
      }
    }
    const inv = S.invoices.find(i => i.id === S.printInvId);
    pdf.save(`Facture_${(inv?.number || '').replace('/', '-')}.pdf`);
  } catch (e) {
    console.error(e);
    alert('خطأ في إنشاء PDF. تأكد من اتصال الإنترنت.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📄 تحميل PDF'; }
  }
};

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
S.invClientId = S.clients[0]?.id || '';
S.invNum = nextInvNum();
render();
