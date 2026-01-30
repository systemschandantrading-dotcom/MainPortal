import { useEffect, useState } from "react";
import { Search, Package, MapPin } from "lucide-react";

interface StockItem {
  id: number;
  serialNo: string;
  location: string;
  totalCapacity: string;
  totalUse: string;
  totalPending: string;
}

const StockPage = () => {
  const SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL;

  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [locationList, setLocationList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // ===============================
  // FETCH STOCK DATA FROM SHEET
  // ===============================
  useEffect(() => {
    if (!SCRIPT_URL) return;

    const fetchStock = async () => {
      try {
        const url = `${SCRIPT_URL}?action=getStockData`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.success && json.stock) {
          // Map the response - handle both old and new API response formats
          const stock: StockItem[] = json.stock.map((item: any) => ({
            id: item.id || 0,
            serialNo: String(item.serialNo ?? ""),
            location: String(item.location ?? ""),
            totalCapacity: String(item.totalCapacity ?? ""),
            totalUse: String(item.totalUse ?? item.totalRemaining ?? ""),
            totalPending: String(item.totalPending ?? item.overview ?? "")
          }));

          setStockData(stock);

          // Extract unique locations for filter
          const locations = [...new Set(stock.map((x) => x.location))].filter(Boolean);
          setLocationList(locations);
        }
      } catch (err) {
        console.error("Error fetching stock:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [SCRIPT_URL]);

  // ===============================
  // APPLY FILTERS
  // ===============================
  const filteredStock = stockData.filter((item) => {
    const s = searchTerm.toLowerCase();

    const matchesSearch =
      item.serialNo.toLowerCase().includes(s) ||
      item.location.toLowerCase().includes(s);

    const matchesLocation =
      filterLocation === "" || item.location === filterLocation;

    return matchesSearch && matchesLocation;
  });

  // ===============================
  // OVERVIEW BAR COMPONENT (Frontend Calculation)
  // ===============================
  const OverviewBar = ({ capacity, used, pending }: { capacity: string; used: string; pending: string }) => {
    // Safely handle null/undefined values
    const capacityStr = capacity || "0";
    const usedStr = used || "0";
    const pendingStr = pending || "0";

    // Parse numbers for calculations
    const capacityNum = parseFloat(capacityStr) || 0;
    const usedNum = parseFloat(usedStr) || 0;

    // Parse pending percentage (remove % sign if present)
    const pendingPercent = parseFloat(String(pendingStr).replace('%', '')) || 0;
    const usedPercent = capacityNum > 0 ? (usedNum / capacityNum) * 100 : 0;

    // Determine color based on pending percentage (higher pending = more free space = green)
    let statusColor = "from-red-400 to-red-600"; // Low pending - red (almost full)
    let statusBg = "bg-red-50";
    let statusText = "text-red-700";

    if (pendingPercent >= 50) {
      statusColor = "from-emerald-400 to-emerald-600"; // High pending - green (lots of space)
      statusBg = "bg-emerald-50";
      statusText = "text-emerald-700";
    } else if (pendingPercent >= 30) {
      statusColor = "from-amber-400 to-amber-600"; // Medium pending - amber
      statusBg = "bg-amber-50";
      statusText = "text-amber-700";
    }

    return (
      <div className="w-full">
        {/* Progress Bar */}
        <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          {/* Used portion (fills from left) */}
          <div
            className={`absolute left-0 top-0 h-full bg-gradient-to-r ${statusColor} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(100 - pendingPercent, 100)}%` }}
          />
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
            {pendingStr.includes('%') ? pendingStr : `${pendingPercent}%`} Pending
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex justify-between mt-2 text-xs">
          <div className="px-2 py-1 rounded-full bg-orange-50 text-orange-700 font-medium">
            Used: {usedStr}
          </div>
          <div className={`px-2 py-1 rounded-full ${statusBg} ${statusText} font-medium`}>
            Pending: {pendingStr}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-2 sm:p-4">

        {/* HEADER */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Package className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Stock Management
              </h1>
              <p className="text-gray-500 text-sm">Track storage capacity and usage</p>
            </div>
          </div>

          {/* Search + Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full">

            {/* SEARCH */}
            <div className="relative w-full col-span-2">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by Serial No or Location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl 
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  bg-white/50 backdrop-blur-sm transition-all duration-200"
              />
            </div>

            {/* Location Filter */}
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl 
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                bg-white/50 backdrop-blur-sm text-sm font-medium cursor-pointer"
            >
              <option value="">All Locations</option>
              {locationList.map((loc, i) => (
                <option key={i} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* LOADING EFFECT */}
        {loading && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-1/4 mx-auto"></div>
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-2/3 mx-auto"></div>
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-1/2 mx-auto"></div>
              <div className="grid grid-cols-6 gap-4 mt-8">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DESKTOP TABLE */}
        {!loading && (
          <div className="hidden sm:block bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-280px)]">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider">
                      Serial No
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider">
                      Total Capacity
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider">
                      Total Use
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider">
                      Total Pending
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider min-w-[250px]">
                      Overview
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredStock.map((item, index) => (
                    <tr
                      key={item.serialNo || index}
                      className="hover:bg-indigo-50/50 transition-colors duration-150"
                    >
                      <td className="px-4 py-4 text-sm text-center font-semibold text-gray-800">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                          {item.serialNo}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-left">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          <span className="font-medium text-gray-700">{item.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span className="font-bold text-blue-600">{item.totalCapacity}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span className="font-bold text-amber-600">{item.totalUse}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                          {item.totalPending}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <OverviewBar
                          capacity={item.totalCapacity}
                          used={item.totalUse}
                          pending={item.totalPending}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredStock.length === 0 && (
              <div className="text-center py-16">
                <Package className="mx-auto text-gray-300 mb-4" size={64} />
                <p className="text-gray-500 text-lg font-medium">No stock entries found</p>
                <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        )}

        {/* MOBILE CARDS */}
        {!loading && (
          <div className="sm:hidden space-y-3 max-h-[calc(100vh-220px)] overflow-auto pb-4">
            {filteredStock.map((item, index) => (
              <div
                key={item.serialNo || index}
                className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                    {item.serialNo}
                  </span>
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <MapPin size={14} />
                    {item.location}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-xs text-blue-600 font-medium">Capacity</p>
                    <p className="text-lg font-bold text-blue-700">{item.totalCapacity}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2">
                    <p className="text-xs text-amber-600 font-medium">Used</p>
                    <p className="text-lg font-bold text-amber-700">{item.totalUse}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <p className="text-xs text-emerald-600 font-medium">Pending</p>
                    <p className="text-lg font-bold text-emerald-700">{item.totalPending}</p>
                  </div>
                </div>

                <OverviewBar
                  capacity={item.totalCapacity}
                  used={item.totalUse}
                  pending={item.totalPending}
                />
              </div>
            ))}

            {filteredStock.length === 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-8 text-center">
                <Package className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500 font-medium">No stock entries found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockPage;
