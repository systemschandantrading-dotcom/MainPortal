import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, X } from "lucide-react";

interface Purchase {
  id: number;
  serialNo: string;
  slipNo: string;
  status: string;
  date: string;
  time: string;
  partyName: string;
  material: string;
  qty: string;
  vehicleNo: string;
  lotNo: string;
  approvalStatus?: string | null;
  remarks?: string;
  approvalDate?: string;
  approvalTime?: string;
}

const VehiclePurchase = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<Purchase[]>([]);
  const [historyPurchases, setHistoryPurchases] = useState<Purchase[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    approval: "",
    remarks: ""
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "";

    const d = new Date(dateString);

    if (isNaN(d.getTime())) return dateString;

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  };

  // Load purchases from localStorage on mount
  // Load purchases from Google Sheet on mount
  useEffect(() => {
    fetchPurchasesFromSheet();
  }, []);

  // Inside VehiclePurchase.tsx

  // Inside VehiclePurchase.tsx

const fetchPurchasesFromSheet = async () => {
  try {
    setIsFetching(true); // Start loading
    const url = `${import.meta.env.VITE_APP_SCRIPT_URL}?action=getApprovalData`;
    
    // Add this log to debug
    console.log("Fetching from:", url);

    const response = await fetch(url);
    const data = await response.json();

    // Add this log to see what came back
    console.log("Sheet Data Received:", data);

    if (data.success && Array.isArray(data.approvals)) {
      const mapped = data.approvals.map((item: any, index: number) => ({
        id: index + 1,
        serialNo: item.serialNo,
        status: item.status,
        slipNo: item.slipNo,
        // Backend now sends clean strings, so we don't need complex date parsing here
        date: item.date, 
        time: item.time,
        partyName: item.partyName,
        material: item.material,
        qty: item.qty,
        vehicleNo: item.vehicleNo,
        lotNo: item.lotNo,
        plannedDate: item.plannedDate,
        actualDate: item.actualDate,
        approvalStatus: item.approvalStatus,
        remarks: item.remarks
      }));

      setPurchases(mapped);
    } else {
      console.error("Data error:", data);
    }
  } catch (err) {
    console.error("Fetch error:", err);
  } finally {
    setIsFetching(false); // End loading
  }
};

  // Separate purchases into pending and history
  useEffect(() => {
    const pending = purchases.filter(p => !p.approvalStatus || p.approvalStatus.trim() === "");
    const history = purchases.filter(p => p.approvalStatus && p.approvalStatus.trim() !== "");
    setPendingPurchases(pending);
    setHistoryPurchases(history);
  }, [purchases]);

  const handleGetApproval = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setApprovalForm({
      approval: "",
      remarks: ""
    });
    setShowApprovalModal(true);
  };

  const handleApprovalFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setApprovalForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!approvalForm.approval) {
      alert("Please select approval status");
      return;
    }

    setIsSaving(true); // Start saving loading
    
    // Update the purchase with approval status
    const updatedPurchases = purchases.map(p => {
      if (p.id === selectedPurchase?.id) {
        return {
          ...p,
          approvalStatus: approvalForm.approval,
          remarks: approvalForm.remarks,
          approvalDate: new Date().toISOString().split('T')[0],
          approvalTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
      }
      return p;
    });

    setPurchases(updatedPurchases);

    // Send approval update to Google Sheet
  await fetch(
    `${import.meta.env.VITE_APP_SCRIPT_URL}`,
    {
      method: "POST",
      body: new URLSearchParams({
        action: "updateApprovalStatus",
        serialNo: selectedPurchase!.serialNo,
        approvalStatus: approvalForm.approval,
        remarks: approvalForm.remarks
      })
    }
  );

  // Refresh table
  await fetchPurchasesFromSheet();
    setIsSaving(false); // Stop saving loading
    setShowApprovalModal(false);
    setSelectedPurchase(null);
    setApprovalForm({ approval: "", remarks: "" });
  };

  const handleApprovalCancel = () => {
    setShowApprovalModal(false);
    setSelectedPurchase(null);
    setApprovalForm({ approval: "", remarks: "" });
  };

  const getTabCounts = () => {
    return {
      pending: pendingPurchases.length,
      history: historyPurchases.length
    };
  };

  const tabCounts = getTabCounts();

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 lg:p-6 bg-gray-50">
        <div className="max-w-full mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Purchase</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-4 lg:px-6 bg-gray-50">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "pending"
                ? "border-red-800 text-red-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Pending ({tabCounts.pending})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "history"
                ? "border-red-800 text-red-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            History ({tabCounts.history})
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-hidden px-4 lg:px-6 pb-4 lg:pb-6 pt-4">
        <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {/* Desktop Table */}
          <div className="hidden lg:block flex-1 overflow-y-auto">
            <table className="w-full min-w-max">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {activeTab === "pending" && (
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Get Approval</th>
                  )}
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Serial Number</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Party Name</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Time</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Material</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Qty.</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Vehicle No</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">LOT No.</th>
                  {activeTab === "history" && (
                    <>
                      <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Approval Status</th>
                      <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Remarks</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeTab === "pending" ? (
                  pendingPurchases.length > 0 ? (
                    pendingPurchases.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleGetApproval(item)}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Get Approval
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{item.serialNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.status === "In" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{formatDate(item.date)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{item.partyName}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.time}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.material}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.qty}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.vehicleNo}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.lotNo}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col gap-2 items-center">
                          <CheckCircle className="w-8 h-8 text-gray-400" />
                          <span>No pending approvals</span>
                        </div>
                      </td>
                    </tr>
                  )
                ) : (
                  historyPurchases.length > 0 ? (
                    historyPurchases.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{item.serialNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.status === "In" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{formatDate(item.date)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{item.partyName}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.time}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.material}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.qty}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.vehicleNo}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.lotNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.approvalStatus === "approved" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {item.approvalStatus === "approved" ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approved
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            {item.remarks || "-"}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col gap-2 items-center">
                          <Eye className="w-8 h-8 text-gray-400" />
                          <span>No history records</span>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="flex-1 overflow-y-auto lg:hidden">
            {activeTab === "pending" ? (
              pendingPurchases.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {pendingPurchases.map((item) => (
                    <div key={item.id} className="p-4 bg-white space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Serial No</span>
                          <p className="text-sm font-semibold text-gray-900">{item.serialNo}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.status === "In" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Date</span>
                          <p className="text-sm text-gray-900">{formatDate(item.date)}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Time</span>
                          <p className="text-sm text-gray-900">{item.time}</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Party Name</span>
                        <p className="text-sm font-medium text-gray-900">{item.partyName}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Material</span>
                          <p className="text-sm text-gray-900">{item.material}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Qty</span>
                          <p className="text-sm text-gray-900">{item.qty}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Vehicle No</span>
                          <p className="text-sm text-gray-900">{item.vehicleNo}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">LOT No</span>
                          <p className="text-sm text-gray-900">{item.lotNo}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleGetApproval(item)}
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Get Approval
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-12 text-center text-gray-500">
                  <div className="flex flex-col gap-3 items-center">
                    <CheckCircle className="w-12 h-12 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-700">No pending approvals</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              historyPurchases.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {historyPurchases.map((item) => (
                    <div key={item.id} className="p-4 bg-white space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Serial No</span>
                          <p className="text-sm font-semibold text-gray-900">{item.serialNo}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.status === "In" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Date</span>
                          <p className="text-sm text-gray-900">{formatDate(item.date)}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Time</span>
                          <p className="text-sm text-gray-900">{item.time}</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Party Name</span>
                        <p className="text-sm font-medium text-gray-900">{item.partyName}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Material</span>
                          <p className="text-sm text-gray-900">{item.material}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Qty</span>
                          <p className="text-sm text-gray-900">{item.qty}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">Vehicle No</span>
                          <p className="text-sm text-gray-900">{item.vehicleNo}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">LOT No</span>
                          <p className="text-sm text-gray-900">{item.lotNo}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.approvalStatus === "approved" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {item.approvalStatus === "approved" ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approved
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Rejected
                            </>
                          )}
                        </span>
                        {item.remarks && (
                          <div className="mt-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">Remarks</span>
                            <p className="text-sm text-gray-900 mt-1">{item.remarks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-12 text-center text-gray-500">
                  <div className="flex flex-col gap-3 items-center">
                    <Eye className="w-12 h-12 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-700">No history records</p>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Get Approval</h3>
              <button onClick={handleApprovalCancel} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Pre-filled fields */}
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={selectedPurchase.serialNo}
                  readOnly
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  Status
                </label>
                <input
                  type="text"
                  value={selectedPurchase.status}
                  readOnly
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="text"
                  value={selectedPurchase.date}
                  readOnly
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  Party Name
                </label>
                <input
                  type="text"
                  value={selectedPurchase.partyName}
                  readOnly
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  Vehicle No
                </label>
                <input
                  type="text"
                  value={selectedPurchase.vehicleNo}
                  readOnly
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Editable fields */}
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  Approval <span className="text-red-600">*</span>
                </label>
                <select
                  name="approval"
                  value={approvalForm.approval}
                  onChange={handleApprovalFormChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent bg-white"
                >
                  <option value="">Select Approval Status</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={approvalForm.remarks}
                  onChange={handleApprovalFormChange}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent resize-none"
                  placeholder="Enter remarks..."
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end p-4 border-t border-gray-200">
              <button
                onClick={handleApprovalCancel}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovalSubmit}
                disabled={isSaving}
                className={`px-4 py-2.5 text-sm font-medium text-white rounded-md transition-colors ${
                  isSaving ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </div>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclePurchase;