// Invoice.tsx
import { useState, useEffect, useCallback } from "react";
import { Search, Printer, Trash2, X, AlertTriangle, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import html2pdf from "html2pdf.js";

// ---------- Environment ----------
const SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL as string | undefined;
const SHEET_ID = import.meta.env.VITE_SHEET_ID as string;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;
const DRIVE_FOLDER_ID = "1trTkjeNIjmT15fcGMgYZOIHVPqScK1Kb";

if (!SCRIPT_URL) console.error("❌ VITE_APP_SCRIPT_URL is missing.");
if (!SHEET_ID) console.error("❌ VITE_SHEET_ID is missing.");
if (!GOOGLE_API_KEY) console.error("❌ VITE_GOOGLE_API_KEY is missing.");

// ---------- Types ----------
export interface InvoiceTableData {
  id: string;
  year: string;
  storageOtherMonthRate: string;
  storageQty: string;
  offSeasonJanRate: string;
  offSeasonFebRate: string;
  offSeasonQty: string;
  otherChargesOtherMonthRate: string;
  otherChargesQty: string;
  hamaliOtherMonthRate: string;
  hamaliQty: string;
}

interface InvoiceSlip {
  id: number;
  slipType: "Invoice";
  invoiceNo: string;
  date: string;
  partyName: string;
  productName: string;
  lotNumber: string;
  vehicleNumber: string;
  storageFrom: string;
  storageTo: string;
  totalDays: string;
  grandTotal: string;
  pdfUrl?: string;
  createdAt: string;
  autoSerial?: string;
  slipTypeLabel?: string;
  year?: string;
  offSeasonJanRate?: string;
  offSeasonFebRate?: string;
  offSeasonOtherMonthRate?: string;
  offSeasonQty?: string;
  storageOtherMonthRate?: string;
  storageQty?: string;
  otherChargesOtherMonthRate?: string;
  otherChargesQty?: string;
  hamaliOtherMonthRate?: string;
  hamaliQty?: string;
  storageCharges?: string;
  offSeasonCharges?: string;
  otherCharges?: string;
  hamaliCharges?: string;
  totalAmount?: string;
  amountInWords?: string;
}

type Slip = InvoiceSlip & { pdfUrl?: string; autoSerial?: string };

// ---------- Helpers ----------
const formatSlipDate = (d: string) => {
  if (!d) return "";
  const date = new Date(d);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (typeof d === "string" && d.includes("/")) {
    const parts = d.split("/");
    if (parts.length === 3) {
      const dd = parts[0].padStart(2, "0");
      const mm = parts[1].padStart(2, "0");
      const yyyy = parts[2];
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  return d;
};

const toNumber = (val: string) => Number(val) || 0;

const getOffSeasonOtherMonthRate = (janRate: string, febRate: string) =>
  toNumber(janRate) + toNumber(febRate);

const numberToWords = (num: number): string => {
  if (num === 0) return "Zero Only";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const convertBelowThousand = (n: number): string => {
    let str = "";
    if (n >= 100) { str += ones[Math.floor(n / 100)] + " Hundred "; n %= 100; }
    if (n >= 20) { str += tens[Math.floor(n / 10)] + " "; n %= 10; }
    if (n > 0) str += ones[n] + " ";
    return str.trim();
  };
  let result = "";
  let crore = Math.floor(num / 10000000); num %= 10000000;
  let lakh = Math.floor(num / 100000); num %= 100000;
  let thousand = Math.floor(num / 1000); num %= 1000;
  if (crore) result += convertBelowThousand(crore) + " Crore ";
  if (lakh) result += convertBelowThousand(lakh) + " Lakh ";
  if (thousand) result += convertBelowThousand(thousand) + " Thousand ";
  if (num) result += convertBelowThousand(num);
  return result.trim() + " Only";
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const Invoice = () => {
  // ---------- State ----------
  const [slips, setSlips] = useState<Slip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [printingSlipId, setPrintingSlipId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingSlip, setEditingSlip] = useState<Slip | null>(null);

  const addLog = (msg: string) => {};

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Form state (invoice fields + year tables)
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNo: "",
    date: new Date().toISOString().split("T")[0],
    partyName: "",
    productName: "",
    lotNumber: "",
    vehicleNumber: "",
    storageFrom: "",
    storageTo: "",
    totalDays: "",
  });

  const [invoiceTables, setInvoiceTables] = useState<InvoiceTableData[]>([
    {
      id: "table-1",
      year: new Date().getFullYear().toString(),
      storageOtherMonthRate: "",
      storageQty: "",
      offSeasonJanRate: "",
      offSeasonFebRate: "",
      offSeasonQty: "",
      otherChargesOtherMonthRate: "",
      otherChargesQty: "",
      hamaliOtherMonthRate: "",
      hamaliQty: "",
    },
  ]);

  // Auto-calculate total days and sync first table's year
  useEffect(() => {
    if (invoiceForm.storageFrom && invoiceForm.storageTo) {
      const from = new Date(invoiceForm.storageFrom);
      const to = new Date(invoiceForm.storageTo);
      if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
        const diffDays = Math.ceil(Math.abs(to.getTime() - from.getTime()) / (86400000)) + 1;
        setInvoiceForm((prev) => ({ ...prev, totalDays: diffDays.toString() }));
      }
    }
    if (invoiceForm.storageFrom) {
      const from = new Date(invoiceForm.storageFrom);
      if (!isNaN(from.getTime())) {
        setInvoiceTables((prev) => {
          const newTables = [...prev];
          newTables[0].year = from.getFullYear().toString();
          return newTables;
        });
      }
    }
  }, [invoiceForm.storageFrom, invoiceForm.storageTo]);

  // Amount calculators
  const getStorageAmount = () =>
    invoiceTables.reduce((sum, t) => sum + toNumber(t.storageOtherMonthRate) * toNumber(t.storageQty), 0);
  const getHamaliAmount = () =>
    invoiceTables.reduce((sum, t) => sum + toNumber(t.hamaliOtherMonthRate) * toNumber(t.hamaliQty), 0);
  const getOffSeasonAmount = () =>
    invoiceTables.reduce((sum, t) => sum + getOffSeasonOtherMonthRate(t.offSeasonJanRate, t.offSeasonFebRate) * toNumber(t.offSeasonQty), 0);
  const getOtherChargesAmount = () =>
    invoiceTables.reduce((sum, t) => sum + toNumber(t.otherChargesOtherMonthRate) * toNumber(t.otherChargesQty), 0);
  const getGrandTotal = () => getStorageAmount() + getHamaliAmount() + getOffSeasonAmount() + getOtherChargesAmount();
  const getAmountInWords = () => {
    const total = getGrandTotal();
    return total ? numberToWords(total) : "";
  };

  // ---------- API Calls ----------
  const saveSlipToSheet = async (payload: any, actionType: string = "addNewSlipFull") => {
    if (!SCRIPT_URL) throw new Error("Script URL is missing");
    addLog(`Saving invoice (${actionType}): ${JSON.stringify(payload).substring(0, 120)}...`);
    const params = new URLSearchParams();
    params.append("action", actionType);
    params.append("payload", JSON.stringify(payload));
    const res = await fetch(SCRIPT_URL, { 
      method: "POST", 
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString() 
    });
    const text = await res.text();
    addLog(`Response: ${text.substring(0, 200)}`);
    if (!text || text.trim() === "") return true;
    try {
      const data = JSON.parse(text);
      if (data.success === false) {
        addLog(`❌ Server error: ${data.error}`);
        toast.error("Error saving invoice: " + (data.error || "Unknown error"));
        return false;
      }
      addLog("✅ Invoice saved successfully");
      return true;
    } catch {
      addLog("⚠️ Non-JSON response");
      toast.error("Network communication error with script.");
      return false;
    }
  };

  const fetchSlips = useCallback(async () => {
    if (!SCRIPT_URL) {
      setLoading(false);
      setError("Script URL is missing in environment.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      addLog("Fetching slips via Apps Script...");
      const url = `${SCRIPT_URL}?action=getAllNewSlips`;
      const res = await fetch(url);
      const data = await res.json();
      
      const cleanQty = (val: string) => {
        if (val && typeof val === "string" && val.includes("T") && val.endsWith("Z")) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            // Google Sheets often auto-converts "X, Y" to a Date.
            // We reconstruct it by extracting Day and Month.
            const day = d.getDate();
            const month = d.getMonth() + 1;
            return `${day}, ${month}`;
          }
        }
        return val;
      };

      if (data.success && Array.isArray(data.slips)) {
        const formatted: Slip[] = data.slips
          .filter((s: any) => s.slipType === "Invoice")
          .map((s: any, index: number) => ({
            id: index + 1,
            slipType: "Invoice",
            createdAt: String(s.timestamp || "").trim(),
            autoSerial: String(s.serialNo || "").trim(),
            slipTypeLabel: String(s.slipTypeLabel || "").trim(),
            invoiceNo: String(s.slipNo || "").trim(),
            date: String(s.date || "").trim(),
            partyName: String(s.partyName || "").trim(),
            pdfUrl: String(s.pdfUrl || "").trim(),
            productName: String(s.productName || "").trim(),
            year: String(s.year || "").trim(),
            lotNumber: String(s.lotNumber || "").trim(),
            vehicleNumber: String(s.vehicleNumber || "").trim(),
            storageFrom: String(s.storageFrom || "").trim(),
            storageTo: String(s.storageTo || "").trim(),
            totalDays: String(s.totalDays || "").trim(),
            offSeasonJanRate: String(s.offSeasonJanRate || "").trim(),
            offSeasonFebRate: String(s.offSeasonFebRate || "").trim(),
            offSeasonOtherMonthRate: String(s.offSeasonOtherMonthRate || "").trim(),
            offSeasonQty: cleanQty(String(s.offSeasonQty || "").trim()),
            storageOtherMonthRate: String(s.storageOtherMonthRate || "").trim(),
            storageQty: cleanQty(String(s.storageQty || "").trim()),
            otherChargesOtherMonthRate: String(s.otherChargesOtherMonthRate || "").trim(),
            otherChargesQty: cleanQty(String(s.otherChargesQty || "").trim()),
            hamaliOtherMonthRate: String(s.hamaliOtherMonthRate || "").trim(),
            hamaliQty: cleanQty(String(s.hamaliQty || "").trim()),
            storageCharges: String(s.storageCharges || "").trim(),
            offSeasonCharges: String(s.offSeasonCharges || "").trim(),
            otherCharges: String(s.otherCharges || "").trim(),
            hamaliCharges: String(s.hamaliCharges || "").trim(),
            totalAmount: String(s.totalAmount || "").trim(),
            grandTotal: String(s.grandTotal || "").trim(),
            amountInWords: String(s.amountInWords || "").trim(),
          }));
        setSlips(formatted);
        addLog(`Loaded ${formatted.length} invoices via Apps Script.`);
      } else {
        setSlips([]);
        addLog("No data rows found or fetch failed.");
      }
    } catch (err: any) {
      console.error("Error fetching slips:", err);
      setError("Network error: " + err.message);
      addLog("❌ Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlips();
  }, [fetchSlips]);

  // ---------- PDF / Drive ----------
  const uploadPdfToDrive = async (pdfBlob: Blob, fileName: string) => {
    const base64Data = await blobToBase64(pdfBlob);
    const params = new URLSearchParams();
    params.append("action", "handleFileUpload");
    params.append("base64Data", base64Data);
    params.append("fileName", fileName);
    params.append("mimeType", "application/pdf");
    params.append("folderId", DRIVE_FOLDER_ID);
    
    const res = await fetch(SCRIPT_URL!, { 
      method: "POST", 
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString() 
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!data.success) throw new Error("PDF upload failed: " + data.error);
    return { url: data.fileUrl };
  };

  const getSlipHTML = (slip: InvoiceSlip & { tables?: InvoiceTableData[] }) => {
    const inv = { ...slip };
    const tablesHtml = (inv.tables || []).map(table => `
      <div style="margin-top: 15px;">
        <div style="font-weight: bold; font-size: 13px; margin-bottom: 5px;">Year: ${table.year}</div>
        <table>
          <thead>
            <tr style="page-break-inside: avoid;">
              <th>Description</th><th>Jan (Rate)</th><th>Feb (Rate)</th>
              <th>Other Months</th><th>Qty</th><th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="page-break-inside: avoid;">
              <td>Storage Charges</td><td></td><td></td>
              <td>${table.storageOtherMonthRate || ""}</td>
              <td>${table.storageQty || ""}</td>
              <td>${toNumber(table.storageOtherMonthRate) * toNumber(table.storageQty) || "0"}</td>
            </tr>
            <tr style="page-break-inside: avoid;">
              <td>Off Season Charges</td><td>${table.offSeasonJanRate || ""}</td><td>${table.offSeasonFebRate || ""}</td>
              <td>${getOffSeasonOtherMonthRate(table.offSeasonJanRate, table.offSeasonFebRate) || ""}</td>
              <td>${table.offSeasonQty || ""}</td>
              <td>${getOffSeasonOtherMonthRate(table.offSeasonJanRate, table.offSeasonFebRate) * toNumber(table.offSeasonQty) || "0"}</td>
            </tr>
            <tr style="page-break-inside: avoid;">
              <td>Hamali Charges</td><td></td><td></td>
              <td>${table.hamaliOtherMonthRate || ""}</td><td>${table.hamaliQty || ""}</td>
              <td>${toNumber(table.hamaliOtherMonthRate) * toNumber(table.hamaliQty) || "0"}</td>
            </tr>
            <tr style="page-break-inside: avoid;">
              <td>Other Charges</td><td></td><td></td>
              <td>${table.otherChargesOtherMonthRate || ""}</td><td>${table.otherChargesQty || ""}</td>
              <td>${toNumber(table.otherChargesOtherMonthRate) * toNumber(table.otherChargesQty) || "0"}</td>
            </tr>
            <tr style="page-break-inside: avoid; background: #f9f9f9;">
              <td colspan="5" style="text-align:right; font-weight:bold; padding-right: 15px;">Table Total</td>
              <td style="text-align:center; font-weight:bold;">
                ${(toNumber(table.storageOtherMonthRate) * toNumber(table.storageQty)) +
                  (getOffSeasonOtherMonthRate(table.offSeasonJanRate, table.offSeasonFebRate) * toNumber(table.offSeasonQty)) +
                  (toNumber(table.hamaliOtherMonthRate) * toNumber(table.hamaliQty)) +
                  (toNumber(table.otherChargesOtherMonthRate) * toNumber(table.otherChargesQty))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `).join("");

    return `
    <html>
      <head>
        <title>Invoice</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; }
          .pdf-page { min-height: 100%; padding: 10px 22px; border: 2px solid #000; box-sizing: border-box; background-color: #ffffff; }
          .header { text-align: center; border: 2px solid #000; padding: 4px 10px; margin-bottom: 8px; }
          .header h2 { margin: 0 0 2px 0; }
          .header p { margin: 1px 0; font-size: 13px; }
          .invoice-title { font-weight: bold; font-size: 15px; margin: 6px 0; text-align: left; }
          .row { display: flex; margin-bottom: 6px; font-size: 13px; align-items: center; }
          .label { width: 200px; font-weight: bold; }
          .value { flex: 1; border-bottom: 1px solid #000; padding: 4px 6px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin: 5px 0 15px 0; font-size: 13px; }
          table, th, td { border: 1px solid #000; }
          th, td { padding: 6.5px 7px; text-align: left; }
          th { background: #f3f3f3; }
          .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px; }
          .footer-terms { flex: 1; font-size: 13px; padding-right: 20px; }
          .footer-signature { text-align: center; font-size: 13px; font-weight: bold; min-width: 200px; }
          .botivate-footer { text-align: center; margin-top: 25px; font-size: 11px; color: #555; }
          .botivate-footer a { color: #000; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="pdf-page">
          <div class="header">
            <h2>BMS COLD STORAGE</h2>
            <p>(A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)</p>
            <p>Village - BANA (DHARSIWA) RAIPUR 492099</p>
            <p>Mob.: 7024566009, 7024066009</p>
            <p>E-mail: bmscoldstorage@gmail.com</p>
          </div>
          <div class="row">
            <div class="label">Invoice No.</div><div class="value">${inv.invoiceNo}</div>
          </div>
          <div class="row">
            <div class="label">Date</div><div class="value">${formatSlipDate(inv.date)}</div>
          </div>
          <div class="row">
            <div class="label">Party Name</div><div class="value">${inv.partyName}</div>
            <div class="label" style="width: 120px; margin-left: 20px;">Product Name</div>
            <div class="value">${inv.productName || ""}</div>
          </div>
          <div class="row">
            <div class="label">Lot Number</div><div class="value">${inv.lotNumber}</div>
            <div class="label" style="width: 120px; margin-left: 20px;">Vehicle Number</div>
            <div class="value">${inv.vehicleNumber}</div>
          </div>
          <div class="row">
            <div class="label">Storage Period</div>
            <div class="value">${formatSlipDate(inv.storageFrom)} &nbsp; <strong>To</strong> &nbsp; ${formatSlipDate(inv.storageTo)}</div>
          </div>
          <div class="row">
            <div class="label">Total Storage Days</div><div class="value">${inv.totalDays || ""}</div>
          </div>
          ${tablesHtml}
          <div class="row" style="margin-top: 20px; font-size: 15px;">
            <div class="label">Grand Total (₹)</div>
            <div class="value" style="font-weight: bold; border-bottom: 2px solid #000;">${inv.grandTotal}</div>
          </div>
          <div class="row">
            <div class="label">Amount in Words</div><div class="value">${inv.amountInWords || ""}</div>
          </div>
          <div class="footer-row">
            <div class="footer-terms">
              <strong>Terms & Conditions</strong>
              <p style="margin: 2px 0;">Payment should be made within ___ days from the invoice date.</p>
              <p style="margin: 2px 0;">Late payments will attract interest as per company policy.</p>
              <p style="margin: 2px 0;">The company is not responsible for damages due to unforeseen circumstances.</p>
            </div>
            <div class="footer-signature">
              Authorized Signatory<br/>(For BMS Cold Storage)
            </div>
          </div>
          <div class="botivate-footer">
            Powered by <a href="https://botivate.in" target="_blank">Botivate</a>
          </div>
        </div>
      </body>
    </html>`;
  };

  const generateAndStorePdf = async (slip: InvoiceSlip & { tables?: InvoiceTableData[] }) => {
    const slipNumber = slip.invoiceNo;
    const fileName = `Invoice_${slipNumber}.pdf`;
    const html = getSlipHTML(slip);
    const pdfBlob = await html2pdf()
      .from(html)
      .set({ margin: 5, html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4" } })
      .outputPdf("blob");
    const { url } = await uploadPdfToDrive(pdfBlob, fileName);
    if (!url) throw new Error("PDF upload failed");
    return url;
  };

  const printSlip = async (slip: Slip) => {
    if (printingSlipId === slip.id) return;
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) {
      alert("Popup blocked. Please allow popups.");
      return;
    }
    pdfWindow.document.write(`
      <html><head><title>Opening PDF...</title>
        <style> body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center; background:#f9fafb; font-family:Arial; }
          .spinner { width:46px; height:46px; border:4px solid #d1d5db; border-top:4px solid #1e40af; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 14px; }
          .text { font-size:14px; color:#374151; } @keyframes spin { to { transform:rotate(360deg); } }
        </style></head><body><div><div class="spinner"></div><div class="text">Opening PDF…</div></div></body></html>`);
    try {
      setPrintingSlipId(slip.id);
      let pdfUrl = slip.pdfUrl;
      if (!pdfUrl) {
        alert("No PDF available for this invoice.");
        return;
      }
      setTimeout(() => pdfWindow.location.replace(pdfUrl), 300);
    } catch (err) {
      console.error(err);
      pdfWindow.document.body.innerHTML = `<p style="color:red;text-align:center;margin-top:40px;">Failed to open PDF.</p>`;
    } finally {
      setTimeout(() => setPrintingSlipId(null), 500);
    }
  };

  const convertToInputDate = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${year}-${month}-${day}`;
    }
    if (typeof d === "string" && d.includes("/")) {
      const parts = d.split("/");
      if (parts.length === 3) {
        const dd = parts[0].padStart(2, "0");
        const mm = parts[1].padStart(2, "0");
        const yyyy = parts[2];
        return `${yyyy}-${mm}-${dd}`;
      }
    }
    return d;
  };

  const handleEditSlip = (slip: Slip) => {
    setEditingSlip(slip);
    setInvoiceForm({
      invoiceNo: slip.invoiceNo || "",
      date: convertToInputDate(slip.date),
      partyName: slip.partyName || "",
      productName: slip.productName || "",
      lotNumber: slip.lotNumber || "",
      vehicleNumber: slip.vehicleNumber || "",
      storageFrom: convertToInputDate(slip.storageFrom),
      storageTo: convertToInputDate(slip.storageTo),
      totalDays: slip.totalDays || "",
    });

    const years = (slip.year || "").split(", ");
    const storageOtherMonthRates = (slip.storageOtherMonthRate || "").split(", ");
    const storageQtys = (slip.storageQty || "").split(", ");
    const offSeasonJanRates = (slip.offSeasonJanRate || "").split(", ");
    const offSeasonFebRates = (slip.offSeasonFebRate || "").split(", ");
    const offSeasonQtys = (slip.offSeasonQty || "").split(", ");
    const otherChargesOtherMonthRates = (slip.otherChargesOtherMonthRate || "").split(", ");
    const otherChargesQtys = (slip.otherChargesQty || "").split(", ");
    const hamaliOtherMonthRates = (slip.hamaliOtherMonthRate || "").split(", ");
    const hamaliQtys = (slip.hamaliQty || "").split(", ");

    const tables: InvoiceTableData[] = years.map((year, index) => ({
      id: `table-${index}-${Date.now()}`,
      year: year || "",
      storageOtherMonthRate: storageOtherMonthRates[index] || "",
      storageQty: storageQtys[index] || "",
      offSeasonJanRate: offSeasonJanRates[index] || "",
      offSeasonFebRate: offSeasonFebRates[index] || "",
      offSeasonQty: offSeasonQtys[index] || "",
      otherChargesOtherMonthRate: otherChargesOtherMonthRates[index] || "",
      otherChargesQty: otherChargesQtys[index] || "",
      hamaliOtherMonthRate: hamaliOtherMonthRates[index] || "",
      hamaliQty: hamaliQtys[index] || "",
    }));

    setInvoiceTables(
      tables.length
        ? tables
        : [
            {
              id: "table-1",
              year: slip.date ? new Date(slip.date).getFullYear().toString() : new Date().getFullYear().toString(),
              storageOtherMonthRate: "",
              storageQty: "",
              offSeasonJanRate: "",
              offSeasonFebRate: "",
              offSeasonQty: "",
              otherChargesOtherMonthRate: "",
              otherChargesQty: "",
              hamaliOtherMonthRate: "",
              hamaliQty: "",
            },
          ]
    );
    setShowInvoiceForm(true);
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    addLog("Submitting invoice...");
    try {
      const payload: any = {
        slipType: "Invoice",
        slipNo: invoiceForm.invoiceNo,
        date: invoiceForm.date,
        partyName: invoiceForm.partyName,
        productName: invoiceForm.productName,
        year: "'" + invoiceTables.map(t => t.year).join(", "),
        lotNumber: invoiceForm.lotNumber,
        vehicleNumber: invoiceForm.vehicleNumber,
        storageFrom: invoiceForm.storageFrom,
        storageTo: invoiceForm.storageTo,
        totalDays: invoiceForm.totalDays,
        offSeasonJanRate: "'" + invoiceTables.map(t => t.offSeasonJanRate || "0").join(", "),
        offSeasonFebRate: "'" + invoiceTables.map(t => t.offSeasonFebRate || "0").join(", "),
        offSeasonOtherMonthRate: "'" + invoiceTables.map(t => String(getOffSeasonOtherMonthRate(t.offSeasonJanRate, t.offSeasonFebRate))).join(", "),
        offSeasonQty: "'" + invoiceTables.map(t => t.offSeasonQty || "0").join(", "),
        storageOtherMonthRate: "'" + invoiceTables.map(t => t.storageOtherMonthRate || "0").join(", "),
        storageQty: "'" + invoiceTables.map(t => t.storageQty || "0").join(", "),
        otherChargesOtherMonthRate: "'" + invoiceTables.map(t => t.otherChargesOtherMonthRate || "0").join(", "),
        otherChargesQty: "'" + invoiceTables.map(t => t.otherChargesQty || "0").join(", "),
        hamaliOtherMonthRate: "'" + invoiceTables.map(t => t.hamaliOtherMonthRate || "0").join(", "),
        hamaliQty: "'" + invoiceTables.map(t => t.hamaliQty || "0").join(", "),
        storageCharges: "'" + invoiceTables.map(t => String(toNumber(t.storageOtherMonthRate) * toNumber(t.storageQty))).join(", "),
        offSeasonCharges: "'" + invoiceTables.map(t => String(getOffSeasonOtherMonthRate(t.offSeasonJanRate, t.offSeasonFebRate) * toNumber(t.offSeasonQty))).join(", "),
        otherCharges: "'" + invoiceTables.map(t => String(toNumber(t.otherChargesOtherMonthRate) * toNumber(t.otherChargesQty))).join(", "),
        hamaliCharges: "'" + invoiceTables.map(t => String(toNumber(t.hamaliOtherMonthRate) * toNumber(t.hamaliQty))).join(", "),
        totalAmount: "'" + invoiceTables.map(t => {
          const s = toNumber(t.storageOtherMonthRate) * toNumber(t.storageQty);
          const o = getOffSeasonOtherMonthRate(t.offSeasonJanRate, t.offSeasonFebRate) * toNumber(t.offSeasonQty);
          const h = toNumber(t.hamaliOtherMonthRate) * toNumber(t.hamaliQty);
          const ot = toNumber(t.otherChargesOtherMonthRate) * toNumber(t.otherChargesQty);
          return String(s + o + h + ot);
        }).join(", "),
        grandTotal: String(getGrandTotal()),
        amountInWords: getAmountInWords(),
        place: "", material: "", bharti: "", killa: "", dharamkataWeight: "", qty: "", rate: "", truckNo: "", driver: "", mobileNo: "", remarks: "",
        placeOut: "", materialReceive: "", jins: "", netWeight: "", qtyOut: "", taadWeight: "", truckNoOut: "", driverOut: "", remarksOut: "",
      };

      const slipForPdf: InvoiceSlip & { tables: InvoiceTableData[] } = {
        id: 0,
        slipType: "Invoice",
        invoiceNo: invoiceForm.invoiceNo,
        date: invoiceForm.date,
        partyName: invoiceForm.partyName,
        productName: invoiceForm.productName,
        lotNumber: invoiceForm.lotNumber,
        vehicleNumber: invoiceForm.vehicleNumber,
        storageFrom: invoiceForm.storageFrom,
        storageTo: invoiceForm.storageTo,
        totalDays: invoiceForm.totalDays,
        grandTotal: String(getGrandTotal()),
        amountInWords: getAmountInWords(),
        pdfUrl: "",
        createdAt: "",
        tables: invoiceTables,
      };

      const pdfUrl = await generateAndStorePdf(slipForPdf);
      payload.pdfUrl = pdfUrl;

      let saved = false;

      if (editingSlip) {
        const indexInState = slips.findIndex(s => s.autoSerial === editingSlip.autoSerial);
        if (indexInState === -1) {
          setError("Could not find original slip row");
          setSaving(false);
          return;
        }
        const rowIndex = indexInState + 3;
        
        const pad = (n: number) => String(n).padStart(2, "0");
        const now = new Date(editingSlip.createdAt || new Date());
        const formattedTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        
        const rowData = [
          formattedTimestamp,
          editingSlip.autoSerial,
          payload.slipType,
          payload.slipNo,
          payload.date,
          payload.partyName,
          payload.pdfUrl,
          payload.productName,
          payload.year,
          payload.lotNumber,
          payload.vehicleNumber,
          payload.storageFrom,
          payload.storageTo,
          payload.totalDays,
          payload.offSeasonJanRate,
          payload.offSeasonFebRate,
          payload.offSeasonOtherMonthRate,
          payload.offSeasonQty,
          payload.storageOtherMonthRate,
          payload.storageQty,
          payload.otherChargesOtherMonthRate,
          payload.otherChargesQty,
          payload.hamaliOtherMonthRate,
          payload.hamaliQty,
          payload.storageCharges,
          payload.offSeasonCharges,
          payload.otherCharges,
          payload.hamaliCharges,
          payload.totalAmount,
          payload.grandTotal,
          payload.amountInWords
        ];

        const updateParams = new URLSearchParams();
        updateParams.append("action", "update");
        updateParams.append("sheetName", "Invoice-Slip");
        updateParams.append("rowIndex", String(rowIndex));
        updateParams.append("rowData", JSON.stringify(rowData));

        const res = await fetch(SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: updateParams.toString()
        });
        const text = await res.text();
        if (!text || text.trim() === "") {
          saved = true;
        } else {
          try {
            const data = JSON.parse(text);
            saved = data.success;
          } catch {
            saved = false;
          }
        }
      } else {
        saved = await saveSlipToSheet(payload);
      }

      if (!saved) {
        setError("Saving failed – check logs");
        toast.error("Failed to save invoice to spreadsheet.");
        setSaving(false);
        return;
      }

      await fetchSlips();
      setEditingSlip(null);
      setInvoiceForm({
        invoiceNo: "",
        date: new Date().toISOString().split("T")[0],
        partyName: "",
        productName: "",
        lotNumber: "",
        vehicleNumber: "",
        storageFrom: "",
        storageTo: "",
        totalDays: "",
      });
      setInvoiceTables([
        {
          id: "table-1",
          year: new Date().getFullYear().toString(),
          storageOtherMonthRate: "", storageQty: "", offSeasonJanRate: "", offSeasonFebRate: "",
          offSeasonQty: "", otherChargesOtherMonthRate: "", otherChargesQty: "",
          hamaliOtherMonthRate: "", hamaliQty: "",
        },
      ]);
      setShowInvoiceForm(false);
      toast.success("Invoice saved & PDF generated successfully!");
    } catch (err: any) {
      setError(err.message);
      addLog(`❌ Submit error: ${err.message}`);
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredSlips = slips.filter((slip) => {
    if (!slip.date || slip.date === "1970-01-01" || (!slip.partyName && !slip.invoiceNo)) return false;
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const fields = [
        slip.partyName, slip.invoiceNo, slip.productName,
        slip.vehicleNumber, slip.grandTotal,
      ];
      if (!fields.some((f) => (f || "").toLowerCase().includes(query))) return false;
    }
    if (filterDate) {
      let slipDateObj: Date | null = null;
      if (slip.date.includes("-")) slipDateObj = new Date(slip.date);
      else if (slip.date.includes("/")) {
        const [dd, mm, yyyy] = slip.date.split("/");
        slipDateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      }
      if (!slipDateObj || isNaN(slipDateObj.getTime())) return false;
      const selectedDateObj = new Date(filterDate);
      slipDateObj.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);
      if (slipDateObj.getTime() !== selectedDateObj.getTime()) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!SCRIPT_URL || !SHEET_ID || !GOOGLE_API_KEY ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 flex items-center gap-3">
          <AlertTriangle size={20} />
          <span>
            <strong>Missing environment variables:</strong> Check <code>.env</code> for VITE_APP_SCRIPT_URL, VITE_SHEET_ID, VITE_GOOGLE_API_KEY.
          </span>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 bg-white border-b border-gray-200">
        {/* Title row */}
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Invoice Management</h1>
          <button
            onClick={() => {
              setEditingSlip(null);
              setInvoiceForm({
                invoiceNo: "",
                date: new Date().toISOString().split("T")[0],
                partyName: "",
                productName: "",
                lotNumber: "",
                vehicleNumber: "",
                storageFrom: "",
                storageTo: "",
                totalDays: "",
              });
              setInvoiceTables([
                {
                  id: "table-1",
                  year: new Date().getFullYear().toString(),
                  storageOtherMonthRate: "", storageQty: "", offSeasonJanRate: "", offSeasonFebRate: "",
                  offSeasonQty: "", otherChargesOtherMonthRate: "", otherChargesQty: "",
                  hamaliOtherMonthRate: "", hamaliQty: "",
                },
              ]);
              setShowInvoiceForm(true);
            }}
            className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white font-semibold rounded-md shadow transition-colors flex items-center gap-2"
          >
            <span className="text-lg">➕</span> Invoice
          </button>
        </div>
        {/* Search & Date Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Party, Invoice No, Product, Vehicle, Total..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full mb-4"></div>
            <p className="text-gray-500">Loading invoices...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">{error}</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-xs font-semibold text-center text-gray-600 uppercase">Actions</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Serial No</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Slip Type</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Slip No</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Date</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Party Name</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">PDF</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Product-Name</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Year</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Lot No</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Vehicle No</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">From</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">To</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Storage Days</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(OS) Jan Rate</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(OS) Feb Rate</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(OS) Other Months</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(OS) QTY</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(SC) Other Months</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(SC) QTY</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(OC) Other Months</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(OC) QTY</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(HC) Other Months</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(HC) QTY</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(SC) Amount</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(OS) Amount</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(OC) Amount</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">(HC) Amount</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Total Amount</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Grand Total</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Amount in Words</th>
                    <th className="px-3 py-3 text-xs font-semibold text-center text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSlips.slice(1).length === 0 ? (
                    <tr>
                      <td colSpan={32} className="text-center py-8 text-gray-500">No invoices found.</td>
                    </tr>
                  ) : (
                    filteredSlips.slice(1).map((slip) => (
                      <tr key={slip.id} className="hover:bg-gray-50 transition-colors text-xs">
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleEditSlip(slip)}
                            title="Edit slip"
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            <Pencil size={15} />
                            <span className="hidden md:inline">Edit</span>
                          </button>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{slip.autoSerial}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.slipTypeLabel || "Invoice"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.invoiceNo}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatSlipDate(slip.date)}</td>
                        <td className="px-3 py-2 whitespace-nowrap max-w-[150px] truncate" title={slip.partyName}>{slip.partyName}</td>
                        <td className="px-3 py-2 whitespace-nowrap truncate max-w-[120px]">{slip.pdfUrl ? <a href={slip.pdfUrl} target="_blank" className="text-blue-600 hover:underline">Link</a> : "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap max-w-[150px] truncate" title={slip.productName}>{slip.productName || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.year || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.lotNumber || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.vehicleNumber || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatSlipDate(slip.storageFrom) || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatSlipDate(slip.storageTo) || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.totalDays || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.offSeasonJanRate || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.offSeasonFebRate || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.offSeasonOtherMonthRate || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.offSeasonQty || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.storageOtherMonthRate || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.storageQty || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.otherChargesOtherMonthRate || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.otherChargesQty || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.hamaliOtherMonthRate || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.hamaliQty || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{slip.storageCharges || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{slip.offSeasonCharges || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{slip.otherCharges || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{slip.hamaliCharges || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-bold">{slip.totalAmount || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-bold text-blue-700">{slip.grandTotal}</td>
                        <td className="px-3 py-2 whitespace-nowrap truncate max-w-[180px]" title={slip.amountInWords}>{slip.amountInWords || "-"}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => printSlip(slip)}
                            disabled={printingSlipId === slip.id}
                            className={`inline-flex items-center gap-1 text-sm font-medium \${
                              printingSlipId === slip.id ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-800"
                            }`}
                          >
                            {printingSlipId === slip.id ? (
                              <span className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                              <Printer size={16} />
                            )}
                            <span className="hidden md:inline">Print</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========== INVOICE FORM MODAL ========== */}
      {showInvoiceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto relative animate-fadeIn">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-800">New Invoice</h2>
              <button onClick={() => setShowInvoiceForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 md:p-6">
              <div className="bg-white rounded-lg border-2 border-black">
                <div className="text-center border-2 border-black m-4 p-4">
                  <h2 className="text-xl md:text-2xl font-bold">BMS COLD STORAGE</h2>
                  <p className="text-xs md:text-sm">(A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)</p>
                  <p className="text-xs md:text-sm">Village - BANA (DHARSIWA) RAIPUR 492099</p>
                  <p className="text-xs md:text-sm">Mob.: 7024566009, 7024066009</p>
                  <p className="text-xs md:text-sm">E-mail: bmscoldstorage@gmail.com</p>
                </div>

                <form onSubmit={handleInvoiceSubmit} className="px-4 md:px-6 pb-6 space-y-3">
                  {/* Invoice No & Date */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">Invoice No.</label>
                      <input type="text" value={invoiceForm.invoiceNo} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })} className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-blue-600 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">Date</label>
                      <input type="date" value={invoiceForm.date} onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })} className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-blue-600 text-sm" />
                    </div>
                  </div>

                  {/* Party Name & Product Name */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">Party Name</label>
                      <input type="text" value={invoiceForm.partyName} onChange={(e) => setInvoiceForm({ ...invoiceForm, partyName: e.target.value })} className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-blue-600 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">Product Name</label>
                      <input type="text" value={invoiceForm.productName} onChange={(e) => setInvoiceForm({ ...invoiceForm, productName: e.target.value })} className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-blue-600 text-sm" />
                    </div>
                  </div>

                  {/* Lot No & Vehicle No */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">Lot Number</label>
                      <input type="text" value={invoiceForm.lotNumber} onChange={(e) => setInvoiceForm({ ...invoiceForm, lotNumber: e.target.value })} className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-blue-600 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">Vehicle Number</label>
                      <input type="text" value={invoiceForm.vehicleNumber} onChange={(e) => setInvoiceForm({ ...invoiceForm, vehicleNumber: e.target.value })} className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-blue-600 text-sm" />
                    </div>
                  </div>

                  {/* Storage Period */}
                  <div className="flex flex-col md:flex-row gap-2 items-center">
                    <label className="w-full md:w-48 font-bold text-xs md:text-sm">Storage Period: From</label>
                    <input type="date" value={invoiceForm.storageFrom} onChange={(e) => setInvoiceForm({ ...invoiceForm, storageFrom: e.target.value })} className="flex-1 px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-blue-600 text-sm" />
                    <span className="font-bold text-xs md:text-sm">To</span>
                    <input type="date" value={invoiceForm.storageTo} onChange={(e) => setInvoiceForm({ ...invoiceForm, storageTo: e.target.value })} className="flex-1 px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-blue-600 text-sm" />
                  </div>

                  {/* Total Days (read-only) */}
                  <div className="flex flex-col md:flex-row md:items-center">
                    <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">Total Storage Days</label>
                    <input type="text" value={invoiceForm.totalDays} readOnly className="flex-1 px-2 py-1.5 bg-gray-100 border-b-2 border-black focus:outline-none text-sm font-semibold" />
                  </div>

                  {/* Year‑wise Tables */}
                  <div className="mt-4 space-y-6">
                    {invoiceTables.map((table, index) => (
                      <div key={table.id} className="relative border-b-4 border-dashed border-gray-300 pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <label className="font-bold text-xs md:text-sm">Year:</label>
                            <input
                              type="text"
                              value={table.year}
                              onChange={(e) => {
                                const newTables = [...invoiceTables];
                                newTables[index].year = e.target.value;
                                setInvoiceTables(newTables);
                              }}
                              className="w-24 px-2 py-1 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                            />
                          </div>
                          {index > 0 && (
                            <button type="button" onClick={() => setInvoiceTables(invoiceTables.filter((_, i) => i !== index))} className="p-1 text-red-600 hover:bg-red-50 rounded">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                        <table className="w-full border-collapse border-2 border-black table-fixed">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-black px-2 py-2 text-xs font-bold text-left">Description</th>
                              <th className="border border-black px-2 py-2 text-xs font-bold text-left">Jan (Rate)</th>
                              <th className="border border-black px-2 py-2 text-xs font-bold text-left">Feb (Rate)</th>
                              <th className="border border-black px-2 py-2 text-xs font-bold text-left">Other Months</th>
                              <th className="border border-black px-2 py-2 text-xs font-bold text-left">Qty (Bag)</th>
                              <th className="border border-black px-2 py-2 text-xs font-bold text-left">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Storage Charges */}
                            <tr>
                              <td className="border border-black px-2 py-2 text-xs font-bold">Storage Charges</td>
                              <td className="border border-black px-2 py-2"></td>
                              <td className="border border-black px-2 py-2"></td>
                              <td className="border border-black px-2 py-2">
                                <input type="text" value={table.storageOtherMonthRate}
                                  onChange={(e) => { const newTables = [...invoiceTables]; newTables[index].storageOtherMonthRate = e.target.value; setInvoiceTables(newTables); }}
                                  className="w-full bg-transparent border-0 border-b border-black px-1 py-0.5 text-xs text-center focus:outline-none" />
                              </td>
                              <td className="border border-black px-2 py-2">
                                <input type="text" value={table.storageQty}
                                  onChange={(e) => { const newTables = [...invoiceTables]; newTables[index].storageQty = e.target.value; setInvoiceTables(newTables); }}
                                  className="w-full bg-transparent border-0 border-b border-black px-1 py-0.5 text-xs text-center focus:outline-none" />
                              </td>
                              <td className="border border-black px-2 py-2 text-xs text-center">
                                {table.storageOtherMonthRate && table.storageQty ? toNumber(table.storageOtherMonthRate) * toNumber(table.storageQty) : ""}
                              </td>
                            </tr>
                            {/* Off Season Charges */}
                            <tr>
                              <td className="border border-black px-2 py-2 text-xs font-bold">Off Season Charges</td>
                              <td className="border border-black px-2 py-2">
                                <input type="text" value={table.offSeasonJanRate} onChange={(e) => { const newTables = [...invoiceTables]; newTables[index].offSeasonJanRate = e.target.value; setInvoiceTables(newTables); }} className="w-full bg-transparent border-0 border-b border-black px-1 py-0.5 text-xs text-center focus:outline-none" />
                              </td>
                              <td className="border border-black px-2 py-2">
                                <input type="text" value={table.offSeasonFebRate} onChange={(e) => { const newTables = [...invoiceTables]; newTables[index].offSeasonFebRate = e.target.value; setInvoiceTables(newTables); }} className="w-full bg-transparent border-0 border-b border-black px-1 py-0.5 text-xs text-center focus:outline-none" />
                              </td>
                              <td className="border border-black px-2 py-2 text-xs text-center">{getOffSeasonOtherMonthRate(table.offSeasonJanRate, table.offSeasonFebRate) || ""}</td>
                              <td className="border border-black px-2 py-2">
                                <input type="text" value={table.offSeasonQty} onChange={(e) => { const newTables = [...invoiceTables]; newTables[index].offSeasonQty = e.target.value; setInvoiceTables(newTables); }} className="w-full bg-transparent border-0 border-b border-black px-1 py-0.5 text-xs text-center focus:outline-none" />
                              </td>
                              <td className="border border-black px-2 py-2 text-xs text-center">
                                {(table.offSeasonJanRate || table.offSeasonFebRate) && table.offSeasonQty
                                  ? getOffSeasonOtherMonthRate(table.offSeasonJanRate, table.offSeasonFebRate) * toNumber(table.offSeasonQty) : ""}
                              </td>
                            </tr>
                            {/* Other Charges */}
                            <tr>
                              <td className="border border-black px-2 py-2 text-xs font-bold">Other Charges</td>
                              <td className="border border-black px-2 py-2"></td>
                              <td className="border border-black px-2 py-2"></td>
                              <td className="border border-black px-2 py-2">
                                <input type="text" value={table.otherChargesOtherMonthRate} onChange={(e) => { const newTables = [...invoiceTables]; newTables[index].otherChargesOtherMonthRate = e.target.value; setInvoiceTables(newTables); }} className="w-full bg-transparent border-0 border-b border-black px-1 py-0.5 text-xs text-center focus:outline-none" />
                              </td>
                              <td className="border border-black px-2 py-2">
                                <input type="text" value={table.otherChargesQty} onChange={(e) => { const newTables = [...invoiceTables]; newTables[index].otherChargesQty = e.target.value; setInvoiceTables(newTables); }} className="w-full bg-transparent border-0 border-b border-black px-1 py-0.5 text-xs text-center focus:outline-none" />
                              </td>
                              <td className="border border-black px-2 py-2 text-xs text-center">
                                {table.otherChargesOtherMonthRate && table.otherChargesQty ? toNumber(table.otherChargesOtherMonthRate) * toNumber(table.otherChargesQty) : ""}
                              </td>
                            </tr>
                            {/* Hamali Charges */}
                            <tr>
                              <td className="border border-black px-2 py-2 text-xs font-bold">Hamali Charges</td>
                              <td className="border border-black px-2 py-2"></td>
                              <td className="border border-black px-2 py-2"></td>
                              <td className="border border-black px-2 py-2">
                                <input type="text" value={table.hamaliOtherMonthRate} onChange={(e) => { const newTables = [...invoiceTables]; newTables[index].hamaliOtherMonthRate = e.target.value; setInvoiceTables(newTables); }} className="w-full bg-transparent border-0 border-b border-black px-1 py-0.5 text-xs text-center focus:outline-none" />
                              </td>
                              <td className="border border-black px-2 py-2">
                                <input type="text" value={table.hamaliQty} onChange={(e) => { const newTables = [...invoiceTables]; newTables[index].hamaliQty = e.target.value; setInvoiceTables(newTables); }} className="w-full bg-transparent border-0 border-b border-black px-1 py-0.5 text-xs text-center focus:outline-none" />
                              </td>
                              <td className="border border-black px-2 py-2 text-xs text-center">
                                {table.hamaliOtherMonthRate && table.hamaliQty ? toNumber(table.hamaliOtherMonthRate) * toNumber(table.hamaliQty) : ""}
                              </td>
                            </tr>
                            {/* Table Total */}
                            <tr>
                              <td colSpan={5} className="border border-black px-2 py-2 text-center font-bold text-xs">Table Total Amount</td>
                              <td className="border border-black px-2 py-2 font-bold text-center text-xs">
                                {(toNumber(table.storageOtherMonthRate) * toNumber(table.storageQty)) +
                                  (getOffSeasonOtherMonthRate(table.offSeasonJanRate, table.offSeasonFebRate) * toNumber(table.offSeasonQty)) +
                                  (toNumber(table.hamaliOtherMonthRate) * toNumber(table.hamaliQty)) +
                                  (toNumber(table.otherChargesOtherMonthRate) * toNumber(table.otherChargesQty))}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))}

                    <div className="flex items-center justify-end gap-3">
                      <span className="text-xs font-bold text-gray-600">Tables: {invoiceTables.length}/15</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (invoiceTables.length < 15) {
                            const lastYear = invoiceTables[invoiceTables.length - 1].year;
                            const nextYear = String(toNumber(lastYear) + 1);
                            setInvoiceTables([...invoiceTables, {
                              id: `table-\${Date.now()}`,
                              year: isNaN(Number(nextYear)) ? "" : nextYear,
                              storageOtherMonthRate: "", storageQty: "", offSeasonJanRate: "", offSeasonFebRate: "",
                              offSeasonQty: "", otherChargesOtherMonthRate: "", otherChargesQty: "",
                              hamaliOtherMonthRate: "", hamaliQty: "",
                            }]);
                          }
                        }}
                        disabled={invoiceTables.length >= 15}
                        className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded shadow disabled:opacity-50"
                      >
                        Add+
                      </button>
                    </div>
                  </div>

                  {/* Grand Total & Amount in Words */}
                  <div className="flex flex-col md:flex-row md:items-center mt-4">
                    <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">Grand Total (₹)</label>
                    <div className="flex-1 px-2 py-1.5 bg-white border-b-2 border-black font-bold text-sm">{getGrandTotal()}</div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center">
                    <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">Amount in Words</label>
                    <div className="flex-1 px-2 py-1.5 bg-gray-50 border-b-2 border-black text-sm font-semibold">{getAmountInWords()}</div>
                  </div>

                  {/* Terms & Submit */}
                  <div className="mt-4">
                    <p className="font-bold text-xs md:text-sm mb-1">Terms & Conditions</p>
                    <p className="text-xs md:text-sm">Payment within ___ days. Late payment attracts interest. Company not responsible for unforeseen damages.</p>
                  </div>
                  <div className="text-center mt-6 pt-4 border-t-2 border-black">
                    <p className="font-bold text-xs md:text-sm">Authorized Signatory</p>
                    <p className="text-xs md:text-sm mb-4">(For BMS Cold Storage)</p>
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => setShowInvoiceForm(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                      <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-800 hover:bg-blue-900 text-white font-semibold rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        {saving ? "Saving..." : "Save Invoice"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;