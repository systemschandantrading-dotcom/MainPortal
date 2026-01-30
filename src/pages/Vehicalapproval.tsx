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
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "pending"
              ? "border-red-800 text-red-800"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            Pending ({tabCounts.pending})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "history"
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
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === "In" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
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
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === "In" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
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
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.approvalStatus === "approved"
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
            {isFetching ? (
              <div className="flex items-center justify-center h-full p-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-600 text-sm">Loading...</p>
                </div>
              </div>
            ) : activeTab === "pending" ? (
              pendingPurchases.length > 0 ? (
                <div className="p-3 space-y-3">
                  {pendingPurchases.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex justify-between items-center border-b border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Serial No</p>
                          <p className="text-sm font-bold text-gray-900">{item.serialNo}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === "In" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                          }`}>
                          {item.status}
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">Date</p>
                            <p className="text-sm font-medium text-gray-900">{formatDate(item.date)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Time</p>
                            <p className="text-sm font-medium text-gray-900">{item.time}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Party Name</p>
                          <p className="text-sm font-semibold text-gray-900">{item.partyName}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">Material</p>
                            <p className="text-sm font-medium text-gray-900">{item.material}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Qty</p>
                            <p className="text-sm font-medium text-gray-900">{item.qty}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">Vehicle No</p>
                            <p className="text-sm font-medium text-gray-900">{item.vehicleNo}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">LOT No</p>
                            <p className="text-sm font-medium text-gray-900">{item.lotNo}</p>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => handleGetApproval(item)}
                          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                        >
                          Get Approval
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-12 text-center text-gray-500">
                  <div className="flex flex-col gap-3 items-center">
                    <CheckCircle className="w-12 h-12 text-gray-300" />
                    <div>
                      <p className="font-medium text-gray-600">No pending approvals</p>
                      <p className="text-sm text-gray-400">All entries have been processed</p>
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
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === "In" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
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
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.approvalStatus === "approved"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-fadeIn">

            {/* Fixed Header */}
            <div className="flex-shrink-0 flex justify-between items-center px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
              <div>
                <h3 className="text-lg font-semibold text-white">Get Approval</h3>
                <p className="text-blue-100 text-xs mt-0.5">Review and approve vehicle entry</p>
              </div>
              <button
                onClick={handleApprovalCancel}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Compact Info Grid - Read Only */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Entry Details</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Serial No</span>
                    <p className="text-sm font-medium text-gray-900">{selectedPurchase.serialNo}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Status</span>
                    <p className="text-sm font-medium">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${selectedPurchase.status === "In" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                        }`}>
                        {selectedPurchase.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Date</span>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedPurchase.date)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Time</span>
                    <p className="text-sm font-medium text-gray-900">{selectedPurchase.time}</p>
                  </div>
                </div>
              </div>

              {/* Party & Vehicle Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <span className="text-xs text-gray-500">Party Name</span>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedPurchase.partyName}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <span className="text-xs text-gray-500">Vehicle No</span>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedPurchase.vehicleNo}</p>
                </div>
              </div>

              {/* Material & Qty */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <span className="text-xs text-gray-500">Material</span>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedPurchase.material}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <span className="text-xs text-gray-500">Quantity</span>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedPurchase.qty}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Approval Decision</p>

                {/* Approval Select */}
                <div className="mb-3">
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Approval Status <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="approval"
                    value={approvalForm.approval}
                    onChange={handleApprovalFormChange}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                  >
                    <option value="">Select Approval Status</option>
                    <option value="approved">✓ Approved</option>
                    <option value="rejected">✗ Rejected</option>
                  </select>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Remarks
                  </label>
                  <textarea
                    name="remarks"
                    value={approvalForm.remarks}
                    onChange={handleApprovalFormChange}
                    rows={2}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                    placeholder="Enter remarks (optional)..."
                  />
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 flex gap-3 justify-end px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={handleApprovalCancel}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovalSubmit}
                disabled={isSaving}
                className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all flex items-center gap-2 ${isSaving ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
                  }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  "Submit Approval"
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