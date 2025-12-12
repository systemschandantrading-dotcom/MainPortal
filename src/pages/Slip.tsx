// SLIP REACT
import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
const SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL;

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
  storageCharges: string;
  hamaliCharges: string;
  otherCharges: string;
  grandTotal: string;
  amountInWords: string;
  createdAt: string;
}

type Slip = GetInSlip | GetOutSlip | InvoiceSlip;

const SlipManagement = () => {
  const [loadingSlips, setLoadingSlips] = useState(true);   // history loading
  const [saving, setSaving] = useState(false);              // save buttons loading
  const [activeTab, setActiveTab] = useState("getIn");
  const [slips, setSlips] = useState<Slip[]>([]);

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
    date: new Date().toISOString().split('T')[0],
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
    date: new Date().toISOString().split('T')[0],
    partyName: "",
    lotNumber: "",
    vehicleNumber: "",
    storageFrom: "",
    storageTo: "",
    totalDays: "",
    storageCharges: "",
    hamaliCharges: "",
    otherCharges: "",
    grandTotal: "",
    amountInWords: "",
  });

  const saveSlipToSheet = async (payload: any) => {
    try {
      const formData = new FormData();
      formData.append("action", "addSlipFull");
      formData.append("payload", JSON.stringify(payload));

      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        alert("Error saving slip: " + data.error);
      }

    } catch (error) {
      console.error(error);
      alert("Network error while saving slip.");
    }
  };

  const fetchSlips = async () => {
    setLoadingSlips(true);   // start loading
    try {
      const res = await fetch(`${SCRIPT_URL}?action=getAllSlips`);
      const data = await res.json();

      if (data.success) {
        const cleaned = data.slips.slice(1);

        const formatted = cleaned.map((s: any, index: number) => ({
          id: index + 1,
          type: s.slipType,
          serialNo: s.slipNo,
          invoiceNo: s.slipNo,
          date: s.date,
          partyName: s.partyName,

          // GET IN
          place: s.place,
          material: s.material,
          bharti: s.bharti,
          killa: s.killa,
          dharamKantaWeight: s.dharamKantaWeight,
          qty: s.qty,
          rate: s.rate,
          truckNo: s.truckNo,
          driver: s.driver,
          mobileNo: s.mobileNo,
          remarks: s.remarks,

          // GET OUT
          placeOut: s.placeOut,
          materialReceive: s.materialReceive,
          jins: s.jins,
          netWeight: s.netWeight,
          qtyOut: s.qtyOut,
          taadWeight: s.taadWeight,
          truckNoOut: s.truckNoOut,
          driverOut: s.driverOut,
          remarksOut: s.remarksOut,

          // INVOICE
          lotNumber: s.lotNumber,
          vehicleNumber: s.vehicleNumber,
          storageFrom: s.storageFrom,
          storageTo: s.storageTo,
          totalDays: s.totalDays,
          storageCharges: s.storageCharges,
          hamaliCharges: s.hamaliCharges,
          otherCharges: s.otherCharges,
          grandTotal: s.grandTotal,
          amountInWords: s.amountInWords,

          createdAt: s.timestamp,
        }));

        setSlips(formatted);
      }
    } catch (err) {
      console.error("Error loading slips:", err);
    } finally {
      setLoadingSlips(false); // stop loader
    }
  };
  useEffect(() => {
    fetchSlips();
  }, []);

  const handleGetOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await saveSlipToSheet({
      slipType: "Get Out",
      slipNo: getOutForm.serialNo,
      date: getOutForm.date,
      partyName: getOutForm.partyName,

      // GET IN empty
      place: "",
      material: "",
      qty: "",
      rate: "",
      truckNo: "",
      driver: "",
      mobileNo: "",
      remarks: "",

      // FULL GET OUT DATA
      placeOut: getOutForm.place,
      materialReceive: getOutForm.materialReceive,
      jins: getOutForm.jins,
      netWeight: getOutForm.netWeight,
      qtyOut: getOutForm.qty,
      taadWeight: getOutForm.taadWeight,
      truckNoOut: getOutForm.truckNo,
      driverOut: getOutForm.driver,
      remarksOut: getOutForm.remarks,

      // invoice empty
      lotNumber: "",
      vehicleNumber: "",
      storageFrom: "",
      storageTo: "",
      totalDays: "",
      storageCharges: "",
      hamaliCharges: "",
      otherCharges: "",
      grandTotal: "",
      amountInWords: "",

      pdfUrl: ""
    });

    fetchSlips(); // ⬅️ reload from sheet

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
    setSaving(false);
    alert("Get Out slip saved successfully!");
  };

  // ⭐ ADD THIS FUNCTION
  const handleGetInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await saveSlipToSheet({
      slipType: "Get In",
      slipNo: getInForm.serialNo,
      date: getInForm.date,
      partyName: getInForm.partyName,

      // FULL FIELDS
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

      // avoid undefined
      placeOut: "",
      materialReceive: "",
      jins: "",
      netWeight: "",
      qtyOut: "",
      taadWeight: "",
      truckNoOut: "",
      driverOut: "",
      remarksOut: "",

      // invoice empty
      lotNumber: "",
      vehicleNumber: "",
      storageFrom: "",
      storageTo: "",
      totalDays: "",
      storageCharges: "",
      hamaliCharges: "",
      otherCharges: "",
      grandTotal: "",
      amountInWords: "",

      pdfUrl: ""
    });

    fetchSlips(); // reload from sheet

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
    setSaving(false);
    alert("Get In slip saved successfully!");
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await saveSlipToSheet({
      slipType: "Invoice",
      slipNo: invoiceForm.invoiceNo,
      date: invoiceForm.date,
      partyName: invoiceForm.partyName,

      // GET IN empty
      place: "",
      material: "",
      qty: "",
      rate: "",
      truckNo: "",
      driver: "",
      mobileNo: "",
      remarks: "",

      // GET OUT empty
      placeOut: "",
      materialReceive: "",
      jins: "",
      netWeight: "",
      qtyOut: "",
      taadWeight: "",
      truckNoOut: "",
      driverOut: "",
      remarksOut: "",

      // FULL INVOICE FIELDS
      lotNumber: invoiceForm.lotNumber,
      vehicleNumber: invoiceForm.vehicleNumber,
      storageFrom: invoiceForm.storageFrom,
      storageTo: invoiceForm.storageTo,
      totalDays: invoiceForm.totalDays,
      storageCharges: invoiceForm.storageCharges,
      hamaliCharges: invoiceForm.hamaliCharges,
      otherCharges: invoiceForm.otherCharges,
      grandTotal: invoiceForm.grandTotal,
      amountInWords: invoiceForm.amountInWords,

      pdfUrl: ""
    });

    fetchSlips(); // ⬅️ reload from sheet

    setInvoiceForm({
      invoiceNo: "",
      date: new Date().toISOString().split("T")[0],
      partyName: "",
      lotNumber: "",
      vehicleNumber: "",
      storageFrom: "",
      storageTo: "",
      totalDays: "",
      storageCharges: "",
      hamaliCharges: "",
      otherCharges: "",
      grandTotal: "",
      amountInWords: "",
    });
    setSaving(false);
    alert("Invoice created successfully!");
  };

  const formatSlipDate = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const printSlip = (slip: Slip) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    
    if (!printWindow) return;
    
    if (slip.type === "Get In") {
      printWindow.document.write(`
        <html>
          <head>
            <title>Get In Slip</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; background: #ffffcc; }
              .header { text-align: center; margin-bottom: 20px; }
              .header h2 { margin: 5px 0; }
              .content { border: 2px solid #000; padding: 15px; }
              .row { display: flex; margin-bottom: 10px; }
              .label { width: 150px; font-weight: bold; }
              .value { flex: 1; border-bottom: 1px solid #000; }
              .footer { text-align: right; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h3>आवक पर्ची / Provisional Receipt</h3>
              <h2>BMS COLD STORAGE</h2>
              <p>(A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)</p>
              <p>Village - BANA (DHARSIWA) RAIPUR 492099</p>
              <p>Mob.: 7024566009, 7024066009</p>
              <p>E-mail: bmscoldstorage@gmail.com</p>
            </div>
            <div class="content">
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
                <div class="value">${slip.place || ''}</div>
              </div>
              <div class="row">
                <div class="label">जिन्स:</div>
                <div class="value">${slip.material}</div>
              </div>
              <div class="row">
                <div class="label">भरती:</div>
                <div class="value">${slip.bharti || ''}</div>
              </div>
              <div class="row">
                <div class="label">किल्ला:</div>
                <div class="value">${slip.killa || ''}</div>
              </div>
              <div class="row">
                <div class="label">धरमकाँटा वजन:</div>
                <div class="value">${slip.dharamKantaWeight || ''}</div>
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
                <div class="value">${slip.driver || ''}</div>
              </div>
              <div class="row">
                <div class="label">मोबाइल नं.:</div>
                <div class="value">${slip.mobileNo || ''}</div>
              </div>
              <div class="row">
                <div class="label">रिमार्क्स:</div>
                <div class="value">${slip.remarks || ''}</div>
              </div>
            </div>
            <div class="footer">
              <p>प्रतिनिधि / ड्राइवर के हस्ताक्षर __________ प्रबंधक</p>
            </div>
          </body>
        </html>
      `);
    } else if (slip.type === "Get Out") {
      printWindow.document.write(`
        <html>
          <head>
            <title>Get Out Slip</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; background: #ffccff; }
              .header { text-align: center; margin-bottom: 20px; }
              .header h2 { margin: 5px 0; }
              .content { border: 2px solid #000; padding: 15px; }
              .row { display: flex; margin-bottom: 10px; }
              .label { width: 150px; font-weight: bold; }
              .value { flex: 1; border-bottom: 1px solid #000; }
              .footer { text-align: right; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h3>गेट पास</h3>
              <h2>BMS COLD STORAGE</h2>
              <p>(A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)</p>
              <p>Village - BANA (DHARSIWA) RAIPUR 492099</p>
              <p>Mob.: 7024566009, 7024066009</p>
              <p>E-mail: bmscoldstorage@gmail.com</p>
            </div>
            <div class="content">
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
                <div class="value">${slip.placeOut || ''}</div>
              </div>

              <div class="row">
                <div class="label">मार्फत / माल प्राप्तकर्ता:</div>
                <div class="value">${slip.materialReceive || ''}</div>
              </div>

              <div class="row">
                <div class="label">जिन्स:</div>
                <div class="value">${slip.jins || ''}</div>
              </div>

              <div class="row">
                <div class="label">माल नंबर / रसीद नं.:</div>
                <div class="value">${slip.netWeight || ''}</div>
              </div>

              <div class="row">
                <div class="label">बोरा:</div>
                <div class="value">${slip.qtyOut || ''}</div>
              </div>

              <div class="row">
                <div class="label">धरमकाँटा वजन:</div>
                <div class="value">${slip.taadWeight || ''}</div>
              </div>

              <div class="row">
                <div class="label">ट्रक नं.:</div>
                <div class="value">${slip.truckNoOut || ''}</div>
              </div>

              <div class="row">
                <div class="label">ड्राइवर:</div>
                <div class="value">${slip.driverOut || ''}</div>
              </div>

              <div class="row">
                <div class="label">रिमार्क्स:</div>
                <div class="value">${slip.remarksOut || ''}</div>
              </div>
          </body>
        </html>
      `);
    } else if (slip.type === "Invoice") {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; border: 2px solid #000; padding: 10px; }
              .header h2 { margin: 5px 0; }
              .invoice-label { font-weight: bold; margin-bottom: 10px; }
              .content { border: 2px solid #000; padding: 15px; }
              .row { display: flex; margin-bottom: 8px; }
              .label { width: 200px; font-weight: bold; }
              .value { flex: 1; border-bottom: 1px solid #000; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              table, th, td { border: 1px solid #000; }
              th, td { padding: 8px; text-align: left; }
              .terms { margin-top: 20px; }
              .signature { margin-top: 40px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>BMS COLD STORAGE</h2>
              <p>Bana, [Location]</p>
            </div>
            <div class="invoice-label">INVOICE</div>
            <div class="content">
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
                <div class="label">Storage Period: From</div>
                <div class="value">${formatSlipDate(slip.storageFrom)} <strong>To</strong> ${formatSlipDate(slip.storageTo)}</div>
              </div>
              <div class="row">
                <div class="label">Total Storage Days</div>
                <div class="value">${slip.totalDays || ''}</div>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Jan (Rate)</th>
                    <th>Feb (Rate)</th>
                    <th>Other Months (Rate)</th>
                    <th>Quantity</th>
                    <th>Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Storage Charges</td>
                    <td>${slip.storageCharges || ''}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr>
                    <td>Hamali Charges</td>
                    <td>${slip.hamaliCharges || ''}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr>
                    <td>Other Charges</td>
                    <td>${slip.otherCharges || ''}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr>
                    <td><strong>Total Amount</strong></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td><strong>${slip.grandTotal}</strong></td>
                  </tr>
                </tbody>
              </table>
              
              <div class="row">
                <div class="label">Grand Total (INR)</div>
                <div class="value">${slip.grandTotal}</div>
              </div>
              <div class="row">
                <div class="label">Amount in Words</div>
                <div class="value">${slip.amountInWords || ''}</div>
              </div>
              
              <div class="terms">
                <strong>Terms & Conditions</strong>
                <p>Payment should be made within ___ days from the invoice date</p>
                <p>Late payments will attract interest as per company policy.</p>
                <p>The company is not responsible for damages due to unforeseen circumstances.</p>
              </div>
              
              <div class="signature">
                <p><strong>Authorized Signatory</strong></p>
                <p>(For BMS Cold Storage)</p>
              </div>
            </div>
          </body>
        </html>
      `);
    }
    
    printWindow.document.close();
    printWindow.print();
  };

  const filteredSlips = slips.filter(slip => {
    if (activeTab === "history") return true;
    if (activeTab === "getIn") return slip.type === "Get In";
    if (activeTab === "getOut") return slip.type === "Get Out";
    if (activeTab === "invoice") return slip.type === "Invoice";
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 md:p-6 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Slip Management</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-2 md:px-6 bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-1 md:gap-2 min-w-max">
          <button
            onClick={() => setActiveTab("getIn")}
            className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "getIn"
                ? "border-red-800 text-red-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Get In
          </button>
          <button
            onClick={() => setActiveTab("getOut")}
            className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "getOut"
                ? "border-red-800 text-red-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Get Out
          </button>
          <button
            onClick={() => setActiveTab("invoice")}
            className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "invoice"
                ? "border-red-800 text-red-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Invoice
          </button>
          <button
            onClick={() => setActiveTab("history")}
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
                <h3 className="text-base md:text-lg font-bold mb-2">आवक पर्ची / Provisional Receipt</h3>
                <h2 className="text-xl md:text-2xl font-bold mb-2">BMS COLD STORAGE</h2>
                <p className="text-xs md:text-sm font-semibold">(A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)</p>
                <p className="text-xs md:text-sm">Village - BANA (DHARSIWA) RAIPUR 492099</p>
                <p className="text-xs md:text-sm">Mob.: 7024566009, 7024066009</p>
                <p className="text-xs md:text-sm">E-mail: bmscoldstorage@gmail.com</p>
              </div>

              {/* Form */}
              <form onSubmit={handleGetInSubmit} className="space-y-2 md:space-y-3">
                {/* Serial No and Date */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center">
                      <label className="w-full md:w-32 font-bold text-xs md:text-sm mb-1 md:mb-0">क्र.:</label>
                      <input
                        type="text"
                        value={getInForm.serialNo}
                        onChange={(e) => setGetInForm({...getInForm, serialNo: e.target.value})}
                        required
                        className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center">
                      <label className="w-full md:w-32 font-bold text-xs md:text-sm mb-1 md:mb-0">दिनांक:</label>
                      <input
                        type="date"
                        value={getInForm.date}
                        onChange={(e) => setGetInForm({...getInForm, date: e.target.value})}
                        required
                        className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Party Name */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">पार्टी का नाम:</label>
                  <input
                    type="text"
                    value={getInForm.partyName}
                    onChange={(e) => setGetInForm({...getInForm, partyName: e.target.value})}
                    required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Place */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">मार्फत / एजेंट:</label>
                  <input
                    type="text"
                    value={getInForm.place}
                    onChange={(e) => setGetInForm({...getInForm, place: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Material */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">जिन्स:</label>
                  <input
                    type="text"
                    value={getInForm.material}
                    onChange={(e) => setGetInForm({...getInForm, material: e.target.value})}
                    required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Bharti */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">भरती:</label>
                  <input
                      type="text"
                      value={getInForm.bharti}
                      onChange={(e) => setGetInForm({ ...getInForm, bharti: e.target.value })}
                      className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                    />
                </div>

                {/* Killa */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">किल्ला:</label>
                  <input
                      type="text"
                      value={getInForm.killa}
                      onChange={(e) => setGetInForm({ ...getInForm, killa: e.target.value })}
                      className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                    />
                </div>

                {/* Dharamkol Weight */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">धरमकाँटा वजन:</label>
                  <input
                    type="text"
                    value={getInForm.dharamKantaWeight}
                    onChange={(e) =>
                      setGetInForm({ ...getInForm, dharamKantaWeight: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Taad Weight */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">ताड़ वजन:</label>
                  <div className="flex-1 flex flex-col md:flex-row gap-2">
                    <input
                      type="text"
                      value={getInForm.qty}
                      onChange={(e) => setGetInForm({...getInForm, qty: e.target.value})}
                      required
                      placeholder="Qty"
                      className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                    />
                    <input
                      type="text"
                      value={getInForm.rate}
                      onChange={(e) => setGetInForm({...getInForm, rate: e.target.value})}
                      placeholder="Rate"
                      className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                    />
                  </div>
                </div>

                {/* Truck No */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">ट्रक नं.:</label>
                  <input
                    type="text"
                    value={getInForm.truckNo}
                    onChange={(e) => setGetInForm({...getInForm, truckNo: e.target.value})}
                    required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Driver */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">ड्राइवर:</label>
                  <input
                    type="text"
                    value={getInForm.driver}
                    onChange={(e) => setGetInForm({...getInForm, driver: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Mobile No */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">मोबाइल नं.:</label>
                  <input
                    type="text"
                    value={getInForm.mobileNo}
                    onChange={(e) => setGetInForm({...getInForm, mobileNo: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Remarks */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">रिमार्क्स:</label>
                  <input
                    type="text"
                    value={getInForm.remarks}
                    onChange={(e) => setGetInForm({...getInForm, remarks: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Footer */}
                <div className="pt-4 md:pt-6 text-right border-t-2 border-black mt-4 md:mt-6">
                  <p className="text-xs md:text-sm mb-4">प्रतिनिधि / ड्राइवर के हस्ताक्षर __________ प्रबंधक</p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full md:w-auto px-4 md:px-6 py-2 text-white font-semibold rounded-md text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#1e40af' }}
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
                <h2 className="text-xl md:text-2xl font-bold mb-2">BMS COLD STORAGE</h2>
                <p className="text-xs md:text-sm font-semibold">(A UNIT OF CHANDAN TRADING COMPANY PVT. LTD.)</p>
                <p className="text-xs md:text-sm">Village - BANA (DHARSIWA) RAIPUR 492099</p>
                <p className="text-xs md:text-sm">Mob.: 7024566009, 7024066009</p>
                <p className="text-xs md:text-sm">E-mail: bmscoldstorage@gmail.com</p>
              </div>

              {/* Form */}
              <form onSubmit={handleGetOutSubmit} className="space-y-2 md:space-y-3">
                {/* Serial No and Date */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center">
                      <label className="w-full md:w-32 font-bold text-xs md:text-sm mb-1 md:mb-0">क्र.:</label>
                      <input
                        type="text"
                        value={getOutForm.serialNo}
                        onChange={(e) => setGetOutForm({...getOutForm, serialNo: e.target.value})}
                        required
                        className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center">
                      <label className="w-full md:w-32 font-bold text-xs md:text-sm mb-1 md:mb-0">दिनांक:</label>
                      <input
                        type="date"
                        value={getOutForm.date}
                        onChange={(e) => setGetOutForm({...getOutForm, date: e.target.value})}
                        required
                        className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Party Name */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">पार्टी का नाम:</label>
                  <input
                    type="text"
                    value={getOutForm.partyName}
                    onChange={(e) => setGetOutForm({...getOutForm, partyName: e.target.value})}
                    required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Place */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">स्थान:</label>
                  <input
                    type="text"
                    value={getOutForm.place}
                    onChange={(e) => setGetOutForm({...getOutForm, place: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Material Receive */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">मार्फत / माल प्राप्तकर्ता:</label>
                  <input
                    type="text"
                    value={getOutForm.materialReceive}
                    onChange={(e) => setGetOutForm({...getOutForm, materialReceive: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Jins */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">जिन्स:</label>
                  <input
                    type="text"
                    value={getOutForm.jins}
                    onChange={(e) => setGetOutForm({...getOutForm, jins: e.target.value})}
                    required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Net Weight */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">माल नंबर / रसीद नं.:</label>
                  <input
                    type="text"
                    value={getOutForm.netWeight}
                    onChange={(e) => setGetOutForm({...getOutForm, netWeight: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Quantity */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">बोरा:</label>
                  <input
                    type="text"
                    value={getOutForm.qty}
                    onChange={(e) => setGetOutForm({...getOutForm, qty: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Taad Weight */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">धरमकाँटा वजन:</label>
                  <input
                    type="text"
                    value={getOutForm.taadWeight}
                    onChange={(e) => setGetOutForm({...getOutForm, taadWeight: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Truck No */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">ट्रक नं.:</label>
                  <input
                    type="text"
                    value={getOutForm.truckNo}
                    onChange={(e) => setGetOutForm({...getOutForm, truckNo: e.target.value})}
                    required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Driver */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">ड्राइवर:</label>
                  <input
                    type="text"
                    value={getOutForm.driver}
                    onChange={(e) => setGetOutForm({...getOutForm, driver: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Remarks */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">रिमार्क्स:</label>
                  <input
                    type="text"
                    value={getOutForm.remarks}
                    onChange={(e) => setGetOutForm({...getOutForm, remarks: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Footer */}
                <div className="pt-4 md:pt-6 text-right border-t-2 border-black mt-4 md:mt-6">
                  <p className="text-xs md:text-sm mb-4">प्रतिनिधि / ड्राइवर के हस्ताक्षर __________ प्रबंधक</p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full md:w-auto px-4 md:px-6 py-2 text-white font-semibold rounded-md text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#1e40af' }}
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
                <h2 className="text-xl md:text-2xl font-bold mb-2">BMS COLD STORAGE</h2>
                <p className="text-xs md:text-sm">Bana, [Location]</p>
              </div>

              <div className="font-bold mb-3 md:mb-4 text-sm md:text-base">INVOICE</div>

              {/* Form */}
              <form onSubmit={handleInvoiceSubmit} className="space-y-2 md:space-y-3">
                {/* Invoice No */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">Invoice No.</label>
                  <input
                    type="text"
                    value={invoiceForm.invoiceNo}
                    onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNo: e.target.value})}
                    required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Date */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">Date</label>
                  <input
                    type="date"
                    value={invoiceForm.date}
                    onChange={(e) => setInvoiceForm({...invoiceForm, date: e.target.value})}
                    required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Party Name */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">Party Name</label>
                  <input
                    type="text"
                    value={invoiceForm.partyName}
                    onChange={(e) => setInvoiceForm({...invoiceForm, partyName: e.target.value})}
                    required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Lot Number and Vehicle Number */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                  <div className="flex-1 flex flex-col md:flex-row md:items-center">
                    <label className="w-full md:w-40 font-bold text-xs md:text-sm mb-1 md:mb-0">Lot Number</label>
                    <input
                      type="text"
                      value={invoiceForm.lotNumber}
                      onChange={(e) => setInvoiceForm({...invoiceForm, lotNumber: e.target.value})}
                      className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                    />
                  </div>
                  <div className="flex-1 flex flex-col md:flex-row md:items-center">
                    <label className="w-full md:w-40 font-bold text-xs md:text-sm mb-1 md:mb-0">Vehicle Number</label>
                    <input
                      type="text"
                      value={invoiceForm.vehicleNumber}
                      onChange={(e) => setInvoiceForm({...invoiceForm, vehicleNumber: e.target.value})}
                      className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                    />
                  </div>
                </div>

                {/* Storage Period */}
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm">Storage Period: From</label>
                  <input
                    type="date"
                    value={invoiceForm.storageFrom}
                    onChange={(e) => setInvoiceForm({...invoiceForm, storageFrom: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                  <span className="font-bold text-xs md:text-sm">To</span>
                  <input
                    type="date"
                    value={invoiceForm.storageTo}
                    onChange={(e) => setInvoiceForm({...invoiceForm, storageTo: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Total Days */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">Total Storage Days</label>
                  <input
                    type="text"
                    value={invoiceForm.totalDays}
                    onChange={(e) => setInvoiceForm({...invoiceForm, totalDays: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Table */}
                <div className="mt-4 md:mt-6 overflow-x-auto">
                  <table className="w-full border-collapse border-2 border-black min-w-max">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">Description</th>
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">Jan (Rate)</th>
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">Feb (Rate)</th>
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">Other Months (Rate)</th>
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">Quantity</th>
                        <th className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm text-left font-bold">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm font-bold">Storage Charges</td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.storageCharges}
                            onChange={(e) => setInvoiceForm({...invoiceForm, storageCharges: e.target.value})}
                            className="w-full px-1 md:px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs md:text-sm"
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm font-bold">Hamali Charges</td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.hamaliCharges}
                            onChange={(e) => setInvoiceForm({...invoiceForm, hamaliCharges: e.target.value})}
                            className="w-full px-1 md:px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs md:text-sm"
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm font-bold">Other Charges</td>
                        <td className="border border-black px-2 md:px-3 py-2">
                          <input
                            type="text"
                            value={invoiceForm.otherCharges}
                            onChange={(e) => setInvoiceForm({...invoiceForm, otherCharges: e.target.value})}
                            className="w-full px-1 md:px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs md:text-sm"
                          />
                        </td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 md:px-3 py-2 text-xs md:text-sm font-bold">Total Amount</td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2"></td>
                        <td className="border border-black px-2 md:px-3 py-2 font-bold text-xs md:text-sm">{invoiceForm.grandTotal}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Grand Total */}
                <div className="flex flex-col md:flex-row md:items-center mt-3 md:mt-4">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">Grand Total (INR)</label>
                  <input
                    type="text"
                    value={invoiceForm.grandTotal}
                    onChange={(e) => setInvoiceForm({...invoiceForm, grandTotal: e.target.value})}
                    required
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Amount in Words */}
                <div className="flex flex-col md:flex-row md:items-center">
                  <label className="w-full md:w-48 font-bold text-xs md:text-sm mb-1 md:mb-0">Amount in Words</label>
                  <input
                    type="text"
                    value={invoiceForm.amountInWords}
                    onChange={(e) => setInvoiceForm({...invoiceForm, amountInWords: e.target.value})}
                    className="flex-1 px-2 md:px-3 py-1.5 bg-white border-b-2 border-black focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Terms & Conditions */}
                <div className="mt-4 md:mt-6">
                  <p className="font-bold mb-2 text-xs md:text-sm">Terms & Conditions</p>
                  <p className="text-xs md:text-sm">Payment should be made within ___ days from the invoice date</p>
                  <p className="text-xs md:text-sm">Late payments will attract interest as per company policy.</p>
                  <p className="text-xs md:text-sm">The company is not responsible for damages due to unforeseen circumstances.</p>
                </div>

                {/* Signature */}
                <div className="text-center mt-6 md:mt-8 pt-4 md:pt-6 border-t-2 border-black">
                  <p className="font-bold text-xs md:text-sm">Authorized Signatory</p>
                  <p className="text-xs md:text-sm mb-4">(For BMS Cold Storage)</p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full md:w-auto px-4 md:px-6 py-2 text-white font-semibold rounded-md text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#1e40af' }}
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
                        Type
                      </th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                        Serial/Invoice No
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
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <Printer size={16} />
                              <span className="hidden md:inline">Print</span>
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