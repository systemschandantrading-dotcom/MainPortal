import { useState, useEffect } from "react";
import { Plus, X, Upload, Eye, Calendar, Loader2, CheckCircle } from "lucide-react";

// ============================
// TYPES
// ============================
interface PeteEntry {
  id: number;
  serialNo?: string;
  name?: string;
  date?: string;
  debitAmount?: string;
  creditAmount?: string;
  groupHead?: string;
  reason?: string;
  personName?: string;
  photoPreview?: string | null;
}

interface FormDataType {
  name: string;
  date: string;
  debitAmount: string;
  creditAmount: string;
  groupHead: string;
  reason: string;
  personName: string;
  photo: File | null;
  photoPreview: string | null;
}

const PetePage = () => {
  const SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL;

  const [showModal, setShowModal] = useState(false);
  const [peteEntries, setPeteEntries] = useState<PeteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState<FormDataType>({
    name: "",
    date: new Date().toISOString().split("T")[0],
    debitAmount: "",
    creditAmount: "",
    groupHead: "",
    reason: "",
    personName: "",
    photo: null,
    photoPreview: null,
  });

  const groupHeadOptions = [
    "Fooding",
    "Labour Payment",
    "Misc Purchase",
    "Personal",
    "Pete",
    "Repair",
    "Travelling",
  ];

  // ⭐ ADD THIS — Formats date into DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  // ============================
  // FETCH SHEET DATA
  // ============================
  const fetchPeteData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${SCRIPT_URL}?action=getAllPete`);
      const data = await res.json();

      if (data.success && data.pete) {
        const rows: any[] = data.pete.slice(1);

        const formatted: PeteEntry[] = rows.map((row: any, index: number) => ({
          id: index + 1,
          ...row,
        }));

        setPeteEntries(formatted);
      }
    } catch (error) {
      console.error("Error fetching Pete data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeteData();
  }, []);

  // ============================
  // FORM INPUT HANDLER
  // ============================
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ============================
  // PHOTO UPLOAD HANDLER
  // ============================
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          photo: file,
          photoPreview: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTimestamp = () => {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  // ============================
  // SUBMIT FORM
  // ============================
  const handleSubmit = async () => {
    if (!formData.name || !formData.date || !formData.groupHead) {
      alert("Please fill in all required fields (Name, Date, and Group Head)");
      return;
    }

    setSubmitting(true);

    const newEntry = {
      id: Date.now(),
      timestamp: formatTimestamp(),
      serialNo: `PT-${String(peteEntries.length + 1).padStart(3, "0")}`,
      ...formData,
    };

    try {
      await fetch(`${SCRIPT_URL}?action=addPete`, {
        method: "POST",
        body: JSON.stringify(newEntry),
      });

      await fetchPeteData();

      // Reset form
      setFormData({
        name: "",
        date: new Date().toISOString().split("T")[0],
        debitAmount: "",
        creditAmount: "",
        groupHead: "",
        reason: "",
        personName: "",
        photo: null,
        photoPreview: null,
      });

      setSubmitting(false);
      setShowModal(false);

      // Show success message
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

    } catch (error) {
      console.error("Error submitting entry:", error);
      setSubmitting(false);
      alert("Failed to submit entry. Please try again.");
    }
  };

  // ============================
  // CANCEL FORM
  // ============================
  const handleCancel = () => {
    setFormData({
      name: "",
      date: new Date().toISOString().split("T")[0],
      debitAmount: "",
      creditAmount: "",
      groupHead: "",
      reason: "",
      personName: "",
      photo: null,
      photoPreview: null,
    });
    setShowModal(false);
  };

  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  // ============================
  // UI START
  // ============================
  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* SUCCESS MESSAGE */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn">
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold">Success!</p>
              <p className="text-sm text-green-100">Pete entry added successfully</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Pete Management
          </h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 shadow-md"
            style={{ backgroundColor: "#1e40af" }}
          >
            <Plus className="w-4 h-4" />
            Add Pete
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-left">
                    Serial No
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-left">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-left">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-left">
                    Debit Amount
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-left">
                    Credit Amount
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-left">
                    Group Head
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-left">
                    Reason
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-left">
                    Person Name
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-left">Photo</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full" />
                        <p className="text-gray-600 text-sm">Loading Pete Entries...</p>
                      </div>
                    </td>
                  </tr>
                ) : peteEntries.length > 0 ? (
                  peteEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{entry.serialNo}</td>
                      <td className="px-6 py-4">{entry.name}</td>
                      <td className="px-6 py-4">{formatDate(entry.date || "")}</td>
                      <td className="px-6 py-4">
                        {entry.debitAmount ? `₹${entry.debitAmount}` : "-"}
                      </td>

                      <td className="px-6 py-4">
                        {entry.creditAmount ? `₹${entry.creditAmount}` : "-"}
                      </td>

                      {/* ⭐ FIXED GROUP HEAD PILL DESIGN */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap"
                          style={{ minWidth: "90px" }}
                        >
                          {entry.groupHead}
                        </span>
                      </td>
                      <td className="px-6 py-4">{entry.reason || "-"}</td>
                      <td className="px-6 py-4">{entry.personName || "-"}</td>

                      {/* PHOTO */}
                      <td className="px-6 py-4">
                        {entry.photoPreview ? (
                          <button
                            onClick={() => setViewPhoto(entry.photoPreview!)}
                            className="text-blue-800 flex items-center gap-1 hover:underline"
                          >
                            <Eye size={16} />
                            View
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">
                      No Pete entries yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW */}
          <div className="lg:hidden">
            {peteEntries.length > 0 ? (
              peteEntries.map((entry) => (
                <div key={entry.id} className="p-4 border-b">
                  <h3 className="text-lg font-semibold">{entry.name}</h3>
                  <p className="text-sm">{formatDate(entry.date || "")}</p>
                  <p className="text-sm">{entry.groupHead}</p>

                  {entry.photoPreview && (
                    <button
                      onClick={() => setViewPhoto(entry.photoPreview!)}
                      className="text-blue-700 mt-2"
                    >
                      <Eye size={16} /> View Photo
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                No Pete entries yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADD PETE FORM MODAL (FULLY INCLUDED & FIXED) */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl animate-fadeIn max-h-[90vh] overflow-hidden flex flex-col">

            {/* HEADER */}
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Add Pete Entry</h2>
              <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                <X size={22} />
              </button>
            </div>

            {/* FORM BODY */}
            <div className="px-6 py-4 overflow-y-auto space-y-5">

              {/* ROW 1: Name + Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full pl-10 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* ROW 2: Debit + Credit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Debit Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      name="debitAmount"
                      type="number"
                      value={formData.debitAmount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      disabled={formData.creditAmount !== ""}
                      className={`w-full pl-7 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm ${formData.creditAmount !== "" ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      name="creditAmount"
                      type="number"
                      value={formData.creditAmount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      disabled={formData.debitAmount !== ""}
                      className={`w-full pl-7 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm ${formData.debitAmount !== "" ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                    />
                  </div>
                </div>
              </div>

              {/* GROUP HEAD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Head <span className="text-red-600">*</span>
                </label>
                <select
                  name="groupHead"
                  value={formData.groupHead}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                >
                  <option value="">Select Group Head</option>
                  {groupHeadOptions.map((opt, idx) => (
                    <option key={idx} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* REASON */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Enter reason"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                ></textarea>
              </div>

              {/* PERSON NAME */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Person Name
                </label>
                <input
                  name="personName"
                  value={formData.personName}
                  onChange={handleInputChange}
                  placeholder="Enter person name"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                />
              </div>

              {/* PHOTO UPLOAD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo
                </label>
                <label className="block border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Upload size={18} />
                    <span>Upload Photo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {formData.photoPreview && (
                  <img
                    src={formData.photoPreview}
                    alt="Preview"
                    className="w-24 h-24 mt-3 rounded-lg object-cover border"
                  />
                )}
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end items-center gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`px-5 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-all ${submitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-700 hover:bg-blue-800"
                  }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PHOTO MODAL */}
      {viewPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setViewPhoto(null)}
        >
          <div className="relative max-w-3xl">
            <button
              className="absolute -top-10 right-0 text-white"
              onClick={() => setViewPhoto(null)}
            >
              <X size={32} />
            </button>
            <img
              src={viewPhoto}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PetePage;
