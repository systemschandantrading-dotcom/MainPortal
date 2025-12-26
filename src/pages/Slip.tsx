// SLIP REACT
import { useState, useEffect } from "react";
import { Printer, Search } from "lucide-react";
import html2pdf from "html2pdf.js";

const SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL;
const DRIVE_FOLDER_ID = "1trTkjeNIjmT15fcGMgYZOIHVPqScK1Kb";

interface SlipPayload {
  slipType: "Get In" | "Get Out" | "Invoice";
  slipNo: string;
  date: string;
  partyName: string;

  // GET IN
  place: string;
  material: string;
  bharti: string;
  killa: string;
  dharamKantaWeight: string;
  qty: string;
  rate: string;
  truckNo: string;
  driver: string;
  mobileNo: string;
  remarks: string;

  // GET OUT
  placeOut: string;
  materialReceive: string;
  jins: string;
  netWeight: string;
  qtyOut: string;
  taadWeight: string;
  truckNoOut: string;
  driverOut: string;
  remarksOut: string;

  // INVOICE
  lotNumber: string;
  vehicleNumber: string;
  storageFrom: string;
  storageTo: string;
  totalDays: string;
  storageCharges: string;
  hamaliCharges: string;
  offSeasonCharges: string;
  otherCharges: string;
  grandTotal: string;
  amountInWords: string;
  // ⭐ INVOICE EXTRA (SHEET KE LIYE)
  storageOtherMonthRate?: string;
  storageQty?: string;

  offSeasonJanRate?: string;
  offSeasonFebRate?: string;
  offSeasonOtherMonthRate?: string;
  offSeasonQty?: string;

  hamaliOtherMonthRate?: string;
  hamaliQty?: string;
  totalAmount?: string;
  otherChargesOtherMonthRate?: string;
  otherChargesQty?: string;

  // ⭐ IMPORTANT
  pdfUrl?: string;
}

interface GetInSlip {
  id: number;
  type: "Get In";
  serialNo: string;
  date: string;
  partyName: string;
  place: string;
  material: string;

  // ⭐ NEW FIELDS
  bharti: string;
  killa: string;
  dharamKantaWeight: string;

  qty: string;
  rate: string;
  truckNo: string;
  driver: string;
  mobileNo: string;
  remarks: string;
  createdAt: string;
}

interface GetOutSlip {
  id: number;
  type: "Get Out";
  serialNo: string;
  date: string;
  partyName: string;

  // ✔ Get Out Fields Corrected
  placeOut: string;          // Column R
  materialReceive: string;   // Column S
  jins: string;              // Column T
  netWeight: string;         // Column U
  qtyOut: string;            // Column V
  taadWeight: string;        // Column W
  truckNoOut: string;        // Column X
  driverOut: string;         // Column Y
  remarksOut: string;        // Column Z

  createdAt: string;
}

interface InvoiceSlip {
  id: number;
  type: "Invoice";
  invoiceNo: string;
  date: string;
  partyName: string;
  lotNumber: string;
  vehicleNumber: string;
  storageFrom: string;
  storageTo: string;
  totalDays: string;

  // 🔹 RATES
  storageOtherMonthRate?: string;
  offSeasonJanRate?: string;
  offSeasonFebRate?: string;
  offSeasonOtherMonthRate?: string;
  hamaliOtherMonthRate?: string;
  otherChargesOtherMonthRate?: string;

  // 🔹 QTY
  storageQty?: string;
  offSeasonQty?: string;
  hamaliQty?: string;
  otherChargesQty?: string;

  // 🔹 AMOUNTS
  storageCharges: string;
  offSeasonCharges: string;
  hamaliCharges: string;
  otherCharges: string;
  grandTotal: string;
  amountInWords: string;

  createdAt: string;
}

type Slip = (GetInSlip | GetOutSlip | InvoiceSlip) & {
  pdfUrl?: string;

  autoSerial?: string;
};

const SlipManagement = () => {
  const tableInputClass =
    "w-full bg-transparent border-0 border-b border-black px-1 py-0.5 text-xs md:text-sm text-center focus:outline-none focus:border-b-2 focus:border-black";
  const [loadingSlips, setLoadingSlips] = useState(true); // history loading
  const [saving, setSaving] = useState(false); // save buttons loading
  const [activeTab, setActiveTab] = useState("getIn");
  // 🔍 Search state (History filter)
  const [searchQuery, setSearchQuery] = useState("");
  // 🔽 Slip Type Filter (History)
  const [slipTypeFilter, setSlipTypeFilter] = useState("all");
  // 📅 Date Filter (History)
  const [filterDate, setFilterDate] = useState("");
  const [slips, setSlips] = useState<Slip[]>([]);
  const [printingSlipId, setPrintingSlipId] = useState<number | null>(null);

  // ✅ Calculate Off Season Other Month Rate (Jan + Feb)
  const getOffSeasonOtherMonthRate = () => {
    const jan = Number(invoiceForm.offSeasonJanRate) || 0;
    const feb = Number(invoiceForm.offSeasonFebRate) || 0;
    return jan + feb;
  };

  // 🔢 Safe number parser
  const toNumber = (val: string) => Number(val) || 0;

  // 🔹 Row-wise amount calculators
  const getStorageAmount = () =>
    toNumber(invoiceForm.storageOtherMonthRate) *
    toNumber(invoiceForm.storageQty);

  const getHamaliAmount = () =>
    toNumber(invoiceForm.hamaliOtherMonthRate) *
    toNumber(invoiceForm.hamaliQty);

  const getOffSeasonAmount = () =>
    getOffSeasonOtherMonthRate() * toNumber(invoiceForm.offSeasonQty);

  const getOtherChargesAmount = () =>
    toNumber(invoiceForm.otherChargesOtherMonthRate) *
    toNumber(invoiceForm.otherChargesQty);

  // 🔤 Number to Words (Indian / English style)
  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero Only";

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];

    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const convertBelowThousand = (n: number): string => {
      let str = "";

      if (n >= 100) {
        str += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }

      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      }

      if (n > 0) {
        str += ones[n] + " ";
      }

      return str.trim();
    };

    let result = "";
    let crore = Math.floor(num / 10000000);
    num %= 10000000;

    let lakh = Math.floor(num / 100000);
    num %= 100000;

    let thousand = Math.floor(num / 1000);
    num %= 1000;

    if (crore) result += convertBelowThousand(crore) + " Crore ";
    if (lakh) result += convertBelowThousand(lakh) + " Lakh ";
    if (thousand) result += convertBelowThousand(thousand) + " Thousand ";
    if (num) result += convertBelowThousand(num);

    return result.trim() + " Only";
  };
  const getAmountInWords = () => {
    const total = getGrandTotal();
    return total ? numberToWords(total) : "";
  };

  const getGrandTotal = () => {
    return (
      getStorageAmount() +
      getHamaliAmount() +
      getOffSeasonAmount() +
      getOtherChargesAmount()
    );
  };

  // Get In Form State
  const [getInForm, setGetInForm] = useState({
    serialNo: "",
    date: new Date().toISOString().split("T")[0],
    partyName: "",
    place: "",
    material: "",
    bharti: "",
    killa: "",
    dharamKantaWeight: "",
    qty: "",
    rate: "",
    truckNo: "",
    driver: "",
    mobileNo: "",
    remarks: "",
  });

  // Get Out Form State
  const [getOutForm, setGetOutForm] = useState({
    serialNo: "",
    date: new Date().toISOString().split("T")[0],
    partyName: "",
    place: "",
    materialReceive: "",
    jins: "",
    netWeight: "",
    qty: "",
    taadWeight: "",
    truckNo: "",
    driver: "",
    remarks: "",
  });

  // Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNo: "",
    date: new Date().toISOString().split("T")[0],
    partyName: "",
    lotNumber: "",
    vehicleNumber: "",
    storageFrom: "",
    storageTo: "",
    totalDays: "",

    // 🔹 Rates
    offSeasonJanRate: "",
    offSeasonFebRate: "",

    storageOtherMonthRate: "",
    hamaliOtherMonthRate: "",
    offSeasonOtherMonthRate: "",
    otherChargesOtherMonthRate: "",

    // 🔹 Quantity
    storageQty: "",
    hamaliQty: "",
    offSeasonQty: "",
    otherChargesQty: "",

    // 🔹 Totals
    storageCharges: "",
    hamaliCharges: "",
    offSeasonCharges: "",
    otherCharges: "",
    grandTotal: "",
    amountInWords: "",
  });

  useEffect(() => {
    const storage = getStorageAmount();
    const hamali = getHamaliAmount();
    const offSeason = getOffSeasonAmount();
    const other = getOtherChargesAmount();

    const total = storage + hamali + offSeason + other;

    setInvoiceForm((prev) => ({
      ...prev,
      storageCharges: String(storage),
      hamaliCharges: String(hamali),
      offSeasonCharges: String(offSeason),
      otherCharges: String(other),
      grandTotal: String(total),
      amountInWords: total ? numberToWords(total) : "",
    }));
  }, [
    invoiceForm.storageOtherMonthRate,
    invoiceForm.storageQty,
    invoiceForm.hamaliOtherMonthRate,
    invoiceForm.hamaliQty,
    invoiceForm.offSeasonJanRate,
    invoiceForm.offSeasonFebRate,
    invoiceForm.offSeasonQty,
    invoiceForm.otherChargesOtherMonthRate,
    invoiceForm.otherChargesQty,
  ]);

  const saveSlipToSheet = async (payload: any) => {
    try {
      const formData = new FormData();
      formData.append("action", "addSlipFull");

      // ✅ SEND PAYLOAD AS JSON STRING
      formData.append("payload", JSON.stringify(payload));

      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      const text = await res.text();

      if (!text || text.trim() === "") {
        return true;
      }

      try {
        const data = JSON.parse(text);
        if (data.success === false) {
          alert("Error saving slip: " + (data.error || "Unknown error"));
          return false;
        }
      } catch {
        console.warn("Non-JSON response ignored:", text);
      }

      return true;
    } catch (error) {
      console.error(error);
      alert("Network error while saving slip.");
      return false;
    }
  };

  const fetchSlips = async () => {
    setLoadingSlips(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=getAllSlips`);
      const data = await res.json();

      if (data.success && Array.isArray(data.slips)) {
        const formatted = data.slips.map((s: any, index: number) => ({
          id: index + 1,
          type: s.slipType, // 🔥 VERY IMPORTANT
          autoSerial: s.serialNo || "",
          serialNo: s.slipNo || "",
          invoiceNo: s.slipNo || "",
          date: s.date || "",
          partyName: s.partyName || "",

          // GET IN
          place: s.place || "",
          material: s.material || "",
          bharti: s.bharti || "",
          killa: s.killa || "",
          dharamKantaWeight: s.dharamKantaWeight || "",
          qty: s.qty || "",
          rate: s.rate || "",
          truckNo: s.truckNo || "",
          driver: s.driver || "",
          mobileNo: s.mobileNo || "",
          remarks: s.remarks || "",

          // GET OUT
          placeOut: s.placeOut || "",
          materialReceive: s.materialReceive || "",
          jins: s.jins || "",
          netWeight: s.netWeight || "",
          qtyOut: s.qtyOut || "",
          taadWeight: s.taadWeight || "",
          truckNoOut: s.truckNoOut || "",
          driverOut: s.driverOut || "",
          remarksOut: s.remarksOut || "",

          // INVOICE
          lotNumber: s.lotNumber || "",
          vehicleNumber: s.vehicleNumber || "",
          storageFrom: s.storageFrom || "",
          storageTo: s.storageTo || "",
          totalDays: s.totalDays || "",
          storageCharges: s.storageCharges || "",
          hamaliCharges: s.hamaliCharges || "",
          offSeasonCharges: s.offSeasonCharges || "",
          otherCharges: s.otherCharges || "",
          grandTotal: s.grandTotal || "",
          amountInWords: s.amontInWords || "",

          // 🔹 INVOICE – RATES
          storageOtherMonthRate: s.storageOtherMonthRate || "",
          offSeasonJanRate: s.offSeasonJanRate || "",
          offSeasonFebRate: s.offSeasonFebRate || "",
          offSeasonOtherMonthRate: s.offSeasonOtherMonthRate || "",
          hamaliOtherMonthRate: s.hamaliOtherMonthRate || "",
          otherChargesOtherMonthRate: s.otherChargesOtherMonthRate || "",

          // 🔹 INVOICE – QTY
          storageQty: s.storageQty || "",
          offSeasonQty: s.offSeasonQty || "",
          hamaliQty: s.hamaliQty || "",
          otherChargesQty: s.otherChargesQty || "",

          createdAt: s.timestamp || "",
          pdfUrl: s.pdfUrl || "",
        }));

        setSlips(formatted);
      }
    } catch (err) {
      console.error("Error loading slips:", err);
    } finally {
      setLoadingSlips(false);
    }
  };
  useEffect(() => {
    fetchSlips();
  }, []);

  const handleGetOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 🔹 Payload
      const payload: SlipPayload = {
        slipType: "Get Out",
        slipNo: getOutForm.serialNo,
        date: getOutForm.date,
        partyName: getOutForm.partyName,

        // GET IN EMPTY
        place: "",
        material: "",
        bharti: "",
        killa: "",
        dharamKantaWeight: "",
        qty: "",
        rate: "",
        truckNo: "",
        driver: "",
        mobileNo: "",
        remarks: "",

        // GET OUT
        placeOut: getOutForm.place,
        materialReceive: getOutForm.materialReceive,
        jins: getOutForm.jins,
        netWeight: getOutForm.netWeight,
        qtyOut: getOutForm.qty,
        taadWeight: getOutForm.taadWeight,
        truckNoOut: getOutForm.truckNo,
        driverOut: getOutForm.driver,
        remarksOut: getOutForm.remarks,

        // INVOICE EMPTY
        lotNumber: "",
        vehicleNumber: "",
        storageFrom: "",
        storageTo: "",
        totalDays: "",
        storageCharges: "",
        hamaliCharges: "",
        offSeasonCharges: "",
        otherCharges: "",
        grandTotal: "",
        amountInWords: "",
      };

      // 🔹 Slip for PDF
      const slipForPdf: GetOutSlip = {
        id: 0,
        type: "Get Out",
        serialNo: getOutForm.serialNo,
        date: getOutForm.date,
        partyName: getOutForm.partyName,
        placeOut: getOutForm.place,
        materialReceive: getOutForm.materialReceive,
        jins: getOutForm.jins,
        netWeight: getOutForm.netWeight,
        qtyOut: getOutForm.qty,
        taadWeight: getOutForm.taadWeight,
        truckNoOut: getOutForm.truckNo,
        driverOut: getOutForm.driver,
        remarksOut: getOutForm.remarks,
        createdAt: "",
      };

      // 🔹 Generate PDF FIRST
      const pdfUrl = await generateAndStorePdf(slipForPdf);
      payload.pdfUrl = pdfUrl;

      // 🔹 Save ONCE
      const saved = await saveSlipToSheet(payload);
      if (!saved) return;

      await fetchSlips();

      // ✅ RESET GET OUT FORM
      setGetOutForm({
        serialNo: "",
        date: new Date().toISOString().split("T")[0],
        partyName: "",
        place: "",
        materialReceive: "",
        jins: "",
        netWeight: "",
        qty: "",
        taadWeight: "",
        truckNo: "",
        driver: "",
        remarks: "",
      });

      alert("Get Out slip saved & PDF generated!");
    } finally {
      setSaving(false);
    }
  };

  // ⭐ ADD THIS FUNCTION
  const handleGetInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: SlipPayload = {
        slipType: "Get In",
        slipNo: getInForm.serialNo,
        date: getInForm.date,
        partyName: getInForm.partyName,

        place: getInForm.place,
        material: getInForm.material,
        bharti: getInForm.bharti,
        killa: getInForm.killa,
        dharamKantaWeight: getInForm.dharamKantaWeight,
        qty: getInForm.qty,
        rate: getInForm.rate,
        truckNo: getInForm.truckNo,
        driver: getInForm.driver,
        mobileNo: getInForm.mobileNo,
        remarks: getInForm.remarks,

        // GET OUT EMPTY
        placeOut: "",
        materialReceive: "",
        jins: "",
        netWeight: "",
        qtyOut: "",
        taadWeight: "",
        truckNoOut: "",
        driverOut: "",
        remarksOut: "",

        // INVOICE EMPTY
        lotNumber: "",
        vehicleNumber: "",
        storageFrom: "",
        storageTo: "",
        totalDays: "",
        storageCharges: "",
        hamaliCharges: "",
        offSeasonCharges: "",
        otherCharges: "",
        grandTotal: "",
        amountInWords: "",
      };

      const slipForPdf: GetInSlip = {
        id: 0,
        type: "Get In",
        serialNo: getInForm.serialNo,
        date: getInForm.date,
        partyName: getInForm.partyName,
        place: getInForm.place,
        material: getInForm.material,
        bharti: getInForm.bharti,
        killa: getInForm.killa,
        dharamKantaWeight: getInForm.dharamKantaWeight,
        qty: getInForm.qty,
        rate: getInForm.rate,
        truckNo: getInForm.truckNo,
        driver: getInForm.driver,
        mobileNo: getInForm.mobileNo,
        remarks: getInForm.remarks,
        createdAt: "",
      };

      const pdfUrl = await generateAndStorePdf(slipForPdf);
      payload.pdfUrl = pdfUrl;

      const saved = await saveSlipToSheet(payload);
      if (!saved) return;

      await fetchSlips();

      // ✅ RESET GET IN FORM
      setGetInForm({
        serialNo: "",
        date: new Date().toISOString().split("T")[0],
        partyName: "",
        place: "",
        material: "",
        bharti: "",
        killa: "",
        dharamKantaWeight: "",
        qty: "",
        rate: "",
        truckNo: "",
        driver: "",
        mobileNo: "",
        remarks: "",
      });
      alert("Get In slip saved & PDF generated!");
    } finally {
      setSaving(false);
    }
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 🔹 Payload (for Sheet)
      const payload: SlipPayload = {
        slipType: "Invoice",
        slipNo: invoiceForm.invoiceNo,
        date: invoiceForm.date,
        partyName: invoiceForm.partyName,

        // GET IN EMPTY
        place: "",
        material: "",
        bharti: "",
        killa: "",
        dharamKantaWeight: "",
        qty: "",
        rate: "",
        truckNo: "",
        driver: "",
        mobileNo: "",
        remarks: "",

        // GET OUT EMPTY
        placeOut: "",
        materialReceive: "",
        jins: "",
        netWeight: "",
        qtyOut: "",
        taadWeight: "",
        truckNoOut: "",
        driverOut: "",
        remarksOut: "",

        // INVOICE DATA
        // INVOICE DATA
        lotNumber: invoiceForm.lotNumber,
        vehicleNumber: invoiceForm.vehicleNumber,
        storageFrom: invoiceForm.storageFrom,
        storageTo: invoiceForm.storageTo,
        totalDays: invoiceForm.totalDays,

        // ✅ STORAGE
        storageOtherMonthRate: invoiceForm.storageOtherMonthRate,
        storageQty: invoiceForm.storageQty,
        storageCharges: String(getStorageAmount()),

        // ✅ OFF SEASON
        offSeasonJanRate: invoiceForm.offSeasonJanRate,
        offSeasonFebRate: invoiceForm.offSeasonFebRate,
        offSeasonOtherMonthRate: String(getOffSeasonOtherMonthRate()),
        offSeasonQty: invoiceForm.offSeasonQty,
        offSeasonCharges: String(getOffSeasonAmount()),

        // ✅ HAMALI
        hamaliOtherMonthRate: invoiceForm.hamaliOtherMonthRate,
        hamaliQty: invoiceForm.hamaliQty,
        hamaliCharges: String(getHamaliAmount()),

        // ✅ OTHER CHARGES
        otherChargesOtherMonthRate: invoiceForm.otherChargesOtherMonthRate,
        otherChargesQty: invoiceForm.otherChargesQty,
        otherCharges: String(getOtherChargesAmount()),

        // ✅ TOTAL
        totalAmount: String(getGrandTotal()),
        grandTotal: String(getGrandTotal()),
        amountInWords: getAmountInWords(),
      };

      // 🔹 Slip object ONLY for PDF generation
      const slipForPdf: InvoiceSlip = {
        id: 0,
        type: "Invoice",
        invoiceNo: invoiceForm.invoiceNo,
        date: invoiceForm.date,
        partyName: invoiceForm.partyName,
        lotNumber: invoiceForm.lotNumber,
        vehicleNumber: invoiceForm.vehicleNumber,
        storageFrom: invoiceForm.storageFrom,
        storageTo: invoiceForm.storageTo,
        totalDays: invoiceForm.totalDays,

        // 🔹 RATES
        storageOtherMonthRate: invoiceForm.storageOtherMonthRate,
        offSeasonJanRate: invoiceForm.offSeasonJanRate,
        offSeasonFebRate: invoiceForm.offSeasonFebRate,
        offSeasonOtherMonthRate: String(getOffSeasonOtherMonthRate()),
        hamaliOtherMonthRate: invoiceForm.hamaliOtherMonthRate,
        otherChargesOtherMonthRate: invoiceForm.otherChargesOtherMonthRate,

        // 🔹 QTY
        storageQty: invoiceForm.storageQty,
        offSeasonQty: invoiceForm.offSeasonQty,
        hamaliQty: invoiceForm.hamaliQty,
        otherChargesQty: invoiceForm.otherChargesQty,

        // 🔹 AMOUNTS
        storageCharges: String(getStorageAmount()),
        offSeasonCharges: String(getOffSeasonAmount()),
        hamaliCharges: String(getHamaliAmount()),
        otherCharges: String(getOtherChargesAmount()),
        grandTotal: String(getGrandTotal()),
        amountInWords: getAmountInWords(),

        createdAt: "",
      };

      // 🔹 1️⃣ Generate PDF FIRST
      const pdfUrl = await generateAndStorePdf(slipForPdf);

      // 🔹 2️⃣ Attach PDF URL
      payload.pdfUrl = pdfUrl;

      // 🔹 3️⃣ Save ONCE (sheet + column F)
      const saved = await saveSlipToSheet(payload);
      if (!saved) return;

      // 🔹 4️⃣ Refresh history
      await fetchSlips();

      // 🔹 Reset form
      setInvoiceForm({
        invoiceNo: "",
        date: new Date().toISOString().split("T")[0],
        partyName: "",
        lotNumber: "",
        vehicleNumber: "",
        storageFrom: "",
        storageTo: "",
        totalDays: "",

        // 🔹 Rates
        offSeasonJanRate: "",
        offSeasonFebRate: "",

        storageOtherMonthRate: "",
        hamaliOtherMonthRate: "",
        offSeasonOtherMonthRate: "",
        otherChargesOtherMonthRate: "",

        // 🔹 Quantity
        storageQty: "",
        hamaliQty: "",
        offSeasonQty: "",
        otherChargesQty: "",

        // 🔹 Totals
        storageCharges: "",
        hamaliCharges: "",
        offSeasonCharges: "",
        otherCharges: "",
        grandTotal: "",
        amountInWords: "",
      });

      // setInvoiceForm({
      //   invoiceNo: "",
      //   date: new Date().toISOString().split("T")[0],
      //   partyName: "",
      //   lotNumber: "",
      //   vehicleNumber: "",
      //   storageFrom: "",
      //   storageTo: "",
      //   totalDays: "",
      //   storageCharges: "",
      //   hamaliCharges: "",
      //   otherCharges: "",
      //   grandTotal: "",
      //   amountInWords: "",
      // });

      alert("Invoice saved & PDF generated!");
    } finally {
      setSaving(false);
    }
  };

  const formatSlipDate = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // const getPdfBgClass = (type: Slip["type"]) => {
  //   if (type === "Get In") return "bg-get-in";
  //   if (type === "Get Out") return "bg-get-out";
  //   return "bg-invoice";
  // };

  const getSlipHTML = (slip: Slip) => {
    if (slip.type === "Get In") {
      return `
      <html>
        <head>
          <title>Get In Slip</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }

            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              background: white;
            }

            .pdf-page {
              min-height: 100%;
              padding: 18px 22px;
              border: 2px solid #000;
              box-sizing: border-box;
              background-color: #fff7c2;
            }

            .header {
              text-align: center;
              margin-bottom: 12px;
            }

            .header h2 {
              margin: 4px 0;
            }

            .header p {
              margin: 2px 0;
              font-size: 13px;
            }

            .divider {
              border-top: 2px solid #000;
              margin: 10px 0 14px;
            }

            .row {
              display: flex;
              margin-bottom: 9px;
              font-size: 13px;
              align-items: center;
            }

            .label {
              width: 160px;
              font-weight: bold;
            }

            .value {
              flex: 1;
              border-bottom: 1px solid #000;
              padding: 4px 6px 4px 6px;  
              line-height: 1.6;
            }

            .footer-sign {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
              font-weight: bold;
              font-size: 13px;
            }
          </style>
        </head>

        <body>
          <div class="pdf-page">

            <div class="header">
              <strong>आवक पर्ची / Provisional Receipt</strong>
              <h2>BMS COLD STORAGE</h2>
              <p>(A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)</p>
              <p>Village - BANA (DHARSIWA) RAIPUR 492099</p>
              <p>Mob.: 7024566009, 7024066009</p>
              <p>E-mail: bmscoldstorage@gmail.com</p>
            </div>

            <div class="divider"></div>

            <div class="row">
              <div class="label">क्र.:</div>
              <div class="value">${slip.serialNo}</div>
              <div class="label">दिनांक:</div>
              <div class="value">${formatSlipDate(slip.date)}</div>
            </div>

            <div class="row">
              <div class="label">पार्टी का नाम:</div>
              <div class="value">${slip.partyName}</div>
            </div>

            <div class="row">
              <div class="label">मार्फत / एजेंट:</div>
              <div class="value">${slip.place || ""}</div>
            </div>

            <div class="row">
              <div class="label">जिन्स:</div>
              <div class="value">${slip.material}</div>
            </div>

            <div class="row">
              <div class="label">भरती:</div>
              <div class="value">${slip.bharti || ""}</div>
            </div>

            <div class="row">
              <div class="label">किल्ला:</div>
              <div class="value">${slip.killa || ""}</div>
            </div>

            <div class="row">
              <div class="label">धरमकाँटा वजन:</div>
              <div class="value">${slip.dharamKantaWeight || ""}</div>
            </div>

            <div class="row">
              <div class="label">ताड़ वजन:</div>
              <div class="value">${slip.qty} / ${slip.rate}</div>
            </div>

            <div class="row">
              <div class="label">ट्रक नं.:</div>
              <div class="value">${slip.truckNo}</div>
            </div>

            <div class="row">
              <div class="label">ड्राइवर:</div>
              <div class="value">${slip.driver || ""}</div>
            </div>

            <div class="row">
              <div class="label">मोबाइल नं.:</div>
              <div class="value">${slip.mobileNo || ""}</div>
            </div>

            <div class="row">
              <div class="label">रिमार्क्स:</div>
              <div class="value">${slip.remarks || ""}</div>
            </div>

            <div class="footer-sign">
              <div>प्रतिनिधि / ड्राइवर</div>
              <div>प्रबंधक</div>
            </div>

          </div>
        </body>
      </html>
      `;
    }

    if (slip.type === "Get Out") {
      return `
      <html>
        <head>
          <title>Get Out Slip</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }

            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              background: white;
            }

            .pdf-page {
              min-height: 100%;
              padding: 18px 22px;
              border: 2px solid #000;
              box-sizing: border-box;
              background-color: #fde2ee; /* 🌸 PINK */
            }

            .header {
              text-align: center;
              margin-bottom: 12px;
            }

            .header h2 {
              margin: 4px 0;
            }

            .header p {
              margin: 2px 0;
              font-size: 13px;
            }

            .divider {
              border-top: 2px solid #000;
              margin: 10px 0 14px;
            }

            .row {
              display: flex;
              margin-bottom: 9px;
              font-size: 13px;
              align-items: center;
            }

            .label {
              width: 180px;
              font-weight: bold;
            }

            .value {
              flex: 1;
              border-bottom: 1px solid #000;
              padding: 4px 6px 4px 6px;  
              line-height: 1.6;
            }

            .footer-sign {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
              font-weight: bold;
              font-size: 13px;
            }
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

            <div class="row">
              <div class="label">क्र.:</div>
              <div class="value">${slip.serialNo}</div>
              <div class="label">दिनांक:</div>
              <div class="value">${formatSlipDate(slip.date)}</div>
            </div>

            <div class="row">
              <div class="label">पार्टी का नाम:</div>
              <div class="value">${slip.partyName}</div>
            </div>

            <div class="row">
              <div class="label">स्थान:</div>
              <div class="value">${slip.placeOut || ""}</div>
            </div>

            <div class="row">
              <div class="label">मार्फत / माल प्राप्तकर्ता:</div>
              <div class="value">${slip.materialReceive || ""}</div>
            </div>

            <div class="row">
              <div class="label">जिन्स:</div>
              <div class="value">${slip.jins || ""}</div>
            </div>

            <div class="row">
              <div class="label">माल नंबर / रसीद नं.:</div>
              <div class="value">${slip.netWeight || ""}</div>
            </div>

            <div class="row">
              <div class="label">बोरा:</div>
              <div class="value">${slip.qtyOut || ""}</div>
            </div>

            <div class="row">
              <div class="label">धरमकाँटा वजन:</div>
              <div class="value">${slip.taadWeight || ""}</div>
            </div>

            <div class="row">
              <div class="label">ट्रक नं.:</div>
              <div class="value">${slip.truckNoOut || ""}</div>
            </div>

            <div class="row">
              <div class="label">ड्राइवर:</div>
              <div class="value">${slip.driverOut || ""}</div>
            </div>

            <div class="row">
              <div class="label">रिमार्क्स:</div>
              <div class="value">${slip.remarksOut || ""}</div>
            </div>

            <div class="footer-sign">
              <div>प्रतिनिधि / ड्राइवर</div>
              <div>प्रबंधक</div>
            </div>

          </div>
        </body>
      </html>
      `;
    }
    // Invoice
    return `
    <html>
      <head>
        <title>Invoice</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: white;
          }

          .pdf-page {
            min-height: 100%;
            padding: 18px 22px;
            border: 2px solid #000;
            box-sizing: border-box;
            background-color: #ffffff; /* 🤍 WHITE */
          }

          .header {
            text-align: center;
            border: 2px solid #000;
            padding: 10px;
            margin-bottom: 14px;
          }

          .header h2 {
            margin: 4px 0;
          }

          .header p {
            margin: 2px 0;
            font-size: 13px;
          }

          .invoice-title {
            font-weight: bold;
            font-size: 15px;
            margin: 10px 0;
            text-align: left;
          }

          .row {
            display: flex;
            margin-bottom: 8px;
            font-size: 13px;
            align-items: center;
          }

          .label {
            width: 200px;
            font-weight: bold;
          }

          .value {
              flex: 1;
              border-bottom: 1px solid #000;
              padding: 4px 6px 4px 6px;  
              line-height: 1.6;
            }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 13px;
          }

          table, th, td {
            border: 1px solid #000;
          }

          th, td {
            padding: 7px;
            text-align: left;
          }

          th {
            background: #f3f3f3;
          }

          .terms {
            margin-top: 18px;
            font-size: 13px;
          }

          .signature {
            margin-top: 40px;
            text-align: center;
            font-size: 13px;
            font-weight: bold;
          }
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

          <div class="invoice-title">INVOICE</div>

          <div class="row">
            <div class="label">Invoice No.</div>
            <div class="value">${slip.invoiceNo}</div>
          </div>

          <div class="row">
            <div class="label">Date</div>
            <div class="value">${formatSlipDate(slip.date)}</div>
          </div>

          <div class="row">
            <div class="label">Party Name</div>
            <div class="value">${slip.partyName}</div>
          </div>

          <div class="row">
            <div class="label">Lot Number</div>
            <div class="value">${slip.lotNumber}</div>
            <div class="label">Vehicle Number</div>
            <div class="value">${slip.vehicleNumber}</div>
          </div>

          <div class="row">
            <div class="label">Storage Period</div>
            <div class="value">
              ${formatSlipDate(
                slip.storageFrom
              )} &nbsp; <strong>To</strong> &nbsp;
              ${formatSlipDate(slip.storageTo)}
            </div>
          </div>

          <div class="row">
            <div class="label">Total Storage Days</div>
            <div class="value">${slip.totalDays || ""}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Jan (Rate)</th>
                <th>Feb (Rate)</th>
                <th>Other Months</th>
                <th>Qty</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Storage Charges</td>
                <td></td>
                <td></td>
                <td>${slip.storageOtherMonthRate || ""}</td>
                <td>${slip.storageQty || ""}</td>
                <td>${slip.storageCharges}</td>
              </tr>
              <tr>
                <td>Off Season Charges</td>
                <td>${slip.offSeasonJanRate || ""}</td>
                <td>${slip.offSeasonFebRate || ""}</td>
                <td>${slip.offSeasonOtherMonthRate || ""}</td>
                <td>${slip.offSeasonQty || ""}</td>
                <td>${slip.offSeasonCharges}</td>
              </tr>
              <tr>
                <td>Hamali Charges</td>
                <td></td>
                <td></td>
                <td>${slip.hamaliOtherMonthRate || ""}</td>
                <td>${slip.hamaliQty || ""}</td>
                <td>${slip.hamaliCharges}</td>
              </tr>
              <tr>
                <td>Other Charges</td>
                <td></td>
                <td></td>
                <td>${slip.otherChargesOtherMonthRate || ""}</td>
                <td>${slip.otherChargesQty || ""}</td>
                <td>${slip.otherCharges}</td>
              </tr>
              <tr>
                <td colspan="5" style="text-align:center; font-weight:bold;">
                  Total Amount
                </td>
                <td style="text-align:center; font-weight:bold;">
                  ${slip.grandTotal}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="row">
            <div class="label">Grand Total (₹)</div>
            <div class="value">${slip.grandTotal}</div>
          </div>

          <div class="row">
            <div class="label">Amount in Words</div>
            <div class="value">${slip.amountInWords || ""}</div>
          </div>

          <div class="terms">
            <strong>Terms & Conditions</strong>
            <p>Payment should be made within ___ days from the invoice date.</p>
            <p>Late payments will attract interest as per company policy.</p>
            <p>The company is not responsible for damages due to unforeseen circumstances.</p>
          </div>

          <div class="signature">
            Authorized Signatory<br/>
            (For BMS Cold Storage)
          </div>

        </div>
      </body>
    </html>
    `;
  };

  const getSlipNumber = (slip: Slip): string =>
    slip.type === "Invoice" ? slip.invoiceNo : slip.serialNo;

  // ------------------------------
  // Convert Blob to Base64
  // ------------------------------
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;

        // 🔥 IMPORTANT: Remove data:application/pdf;base64,
        const base64 = result.split(",")[1];

        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // ------------------------------
  // Upload PDF to Google Drive
  // ------------------------------
  const uploadPdfToDrive = async (
    pdfBlob: Blob,
    fileName: string
  ): Promise<{ url: string | null; alreadyExists: boolean }> => {
    try {
      const base64Data = await blobToBase64(pdfBlob);

      const formData = new FormData();
      formData.append("action", "handleFileUpload");
      formData.append("base64Data", base64Data);
      formData.append("fileName", fileName);
      formData.append("mimeType", "application/pdf");
      formData.append("folderId", DRIVE_FOLDER_ID);

      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      // 🔥 IMPORTANT: parse ONLY ONCE
      const text = await res.text();
      const data = JSON.parse(text);

      if (!data.success) {
        console.error("Drive upload failed:", data.error);
        return { url: null, alreadyExists: false };
      }

      return {
        url: data.fileUrl,
        alreadyExists: data.alreadyExists || false,
      };
    } catch (err) {
      console.error("PDF upload error:", err);
      return { url: null, alreadyExists: false };
    }
  };

  const generateAndStorePdf = async (slip: Slip) => {
    const slipNumber = getSlipNumber(slip);
    const fileName = `${slip.type}_${slipNumber}.pdf`;

    const html = getSlipHTML(slip);

    const pdfBlob = await html2pdf()
      .from(html)
      .set({
        margin: 5,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4" },
      })
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

    // 🌈 Smooth loader UI
    pdfWindow.document.write(`
      <html>
        <head>
          <title>Opening PDF...</title>
          <style>
            body {
              margin: 0;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f9fafb;
              font-family: Arial, sans-serif;
              opacity: 0;
              animation: fadeIn 0.4s ease forwards;
            }
            .container {
              text-align: center;
              transform: scale(0.96);
              animation: scaleIn 0.4s ease forwards;
            }
            .spinner {
              width: 46px;
              height: 46px;
              border: 4px solid #d1d5db;
              border-top: 4px solid #1e40af;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 14px;
            }
            .text {
              font-size: 14px;
              color: #374151;
              letter-spacing: 0.2px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              to { transform: scale(1); }
            }
            .fadeOut {
              animation: fadeOut 0.25s ease forwards;
            }
            @keyframes fadeOut {
              to { opacity: 0; }
            }
          </style>
        </head>
        <body id="body">
          <div class="container">
            <div class="spinner"></div>
            <div class="text">Opening PDF, please wait…</div>
          </div>
        </body>
      </html>
    `);

    try {
      setTimeout(() => {
        setPrintingSlipId(slip.id);
      }, 0);

      let pdfUrl = slip.pdfUrl;
      if (!pdfUrl) {
        pdfUrl = await generateAndStorePdf(slip);

        setSlips((prev) =>
          prev.map((s) => (s.id === slip.id ? { ...s, pdfUrl } : s))
        );
      }

      // ✨ Smooth fade-out before redirect
      pdfWindow.document.getElementById("body")?.classList.add("fadeOut");

      setTimeout(() => {
        pdfWindow.location.replace(pdfUrl);
      }, 220); // small delay for smoothness
    } catch (err) {
      console.error(err);
      pdfWindow.document.body.innerHTML = `
        <p style="font-family:Arial;color:red;text-align:center;margin-top:40px;">
          Failed to open PDF. Please try again.
        </p>
      `;
    } finally {
      // 🧠 Delay unlock to avoid UI jitter
      setTimeout(() => {
        setPrintingSlipId(null);
      }, 300);
    }
  };

  const filteredSlips =
    activeTab !== "history"
      ? []
      : slips.filter((slip) => {
        const slipNumber = getSlipNumber(slip);

        // ❌ Remove invalid rows
        if (
          !slip.date ||
          slip.date === "01/01/1970" ||
          slip.date === "1970-01-01" ||
          (!slip.partyName && !slipNumber)
        ) {
          return false;
        }

        // 🔍 SEARCH FILTER
        const query = searchQuery.toLowerCase().trim();
        if (query) {
          const party = String(slip.partyName || "").toLowerCase();
          const autoSerial = String(slip.autoSerial || "").toLowerCase();
          const slipNo = String(slipNumber || "").toLowerCase();

          if (
            !party.includes(query) &&
            !autoSerial.includes(query) &&
            !slipNo.includes(query)
          ) {
            return false;
          }
        }

        // 🔽 SLIP TYPE FILTER
        if (slipTypeFilter !== "all") {
          if (slip.type !== slipTypeFilter) {
            return false;
          }
        }

        // 📅 SINGLE DATE FILTER (DD/MM/YYYY SAFE)
        if (filterDate) {
          let slipDateObj: Date | null = null;

          // Case 1: YYYY-MM-DD (from input / sheet)
          if (slip.date.includes("-")) {
            slipDateObj = new Date(slip.date);
          }

          // Case 2: DD/MM/YYYY (history table format)
          if (slip.date.includes("/")) {
            const [dd, mm, yyyy] = slip.date.split("/");
            slipDateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
          }

          if (!slipDateObj || isNaN(slipDateObj.getTime())) {
            return false;
          }

          const selectedDateObj = new Date(filterDate);

          slipDateObj.setHours(0, 0, 0, 0);
          selectedDateObj.setHours(0, 0, 0, 0);

          if (slipDateObj.getTime() !== selectedDateObj.getTime()) {
            return false;
          }
        }

        return true;
      });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 md:p-6 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Slip Management
          </h1>
        </div>
      </div>
      {/* 🔍 Search + Filter Bar (ONLY FOR HISTORY TAB) */}
      {/* 🔍 Filters Bar (ONLY FOR HISTORY TAB) */}
      {activeTab === "history" && (
        <div className="px-4 md:px-6 py-3 bg-white border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
            {/* 🔍 Search */}
            <div className="relative h-full">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by Party Name/ Serial No / Slip/Invoice No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 🔽 Slip Type */}
            <div className="h-full">
              <select
                value={slipTypeFilter}
                onChange={(e) => setSlipTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md
                     bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Get In">Get In</option>
                <option value="Get Out">Get Out</option>
                <option value="Invoice">Invoice</option>
              </select>
            </div>

            {/* 📅 Date Filter */}
            <div className="h-full">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md
         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
      {/* Tabs */}
      <div className="flex-shrink-0 px-2 md:px-6 bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-1 md:gap-2 min-w-max">
          <button
            onClick={() => printingSlipId === null && setActiveTab("getIn")}
            className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "getIn"
                ? "border-red-800 text-red-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Get In
          </button>
          <button
            onClick={() => printingSlipId === null && setActiveTab("getOut")}
            className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "getOut"
                ? "border-red-800 text-red-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Get Out
          </button>
          <button
            onClick={() => printingSlipId === null && setActiveTab("invoice")}
            className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "invoice"
                ? "border-red-800 text-red-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Invoice
          </button>
          <button
            onClick={() => printingSlipId === null && setActiveTab("history")}
            className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "history"
                ? "border-red-800 text-red-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        {/* Get In Form */}
        {activeTab === "getIn" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-yellow-100 rounded-lg shadow-lg p-4 md:p-8 border-2 border-black">
              {/* Header */}
              <div className="text-center mb-4 md:mb-6 border-b-2 border-black pb-3 md:pb-4">
                <h3 className="text-base md:text-lg font-bold mb-2">
                  आवक पर्ची / Provisional Receipt
                </h3>
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  BMS COLD STORAGE
                </h2>
                <p className="text-xs md:text-sm font-semibold">
                  (A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)
                </p>
                <p className="text-xs md:text-sm">
                  Village - BANA (DHARSIWA) RAIPUR 492099
                </p>
                <p className="text-xs md:text-sm">
                  Mob.: 7024566009, 7024066009
                </p>
                <p className="text-xs md:text-sm">
                  E-mail: bmscoldstorage@gmail.com
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleGetInSubmit}
                className="space-y-2 md:space-y-3"
              >
                {/* Serial No and Date */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center">
                      <label className="w-full md:w-32 font-bold text-xs md:text-sm mb-1 md:mb-0">
                        क्र.:
                      </label>
                      <input
                        type="text"
                        value={getInForm.serialNo}
                        onChange={(e) =>
                          setGetInForm({
                            ...getInForm,
                            serialNo: e.target.value,
                          })
                        }
                        // required
                        className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center">
                      <label className="w-full md:w-32 font-bold text-xs md:text-sm mb-1 md:mb-0">
                        दिनांक:
                      </label>
                      <input
                        type="date"
                        value={getInForm.date}
                        onChange={(e) =>
                          setGetInForm({ ...getInForm, date: e.target.value })
                        }
                        // required
                        className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Party Name */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    पार्टी का नाम:
                  </label>
                  <input
                    type="text"
                    value={getInForm.partyName}
                    onChange={(e) =>
                      setGetInForm({ ...getInForm, partyName: e.target.value })
                    }
                    // required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Place */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    मार्फत / एजेंट:
                  </label>
                  <input
                    type="text"
                    value={getInForm.place}
                    onChange={(e) =>
                      setGetInForm({ ...getInForm, place: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Material */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    जिन्स:
                  </label>
                  <input
                    type="text"
                    value={getInForm.material}
                    onChange={(e) =>
                      setGetInForm({ ...getInForm, material: e.target.value })
                    }
                    // required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Bharti */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    भरती:
                  </label>
                  <input
                    type="text"
                    value={getInForm.bharti}
                    onChange={(e) =>
                      setGetInForm({ ...getInForm, bharti: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Killa */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    किल्ला:
                  </label>
                  <input
                    type="text"
                    value={getInForm.killa}
                    onChange={(e) =>
                      setGetInForm({ ...getInForm, killa: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Dharamkol Weight */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    धरमकाँटा वजन:
                  </label>
                  <input
                    type="text"
                    value={getInForm.dharamKantaWeight}
                    onChange={(e) =>
                      setGetInForm({
                        ...getInForm,
                        dharamKantaWeight: e.target.value,
                      })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Taad Weight */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    ताड़ वजन:
                  </label>
                  <div className="flex-1 flex flex-col md:flex-row gap-2">
                    <input
                      type="text"
                      value={getInForm.qty}
                      onChange={(e) =>
                        setGetInForm({ ...getInForm, qty: e.target.value })
                      }
                      // required
                      placeholder="Qty"
                      className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                    />
                    <input
                      type="text"
                      value={getInForm.rate}
                      onChange={(e) =>
                        setGetInForm({ ...getInForm, rate: e.target.value })
                      }
                      placeholder="Rate"
                      className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                    />
                  </div>
                </div>

                {/* Truck No */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    ट्रक नं.:
                  </label>
                  <input
                    type="text"
                    value={getInForm.truckNo}
                    onChange={(e) =>
                      setGetInForm({ ...getInForm, truckNo: e.target.value })
                    }
                    // required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Driver */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    ड्राइवर:
                  </label>
                  <input
                    type="text"
                    value={getInForm.driver}
                    onChange={(e) =>
                      setGetInForm({ ...getInForm, driver: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Mobile No */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    मोबाइल नं.:
                  </label>
                  <input
                    type="text"
                    value={getInForm.mobileNo}
                    onChange={(e) =>
                      setGetInForm({ ...getInForm, mobileNo: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Remarks */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    रिमार्क्स:
                  </label>
                  <input
                    type="text"
                    value={getInForm.remarks}
                    onChange={(e) =>
                      setGetInForm({ ...getInForm, remarks: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Footer */}
                <div className="pt-4 md:pt-6 text-right border-t-2 border-black mt-4 md:mt-6">
                  <p className="text-xs md:text-sm mb-4">
                    प्रतिनिधि / ड्राइवर के हस्ताक्षर __________ प्रबंधक
                  </p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full md:w-auto px-4 md:px-6 py-2 text-white font-semibold rounded-md text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#1e40af" }}
                  >
                    {saving ? "Saving..." : "Save Get In Slip"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Get Out Form */}
        {activeTab === "getOut" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-pink-100 rounded-lg shadow-lg p-4 md:p-8 border-2 border-black">
              {/* Header */}
              <div className="text-center mb-4 md:mb-6 border-b-2 border-black pb-3 md:pb-4">
                <h3 className="text-base md:text-lg font-bold mb-2">गेट पास</h3>
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  BMS COLD STORAGE
                </h2>
                <p className="text-xs md:text-sm font-semibold">
                  (A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)
                </p>
                <p className="text-xs md:text-sm">
                  Village - BANA (DHARSIWA) RAIPUR 492099
                </p>
                <p className="text-xs md:text-sm">
                  Mob.: 7024566009, 7024066009
                </p>
                <p className="text-xs md:text-sm">
                  E-mail: bmscoldstorage@gmail.com
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleGetOutSubmit}
                className="space-y-2 md:space-y-3"
              >
                {/* Serial No and Date */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center">
                      <label className="w-full md:w-32 font-bold text-xs md:text-sm mb-1 md:mb-0">
                        क्र.:
                      </label>
                      <input
                        type="text"
                        value={getOutForm.serialNo}
                        onChange={(e) =>
                          setGetOutForm({
                            ...getOutForm,
                            serialNo: e.target.value,
                          })
                        }
                        // required
                        className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center">
                      <label className="w-full md:w-32 font-bold text-xs md:text-sm mb-1 md:mb-0">
                        दिनांक:
                      </label>
                      <input
                        type="date"
                        value={getOutForm.date}
                        onChange={(e) =>
                          setGetOutForm({ ...getOutForm, date: e.target.value })
                        }
                        // required
                        className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Party Name */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    पार्टी का नाम:
                  </label>
                  <input
                    type="text"
                    value={getOutForm.partyName}
                    onChange={(e) =>
                      setGetOutForm({
                        ...getOutForm,
                        partyName: e.target.value,
                      })
                    }
                    // required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Place */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    स्थान:
                  </label>
                  <input
                    type="text"
                    value={getOutForm.place}
                    onChange={(e) =>
                      setGetOutForm({ ...getOutForm, place: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Material Receive */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    मार्फत / माल प्राप्तकर्ता:
                  </label>
                  <input
                    type="text"
                    value={getOutForm.materialReceive}
                    onChange={(e) =>
                      setGetOutForm({
                        ...getOutForm,
                        materialReceive: e.target.value,
                      })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Jins */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    जिन्स:
                  </label>
                  <input
                    type="text"
                    value={getOutForm.jins}
                    onChange={(e) =>
                      setGetOutForm({ ...getOutForm, jins: e.target.value })
                    }
                    // required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Net Weight */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    माल नंबर / रसीद नं.:
                  </label>
                  <input
                    type="text"
                    value={getOutForm.netWeight}
                    onChange={(e) =>
                      setGetOutForm({
                        ...getOutForm,
                        netWeight: e.target.value,
                      })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Quantity */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    बोरा:
                  </label>
                  <input
                    type="text"
                    value={getOutForm.qty}
                    onChange={(e) =>
                      setGetOutForm({ ...getOutForm, qty: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Taad Weight */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    धरमकाँटा वजन:
                  </label>
                  <input
                    type="text"
                    value={getOutForm.taadWeight}
                    onChange={(e) =>
                      setGetOutForm({
                        ...getOutForm,
                        taadWeight: e.target.value,
                      })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Truck No */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    ट्रक नं.:
                  </label>
                  <input
                    type="text"
                    value={getOutForm.truckNo}
                    onChange={(e) =>
                      setGetOutForm({ ...getOutForm, truckNo: e.target.value })
                    }
                    // required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Driver */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    ड्राइवर:
                  </label>
                  <input
                    type="text"
                    value={getOutForm.driver}
                    onChange={(e) =>
                      setGetOutForm({ ...getOutForm, driver: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Remarks */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    रिमार्क्स:
                  </label>
                  <input
                    type="text"
                    value={getOutForm.remarks}
                    onChange={(e) =>
                      setGetOutForm({ ...getOutForm, remarks: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Footer */}
                <div className="pt-4 md:pt-6 text-right border-t-2 border-black mt-4 md:mt-6">
                  <p className="text-xs md:text-sm mb-4">
                    प्रतिनिधि / ड्राइवर के हस्ताक्षर __________ प्रबंधक
                  </p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full md:w-auto px-4 md:px-6 py-2 text-white font-semibold rounded-md text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#1e40af" }}
                  >
                    {saving ? "Saving..." : "Save Get Out Slip"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invoice Form */}
        {activeTab === "invoice" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 border-2 border-black">
              {/* Header */}
              <div className="text-center mb-4 md:mb-6 border-2 border-black p-3 md:p-4">
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  BMS COLD STORAGE
                </h2>
                <p className="text-xs md:text-sm">Bana, [Location]</p>
              </div>

              <div className="font-bold mb-3 md:mb-4 text-sm md:text-base">
                INVOICE
              </div>

              {/* Form */}
              <form
                onSubmit={handleInvoiceSubmit}
                className="space-y-2 md:space-y-3"
              >
                {/* Invoice No */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    Invoice No.
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.invoiceNo}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        invoiceNo: e.target.value,
                      })
                    }
                    // required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Date */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    Date
                  </label>
                  <input
                    type="date"
                    value={invoiceForm.date}
                    onChange={(e) =>
                      setInvoiceForm({ ...invoiceForm, date: e.target.value })
                    }
                    // required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Party Name */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    Party Name
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.partyName}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        partyName: e.target.value,
                      })
                    }
                    // required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Lot Number and Vehicle Number */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                  <div className="flex-1 flex flex-col md:flex-row md:items-center">
                    <label className="w-full md:w-40 font-bold text-xs md:text-sm mb-1 md:mb-0">
                      Lot Number
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.lotNumber}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          lotNumber: e.target.value,
                        })
                      }
                      className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                    />
                  </div>
                  <div className="flex-1 flex flex-col md:flex-row md:items-center">
                    <label className="w-full md:w-40 font-bold text-xs md:text-sm mb-1 md:mb-0">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.vehicleNumber}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          vehicleNumber: e.target.value,
                        })
                      }
                      className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                    />
                  </div>
                </div>

                {/* Storage Period */}
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm">
                    Storage Period: From
                  </label>
                  <input
                    type="date"
                    value={invoiceForm.storageFrom}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        storageFrom: e.target.value,
                      })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                  <span className="font-bold text-xs md:text-sm">To</span>
                  <input
                    type="date"
                    value={invoiceForm.storageTo}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        storageTo: e.target.value,
                      })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Total Days */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    Total Storage Days
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.totalDays}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        totalDays: e.target.value,
                      })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Table */}
                {/* <div className="mt-4 md:mt-6 overflow-x-auto"> */}
                <div className="mt-4 md:mt-6">
                  {/* <table className="w-full border-collapse border-2 border-black min-w-max"> */}
                  <table className="w-full border-collapse border-2 border-black table-fixed">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">
                          Description
                        </th>
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">
                          Jan (Rate)
                        </th>
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">
                          Feb (Rate)
                        </th>
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">
                          Other Months (Rate)
                        </th>
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">
                          Quantity (Bag)
                        </th>
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">
                          Amount (INR)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm font-bold">
                          Storage Charges
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.storageOtherMonthRate}
                            onChange={(e) =>
                              setInvoiceForm({
                                ...invoiceForm,
                                storageOtherMonthRate: e.target.value,
                              })
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.storageQty}
                            onChange={(e) =>
                              setInvoiceForm({
                                ...invoiceForm,
                                storageQty: e.target.value,
                              })
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-center">
                          {invoiceForm.storageOtherMonthRate &&
                          invoiceForm.storageQty
                            ? getStorageAmount()
                            : ""}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm font-bold">
                          Off Season Charges(Jan+Feb)
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.offSeasonJanRate}
                            onChange={(e) =>
                              setInvoiceForm({
                                ...invoiceForm,
                                offSeasonJanRate: e.target.value,
                              })
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.offSeasonFebRate}
                            onChange={(e) =>
                              setInvoiceForm({
                                ...invoiceForm,
                                offSeasonFebRate: e.target.value,
                              })
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs text-center md:text-sm">
                          {invoiceForm.offSeasonJanRate ||
                          invoiceForm.offSeasonFebRate
                            ? getOffSeasonOtherMonthRate()
                            : ""}
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.offSeasonQty}
                            onChange={(e) =>
                              setInvoiceForm({
                                ...invoiceForm,
                                offSeasonQty: e.target.value,
                              })
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-center">
                          {(invoiceForm.offSeasonJanRate ||
                            invoiceForm.offSeasonFebRate) &&
                          invoiceForm.offSeasonQty
                            ? getOffSeasonAmount()
                            : ""}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm font-bold">
                          Other Charges
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.otherChargesOtherMonthRate}
                            onChange={(e) =>
                              setInvoiceForm({
                                ...invoiceForm,
                                otherChargesOtherMonthRate: e.target.value,
                              })
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.otherChargesQty}
                            onChange={(e) =>
                              setInvoiceForm({
                                ...invoiceForm,
                                otherChargesQty: e.target.value,
                              })
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-center">
                          {invoiceForm.otherChargesOtherMonthRate &&
                          invoiceForm.otherChargesQty
                            ? getOtherChargesAmount()
                            : ""}
                        </td>
                      </tr>

                      <tr>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm font-bold">
                          Hamali Charges
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.hamaliOtherMonthRate}
                            onChange={(e) =>
                              setInvoiceForm({
                                ...invoiceForm,
                                hamaliOtherMonthRate: e.target.value,
                              })
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.hamaliQty}
                            onChange={(e) =>
                              setInvoiceForm({
                                ...invoiceForm,
                                hamaliQty: e.target.value,
                              })
                            }
                            className={tableInputClass}
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-center">
                          {invoiceForm.hamaliOtherMonthRate &&
                          invoiceForm.hamaliQty
                            ? getHamaliAmount()
                            : ""}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan={5}
                          className="border border-black px-2 md:px-3 py-2 text-center font-bold text-xs md:text-sm"
                        >
                          Total Amount
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2 font-bold text-center text-xs md:text-sm">
                          {getGrandTotal()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Grand Total */}
                <div className="flex flex-col md:flex-row md:items-center mt-3 md:mt-4">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    Grand Total (INR)
                  </label>
                  <td className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none font-bold focus:border-blue-600 text-sm">
                    {getGrandTotal()}
                  </td>
                </div>

                {/* Amount in Words */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">
                    Amount in Words
                  </label>
                  <div className="flex-1 px-2 md:px-3 py-1.5 bg-gray-50 border-b-2 border-black text-sm font-semibold">
                    {getAmountInWords()}
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="mt-4 md:mt-6">
                  <p className="font-bold mb-2 text-xs md:text-sm">
                    Terms & Conditions
                  </p>
                  <p className="text-xs md:text-sm">
                    Payment should be made within ___ days from the invoice date
                  </p>
                  <p className="text-xs md:text-sm">
                    Late payments will attract interest as per company policy.
                  </p>
                  <p className="text-xs md:text-sm">
                    The company is not responsible for damages due to unforeseen
                    circumstances.
                  </p>
                </div>

                {/* Signature */}
                <div className="text-center mt-6 md:mt-8 pt-4 md:pt-6 border-t-2 border-black">
                  <p className="font-bold text-xs md:text-sm">
                    Authorized Signatory
                  </p>
                  <p className="text-xs md:text-sm mb-4">
                    (For BMS Cold Storage)
                  </p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full md:w-auto px-4 md:px-6 py-2 text-white font-semibold rounded-md text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#1e40af" }}
                  >
                    {saving ? "Saving..." : "Save Invoice"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* ⭐ LOADING EFFECT */}
            {loadingSlips ? (
              <div className="p-6 text-center text-gray-600 text-sm">
                <div className="animate-spin h-6 w-6 border-2 border-gray-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                Loading slips...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                        Serial No
                      </th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                        Type
                      </th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                        Slip/Invoice No
                      </th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                        Date
                      </th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                        Party Name
                      </th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSlips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900">
                          {slip.autoSerial || "-"}
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 md:px-2.5 py-1 rounded-full text-xs font-semibold ${
                              slip.type === "Get In"
                                ? "bg-yellow-100 text-yellow-800"
                                : slip.type === "Get Out"
                                ? "bg-pink-100 text-pink-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {slip.type}
                          </span>
                        </td>

                        <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-gray-900">
                          {slip.type === "Invoice"
                            ? (slip as InvoiceSlip).invoiceNo
                            : (slip as GetInSlip | GetOutSlip).serialNo}
                        </td>

                        <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900">
                          {slip.date}
                        </td>

                        <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900">
                          {slip.partyName}
                        </td>

                        <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => printSlip(slip)}
                              disabled={printingSlipId === slip.id}
                              className={`flex items-center gap-2 text-sm font-medium ${
                                printingSlipId === slip.id
                                  ? "text-gray-400 cursor-not-allowed"
                                  : "text-blue-600 hover:text-blue-800"
                              }`}
                            >
                              {printingSlipId === slip.id ? (
                                <>
                                  <span className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                                  <span>Opening...</span>
                                </>
                              ) : (
                                <>
                                  <Printer size={16} />
                                  <span className="hidden md:inline">
                                    Print
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SlipManagement;