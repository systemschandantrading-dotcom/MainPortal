import React, { useState, useEffect, ChangeEvent, FormEvent, MouseEvent, useMemo, useRef } from "react";
import { Calendar, Filter, X, Search, ChevronDown, ChevronUp, Plus, Upload, Eye, Download, RefreshCw} from "lucide-react";
import MasterDataComponent from "./Purchase/MasterData";

// 1. UPDATED INTERFACES (slipNumber and lotNo are now single strings, bag added)
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
  inWord: string;
  taadWeight: string;
  vehicleNo: string;
  lotNo: string; // Changed from string[] to string
  location: string;
  slipNumber: string; // Changed from string[] to string
  bag: string; // Added bag
  weight: string,
  aadhaarImage: File | null;
  aadhaarImagePreview?: string | ArrayBuffer | null;
}

interface FormData {
  status: string;
  date: string;
  time: string;
  partyName: string;
  material: string;
  qty: string;
  inWord: string;
  taadWeight: string;
  vehicleNo: string;
  slipNumber: string; // Changed from string[] to string
  lotNo: string; // Changed from string[] to string
  aadhaarImage: File | null;
  aadhaarImagePreview: string | ArrayBuffer | null;
}

// New interface for the Location & Bag repeating fields
interface LocationBagEntry {
    location: string;
    bag: string;
    weight: string;
}

const APP_SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL;

// Utility function to convert number to words (UNCHANGED)
const numberToWords = (num: number): string => {
  if (!num || num === 0) return "Zero";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + numberToWords(num % 100) : "");
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + numberToWords(num % 1000) : "");

  return num.toString();
};

// Excel Export Function (UPDATED for single lotNo/slipNumber and added bag)
const downloadExcel = (data: Purchase[]): void => {
  const headers = ["Serial No", "Slip No", "Status", "Date", "Time", "Party Name", "Material", "Qty", "In Word", "TAAD Weight", "Vehicle No", "Lot No", "Location", "Bag", "Slip Number"];

  const csvContent = [
    headers.join(","),
    ...data.map(item => [
      item.serialNo,
      item.slipNo,
      item.status,
      item.date,
      item.time,
      `"${item.partyName}"`,
      item.material,
      item.qty,
      item.inWord,
      item.taadWeight,
      item.vehicleNo,
      `"${item.lotNo}"`, // Single string now
      `"${item.location}"`,
      `"${item.bag}"`, // Added Bag
      `"${item.slipNumber}"` // Single string now
    ].join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `purchase-records-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const PurchaseInOut: React.FC = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState({
    partyName: "",
    material: "",
    status: "",
    startDate: "",
    endDate: "",
  });

  const [formData, setFormData] = useState<FormData>({
    status: "In",
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    partyName: "",
    material: "",
    qty: "",
    inWord: "",
    taadWeight: "",
    vehicleNo: "",
    slipNumber: "", // Changed to string
    lotNo: "", // Changed to string
    aadhaarImage: null,
    aadhaarImagePreview: null,
  });

  // NEW STATE for repeating Location/Bag entries
  const [locationBagEntries, setLocationBagEntries] = useState<LocationBagEntry[]>([
    { location: "", bag: "", weight: "" }
  ]);


  // Add search states for dropdowns
  const [dropdownSearch, setDropdownSearch] = useState({
    partyName: "",
    material: "",
    location: "", // Keep location for master data search
  });

  const dropdownRefs = {
    partyName: useRef<HTMLDivElement>(null),
    material: useRef<HTMLDivElement>(null),
    location: useRef<HTMLDivElement>(null)
  };

  const [showDropdown, setShowDropdown] = useState({
    partyName: false,
    material: false,
    location: false,
  });

  const [showLocationDropdown, setShowLocationDropdown] = useState<boolean[]>([false]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) =>  {
      const target = event.target as Node;

      const isOutsidePartyName = !dropdownRefs.partyName.current?.contains(target);
      const isOutsideMaterial = !dropdownRefs.material.current?.contains(target);
      const isOutsideLocation = !dropdownRefs.location.current?.contains(target);

      if (isOutsidePartyName && isOutsideMaterial && isOutsideLocation) {
        setShowDropdown({
          partyName: false,
          material: false,
          location: false,
        });
      }
    };

    // Note: TypeScript might complain about 'MouseEvent' being too broad.
    // The cast 'as any' is often used in React external click handlers for events
    // that attach to the document.
    document.addEventListener('click', handleClickOutside as any);
    return () => document.removeEventListener('click', handleClickOutside as any);
  }, []);

  // Handle dropdown search changes
  const handleDropdownSearchChange = (field: keyof typeof dropdownSearch, value: string) => {
    setDropdownSearch(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // handleDropdownSelect for PartyName/Material (single fields)
  const handleDropdownSelect = (field: 'partyName' | 'material', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    } as unknown as FormData));
    setDropdownSearch(prev => ({
      ...prev,
      [field]: ""
    }));
    setShowDropdown(prev => ({
      ...prev,
      [field]: false
    }));
  };
  
  // handleDropdownSelect for Location in the Location/Bag repeating field
  const handleLocationDropdownSelect = (index: number, value: string) => {
    setLocationBagEntries(prev => {
        const updated = [...prev];
        updated[index].location = value;
        return updated;
    });

    // ✅ Close only this dropdown
    setShowLocationDropdown(prev => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
    });

    // Clear search bar
    handleDropdownSearchChange("location", "");
  };

  const handleInputFocus = (field: keyof typeof showDropdown, index?: number) => (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation();
    
    // Logic for single-entry dropdowns (PartyName, Material)
    if (index === undefined) {
        setShowDropdown(prev => ({
            ...prev,
            [field]: true
        }));
        // Set the search term to current value when focusing
        // - safe cast because these dropdown fields are strings on formData
        handleDropdownSearchChange(field, (formData as any)[field] as string || "");
    } else {
        // Logic for Location dropdown within the Location/Bag list
            setShowLocationDropdown(prev => {
            const updated = [...prev];
            updated[index] = true;   // open dropdown for THIS row only
            return updated;
        });

        handleDropdownSearchChange("location", locationBagEntries[index].location || "");
    }
  };

  // Clear dropdown search when modal closes
  useEffect(() => {
    if (!showModal) {
      setDropdownSearch({
        partyName: "",
        material: "",
        location: ""
      });

      // CLOSE ALL LOCATION DROPDOWNS
      setShowLocationDropdown(prev => prev.map(() => false));
    }
  }, [showModal]);

  useEffect(() => {
    fetchPurchasesFromSheet();
  }, []);

  // Auto-fill "In Word" when qty changes (UNCHANGED)
  useEffect(() => {
    if (formData.qty) {
      setFormData(prev => ({
        ...prev,
        inWord: numberToWords(parseInt(formData.qty))
      }));
    } else {
      setFormData(prev => ({ ...prev, inWord: "" }));
    }
  }, [formData.qty]);

  // Apply filters (UNCHANGED)
  const applyFilters = React.useCallback((): void => {
    let filtered = [...purchases];

    if (activeTab === "in") {
      filtered = filtered.filter(item => item.status === "In");
    } else if (activeTab === "out") {
      filtered = filtered.filter(item => item.status === "Out");
    }

    if (filters.partyName) {
      filtered = filtered.filter((item) =>
        item.partyName.toLowerCase().includes(filters.partyName.toLowerCase())
      );
    }

    if (filters.material) {
      filtered = filtered.filter((item) =>
        item.material.toLowerCase().includes(filters.material.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.date);
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    setFilteredPurchases(filtered);
  }, [filters, purchases, activeTab]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleClearFilters = (): void => {
    setFilters({
      partyName: "",
      material: "",
      status: "",
      startDate: "",
      endDate: "",
    });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    } as unknown as FormData));
  };

  // ==============================
  // FETCH ALL PURCHASES FROM SHEET (UPDATED for single lotNo/slipNumber/location/bag)
  // ==============================
  const fetchPurchasesFromSheet = async () => {
    try {
      const response = await fetch(`${APP_SCRIPT_URL}?action=getAllPurchases`);
      const data = await response.json();

      if (data.success && Array.isArray(data.purchases)) {
        const mappedData: Purchase[] = data.purchases.map((item: any, index: number) => ({
          id: index + 1,
          serialNo: item.serialNo || "",
          slipNo: item.slipNo || "",
          status: item.status || "",
          date: item.date ? new Date(item.date).toLocaleDateString("en-GB") : "",
          time: item.time ? new Date(item.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "",
          partyName: item.partyName || "",
          material: item.material || "",
          qty: item.qty || "",
          inWord: item.inWord || "",
          taadWeight: item.taadWeight || "",
          vehicleNo: item.vehicleNo || "",
          // Map lotNo from array/string to a single string (for display compatibility)
          lotNo: item.lotNo || "",
          location: item.location || "",
          bag: item.bag || "",
          weight: item.weight || "",
          aadhaarImage: null, // Assuming image link is not directly in list
        }));

        setPurchases(mappedData);
        setFilteredPurchases(mappedData);
      }
    } catch (err) {
      console.error("Failed to fetch purchases:", err);
    } finally {
    }
  };

  // ===================================
  // NEW LOCATION & BAG ARRAY MANAGEMENT
  // ===================================
  const addLocationBagEntry = (): void => {
    setLocationBagEntries(prev => [...prev, { location: "", bag: "", weight: "" }]);
    setShowLocationDropdown(prev => [...prev, false]); // add dropdown slot
  };

  const removeLocationBagEntry = (index: number): void => {
    if (locationBagEntries.length === 1) {
      setLocationBagEntries([{ location: "", bag: "",weight: "" }]);
      return;
    }

    setLocationBagEntries(prev => prev.filter((_, i) => i !== index));
    setShowLocationDropdown(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationBagChange = (
    index: number,
    field: 'location' | 'bag' | 'weight',
    value: string
  ): void => {
    const updatedEntries = [...locationBagEntries];
    updatedEntries[index][field] = value;

    setLocationBagEntries(updatedEntries);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          aadhaarImage: file,
          aadhaarImagePreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    handleSaveClick(e as unknown as MouseEvent<HTMLButtonElement>);
  };

  const formatTimeWithSeconds = (timeStr: string) => {
  // Case: "5:09 PM"
    if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(timeStr)) {
      return timeStr.replace(" ", ":00 ");
    }

    // Already correct format
    if (/^\d{1,2}:\d{2}:\d{2}\s?(AM|PM)$/i.test(timeStr)) {
      return timeStr;
    }

    return timeStr; // fallback
  };

  // Google Apps Script submission functions (UPDATED)
  const submitToGoogleSheets = async (
    purchaseData: FormData,
    serialNo: string,
    slipNo: string,
    location: string,
    bag: string,
    weight: string     // correct variable
  ): Promise<{ success: boolean; serialNo: string; slipNo: string }> => {

    try {
      // NOTE: slipNumber and lotNo are now single values from formData
      const submissionData = {
      action: 'submitPurchase',
      serialNo,
      slipNo, 
      status: purchaseData.status,
      date: purchaseData.date,
      time: formatTimeWithSeconds(purchaseData.time),
      partyName: purchaseData.partyName,
      material: purchaseData.material,
      qty: purchaseData.qty,
      inWord: purchaseData.inWord,
      taadWeight: purchaseData.taadWeight,
      vehicleNo: purchaseData.vehicleNo,
      lotNo: purchaseData.lotNo,
      location: location,
      bag: bag,            // This goes to sheet column QTY
      weight: weight,
      slipNumber: purchaseData.slipNumber,
      timestamp: new Date().toISOString(),
    };

      const fd = new URLSearchParams();
      Object.entries(submissionData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          fd.append(key, value.toString());
        }
      });

      const response = await fetch(APP_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: fd
      });

      const json = await response.json();

      return {
        success: json.success,
        serialNo: json.serialNo || "",
        slipNo: json.slipNo || ""
      };

    } catch (err) {
      console.error(err);
      return {
        success: false,
        serialNo: "",
        slipNo: ""
      };
    }
  };

  const handleSaveClick = async (e: MouseEvent<HTMLButtonElement>): Promise<void> => {
    setIsSaving(true);
    e.preventDefault();

    // 1. Basic Validation
    if (!formData.status || !formData.date || !formData.partyName || !formData.material || !formData.qty) {
      alert("Please fill in all required fields (Status, Date, Party Name, Material, Qty).");
      setIsSaving(false);
      return;
    }

  const cleanedLocationBagEntries = locationBagEntries.filter(entry => {
    return entry.location.trim() !== "" || entry.bag.trim() !== "";
  });

  // if (cleanedLocationBagEntries.length === 0) {
  //   alert("Please enter at least one Location and Bag value.");
  //   setIsSaving(false);
  //   return;
  // }

  for (let entry of cleanedLocationBagEntries) {
    if (entry.location.trim() === "" || entry.bag.trim() === "") {
      alert("Please fill both Location and Bag in each row.");
      setIsSaving(false);
      return;
    }
  }

    // if (cleanedLocationBagEntries.length === 0) {
    //   alert("Please enter at least one Location or Bag value.");
    //   setIsSaving(false);
    //   return;
    // }

    let newPurchases: Purchase[] = [];

    // 3. Loop through Location/Bag entries to create multiple records
    for (let i = 0; i < cleanedLocationBagEntries.length; i++) {
    const entry = cleanedLocationBagEntries[i];

    // Submit row to Google Sheet (old logic kept same)
    const submitted = await submitToGoogleSheets(
      formData,
      "",       // backend will generate serial
      "",       // backend will generate slip no
      entry.location,
      entry.bag,
      entry.weight
    );

    newPurchases.push({
      id: 0,
      serialNo: submitted.serialNo,
      slipNo: submitted.slipNo,

      status: formData.status,
      date: formData.date,
      time: formData.time,
      partyName: formData.partyName,
      material: formData.material,
      qty: formData.qty,
      inWord: formData.inWord,
      taadWeight: formData.taadWeight,
      vehicleNo: formData.vehicleNo,

      lotNo: formData.lotNo,
      slipNumber: "",         // REMOVED from row storage completely

      location: entry.location,
      bag: entry.bag,
      weight: entry.weight,

      aadhaarImage: formData.aadhaarImage,
      aadhaarImagePreview: formData.aadhaarImagePreview
    });
  }
    // 4. Update state and UI
    // 4. Instead of using local state (wrong slip nos), re-fetch correct data
    await fetchPurchasesFromSheet();

    setShowModal(false);
    handleCancel();
    alert(`${newPurchases.length} rows saved successfully!`);
    setIsSaving(false);
  };
  
  const handleCancel = (): void => {
  setFormData({
      status: "In",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }),
      partyName: "",
      material: "",
      qty: "",
      inWord: "",
      taadWeight: "",
      vehicleNo: "",
      slipNumber: "",
      lotNo: "",
      aadhaarImage: null,
      aadhaarImagePreview: null,
    });

    // RESET location rows — always exactly ONE row only
    setLocationBagEntries([{ location: "", bag: "", weight: "" }]);

    setShowModal(false);
  };

  const getTabCounts = (): { all: number; in: number; out: number } => {
    return {
      all: purchases.length,
      in: purchases.filter(p => p.status === "In").length,
      out: purchases.filter(p => p.status === "Out").length,
    };
  };

  const getStats = (): { totalIn: number; totalOut: number; totalPurchase: number } => {
    const uniqueSerials = new Set<string>();
    let totalIn = 0;
    let totalOut = 0;

    purchases.forEach(item => {
      if (item.status === "In") totalIn++;
      if (item.status === "Out") totalOut++;
      uniqueSerials.add(item.serialNo);
    });

    return {
      totalIn,
      totalOut,
      totalPurchase: uniqueSerials.size,
    };
  };

  const stats = getStats();
  const tabCounts = getTabCounts();

  return (
    <MasterDataComponent>
      {({ masterData, refreshMasterData, loading, error }) => {
        // Filtered options for dropdowns (location filter simplified to always use master data)
        const filteredPartyNames = useMemo(() => {
          return masterData.partyNames.filter(party =>
            party.toLowerCase().includes(dropdownSearch.partyName.toLowerCase())
          );
        }, [masterData.partyNames, dropdownSearch.partyName]);

        const filteredMaterials = useMemo(() => {
          return masterData.materials.filter(material =>
            material.toLowerCase().includes(dropdownSearch.material.toLowerCase())
          );
        }, [masterData.materials, dropdownSearch.material]);

        const filteredLocations = useMemo(() => {
          return masterData.locations.filter(location =>
            location.toLowerCase().includes(dropdownSearch.location.toLowerCase())
          );
        }, [masterData.locations, dropdownSearch.location]);

        return (
          <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
            {/* Stats Cards */}
            <div className="flex-shrink-0 p-4 lg:p-6 bg-gray-50">
              <div className="max-w-full mx-auto">
                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{error}</span>
                      <button onClick={refreshMasterData} className="text-red-700 hover:text-red-900">
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                  <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-md">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading master data...</span>
                    </div>
                  </div>
                )}

                {/* Desktop Stats - 3 columns (UNCHANGED) */}
                <div className="hidden md:grid md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total In</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalIn}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📥</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Out</p>
                        <p className="text-3xl font-bold text-orange-600 mt-2">{stats.totalOut}</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📤</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Purchase</p>
                        <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalPurchase}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📊</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Stats - Single Row (UNCHANGED) */}
                <div className="md:hidden bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl">📥</span>
                      </div>
                      <p className="text-xs font-medium text-gray-600">Total In</p>
                      <p className="text-xl font-bold text-green-600 mt-1">{stats.totalIn}</p>
                    </div>

                    <div className="text-center border-x border-gray-200">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl">📤</span>
                      </div>
                      <p className="text-xs font-medium text-gray-600">Total Out</p>
                      <p className="text-xl font-bold text-orange-600 mt-1">{stats.totalOut}</p>
                    </div>

                    <div className="text-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl">📊</span>
                      </div>
                      <p className="text-xs font-medium text-gray-600">Purchase</p>
                      <p className="text-xl font-bold text-blue-600 mt-1">{stats.totalPurchase}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">Purchase In/Out</h1>
                  <div className="flex gap-2">
                    {/* Refresh Data Button (UNCHANGED) */}
                    <button
                      onClick={refreshMasterData}
                      className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md transition-all hover:opacity-90"
                      title="Refresh Master Data"
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      {loading ? 'Loading...' : 'Refresh Data'}
                    </button>

                    {/* Desktop Buttons (UNCHANGED, except Download Excel headers) */}
                    <button
                      onClick={() => downloadExcel(filteredPurchases)}
                      className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-all hover:opacity-90 bg-green-600"
                    >
                      <Download className="w-4 h-4" />
                      Download Excel
                    </button>
                    <button
                      onClick={() => {
                        handleCancel();      
                        setShowModal(true);  
                      }}
                      className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-all hover:opacity-90"
                      style={{ backgroundColor: '#1e40af' }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Purchase
                    </button>

                    {/* Mobile Icon Buttons (UNCHANGED) */}
                    <button
                      onClick={refreshMasterData}
                      className="md:hidden flex items-center justify-center w-10 h-10 text-white bg-purple-600 rounded-md transition-all hover:opacity-90"
                      title="Refresh Master Data"
                      disabled={loading}
                    >
                      <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => downloadExcel(filteredPurchases)}
                      className="md:hidden flex items-center justify-center w-10 h-10 text-white rounded-md transition-all hover:opacity-90 bg-green-600"
                      title="Download Excel"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowModal(true)}
                      className="md:hidden flex items-center justify-center w-10 h-10 text-white rounded-md transition-all hover:opacity-90"
                      style={{ backgroundColor: '#1e40af' }}
                      title="Add Purchase"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Desktop Filters (UNCHANGED) */}
                <div className="hidden lg:block p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                    <div className="flex gap-2 items-center">
                      <Filter className="w-5 h-5 text-gray-600" />
                      <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
                    </div>
                    <button
                      onClick={handleClearFilters}
                      className="px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded-md transition-colors hover:bg-gray-300"
                    >
                      Clear Filters
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {/* Party Name Filter (UNCHANGED) */}
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Party Name
                      </label>
                      <select
                        value={filters.partyName}
                        onChange={(e) => setFilters({ ...filters, partyName: e.target.value })}
                        className="py-2 px-3 w-full text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        disabled={loading}
                      >
                        <option value="">All Parties</option>
                        {masterData.partyNames
                          .filter(party => party && party.trim() !== '')
                          .map((party, idx) => (
                            <option key={idx} value={party}>{party}</option>
                          ))}
                      </select>
                      {loading && (
                        <p className="text-xs text-gray-500 mt-1">Loading parties...</p>
                      )}
                    </div>

                    {/* Material Filter (UNCHANGED) */}
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Material
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={filters.material}
                          onChange={(e) => setFilters({ ...filters, material: e.target.value })}
                          placeholder="Search material..."
                          className="py-2 pr-3 pl-10 w-full text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          list="material-options"
                          disabled={loading}
                        />
                        <datalist id="material-options">
                          {masterData.materials
                            .filter(material => material && material.trim() !== '')
                            .map((material, idx) => (
                              <option key={idx} value={material} />
                            ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Status Filter (UNCHANGED) */}
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="py-2 px-3 w-full text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">All Status</option>
                        <option value="In">In</option>
                        <option value="Out">Out</option>
                      </select>
                    </div>

                    {/* Start Date Filter (UNCHANGED) */}
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Start Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                          className="py-2 pr-3 pl-10 w-full text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* End Date Filter (UNCHANGED) */}
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        End Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                          className="py-2 pr-3 pl-10 w-full text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Filters Toggle (UNCHANGED) */}
            <div className="lg:hidden flex-shrink-0 p-4 bg-gray-50 space-y-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Filters</span>
                  {(filters.partyName || filters.material || filters.status || filters.startDate || filters.endDate) && (
                    <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-800 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                {showFilters ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {showFilters && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Party Name
                    </label>
                    <select
                      value={filters.partyName}
                      onChange={(e) => setFilters({ ...filters, partyName: e.target.value })}
                      className="py-2 px-3 w-full text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      disabled={loading}
                    >
                      <option value="">All Parties</option>
                      {masterData.partyNames
                        .filter(party => party && party.trim() !== '')
                        .map((party, idx) => (
                          <option key={idx} value={party}>{party}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Material
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={filters.material}
                        onChange={(e) => setFilters({ ...filters, material: e.target.value })}
                        placeholder="Search material..."
                        className="py-2 pr-3 pl-10 w-full text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        list="material-options-mobile"
                        disabled={loading}
                      />
                      <datalist id="material-options-mobile">
                        {masterData.materials
                          .filter(material => material && material.trim() !== '')
                          .map((material, idx) => (
                            <option key={idx} value={material} />
                          ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="py-2 px-3 w-full text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">All Status</option>
                      <option value="In">In</option>
                      <option value="Out">Out</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="py-2 px-3 w-full text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="py-2 px-3 w-full text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleClearFilters}
                    className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md transition-colors hover:bg-gray-300"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Tabs (UNCHANGED) */}
            <div className="flex-shrink-0 px-4 lg:px-6 bg-gray-50">
              <div className="flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "all"
                      ? "border-red-800 text-red-800"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  All ({tabCounts.all})
                </button>
                <button
                  onClick={() => setActiveTab("in")}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "in"
                      ? "border-red-800 text-red-800"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  In ({tabCounts.in})
                </button>
                <button
                  onClick={() => setActiveTab("out")}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "out"
                      ? "border-red-800 text-red-800"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                  Out ({tabCounts.out})
                </button>
              </div>
            </div>

            {/* Table Section */}
            <div className="flex-1 overflow-hidden px-4 lg:px-6 pb-4 lg:pb-6 pt-2 lg:pt-4">
              <div className="h-[calc(100vh-260px)] bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                {/* Desktop Table */}
                <div className="hidden lg:block flex-1 overflow-y-auto">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Serial No</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Slip No</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Status</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Date</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Time</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Party Name</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Material</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total QTY</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">In Word</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">TAAD Weight</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Vehicle No</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Lot No</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Location</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">QTY</th> {/* Added Bag Column */}
                        {/* <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Slip Number</th> */}
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Weight In KG</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Aadhaar Image</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPurchases.length > 0 ? (
                        filteredPurchases.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{item.serialNo}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{item.slipNo}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === "In" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                                }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.date}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.time}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{item.partyName}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.material}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.qty}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.inWord}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.taadWeight}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.vehicleNo}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.lotNo}</td> {/* Single string now */}
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.location}</td> {/* Single string now */}
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.bag}</td> {/* Single string now */}
                            <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.weight}</td>
                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                              {item.aadhaarImage ? (
                                <button className="text-red-800 hover:text-red-900 flex items-center gap-1 font-medium">
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
                          <td colSpan={16} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col gap-2 items-center">
                              <Filter className="w-8 h-8 text-gray-400" />
                              <span>No records found</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="flex-1 overflow-y-auto lg:hidden">
                  {filteredPurchases.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {filteredPurchases.map((item) => (
                        <div key={item.id} className="p-4 bg-white">
                          {/* Header: Serial, Slip, Status */}
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded">
                                {item.serialNo}
                              </span>
                              <span className="text-xs text-gray-500">
                                Slip: {item.slipNo}
                              </span>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === "In" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                              }`}>
                              {item.status}
                            </span>
                          </div>

                          {/* Date & Time */}
                          <div className="mb-3 pb-3 border-b border-gray-100 flex items-center justify-between text-sm">
                            <span className="text-gray-600">{item.date}</span>
                            <span className="text-gray-600">{item.time}</span>
                          </div>

                          {/* Party Name */}
                          <div className="mb-3">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Party Name</span>
                            <span className="text-sm font-semibold text-gray-900 block">{item.partyName}</span>
                          </div>

                          {/* Material & Qty */}
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Material</span>
                              <span className="text-sm font-medium text-gray-900 block">{item.material}</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Quantity</span>
                              <span className="text-sm font-semibold text-gray-900 block">{item.qty}</span>
                            </div>
                          </div>

                          {/* In Word & TAAD Weight */}
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">In Word</span>
                              <span className="text-sm text-gray-900 block">{item.inWord}</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">TAAD Weight</span>
                              <span className="text-sm font-semibold text-gray-900 block">{item.taadWeight}</span>
                            </div>
                          </div>

                          {/* Vehicle No & Lot No */}
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Vehicle No</span>
                              <span className="text-sm font-medium text-gray-900 block">{item.vehicleNo}</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Lot No</span>
                              <span className="text-sm font-medium text-gray-900 block">{item.lotNo}</span> {/* Single string now */}
                            </div>
                          </div>

                          {/* Location / Bag / Weight */}
                          <div className="grid grid-cols-3 gap-4 mb-3">
                              <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Location</span>
                                  <span className="text-sm text-gray-900 block">{item.location}</span>
                              </div>
                              <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">QTY</span>
                                  <span className="text-sm text-gray-900 block">{item.bag}</span>
                              </div>
                              <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Weight IN KG</span>
                                  <span className="text-sm text-gray-900 block">{item.weight}</span>
                              </div>
                          </div>                    
                          {/* Slip Number */}
                          <div className="mb-3">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Slip Number</span>
                            <span className="text-sm text-gray-900 block">{item.slipNumber}</span> {/* Single string now */}
                          </div>

                          {/* Aadhaar Image Button */}
                          {item.aadhaarImage && (
                            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-800 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium border border-red-200">
                              <Eye size={16} />
                              View Aadhaar Image
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full p-8 text-center text-gray-500">
                      <div className="flex flex-col gap-3 items-center">
                        <Filter className="w-10 h-10 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-700 text-sm">No records found</p>
                          <p className="text-xs text-gray-500 mt-1">Try adjusting your filters</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal */}
            {showModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-semibold text-gray-900">Add Purchase Entry</h3>
                    <button
                      onClick={handleCancel}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Row 1: Status, Date, Time (UNCHANGED) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          Status <span className="text-red-600">*</span>
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="In">In</option>
                          <option value="Out">Out</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          Date <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          Time
                        </label>
                        <input
                          type="text"
                          name="time"
                          value={formData.time}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Row 2: Party Name, Material - (UPDATED with dropdowns fixed in modal) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Party Name with Search */}
                      <div ref={dropdownRefs.partyName} className="relative">
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Party Name <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="partyName"
                            value={formData.partyName}
                            onChange={(e) => {
                              handleInputChange(e);
                              handleDropdownSearchChange('partyName', e.target.value);
                            }}
                            onFocus={handleInputFocus('partyName')}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-3 py-2.5 pr-10 text-sm bg-white border border-gray-300 rounded-md transition-all duration-200 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder={loading ? "Loading..." : "Select or type party name"}
                            required
                            disabled={loading}
                          />
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        {/* Searchable Dropdown */}
                        {showDropdown.partyName && (
                          <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md shadow-lg bg-white absolute w-full z-[100] ">
                            {filteredPartyNames
                              .filter(party => party && party.trim() !== '')
                              .map((party, idx) => (
                                <div
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDropdownSelect('partyName', party);
                                  }}
                                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                                    formData.partyName === party ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                  }`}
                                >
                                  {party}
                                </div>
                              ))}

                            {filteredPartyNames.length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500">
                                No parties found
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Material with Search */}
                      <div ref={dropdownRefs.material} className="relative">
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          Material <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="material"
                            value={formData.material}
                            onChange={(e) => {
                              handleInputChange(e);
                              handleDropdownSearchChange('material', e.target.value);
                            }}
                            onFocus={handleInputFocus('material')}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder={loading ? 'Loading...' : 'Select or type material'}
                            required
                            disabled={loading}
                          />
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Searchable Dropdown */}
                        {showDropdown.material && (
                          <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md shadow-lg bg-white absolute w-full z-[100]">
                            {filteredMaterials
                              .filter(material => material && material.trim() !== '')
                              .map((material, idx) => (
                                <div
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDropdownSelect('material', material);
                                  }}
                                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                                    formData.material === material ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                  }`}
                                >
                                  {material}
                                </div>
                              ))}

                            {filteredMaterials.length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500">
                                No materials found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 3: Qty, In Word (UNCHANGED) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          Total Qty <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          name="qty"
                          value={formData.qty}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter quantity"
                          required
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          In Word
                        </label>
                        <input
                          type="text"
                          name="inWord"
                          value={formData.inWord}
                          readOnly
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                          placeholder="Auto-filled"
                        />
                      </div>
                    </div>

                    {/* Row 4: TAAD Weight, Vehicle No (UNCHANGED) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          TAAD Weight
                        </label>
                        <input
                          type="text"
                          name="taadWeight"
                          value={formData.taadWeight}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter TAAD weight"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          Vehicle No
                        </label>
                        <input
                          type="text"
                          name="vehicleNo"
                          value={formData.vehicleNo}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter vehicle number"
                        />
                      </div>
                    </div>

                    {/* Row 5: Slip Number (Single Entry) and Lot Number (Single Entry) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          Slip Number
                        </label>
                        <input
                          type="text"
                          name="slipNumber"
                          value={formData.slipNumber}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter slip number"
                        />
                      </div>

                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                          Lot Number
                        </label>
                        <input
                          type="text"
                          name="lotNo"
                          value={formData.lotNo}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter lot number"
                        />
                      </div>
                    </div>

                    {/* Row 6: Location, Bag, Weight */}
                    <div>
                      {locationBagEntries.map((entry, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 relative">

                          {/* Location */}
                          <div ref={dropdownRefs.location} className="relative">
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Location
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={entry.location}
                                onChange={(e) => {
                                  handleLocationBagChange(index, "location", e.target.value);
                                  handleDropdownSearchChange("location", e.target.value);
                                }}
                                onFocus={handleInputFocus("location", index)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter or select location"
                              />
                              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            </div>

                            {showLocationDropdown[index] && (
                              <div className="absolute w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1 z-[100]">
                                {filteredLocations.map((loc, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => handleLocationDropdownSelect(index, loc)}
                                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                                  >
                                    {loc}
                                  </div>
                                ))}
                                {filteredLocations.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500">No locations found</div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Bag */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              QTY
                            </label>
                            <input
                              type="text"
                              value={entry.bag}
                              onChange={(e) => handleLocationBagChange(index, "bag", e.target.value)}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter QTY"
                            />
                          </div>

                          {/* Weight (NEW FIELD) */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Weight
                            </label>
                            <input
                              type="text"
                              value={entry.weight}
                              onChange={(e) => handleLocationBagChange(index, "weight", e.target.value)}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter weight"
                            />
                          </div>

                          {/* Remove Button */}
                          {locationBagEntries.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLocationBagEntry(index)}
                              className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-1 text-red-600 hover:text-red-800"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add more button */}
                      <button
                        type="button"
                        onClick={addLocationBagEntry}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-bold"
                      >
                        <Plus size={16} />
                        Add Another Location / Bag / Weight
                      </button>
                    </div>

                    {/* Row 7: Aadhaar Photo (UNCHANGED) */}
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">
                        Aadhaar Photo
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 cursor-pointer">
                          <div className="w-full px-3 py-2.5 text-sm border-2 border-dashed border-gray-300 rounded-md hover:border-red-800 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-red-800">
                            <Upload size={18} />
                            <span>{formData.aadhaarImage ? formData.aadhaarImage.name : "Upload Aadhaar Image"}</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        {formData.aadhaarImagePreview && (
                          <div className="w-16 h-16 border-2 border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={formData.aadhaarImagePreview as string}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end p-4 border-t border-gray-200 sticky bottom-0 bg-white">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className={`px-4 py-2.5 text-sm font-medium text-white rounded-md transition-all 
                          ${isSaving ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"}`}
                        style={{ backgroundColor: '#1e40af' }}
                      >
                        {isSaving ? (
                          <div className="flex items-center gap-2">
                            <svg
                              className="animate-spin h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              ></path>
                            </svg>
                            Saving...
                          </div>
                        ) : (
                          "Save"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      }}
    </MasterDataComponent>
  );
};

export default PurchaseInOut;