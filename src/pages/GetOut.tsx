// GetOut.tsx
import { useState, useEffect, useCallback } from "react";
import { Search, Printer, X, Pencil, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import html2pdf from "html2pdf.js";

// ---------- Environment ----------
const SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL as string | undefined;
const SHEET_ID = import.meta.env.VITE_SHEET_ID as string | undefined;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
const DRIVE_FOLDER_ID = "1trTkjeNIjmT15fcGMgYZOIHVPqScK1Kb";

if (!SCRIPT_URL) console.error("❌ VITE_APP_SCRIPT_URL is missing.");
if (!SHEET_ID) console.error("❌ VITE_SHEET_ID is missing.");
if (!GOOGLE_API_KEY) console.error("❌ VITE_GOOGLE_API_KEY is missing.");

// ---------- Types ----------
interface GetOutSlip {
  id: number;
  slipType: "Get Out";
  autoSerial?: string; // e.g. GO-001 from backend
  serialNo: string;   // User-provided slip number
  date: string;
  partyName: string;
  place: string;
  receiver: string;
  jinse: string;
  rasidNo: string;
  bora: string;
  dharamkataWeight: string;
  truckNo: string;
  driver: string;
  remarks: string;
  createdAt: string;
  pdfUrl?: string;
}

type Slip = GetOutSlip & { pdfUrl?: string; autoSerial?: string };

// ---------- Helpers (same as original) ----------
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

const GetOut = () => {
  // ---------- State ----------
  const [slips, setSlips] = useState<Slip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showGetOutForm, setShowGetOutForm] = useState(false);
  const [printingSlipId, setPrintingSlipId] = useState<number | null>(null);
  const [editingSlip, setEditingSlip] = useState<Slip | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Debug Log
  const addLog = (msg: string) => {};

  // Get Out form state (aligned with backend field names)
  const [getOutForm, setGetOutForm] = useState({
    serialNo: "",
    date: new Date().toISOString().split("T")[0],
    partyName: "",
    place: "",           // corresponds to placeOut
    receiver: "",
    jins: "",
    rasidNo: "",
    bora: "",             // corresponds to qtyOut
    dharamkataWeight: "",
    truckNo: "",         // corresponds to truckNoOut
    driver: "",          // corresponds to driverOut
    remarks: "",         // corresponds to remarksOut
  });

  // ---------- API Calls ----------
  const saveSlipToSheet = async (payload: any) => {
    if (!SCRIPT_URL) {
      toast.error("Script URL is missing in environment.");
      return false;
    }
    try {
      const formData = new FormData();
      formData.append("action", "addNewSlipFull");
      formData.append("payload", JSON.stringify(payload));
      const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
      const text = await res.text();
      if (!text || text.trim() === "") return true;
      try {
        const data = JSON.parse(text);
        if (data.success === false) {
          toast.error("Error saving slip: " + (data.error || "Unknown error"));
          return false;
        }
      } catch {
        console.warn("Non-JSON response ignored:", text);
      }
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Network error while saving slip.");
      return false;
    }
  };

  const updateSlipInSheet = async (payload: any) => {
    if (!SCRIPT_URL) {
      toast.error("Script URL is missing in environment.");
      return false;
    }
    try {
      // 1. Fetch the specific sheet to find the rowIndex
      const sheetName = "Get-Out-Slip";
      const fetchUrl = `${SCRIPT_URL}${SCRIPT_URL.includes("?") ? "&" : "?"}action=fetch&sheet=${sheetName}`;
      const fetchRes = await fetch(fetchUrl);
      const fetchData = await fetchRes.json();
      
      if (!fetchData.success) {
        toast.error("Could not fetch sheet data to find row.");
        return false;
      }

      const rows = fetchData.data;
      let rowIndex = -1;
      
      addLog(`Searching for autoSerial="${payload.autoSerial}" in Column B of ${sheetName}...`);
      addLog(`Sheet has ${rows.length} rows. First few Col-B values: ${rows.slice(0, 5).map((r: any[]) => r[1]).join(", ")}`);
      
      // Column B (index 1) holds the AUTO-GENERATED serial (GO-001), NOT the user's slip number
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][1]).trim() === String(payload.autoSerial).trim()) {
          rowIndex = i + 1; // Apps Script rows are 1-indexed
          addLog(`✅ Found autoSerial "${payload.autoSerial}" at data row ${i} => sheet rowIndex ${rowIndex}`);
          break;
        }
      }

      if (rowIndex === -1) {
        addLog(`❌ autoSerial "${payload.autoSerial}" NOT found. All Col-B values: ${rows.map((r: any[]) => r[1]).join(", ")}`);
        toast.error(`Slip ${payload.autoSerial} not found in ${sheetName}.`);
        return false;
      }

      // 2. Prepare rowData array (index matches Column A, B, C...)
      // Columns: A:TS, B:Serial, C:Type, D:No, E:Date, F:Party, G:PDF, H:Place, I:Receiver, J:Jinse, K:Rasid No., L:Bora, M:Dharamkata Weight, N:Truck No., O:Driver, P:Remark
      // Sending "" for a column will cause the backend's updateRow to skip it (preserving original value).
      const rowData = [
        "", // A: Timestamp (PRESERVE)
        "", // B: Serial No (PRESERVE)
        "", // C: Slip Type (PRESERVE)
        "", // D: Slip No (PRESERVE)
        "", // E: Date (PRESERVE)
        payload.partyName || "",           // F: Party Name
        payload.pdfUrl || "",              // G: PDF
        payload.place || "",               // H: Place
        payload.receiver || "",            // I: Receiver
        payload.jinse || "",               // J: Jinse
        payload.rasidNo || "",             // K: Rasid No.
        payload.bora || "",                // L: Bora
        payload.dharamkataWeight || "",    // M: Dharamkata Weight
        payload.truckNo || "",             // N: Truck No.
        payload.driver || "",              // O: Driver
        payload.remarks || "",             // P: Remark
      ];

      // 3. Call the generic 'update' action
      const formData = new FormData();
      formData.append("action", "update");
      formData.append("sheetName", sheetName);
      formData.append("rowIndex", rowIndex.toString());
      formData.append("rowData", JSON.stringify(rowData));

      const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
      const text = await res.text();
      
      if (!text || text.trim() === "") return true;
      try {
        const data = JSON.parse(text);
        if (data.success === false) {
          toast.error("Error updating slip: " + (data.error || "Unknown error"));
          return false;
        }
      } catch {
        console.warn("Non-JSON response ignored:", text);
      }
      return true;
    } catch (error: any) {
      console.error(error);
      toast.error("Network error while updating slip: " + error.message);
      return false;
    }
  };

  const fetchSlips = useCallback(async () => {
    if (!SCRIPT_URL) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=getAllNewSlips`);
      const data = await res.json();
      if (data.success && Array.isArray(data.slips)) {
        // Filter only Get Out slips
        const formatted = data.slips
          .filter((s: any) => s.slipType === "Get Out")
          .slice(1)
          .map((s: any, index: number) => ({
            id: index + 1,
            type: "Get Out",
            autoSerial: s.serialNo || "", // This is GO-001
            serialNo: s.slipNo || "",     // User slip number
            date: s.date || "",
            partyName: s.partyName || "",
            place: s.place || "",
            receiver: s.receiver || "",
            jinse: s.jinse || "",
            rasidNo: s.rasidNo || "",
            bora: s.bora || "",
            dharamkataWeight: s.dharamkataWeight || "",
            truckNo: s.truckNo || "",
            driver: s.driver || "",
            remarks: s.remarks || "",
            createdAt: s.timestamp || "",
            pdfUrl: s.pdfUrl || "",
          }));
        setSlips(formatted);
      }
    } catch (err) {
      console.error("Error loading slips:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlips();
  }, [fetchSlips]);

  // ---------- PDF / Drive (inherited from original) ----------
  const uploadPdfToDrive = async (pdfBlob: Blob, fileName: string) => {
    try {
      addLog(`Converting ${fileName} to Base64...`);
      const base64Data = await blobToBase64(pdfBlob);
      const formData = new FormData();
      formData.append("action", "handleFileUpload");
      formData.append("base64Data", base64Data);
      formData.append("fileName", fileName);
      formData.append("mimeType", "application/pdf");
      formData.append("folderId", DRIVE_FOLDER_ID);
      
      addLog(`Uploading to Drive action=handleFileUpload...`);
      const res = await fetch(SCRIPT_URL!, { method: "POST", body: formData });
      const text = await res.text();
      
      const data = JSON.parse(text);
      if (!data.success) {
        addLog(`❌ Upload failed: ${data.error}`);
        throw new Error(data.error || "PDF upload failed");
      }

      addLog(`✅ Upload successful: ${data.fileUrl}`);
      return { url: data.fileUrl };
    } catch (err: any) {
      addLog(`❌ PDF upload error: ${err.message}`);
      console.error("PDF upload catch error:", err);
      throw err;
    }
  };

  const updateSlipPdfUrl = async (payload: { slipType: string; slipNo: string; pdfUrl: string }) => {
    try {
      const formData = new FormData();
      formData.append("action", "updateSlipPdf");
      formData.append("slipType", payload.slipType);
      formData.append("slipNo", payload.slipNo);
      formData.append("serialNo", payload.slipNo);
      formData.append("pdfUrl", payload.pdfUrl);

      const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
      const text = await res.text();
      if (!text || text.trim() === "") return true;

      try {
        const data = JSON.parse(text);
        return data.success !== false;
      } catch {
        return true;
      }
    } catch (err) {
      console.error("PDF URL update error:", err);
      return false;
    }
  };

  const getSlipHTML = (slip: GetOutSlip) => `
    <html>
      <head>
        <title>Get Out Slip</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; }
          .pdf-page { padding: 18px 22px; border: 2px solid #000; background-color: #fde2ee; }
          .header { text-align: center; margin-bottom: 12px; }
          .header h2 { margin: 4px 0; }
          .header p { margin: 2px 0; font-size: 13px; }
          .divider { border-top: 2px solid #000; margin: 10px 0 14px; }
          .row { display: flex; margin-bottom: 9px; font-size: 13px; align-items: center; }
          .label { width: 180px; font-weight: bold; }
          .value { flex: 1; border-bottom: 1px solid #000; padding: 4px 6px; line-height: 1.6; }
          .footer-sign { display: flex; justify-content: space-between; margin-top: 40px; font-weight: bold; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="pdf-page">
          <div class="header">
            <strong>गेट पास</strong>
            <h2>BMS COLD STORAGE</h2>
            <p>(A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)</p>
            <p>Village - BANA (DHARSIWA) RAIPUR 492099</p>
            <p>Mob.: 7024566009, 7024066009</p>
            <p>E-mail: bmscoldstorage@gmail.com</p>
          </div>
          <div class="divider"></div>
          <div class="row"><div class="label">क्र.:</div><div class="value">${slip.serialNo}</div><div class="label">दिनांक:</div><div class="value">${formatSlipDate(slip.date)}</div></div>
          <div class="row"><div class="label">पार्टी का नाम:</div><div class="value">${slip.partyName}</div></div>
          <div class="row"><div class="label">स्थान:</div><div class="value">${slip.place || ""}</div></div>
          <div class="row"><div class="label">मार्फत / माल प्राप्तकर्ता:</div><div class="value">${slip.receiver || ""}</div></div>
          <div class="row"><div class="label">जिन्स:</div><div class="value">${slip.jinse || ""}</div></div>
          <div class="row"><div class="label">माल नंबर / रसीद नं.:</div><div class="value">${slip.rasidNo || ""}</div></div>
          <div class="row"><div class="label">बोरा:</div><div class="value">${slip.bora || ""}</div></div>
          <div class="row"><div class="label">धरमकाँटा वजन:</div><div class="value">${slip.dharamkataWeight || ""}</div></div>
          <div class="row"><div class="label">ट्रक नं.:</div><div class="value">${slip.truckNo || ""}</div></div>
          <div class="row"><div class="label">ड्राइवर:</div><div class="value">${slip.driver || ""}</div></div>
          <div class="row"><div class="label">रिमार्क्स:</div><div class="value">${slip.remarks || ""}</div></div>
          <div class="footer-sign"><div>प्रतिनिधि / ड्राइवर</div><div>प्रबंधक</div></div>
        </div>
      </body>
    </html>`;

  const generateAndStorePdf = async (slip: GetOutSlip, isEdit: boolean = false) => {
    try {
      const slipNumber = slip.serialNo || "UNKNOWN";
      // In edit mode, use a timestamp suffix to create a fresh file and avoid
      // Drive's getFilesByName() lookup which intermittently causes Service errors.
      const ts = isEdit ? `_${Date.now()}` : "";
      const fileName = `Get_Out_${slipNumber}${ts}.pdf`;
      addLog(`Generating PDF: ${fileName}...`);
      const html = getSlipHTML(slip);
      const pdfBlob = await html2pdf()
        .from(html)
        .set({ margin: 5, html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4" } })
        .outputPdf("blob");
      
      const { url } = await uploadPdfToDrive(pdfBlob, fileName);
      if (!url) throw new Error("Server returned no URL");
      return url;
    } catch (err: any) {
      addLog(`❌ generateAndStorePdf error: ${err.message}`);
      throw err;
    }
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
        pdfUrl = await generateAndStorePdf(slip as GetOutSlip);
        setSlips((prev) => prev.map((s) => (s.id === slip.id ? { ...s, pdfUrl } : s)));
      }
      const finalPdfUrl = pdfUrl;
      setTimeout(() => {
        if (finalPdfUrl) {
          pdfWindow.location.replace(finalPdfUrl);
        }
      }, 300);
    } catch (err) {
      console.error(err);
      pdfWindow.document.body.innerHTML = `<p style="font-family:Arial;color:red;text-align:center;margin-top:40px;">Failed to open PDF.</p>`;
    } finally {
      setTimeout(() => setPrintingSlipId(null), 500);
    }
  };

  // ---------- Open edit modal ----------
  const handleEditClick = (slip: Slip) => {
    setEditingSlip(slip);
    setGetOutForm({
      serialNo: slip.serialNo,
      date: slip.date,
      partyName: slip.partyName,
      place: slip.place,
      receiver: slip.receiver,
      jins: slip.jinse,
      rasidNo: slip.rasidNo,
      bora: slip.bora,
      dharamkataWeight: slip.dharamkataWeight,
      truckNo: slip.truckNo,
      driver: slip.driver,
      remarks: slip.remarks,
    });
    setShowGetOutForm(true);
  };

  const resetForm = () => {
    setGetOutForm({
      serialNo: "",
      date: new Date().toISOString().split("T")[0],
      partyName: "",
      place: "",
      receiver: "",
      jins: "",
      rasidNo: "",
      bora: "",
      dharamkataWeight: "",
      truckNo: "",
      driver: "",
      remarks: "",
    });
    setEditingSlip(null);
    setShowGetOutForm(false);
  };

  // ---------- Submit (new or edit) ----------
  const handleGetOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSlip) {
        // ---- EDIT MODE ----
        // 1. Prepare data for PDF
        const slipForPdf: GetOutSlip = {
          ...editingSlip,
          slipType: "Get Out",
          serialNo: getOutForm.serialNo,
          date: getOutForm.date,
          partyName: getOutForm.partyName,
          place: getOutForm.place,
          receiver: getOutForm.receiver,
          jinse: getOutForm.jins,
          rasidNo: getOutForm.rasidNo,
          bora: getOutForm.bora,
          dharamkataWeight: getOutForm.dharamkataWeight,
          truckNo: getOutForm.truckNo,
          driver: getOutForm.driver,
          remarks: getOutForm.remarks,
        };

        // 2. Generate and upload new PDF (isEdit=true uses timestamped filename
        // to avoid Drive's getFilesByName() service error on duplicate names)
        let newPdfUrl = undefined;
        try {
          newPdfUrl = await generateAndStorePdf(slipForPdf, true);
        } catch (err) {
          console.error("PDF regenerate failed:", err);
          toast.error("PDF regeneration failed.");
          setSaving(false);
          return;
        }

        // 3. Update the sheet
        const updatePayload = {
          slipType: "Get Out",
          // IMPORTANT: autoSerial (GO-001) is used to locate the row in the sheet (Column B)
          // serialNo is the user-facing slip number (e.g. "kra"), NOT used for matching
          autoSerial: editingSlip.autoSerial,
          serialNo: editingSlip.serialNo,
          partyName: getOutForm.partyName,
          place: getOutForm.place,
          receiver: getOutForm.receiver,
          jinse: getOutForm.jins,
          rasidNo: getOutForm.rasidNo,
          bora: getOutForm.bora,
          dharamkataWeight: getOutForm.dharamkataWeight,
          truckNo: getOutForm.truckNo,
          driver: getOutForm.driver,
          remarks: getOutForm.remarks,
          pdfUrl: newPdfUrl,
        };

        const updated = await updateSlipInSheet(updatePayload);
        if (!updated) {
          setSaving(false);
          return;
        }

        await fetchSlips();
        resetForm();
        toast.success("Get Out slip updated & PDF regenerated!");
        setSaving(false);
        return;
      }

      // ---- NEW MODE ----
      const payload = {
        slipType: "Get Out",
        slipNo: getOutForm.serialNo,
        date: getOutForm.date,
        partyName: getOutForm.partyName,
        place: getOutForm.place,
        receiver: getOutForm.receiver,
        jinse: getOutForm.jins,
        rasidNo: getOutForm.rasidNo,
        bora: getOutForm.bora,
        dharamkataWeight: getOutForm.dharamkataWeight,
        truckNo: getOutForm.truckNo,
        driver: getOutForm.driver,
        remarks: getOutForm.remarks,
      };

      const slipForPdf: GetOutSlip = {
        id: 0, 
        slipType: "Get Out",
        serialNo: getOutForm.serialNo,
        date: getOutForm.date,
        partyName: getOutForm.partyName,
        place: getOutForm.place,
        receiver: getOutForm.receiver,
        jinse: getOutForm.jins,
        rasidNo: getOutForm.rasidNo,
        bora: getOutForm.bora,
        dharamkataWeight: getOutForm.dharamkataWeight,
        truckNo: getOutForm.truckNo,
        driver: getOutForm.driver,
        remarks: getOutForm.remarks,
        createdAt: "",
      };

      let pdfUrl: string | undefined = undefined;
      try {
        pdfUrl = await generateAndStorePdf(slipForPdf);
      } catch (pdfErr) {
        console.error("PDF generation/upload failed:", pdfErr);
        toast.error("PDF generation failed.");
        setSaving(false);
        return;
      }

      const finalPayload = { ...payload, pdfUrl };
      const saved = await saveSlipToSheet(finalPayload);
      if (!saved) {
        setSaving(false);
        return;
      }

      await fetchSlips();
      resetForm();
      toast.success("Get Out slip saved & PDF generated!");
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error("Error saving Get Out slip.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Filtered slips ----------
  const filteredSlips = slips.filter((slip) => {
    if (!slip.date || slip.date === "1970-01-01" || (!slip.partyName && !slip.serialNo)) return false;

    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const fields = [
        slip.partyName, slip.autoSerial, slip.serialNo,
        slip.place, slip.receiver, slip.jinse,
        slip.rasidNo, slip.bora, slip.truckNo, slip.driver, slip.remarks
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
      {/* Saving Overlay */}
      {saving && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-pink-800 animate-spin" />
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Get Out Slips</h1>
          <button
            onClick={() => setShowGetOutForm(true)}
            className="px-4 py-2 bg-pink-800 hover:bg-pink-900 text-white font-semibold rounded-md shadow transition-colors flex items-center gap-2"
          >
            <span className="text-lg">➕</span> Get Out
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
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-pink-600 rounded-full mb-4"></div>
            <p className="text-gray-500">Loading Get Out slips...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-xs font-semibold text-center text-gray-600 uppercase">Actions</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">S.No</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Slip No</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Date</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Party Name</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Place</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Receiver</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Jinse</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Rasid No</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Bora</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Dharamkata Weight</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Truck No</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Driver</th>
                    <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Remarks</th>
                    <th className="px-3 py-3 text-xs font-semibold text-center text-gray-600 uppercase">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSlips.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="text-center py-8 text-gray-500">No Get Out slips found.</td>
                    </tr>
                  ) : (
                    filteredSlips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-gray-50 transition-colors">
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
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{slip.autoSerial || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900">{slip.serialNo}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.date}</td>
                        <td className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">{slip.partyName}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.place || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.receiver || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.jinse || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.rasidNo || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.bora || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.dharamkataWeight || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.truckNo || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{slip.driver || "-"}</td>
                        <td className="px-3 py-2 max-w-[150px] truncate">{slip.remarks || "-"}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => printSlip(slip)}
                            disabled={printingSlipId === slip.id}
                            className={`inline-flex items-center gap-2 text-sm font-medium ${
                              printingSlipId === slip.id
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-pink-600 hover:text-pink-800"
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

      {/* Get Out Form Modal */}
      {showGetOutForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative animate-fadeIn">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {editingSlip ? `Edit Slip – ${editingSlip.serialNo}` : "New Get Out Slip"}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Content – replica of original Get Out tab */}
            <div className="p-4 md:p-6">
              <div className="bg-pink-100 rounded-lg border-2 border-black">
                <div className="text-center border-b-2 border-black p-4">
                  <h3 className="text-base md:text-lg font-bold">गेट पास</h3>
                  <h2 className="text-xl md:text-2xl font-bold">BMS COLD STORAGE</h2>
                  <p className="text-xs md:text-sm">(A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)</p>
                  <p className="text-xs md:text-sm">Village - BANA (DHARSIWA) RAIPUR 492099</p>
                  <p className="text-xs md:text-sm">Mob.: 7024566009, 7024066009</p>
                  <p className="text-xs md:text-sm">E-mail: bmscoldstorage@gmail.com</p>
                </div>

                <form onSubmit={handleGetOutSubmit} className="p-4 md:p-6 space-y-3">
                  {/* क्र. & दिनांक – disabled in edit mode */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">क्र.:</label>
                      <input
                        type="text"
                        value={getOutForm.serialNo}
                        onChange={(e) => setGetOutForm({ ...getOutForm, serialNo: e.target.value })}
                        disabled={!!editingSlip}
                        className={`w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm ${
                          editingSlip ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block font-bold text-xs md:text-sm mb-1">दिनांक:</label>
                      <input
                        type="date"
                        value={getOutForm.date}
                        onChange={(e) => setGetOutForm({ ...getOutForm, date: e.target.value })}
                        disabled={!!editingSlip}
                        className={`w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm ${
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
                      value={getOutForm.partyName}
                      onChange={(e) => setGetOutForm({ ...getOutForm, partyName: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm"
                    />
                  </div>

                  {/* Place */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">स्थान:</label>
                    <input
                      type="text"
                      value={getOutForm.place}
                      onChange={(e) => setGetOutForm({ ...getOutForm, place: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm"
                    />
                  </div>

                  {/* मार्फत / माल प्राप्तकर्ता */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">मार्फत / माल प्राप्तकर्ता:</label>
                    <input
                      type="text"
                      value={getOutForm.receiver}
                      onChange={(e) => setGetOutForm({ ...getOutForm, receiver: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm"
                    />
                  </div>

                  {/* जिन्स */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">जिन्स:</label>
                    <input
                      type="text"
                      value={getOutForm.jins}
                      onChange={(e) => setGetOutForm({ ...getOutForm, jins: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm"
                    />
                  </div>

                  {/* माल नंबर / रसीद नं. */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">माल नंबर / रसीद नं.:</label>
                    <input
                      type="text"
                      value={getOutForm.rasidNo}
                      onChange={(e) => setGetOutForm({ ...getOutForm, rasidNo: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm"
                    />
                  </div>

                  {/* बोरा */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">बोरा:</label>
                    <input
                      type="text"
                      value={getOutForm.bora}
                      onChange={(e) => setGetOutForm({ ...getOutForm, bora: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm"
                    />
                  </div>

                  {/* धरमकाँटा वजन */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">धरमकाँटा वजन:</label>
                    <input
                      type="text"
                      value={getOutForm.dharamkataWeight}
                      onChange={(e) => setGetOutForm({ ...getOutForm, dharamkataWeight: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm"
                    />
                  </div>

                  {/* ट्रक नं. */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">ट्रक नं.:</label>
                    <input
                      type="text"
                      value={getOutForm.truckNo}
                      onChange={(e) => setGetOutForm({ ...getOutForm, truckNo: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm"
                    />
                  </div>

                  {/* ड्राइवर */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">ड्राइवर:</label>
                    <input
                      type="text"
                      value={getOutForm.driver}
                      onChange={(e) => setGetOutForm({ ...getOutForm, driver: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm"
                    />
                  </div>

                  {/* रिमार्क्स */}
                  <div>
                    <label className="block font-bold text-xs md:text-sm mb-1">रिमार्क्स:</label>
                    <input
                      type="text"
                      value={getOutForm.remarks}
                      onChange={(e) => setGetOutForm({ ...getOutForm, remarks: e.target.value })}
                      className="w-full px-2 py-1.5 border-b-2 border-black bg-white focus:outline-none focus:border-pink-600 text-sm"
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
                        className="px-6 py-2 bg-pink-800 hover:bg-pink-900 text-white font-semibold rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? (editingSlip ? "Updating..." : "Saving...") : (editingSlip ? "Update Slip" : "Save Get Out Slip")}
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

export default GetOut;