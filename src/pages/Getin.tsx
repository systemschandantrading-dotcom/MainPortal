// Getin.tsx
import { useState, useEffect, useCallback } from "react";
import { Search, Printer, X, AlertTriangle, Pencil, Loader2 } from "lucide-react";
import html2pdf from "html2pdf.js";

// ---------- Environment ----------
const SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL as string | undefined;
const SHEET_ID = import.meta.env.VITE_SHEET_ID as string;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;
const DRIVE_FOLDER_ID = "1trTkjeNIjmT15fcGMgYZOIHVPqScK1Kb";

//url
if (!SCRIPT_URL) console.error("❌ VITE_APP_SCRIPT_URL is missing.");
if (!SHEET_ID) console.error("❌ VITE_SHEET_ID is missing.");
if (!GOOGLE_API_KEY) console.error("❌ VITE_GOOGLE_API_KEY is missing.");

// ---------- Types ----------
interface GetInSlip {
  id: number;
  slipType: "Get In";
  serialNo: string;
  slipNo: string;
  date: string;
  partyName: string;
  pdfUrl?: string;
  receiver: string;
  jinse: string;
  bharti: string;
  killa: string;
  dharamkataWeight: string;
  taadaWeightQty: string;
  taadaWeightRate: string;
  truckNo: string;
  driver: string;
  mobileNo: string;
  remarks: string;
  createdAt: string;
}

type Slip = GetInSlip & { pdfUrl?: string };

// ---------- Helpers ----------
const formatSlipDate = (d: string) => {
  if (!d) return "";
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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

// Convert Google Sheets date serial number to YYYY-MM-DD
const sheetSerialToDate = (val: any): string => {
  if (!val) return "";
  if (typeof val === "number") {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  return String(val).trim();
};

const GetIn = () => {
  // ---------- State ----------
  const [slips, setSlips] = useState<Slip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showGetInForm, setShowGetInForm] = useState(false);
  const [printingSlipId, setPrintingSlipId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Edit mode: holds the slip being edited (null = new slip)
  const [editingSlip, setEditingSlip] = useState<Slip | null>(null);

  const addLog = (msg: string) => {};

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Form state
  const [getInForm, setGetInForm] = useState({
    slipNo: "",
    date: new Date().toISOString().split("T")[0],
    partyName: "",
    receiver: "",
    jinse: "",
    bharti: "",
    killa: "",
    dharamkataWeight: "",
    taadaWeightQty: "",
    taadaWeightRate: "",
    truckNo: "",
    driver: "",
    mobileNo: "",
    remarks: "",
  });

  // ---------- API Calls ----------
  const saveSlipToSheet = async (payload: any) => {
    if (!SCRIPT_URL) throw new Error("Script URL is missing");
    addLog(`Saving: ${JSON.stringify(payload).substring(0, 120)}...`);
    const formData = new FormData();
    formData.append("action", "addNewSlipFull");
    formData.append("payload", JSON.stringify(payload));
    const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
    const text = await res.text();
    addLog(`Response: ${text.substring(0, 200)}`);
    if (!text || text.trim() === "") return true;
    try {
      const data = JSON.parse(text);
      if (data.success === false) {
        addLog(`❌ Server error: ${data.error}`);
        alert("Error saving slip: " + (data.error || "Unknown error"));
        return false;
      }
      addLog("✅ Saved successfully");
      return true;
    } catch {
      addLog("⚠️ Non-JSON response");
      return false;
    }
  };

  // ---------- Update existing slip (no timestamp change) ----------
  const updateSlipInSheet = async (payload: any) => {
    if (!SCRIPT_URL) throw new Error("Script URL is missing");
    
    try {
      addLog(`Finding row for Serial: ${payload.serialNo}...`);
      // 1. Fetch the specific sheet to find the rowIndex
      const sheetName = "Get-In-Slip";
      const fetchUrl = `${SCRIPT_URL}${SCRIPT_URL.includes("?") ? "&" : "?"}action=fetch&sheet=${sheetName}`;
      const fetchRes = await fetch(fetchUrl);
      const fetchData = await fetchRes.json();
      
      if (!fetchData.success) {
        throw new Error("Could not fetch sheet data to find row.");
      }

      const rows = fetchData.data;
      let rowIndex = -1;
      // Serial No is in Column B (index 1)
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][1]).trim() === String(payload.serialNo).trim()) {
          rowIndex = i + 1; // Apps Script rows are 1-indexed
          break;
        }
      }

      if (rowIndex === -1) {
        throw new Error(`Slip ${payload.serialNo} not found in ${sheetName}.`);
      }

      addLog(`Found at Row ${rowIndex}. Sending update...`);

      // 2. Prepare rowData array (index matches Column A, B, C...)
      // Based on your backend: A:TS, B:Serial, C:Type, D:No, E:Date, F:Party, G:PDF, H:Receiver, I:Jinse, J:Bharti, K:Killa...
      // Sending "" for a column will cause the backend's updateRow to skip it (preserving original value).
      const rowData = [
        "", // A: Timestamp (PRESERVE)
        "", // B: Serial No (PRESERVE)
        "", // C: Slip Type (PRESERVE)
        "", // D: Slip No (PRESERVE)
        "", // E: Date (PRESERVE)
        payload.partyName || "",         // F: Party Name
        payload.pdfUrl || "",            // G: PDF
        payload.receiver || "",          // H: Receiver
        payload.jinse || "",             // I: Jinse
        payload.bharti || "",            // J: Bharti
        payload.killa || "",             // K: Killa
        payload.dharamkataWeight || "",  // L: Dharamkata Weight
        payload.taadaWeightQty || "",    // M: Taada Weight (QTY)
        payload.taadaWeightRate || "",   // N: Taada Weight (Rate)
        payload.truckNo || "",           // O: Truck No.
        payload.driver || "",            // P: Driver
        payload.mobileNo || "",          // Q: Mobile No.
        payload.remarks || "",           // R: Remarks
      ];

      // 3. Call the generic 'update' action
      const formData = new FormData();
      formData.append("action", "update");
      formData.append("sheetName", sheetName);
      formData.append("rowIndex", rowIndex.toString());
      formData.append("rowData", JSON.stringify(rowData));

      const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
      const text = await res.text();
      addLog(`Update response: ${text.substring(0, 200)}`);
      
      if (!text || text.trim() === "") return true;
      try {
        const data = JSON.parse(text);
        if (data.success === false) {
          addLog(`❌ Update error: ${data.error}`);
          alert("Error updating slip: " + (data.error || "Unknown error"));
          return false;
        }
        addLog("✅ Updated successfully");
        return true;
      } catch {
        addLog("⚠️ Non-JSON update response");
        return false;
      }
    } catch (err: any) {
      addLog(`❌ Update catch: ${err.message}`);
      alert("Update failed: " + err.message);
      return false;
    }
  };

  // ⭐ NEW: Fetch slip history directly from Google Sheets
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
      
      if (data.success && Array.isArray(data.slips)) {
        const formatted: Slip[] = data.slips
          .filter((s: any) => s.slipType === "Get In")
          .slice(1)
          .map((s: any, index: number) => ({
            id: index + 1,
            slipType: "Get In",
            serialNo: String(s.serialNo || "").trim(),
            slipNo: String(s.slipNo || "").trim(),
            date: String(s.date || "").trim(),
            partyName: String(s.partyName || "").trim(),
            pdfUrl: String(s.pdfUrl || "").trim(),
            receiver: String(s.receiver || "").trim(),
            jinse: String(s.jinse || "").trim(),
            bharti: String(s.bharti || "").trim(),
            killa: String(s.killa || "").trim(),
            dharamkataWeight: String(s.dharamkataWeight || "").trim(),
            taadaWeightQty: String(s.taadaWeightQty || "").trim(),
            taadaWeightRate: String(s.taadaWeightRate || "").trim(),
            truckNo: String(s.truckNo || "").trim(),
            driver: String(s.driver || "").trim(),
            mobileNo: String(s.mobileNo || "").trim(),
            remarks: String(s.remarks || "").trim(),
            createdAt: String(s.timestamp || s.createdAt || "").trim(),
          }));
        
        setSlips(formatted);
        addLog(`Loaded ${formatted.length} Get-In slips via Apps Script.`);
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
    const formData = new FormData();
    formData.append("action", "handleFileUpload");
    formData.append("base64Data", base64Data);
    formData.append("fileName", fileName);
    formData.append("mimeType", "application/pdf");
    formData.append("folderId", DRIVE_FOLDER_ID);
    const res = await fetch(SCRIPT_URL!, { method: "POST", body: formData });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!data.success) throw new Error("PDF upload failed: " + data.error);
    return { url: data.fileUrl };
  };

  const getSlipHTML = (slip: GetInSlip) => `
    <html>
      <head>
        <title>Get In Slip</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { margin: 0; font-family: Arial, sans-serif; }
          .pdf-page { padding: 18px 22px; border: 2px solid #000; background-color: #fff7c2; }
          .header { text-align: center; margin-bottom: 12px; }
          .divider { border-top: 2px solid #000; margin: 10px 0; }
          .row { display: flex; margin-bottom: 9px; font-size: 13px; }
          .label { width: 180px; font-weight: bold; }
          .value { flex:1; border-bottom:1px solid #000; padding:4px 6px; }
        </style>
      </head>
      <body>
        <div class="pdf-page">
          <div class="header">
            <strong>आवक पर्ची / Provisional Receipt</strong>
            <h2>BMS COLD STORAGE</h2>
            <p>(A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)</p>
            <p>Village - BANA (DHARSIWA) RAIPUR 492099</p>
          </div>
          <div class="divider"></div>
          <div class="row"><div class="label">क्र. (Serial No):</div><div class="value">${slip.serialNo}</div><div class="label">दिनांक:</div><div class="value">${formatSlipDate(slip.date)}</div></div>
          <div class="row"><div class="label">पार्टी का नाम:</div><div class="value">${slip.partyName}</div></div>
          <div class="row"><div class="label">मार्फत / एजेंट:</div><div class="value">${slip.receiver || ""}</div></div>
          <div class="row"><div class="label">जिन्स:</div><div class="value">${slip.jinse}</div></div>
          <div class="row"><div class="label">भरती:</div><div class="value">${slip.bharti || ""}</div></div>
          <div class="row"><div class="label">किल्ला:</div><div class="value">${slip.killa || ""}</div></div>
          <div class="row"><div class="label">धरमकाँटा वजन:</div><div class="value">${slip.dharamkataWeight || ""}</div></div>
          <div class="row"><div class="label">ताड़ वजन (Qty/Rate):</div><div class="value">${slip.taadaWeightQty} / ${slip.taadaWeightRate}</div></div>
          <div class="row"><div class="label">ट्रक नं.:</div><div class="value">${slip.truckNo}</div></div>
          <div class="row"><div class="label">ड्राइवर:</div><div class="value">${slip.driver || ""}</div></div>
          <div class="row"><div class="label">मोबाइल नं.:</div><div class="value">${slip.mobileNo || ""}</div></div>
          <div class="row"><div class="label">रिमार्क्स:</div><div class="value">${slip.remarks || ""}</div></div>
          <div class="footer-sign" style="display:flex; justify-content:space-between; margin-top:40px; font-weight:bold;">
            <div>प्रतिनिधि / ड्राइवर</div>
            <div>प्रबंधक</div>
          </div>
        </div>
      </body>
    </html>`;

  const generateAndStorePdf = async (slip: GetInSlip) => {
    const slipNumber = slip.slipNo || slip.serialNo;
    const fileName = `Get_In_${slipNumber}.pdf`;
    const html = getSlipHTML(slip);
    const pdfBlob = await html2pdf()
      .from(html)
      .set({ margin: 5, html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4" } })
      .outputPdf("blob");
    const { url } = await uploadPdfToDrive(pdfBlob, fileName);
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
        pdfUrl = await generateAndStorePdf(slip as GetInSlip);
        setSlips((prev) => prev.map((s) => (s.id === slip.id ? { ...s, pdfUrl } : s)));
      }
      setTimeout(() => pdfWindow.location.replace(pdfUrl), 300);
    } catch (err) {
      console.error(err);
      pdfWindow.document.body.innerHTML = `<p style="color:red;text-align:center;margin-top:40px;">Failed to open PDF.</p>`;
    } finally {
      setTimeout(() => setPrintingSlipId(null), 500);
    }
  };

  // ---------- Open edit modal ----------
  const handleEditClick = (slip: Slip) => {
    setEditingSlip(slip);
    setGetInForm({
      slipNo: slip.slipNo,
      date: slip.date,
      partyName: slip.partyName,
      receiver: slip.receiver,
      jinse: slip.jinse,
      bharti: slip.bharti,
      killa: slip.killa,
      dharamkataWeight: slip.dharamkataWeight,
      taadaWeightQty: slip.taadaWeightQty,
      taadaWeightRate: slip.taadaWeightRate,
      truckNo: slip.truckNo,
      driver: slip.driver,
      mobileNo: slip.mobileNo,
      remarks: slip.remarks,
    });
    setShowGetInForm(true);
  };

  const resetForm = () => {
    setGetInForm({
      slipNo: "",
      date: new Date().toISOString().split("T")[0],
      partyName: "",
      receiver: "",
      jinse: "",
      bharti: "",
      killa: "",
      dharamkataWeight: "",
      taadaWeightQty: "",
      taadaWeightRate: "",
      truckNo: "",
      driver: "",
      mobileNo: "",
      remarks: "",
    });
    setEditingSlip(null);
    setShowGetInForm(false);
  };

  // ---------- Submit (new or edit) ----------
  const handleGetInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (editingSlip) {
      // ---- EDIT MODE: update fields, do NOT touch timestamp ----
      addLog("Edit submit started");
      try {
        // 1. Prepare data for PDF
        const slipForPdf: GetInSlip = {
          ...editingSlip,
          ...getInForm,
          slipType: "Get In",
        };

        // 2. Generate and upload new PDF
        addLog("Generating updated PDF...");
        const newPdfUrl = await generateAndStorePdf(slipForPdf);
        addLog(`New PDF uploaded: ${newPdfUrl}`);

        // 3. Update the sheet with new fields AND new PDF URL
        const updatePayload = {
          slipType: "Get In",
          serialNo: editingSlip.serialNo, // used to find the row
          partyName: getInForm.partyName,
          receiver: getInForm.receiver,
          jinse: getInForm.jinse,
          bharti: getInForm.bharti,
          killa: getInForm.killa,
          dharamkataWeight: getInForm.dharamkataWeight,
          taadaWeightQty: getInForm.taadaWeightQty,
          taadaWeightRate: getInForm.taadaWeightRate,
          truckNo: getInForm.truckNo,
          driver: getInForm.driver,
          mobileNo: getInForm.mobileNo,
          remarks: getInForm.remarks,
          pdfUrl: newPdfUrl, // Replace the old URL
        };
        const updated = await updateSlipInSheet(updatePayload);
        if (!updated) {
          setError("Update failed – check logs");
          return;
        }
        await fetchSlips();
        resetForm();
        alert("Get In slip updated!");
      } catch (err: any) {
        setError(err.message);
        addLog(`❌ Edit error: ${err.message}`);
      } finally {
        setSaving(false);
      }
      return;
    }

    // ---- NEW MODE ----
    addLog("Submit started");
    try {
      const payload = {
        slipType: "Get In",
        slipNo: getInForm.slipNo,
        date: getInForm.date,
        partyName: getInForm.partyName,
        receiver: getInForm.receiver,
        jinse: getInForm.jinse,
        bharti: getInForm.bharti,
        killa: getInForm.killa,
        dharamkataWeight: getInForm.dharamkataWeight,
        taadaWeightQty: getInForm.taadaWeightQty,
        taadaWeightRate: getInForm.taadaWeightRate,
        truckNo: getInForm.truckNo,
        driver: getInForm.driver,
        mobileNo: getInForm.mobileNo,
        remarks: getInForm.remarks,
      };

      const slipForPdf: GetInSlip = {
        id: 0,
        slipType: "Get In",
        serialNo: "",
        ...payload,
        createdAt: "",
      };

      const pdfUrl = await generateAndStorePdf(slipForPdf);
      const finalPayload = { ...payload, pdfUrl };
      const saved = await saveSlipToSheet(finalPayload);
      if (!saved) {
        setError("Saving failed – check logs");
        return;
      }

      await fetchSlips();
      resetForm();
      alert("Get In slip saved!");
    } catch (err: any) {
      setError(err.message);
      addLog(`❌ Submit error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ---------- Filters ----------
  const filteredSlips = slips.filter((slip) => {
    if (!slip.date || slip.date === "1970-01-01" || (!slip.partyName && !slip.slipNo)) return false;
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const fields = [
        slip.partyName, slip.serialNo, slip.slipNo,
        slip.receiver, slip.jinse, slip.truckNo,
        slip.driver, slip.mobileNo, slip.remarks
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

  // ---------- Render ----------
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
      
      {/* Saving Overlay */}
      {saving && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-red-800 animate-spin" />
            <p className="text-gray-800 font-bold text-lg">
              {editingSlip ? "Updating Slip..." : "Saving Slip..."}
            </p>
            <p className="text-gray-500 text-sm italic">Please wait, generating PDF and syncing...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 bg-white border-b border-gray-200">
        {/* Title row */}
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Get In Slips</h1>
          <button
            onClick={() => setShowGetInForm(true)}
            className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-semibold rounded-md shadow transition-colors flex items-center gap-2"
          >
            <span className="text-lg">➕</span> Get In
          </button>
        </div>
        {/* Search & Date Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search all fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-red-600 rounded-full mb-4"></div>
            <p className="text-gray-500">Loading Get In slips...</p>
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
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Serial No.</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Slip Type</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Slip No</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Date</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Party Name</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">PDF</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Receiver</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Jinse</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Bharti</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Killa</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Dharamkata Weight</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Taada Weight (QTY)</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Taada Weight (Rate)</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Truck No.</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Driver</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Mobile No.</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Remarks</th>
                    <th className="px-3 py-3 text-xs font-semibold text-center text-gray-600 uppercase">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSlips.length === 0 ? (
                    <tr>
                      <td colSpan={19} className="text-center py-8 text-gray-500">No Get In slips found.</td>
                    </tr>
                  ) : (
                    filteredSlips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-gray-50 transition-colors">
                        {/* Actions */}
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleEditClick(slip)}
                            title="Edit slip"
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            <Pencil size={15} />
                            <span className="hidden md:inline">Edit</span>
                          </button>
                        </td>
                        {/* Data Columns B-R */}
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{slip.serialNo || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">Get In</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.slipNo || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.date || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">{slip.partyName || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {slip.pdfUrl ? (
                            <a href={slip.pdfUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              View PDF
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.receiver || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.jinse || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.bharti || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.killa || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.dharamkataWeight || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.taadaWeightQty || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.taadaWeightRate || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.truckNo || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.driver || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.mobileNo || "-"}</td>
                        <td className="px-3 py-2 max-w-[150px] truncate">{slip.remarks || "-"}</td>
                        {/* Print Action */}
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => printSlip(slip)}
                            disabled={printingSlipId === slip.id}
                            title="Print slip"
                            className={`inline-flex items-center gap-1 text-sm font-medium ${
                              printingSlipId === slip.id ? "text-gray-400 cursor-not-allowed" : "text-red-600 hover:text-red-800"
                            }`}
                          >
                            {printingSlipId === slip.id ? (
                              <span className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                              <Printer size={15} />
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

      {/* ========== GET IN FORM MODAL ========== */}
      {showGetInForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative animate-fadeIn">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {editingSlip ? `Edit Slip – ${editingSlip.serialNo}` : "New Get In Slip"}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-4 md:p-6">
              <div className="bg-yellow-100 rounded-lg border-2 border-black">
                <div className="text-center border-b-2 border-black p-4">
                  <h3 className="text-base md:text-lg font-bold">आवक पर्ची / Provisional Receipt</h3>
                  <h2 className="text-xl md:text-2xl font-bold">BMS COLD STORAGE</h2>
                  <p className="text-xs md:text-sm">(A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)</p>
                  <p className="text-xs md:text-sm">Village - BANA (DHARSIWA) RAIPUR 492099</p>
                  <p className="text-xs md:text-sm">Mob.: 7024566009, 7024066009</p>
                  <p className="text-xs md:text-sm">E-mail: bmscoldstorage@gmail.com</p>
                </div>

                <form onSubmit={handleGetInSubmit} className="p-4 md:p-6 space-y-3">
                  {/* Slip No & Date – read-only when editing */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">क्र. (Slip No):</label>
                      <input
                        type="text"
                        value={getInForm.slipNo}
                        onChange={(e) => setGetInForm({ ...getInForm, slipNo: e.target.value })}
                        disabled={!!editingSlip}
                        className={`w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm ${
                          editingSlip ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">दिनांक:</label>
                      <input
                        type="date"
                        value={getInForm.date}
                        onChange={(e) => setGetInForm({ ...getInForm, date: e.target.value })}
                        disabled={!!editingSlip}
                        className={`w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm ${
                          editingSlip ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Party Name */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">पार्टी का नाम:</label>
                    <input
                      type="text"
                      value={getInForm.partyName}
                      onChange={(e) => setGetInForm({ ...getInForm, partyName: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                    />
                  </div>

                  {/* Receiver */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">मार्फत / एजेंट (Receiver):</label>
                    <input
                      type="text"
                      value={getInForm.receiver}
                      onChange={(e) => setGetInForm({ ...getInForm, receiver: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                    />
                  </div>

                  {/* Jinse */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">जिन्स:</label>
                    <input
                      type="text"
                      value={getInForm.jinse}
                      onChange={(e) => setGetInForm({ ...getInForm, jinse: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                    />
                  </div>

                  {/* Bharti & Killa */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">भरती:</label>
                      <input
                        type="text"
                        value={getInForm.bharti}
                        onChange={(e) => setGetInForm({ ...getInForm, bharti: e.target.value })}
                        className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">किल्ला:</label>
                      <input
                        type="text"
                        value={getInForm.killa}
                        onChange={(e) => setGetInForm({ ...getInForm, killa: e.target.value })}
                        className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                      />
                    </div>
                  </div>

                  {/* Dharamkata Weight */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">धरमकाँटा वजन:</label>
                    <input
                      type="text"
                      value={getInForm.dharamkataWeight}
                      onChange={(e) => setGetInForm({ ...getInForm, dharamkataWeight: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                    />
                  </div>

                  {/* Taada Weight Qty & Rate */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">ताड़ वजन (Qty / Rate):</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Qty"
                        value={getInForm.taadaWeightQty}
                        onChange={(e) => setGetInForm({ ...getInForm, taadaWeightQty: e.target.value })}
                        className="flex-1 px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Rate"
                        value={getInForm.taadaWeightRate}
                        onChange={(e) => setGetInForm({ ...getInForm, taadaWeightRate: e.target.value })}
                        className="flex-1 px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                      />
                    </div>
                  </div>

                  {/* Truck No & Driver */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">ट्रक नं.:</label>
                      <input
                        type="text"
                        value={getInForm.truckNo}
                        onChange={(e) => setGetInForm({ ...getInForm, truckNo: e.target.value })}
                        className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">ड्राइवर:</label>
                      <input
                        type="text"
                        value={getInForm.driver}
                        onChange={(e) => setGetInForm({ ...getInForm, driver: e.target.value })}
                        className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                      />
                    </div>
                  </div>

                  {/* Mobile No */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">मोबाइल नं.:</label>
                    <input
                      type="text"
                      value={getInForm.mobileNo}
                      onChange={(e) => setGetInForm({ ...getInForm, mobileNo: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                    />
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">रिमार्क्स:</label>
                    <input
                      type="text"
                      value={getInForm.remarks}
                      onChange={(e) => setGetInForm({ ...getInForm, remarks: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-red-600 text-sm"
                    />
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t-2 border-black mt-4">
                    <p className="text-xs md:text-sm mb-4">प्रतिनिधि / ड्राइवर के हस्ताक्षर __________ प्रबंधक</p>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-red-800 hover:bg-red-900 text-white font-semibold rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? (editingSlip ? "Updating..." : "Saving...") : (editingSlip ? "Update Slip" : "Save Get In Slip")}
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

export default GetIn;