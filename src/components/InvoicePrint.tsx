import { useRef, useState } from "react";
import { Invoice, Client } from "../types";
import { formatAmount, amountInWords } from "../utils/numbers";

interface Props {
  invoice: Invoice;
  client: Client | undefined;
  onClose: () => void;
}

export function InvoicePrint({ invoice, client, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handlePrint = () => window.print();

  const handlePDF = async () => {
    if (!printRef.current) return;
    setPdfLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(printRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgH = pageW * ratio;
      if (imgH <= pageH) {
        pdf.addImage(imgData, "PNG", 0, 0, pageW, imgH);
      } else {
        let y = 0, remaining = canvas.height;
        while (remaining > 0) {
          const sliceH = Math.min(canvas.width * (pageH / pageW), remaining);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width; sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext("2d");
          ctx?.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          if (y > 0) pdf.addPage();
          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, pageW, pageH);
          y += sliceH; remaining -= sliceH;
        }
      }
      pdf.save(`Facture_${invoice.number.replace("/", "-")}.pdf`);
    } catch (e) {
      console.error(e); alert("حدث خطأ أثناء إنشاء PDF");
    } finally { setPdfLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center overflow-auto py-4 px-2">
      {/* Toolbar */}
      <div className="flex gap-2 mb-4 print:hidden w-full max-w-[210mm] sticky top-2 z-10 flex-wrap">
        <button onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2 text-sm shadow-lg">
          🖨️ طباعة
        </button>
        <button onClick={handlePDF} disabled={pdfLoading}
          className="bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-red-700 flex items-center gap-2 text-sm shadow-lg disabled:opacity-60">
          {pdfLoading
            ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> جاري الإنشاء...</>
            : <>📄 تحميل PDF</>}
        </button>
        <button onClick={onClose}
          className="bg-white text-gray-700 border px-4 py-2.5 rounded-xl font-medium hover:bg-gray-100 text-sm shadow-lg mr-auto">
          ✕ إغلاق
        </button>
      </div>

      <InvoicePaper ref={printRef} invoice={invoice} client={client} />

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable, #printable * { visibility: visible !important; }
          #printable {
            position: fixed !important; inset: 0 !important;
            width: 100% !important; max-width: 100% !important;
            margin: 0 !important; padding: 20px 28px !important;
            box-shadow: none !important; border-radius: 0 !important;
            font-size: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Shared Invoice Paper ───
interface PaperProps {
  invoice: Partial<Invoice> & {
    number: string; date: string;
    items: Invoice["items"]; totalHT: number;
    paid: number; paymentMode: string; notes: string;
  };
  client: Client | undefined;
  ref?: React.Ref<HTMLDivElement>;
}

export const InvoicePaper = ({ invoice, client, ref }: PaperProps & { ref?: React.Ref<HTMLDivElement> }) => (
  <div
    ref={ref}
    id="printable"
    style={{
      fontFamily: "'Times New Roman', serif",
      fontSize: "13px",
      color: "#000000",
      background: "#fff",
      width: "100%",
      maxWidth: "210mm",
      padding: "28px 32px",
      boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      borderRadius: "10px",
      direction: "ltr",
    }}
  >
    {/* ═══ SELLER HEADER ═══ */}
    <div style={{
      border: "2.5px solid #1e3a8a",
      borderRadius: "14px",
      overflow: "hidden",
      marginBottom: "16px",
      boxShadow: "0 3px 16px rgba(30,58,138,0.13)",
    }}>
      {/* بدون شريط علوي */}

      {/* محتوى */}
      <div style={{ display: "flex", alignItems: "center", gap: "18px", padding: "14px 20px", background: "linear-gradient(to bottom, #f0f5ff, #ffffff)" }}>

        {/* ═══ اللوجو ═══ */}
        <div style={{ flexShrink: 0 }}>
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="bgGrad" cx="38%" cy="28%" r="78%">
                <stop offset="0%" stopColor="#1e40af" />
                <stop offset="100%" stopColor="#0a1540" />
              </radialGradient>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="mattressGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f0f9ff" />
                <stop offset="50%" stopColor="#e0f2fe" />
                <stop offset="100%" stopColor="#bae6fd" />
              </linearGradient>
              <linearGradient id="pillowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#dbeafe" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* ── الخلفية الدائرية ── */}
            <circle cx="48" cy="48" r="47" fill="#0a1540" />
            <circle cx="48" cy="48" r="45" fill="url(#bgGrad)" />

            {/* إطار ذهبي مزدوج */}
            <circle cx="48" cy="48" r="44" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
            <circle cx="48" cy="48" r="41" fill="none" stroke="#fde68a" strokeWidth="0.6" strokeDasharray="4 3" />

            {/* ── نجمة زخرفية خلفية شبه شفافة ── */}
            <polygon points="48,6 51,18 63,18 54,26 57,38 48,30 39,38 42,26 33,18 45,18"
              fill="#f59e0b" opacity="0.15" />

            {/* ── إطار السرير الخارجي ── */}
            <rect x="10" y="38" width="76" height="36" rx="6" fill="#0c1e5c" stroke="#3b82f6" strokeWidth="1.2" />

            {/* ── المرتبة / الفرشة ── */}
            <rect x="12" y="40" width="72" height="26" rx="5" fill="url(#mattressGrad)" stroke="#93c5fd" strokeWidth="0.8" />

            {/* تفاصيل المرتبة — خطوط أفقية */}
            <line x1="16" y1="46" x2="80" y2="46" stroke="#7dd3fc" strokeWidth="1" opacity="0.8" />
            <line x1="16" y1="50" x2="80" y2="50" stroke="#7dd3fc" strokeWidth="0.7" opacity="0.6" />
            <line x1="16" y1="54" x2="80" y2="54" stroke="#7dd3fc" strokeWidth="0.7" opacity="0.5" />
            <line x1="16" y1="58" x2="80" y2="58" stroke="#7dd3fc" strokeWidth="0.5" opacity="0.4" />

            {/* تفاصيل المرتبة — خطوط عمودية */}
            <line x1="32" y1="41" x2="32" y2="65" stroke="#bae6fd" strokeWidth="0.7" opacity="0.55" />
            <line x1="48" y1="41" x2="48" y2="65" stroke="#bae6fd" strokeWidth="0.7" opacity="0.55" />
            <line x1="64" y1="41" x2="64" y2="65" stroke="#bae6fd" strokeWidth="0.7" opacity="0.55" />

            {/* زر في مركز الفرشة */}
            <circle cx="48" cy="53" r="2.2" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="0.8" />
            <circle cx="28" cy="53" r="1.5" fill="#2563eb" opacity="0.5" />
            <circle cx="68" cy="53" r="1.5" fill="#2563eb" opacity="0.5" />

            {/* ── الوسادتان ── */}
            {/* وسادة يسرى */}
            <rect x="13" y="24" width="28" height="17" rx="6" fill="url(#pillowGrad)" stroke="#60a5fa" strokeWidth="1.2" />
            <rect x="17" y="28" width="20" height="3" rx="1.5" fill="#93c5fd" opacity="0.8" />
            <rect x="17" y="33" width="16" height="2.5" rx="1.2" fill="#93c5fd" opacity="0.5" />
            <line x1="13" y1="32" x2="41" y2="32" stroke="#bfdbfe" strokeWidth="0.5" opacity="0.6" />

            {/* وسادة يمنى */}
            <rect x="55" y="24" width="28" height="17" rx="6" fill="url(#pillowGrad)" stroke="#60a5fa" strokeWidth="1.2" />
            <rect x="59" y="28" width="20" height="3" rx="1.5" fill="#93c5fd" opacity="0.8" />
            <rect x="59" y="33" width="16" height="2.5" rx="1.2" fill="#93c5fd" opacity="0.5" />
            <line x1="55" y1="32" x2="83" y2="32" stroke="#bfdbfe" strokeWidth="0.5" opacity="0.6" />

            {/* ── رأس السرير (يمين) ── */}
            <rect x="8" y="22" width="6" height="52" rx="3" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />
            <rect x="8" y="26" width="6" height="8" rx="2" fill="#2563eb" opacity="0.6" />

            {/* ── قدم السرير (يسار) ── */}
            <rect x="82" y="30" width="6" height="44" rx="3" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />

            {/* ── أرجل السرير ── */}
            <rect x="13" y="73" width="8" height="13" rx="4" fill="#1e40af" stroke="#3b82f6" strokeWidth="0.7" />
            <rect x="75" y="73" width="8" height="13" rx="4" fill="#1e40af" stroke="#3b82f6" strokeWidth="0.7" />

            {/* ── النجمة الذهبية المركزية ── */}
            <polygon
              points="48,8 49.8,14 56,14 51,17.6 53,23.5 48,20 43,23.5 45,17.6 40,14 46.2,14"
              fill="url(#goldGrad)" filter="url(#glow)"
            />

            {/* نقاط ذهبية زخرفية */}
            <circle cx="24" cy="13" r="2.5" fill="url(#goldGrad)" opacity="0.9" />
            <circle cx="72" cy="13" r="2.5" fill="url(#goldGrad)" opacity="0.9" />
            <circle cx="14" cy="22" r="1.5" fill="#f59e0b" opacity="0.65" />
            <circle cx="82" cy="22" r="1.5" fill="#f59e0b" opacity="0.65" />
            <circle cx="48" cy="88" r="2" fill="url(#goldGrad)" opacity="0.7" />
          </svg>
        </div>

        {/* اسم الحرفي */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: "24px",
            fontWeight: "900",
            color: "#0f2060",
            lineHeight: 1.1,
            letterSpacing: "1px",
            fontFamily: "'Amiri', 'Scheherazade New', 'Traditional Arabic', 'Times New Roman', serif",
            textShadow: "0 2px 8px rgba(30,58,138,0.13)",
          }}>
            وَلد بُوزِيدِي عُمَر
          </div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "linear-gradient(135deg, #0f2060, #1e3a8a, #2563eb)",
            color: "#fde68a",
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: "2px",
            borderRadius: "20px",
            padding: "4px 16px",
            marginTop: "6px",
            marginBottom: "7px",
            border: "1.5px solid #f59e0b",
            boxShadow: "0 2px 8px rgba(245,158,11,0.18)",
            fontFamily: "'Amiri', 'Times New Roman', serif",
            textShadow: "0 1px 4px rgba(0,0,0,0.25)",
          }}>
            ✦ صناعة الأفرشة ✦
          </div>
          <div style={{ fontSize: "11px", color: "#1f2937", fontWeight: "600", lineHeight: 1.7 }}>
            حرفي صانع أفرشة الأسرة
          </div>
          <div style={{ fontSize: "10px", color: "#374151", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#2563eb" }}>📍</span>
            بلدية شلالة العذاورة — ولاية المدية
          </div>
        </div>

        {/* الأرقام التعريفية */}
        <div style={{
          borderLeft: "3px solid #2563eb",
          paddingLeft: "14px",
          fontSize: "11px",
          lineHeight: "2.1",
          color: "#000000",
          flexShrink: 0,
          fontWeight: "600",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color: "#1e3a8a", fontWeight: 800, fontSize: "10px" }}>N° CARTE :</span>
            <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#000" }}>22260013954</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color: "#1e3a8a", fontWeight: 800, fontSize: "10px" }}>MF N° :</span>
            <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#000" }}>185261800357101</span>
          </div>
        </div>
      </div>

      {/* شريط سفلي بتدرج */}
      <div style={{ height: "5px", background: "linear-gradient(to right, #0f2060, #1e3a8a, #2563eb, #60a5fa, #f59e0b)" }} />
    </div>

    {/* فاصل */}
    <div style={{ height: "2px", background: "linear-gradient(to right,#1e3a8a,#3b82f6,#bfdbfe)", borderRadius: "2px", margin: "0 0 16px 0" }} />

    {/* ═══ INVOICE META + CLIENT ═══ */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", gap: "20px" }}>

      {/* شارة رقم الفاتورة */}
      <div style={{
        background: "linear-gradient(135deg, #0f2060, #1e3a8a)",
        color: "#fff",
        borderRadius: "10px",
        padding: "10px 20px",
        flexShrink: 0,
        boxShadow: "0 4px 14px rgba(30,58,138,0.25)",
      }}>
        <div style={{ fontSize: "9px", opacity: 0.75, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700 }}>Facture</div>
        <div style={{ fontSize: "15px", fontWeight: "900", letterSpacing: "1px", lineHeight: 1.2, color: "#000000" }}>N° {invoice.number || "—"}</div>
        <div style={{ fontSize: "12px", marginTop: "5px", fontWeight: 900, color: "#000000", letterSpacing: "0.5px", textShadow: "none" }}>FAIT LE : {invoice.date || "—"}</div>
      </div>

      {/* معلومات الزبون */}
      <div style={{ fontSize: "12px", color: "#000000" }}>
        <div style={{
          fontWeight: "900",
          fontSize: "15px",
          color: "#0f2060",
          marginBottom: "8px",
          letterSpacing: "0.3px",
        }}>
          {client?.name || "—"}
        </div>
        <table style={{ borderSpacing: 0, borderCollapse: "collapse" }}>
          <tbody>
            {[
              ["Qualité", client?.type, "Wilaya", client?.wilaya],
              client?.rc || client?.nif ? ["RC N°", client?.rc, "IF N°", client?.nif] : null,
              client?.art ? ["ART N°", client?.art, "", ""] : null,
              client?.phone ? ["Tél", client?.phone, "", ""] : null,
            ].filter(Boolean).map((row, i) => row && (
              <tr key={i}>
                <td style={{ color: "#444", paddingRight: "10px", paddingBottom: "3px", fontWeight: "700", whiteSpace: "nowrap", fontSize: "11px" }}>{row[0]} :</td>
                <td style={{ fontWeight: "800", paddingRight: "20px", paddingBottom: "3px", color: "#000", fontSize: "12px" }}>{row[1] || "—"}</td>
                {row[2] ? (
                  <>
                    <td style={{ color: "#444", paddingRight: "10px", paddingBottom: "3px", fontWeight: "700", whiteSpace: "nowrap", fontSize: "11px" }}>{row[2]} :</td>
                    <td style={{ fontWeight: "800", paddingBottom: "3px", color: "#000", fontSize: "12px" }}>{row[3] || "—"}</td>
                  </>
                ) : <><td /><td /></>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* ═══ ITEMS TABLE ═══ */}
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "4px" }}>
      <thead>
        <tr style={{ background: "linear-gradient(to right, #0f2060, #1e3a8a)", color: "#fff" }}>
          {[
            { label: "N°", w: "6%", align: "center" as const },
            { label: "DESCRIPTION", w: "36%", align: "left" as const },
            { label: "QTÉ", w: "10%", align: "center" as const },
            { label: "UNITÉ", w: "10%", align: "center" as const },
            { label: "P.U", w: "16%", align: "right" as const },
            { label: "MONTANT", w: "16%", align: "right" as const },
          ].map((h) => (
            <th key={h.label} style={{
              padding: "9px 7px",
              textAlign: h.align,
              fontSize: "13px",
              fontWeight: "900",
              letterSpacing: "1.5px",
              width: h.w,
              textShadow: "0 1px 2px rgba(0,0,0,0.18)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}>
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {invoice.items.map((item, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f4f7ff" }}>
            <td style={{ border: "1px solid #cbd5e1", padding: "7px 6px", textAlign: "center", fontWeight: "800", color: "#000" }}>{i + 1}</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "7px 6px", fontWeight: "700", color: "#000" }}>{item.description}</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "7px 6px", textAlign: "center", fontWeight: "800", color: "#000" }}>{item.quantity}</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "7px 6px", textAlign: "center", fontWeight: "700", color: "#000" }}>{item.unit}</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "7px 6px", textAlign: "right", fontWeight: "800", color: "#000" }}>{formatAmount(item.unitPrice)}</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "7px 6px", textAlign: "right", fontWeight: "900", color: "#000" }}>{formatAmount(item.total)}</td>
          </tr>
        ))}

        {/* Total HT */}
        <tr style={{ background: "#f0f5ff", borderTop: "2.5px solid #1e3a8a" }}>
          <td colSpan={5} style={{
            padding: "10px 14px",
            textAlign: "right",
            fontWeight: "900",
            fontSize: "15px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#000000",
            border: "1.5px solid #1e3a8a",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}>
            Total HT
          </td>
          <td style={{
            padding: "10px 10px",
            textAlign: "right",
            fontWeight: "900",
            fontSize: "15px",
            letterSpacing: "0.5px",
            color: "#000000",
            border: "1.5px solid #1e3a8a",
          }}>
            {formatAmount(invoice.totalHT)}
          </td>
        </tr>

        {invoice.paid > 0 && (
          <>
            <tr>
              <td colSpan={5} style={{ border: "1px solid #cbd5e1", padding: "7px 8px", textAlign: "right", fontWeight: "700", color: "#000" }}>Versement</td>
              <td style={{ border: "1px solid #cbd5e1", padding: "7px 8px", textAlign: "right", fontWeight: "800", color: "#000" }}>- {formatAmount(invoice.paid)}</td>
            </tr>
            <tr style={{ background: "#fffbeb" }}>
              <td colSpan={5} style={{ border: "1px solid #cbd5e1", padding: "7px 8px", textAlign: "right", fontWeight: "900", color: "#000" }}>Reste à payer</td>
              <td style={{ border: "1px solid #cbd5e1", padding: "7px 8px", textAlign: "right", fontWeight: "900", color: "#92400e" }}>
                {formatAmount(invoice.totalHT - invoice.paid)}
              </td>
            </tr>
          </>
        )}
      </tbody>
    </table>

    {/* المبلغ بالحروف */}
    <div style={{
      border: "1.5px solid #1e3a8a",
      background: "linear-gradient(to right, #eff6ff, #f8faff)",
      padding: "10px 16px",
      marginTop: "14px",
      borderRadius: "8px",
      fontSize: "12px",
      color: "#000000",
    }}>
      <span style={{ fontWeight: "700", color: "#1e3a8a" }}>Arrêtée la présente facture à la somme de :</span>
      <br />
      <strong style={{ fontSize: "13px", fontWeight: "900", color: "#000000" }}>{amountInWords(invoice.totalHT)}</strong>
    </div>

    {/* FOOTER */}
    <div style={{
      marginTop: "18px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      fontSize: "12px",
      color: "#000000",
      fontWeight: "600",
    }}>
      <div style={{ lineHeight: "1.9" }}>
        <div style={{ fontWeight: "700" }}>⚡ Ne relève pas TVA 19% + taxe de timbre</div>
        <div>
          <span style={{ fontWeight: "900" }}>MODE DE PAIEMENT : </span>
          <span style={{ fontWeight: "800" }}>{invoice.paymentMode || "À TERME"}</span>
        </div>
        {invoice.notes && (
          <div><span style={{ fontWeight: "900" }}>Notes : </span>{invoice.notes}</div>
        )}
      </div>
      <div style={{
        textAlign: "center",
        borderTop: "1.5px solid #000",
        paddingTop: "8px",
        minWidth: "130px",
        fontSize: "12px",
        fontWeight: "900",
        color: "#000",
      }}>
        Le fournisseur
      </div>
    </div>
  </div>
);
