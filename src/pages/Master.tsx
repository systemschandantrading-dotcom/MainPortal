import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

const MasterDataPage = () => {
  const SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL;
  const SHEET_ID = import.meta.env.VITE_SHEET_ID;

  const [partyNames, setPartyNames] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);

  const [showPartyInput, setShowPartyInput] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showMaterialInput, setShowMaterialInput] = useState(false);

  const [newPartyName, setNewPartyName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newMaterial, setNewMaterial] = useState("")
  const [loadingPage, setLoadingPage] = useState(true);
  const [savingLoader, setSavingLoader] = useState(false);

  // --------------------------------------------------
  // 🔹 Fetch Google Sheet Data
  // --------------------------------------------------
  // --------------------------------------------------
// 🔹 Fetch Google Sheet Data (with Page Loader)
// --------------------------------------------------
  const fetchSheetData = async () => {
    setLoadingPage(true);

    try {
      console.log("Fetching:", `${SCRIPT_URL}?action=fetchMaster`);

      const res = await fetch(`${SCRIPT_URL}?action=fetchMaster`);
      console.log("Raw Response:", res);

      const text = await res.text();
      console.log("Raw Text:", text);

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.error("JSON Parse Error:", e);
        setLoadingPage(false);
        return;
      }

      console.log("JSON:", json);

      if (json.success) {
        setPartyNames(json.partyNames || []);
        setLocations(json.locations || []);
        setMaterials(json.materials || []);
      } else {
        console.error("Backend error:", json);
      }

    } catch (error) {
      console.error("Error fetching sheet data:", error);

    } finally {
      console.log("Stopping Loader...");
      setLoadingPage(false);
    }
  };
  // 🔥 Load Data on Page Mount
  useEffect(() => {
    fetchSheetData();
  }, []);
  // --------------------------------------------------
  // 🔥 Save Button → send to Google Sheet
  // --------------------------------------------------
  const saveToSheet = async (columnIndex: number, value: string) => {
    try {
      const formData = new FormData();
      formData.append("action", "addData");
      formData.append("spreadsheetId", SHEET_ID);
      formData.append("sheetName", "Master");
      formData.append("columnIndex", columnIndex.toString());
      formData.append("value", value);

      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!json.success) {
        console.error("Sheet insert error:", json.error);
        alert("Failed to save into sheet.");
      }

    } catch (error) {
      console.error("Save to sheet error:", error);
    }
  };

  const handleSave = async () => {
    let saved = false;
    setSavingLoader(true); // show loader
    // PARTY
    if (showPartyInput && newPartyName.trim()) {
      const value = newPartyName.trim();
      await saveToSheet(0, value); // 🔥 Save to sheet column A
      setPartyNames([...partyNames, value]);
      setNewPartyName("");
      setShowPartyInput(false);
      saved = true;
    }

    // LOCATION
    if (showLocationInput && newLocation.trim()) {
      const value = newLocation.trim();
      await saveToSheet(1, value); // 🔥 Save to sheet column B
      setLocations([...locations, value]);
      setNewLocation("");
      setShowLocationInput(false);
      saved = true;
    }

    // MATERIAL
    if (showMaterialInput && newMaterial.trim()) {
      const value = newMaterial.trim();
      await saveToSheet(2, value); // 🔥 Save to sheet column C
      setMaterials([...materials, value]);
      setNewMaterial("");
      setShowMaterialInput(false);
      saved = true;
    }

    if (saved) {
      alert("Saved successfully!");
      fetchSheetData();  // Refresh live data
    } else {
      alert("Please add at least one entry before saving.");
    }
    setSavingLoader(false); // hide loader
  };

  // (UI BELOW — UNCHANGED)
  const columnStyle =
    "flex-shrink-0 md:flex-1 bg-white border-2 border-gray-300 rounded-lg overflow-hidden flex flex-col h-64 md:h-auto md:min-h-0";
  const headerStyle =
    "px-3 sm:px-4 py-2 sm:py-3 font-bold text-sm sm:text-base md:text-lg text-center border-b-2 border-gray-300 flex-shrink-0";
  const addButtonStyle =
    "px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-white border-b-2 border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 flex-shrink-0";
  const listStyle = "flex-1 overflow-y-auto min-h-0";
  const itemStyle =
    "px-3 sm:px-4 py-2 text-xs sm:text-sm border-b border-gray-200 hover:bg-gray-50 break-words";
  const inputSectionStyle =
    "px-3 sm:px-4 py-3 bg-white border-b-2 border-gray-300 flex-shrink-0";

  // 🔥 Full Page Loader Component
  const FullPageLoader = () => {
    return (
      <div className="flex justify-center items-center h-screen w-full bg-white">
        <div
          className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent"
          style={{
            borderColor: "#ef9a9a #90caf9 #ffcc80 #ef9a9a",
          }}
        ></div>
      </div>
    );
  };

  // 🔥 Show Loader Until Data Is Fully Loaded
  if (loadingPage) {
    return <FullPageLoader />;
  }

  // Small Overlay Loader (Saving)
  const SavingOverlay = () => (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
      <div className="p-4 bg-white rounded-lg shadow-lg flex flex-col items-center">
        <div
          className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent"
          style={{ borderColor: "#4caf50 transparent #4caf50 transparent" }}
        ></div>
        <p className="mt-3 text-sm font-semibold text-gray-700">Saving...</p>
      </div>
    </div>
  );
  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {savingLoader && <SavingOverlay />}
      <div className="bg-white px-4 sm:px-6 py-4 sm:py-6 flex justify-end border-b border-gray-200 flex-shrink-0">
        <button
          onClick={handleSave}
          className="px-6 sm:px-8 py-2 sm:py-2.5 text-sm sm:text-base font-bold text-white bg-green-500 rounded hover:bg-green-600 transition-colors shadow-md"
        >
          Save
        </button>
      </div>

      {/* THREE COLUMN UI - SAME AS BEFORE */}
      <div className="flex-1 px-4 sm:px-6 pb-4 sm:pb-6 pt-4 flex flex-col md:flex-row gap-4 sm:gap-6 overflow-y-auto md:overflow-hidden min-h-0">
        {/* Party */}
        <div className={columnStyle} style={{ backgroundColor: "#ffebee" }}>
          <div className={headerStyle} style={{ backgroundColor: "#ffcdd2" }}>
            Party Name
          </div>
          <button
            onClick={() => setShowPartyInput(!showPartyInput)}
            className={addButtonStyle}
            style={{ backgroundColor: showPartyInput ? "#ef9a9a" : "white" }}
          >
            {showPartyInput ? <X size={16} /> : <Plus size={16} />}
            <span>Add</span>
          </button>

          {showPartyInput && (
            <div className={inputSectionStyle}>
              <input
                type="text"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="Enter party name..."
                className="w-full px-3 py-2 border-2 border-gray-400 rounded"
                autoFocus
              />
            </div>
          )}

          <div className={listStyle}>
            {partyNames.map((name, index) => (
              <div key={index} className={itemStyle}>
                {name}
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className={columnStyle} style={{ backgroundColor: "#e3f2fd" }}>
          <div className={headerStyle} style={{ backgroundColor: "#bbdefb" }}>
            Location
          </div>
          <button
            onClick={() => setShowLocationInput(!showLocationInput)}
            className={addButtonStyle}
            style={{ backgroundColor: showLocationInput ? "#90caf9" : "white" }}
          >
            {showLocationInput ? <X size={16} /> : <Plus size={16} />}
            <span>Add</span>
          </button>

          {showLocationInput && (
            <div className={inputSectionStyle}>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Enter location..."
                className="w-full px-3 py-2 border-2 border-gray-400 rounded"
                autoFocus
              />
            </div>
          )}

          <div className={listStyle}>
            {locations.map((loc, index) => (
              <div key={index} className={itemStyle}>
                {loc}
              </div>
            ))}
          </div>
        </div>

        {/* Material */}
        <div className={columnStyle} style={{ backgroundColor: "#fff3e0" }}>
          <div className={headerStyle} style={{ backgroundColor: "#ffe0b2" }}>
            Material Name
          </div>

          <button
            onClick={() => setShowMaterialInput(!showMaterialInput)}
            className={addButtonStyle}
            style={{ backgroundColor: showMaterialInput ? "#ffcc80" : "white" }}
          >
            {showMaterialInput ? <X size={16} /> : <Plus size={16} />}
            <span>Add</span>
          </button>

          {showMaterialInput && (
            <div className={inputSectionStyle}>
              <input
                type="text"
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                placeholder="Enter material..."
                className="w-full px-3 py-2 border-2 border-gray-400 rounded"
                autoFocus
              />
            </div>
          )}

          <div className={listStyle}>
            {materials.map((mat, index) => (
              <div key={index} className={itemStyle}>
                {mat}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterDataPage;