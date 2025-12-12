import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface StockItem {
  id: number;
  serialNo: string;
  location: string;
  totalCapacity: string;
  totalRemaining: string;
  overview: string;
}

const StockLevelBar = ({ current, minimum }: { current: number; minimum: number }) => {
  const stockLevelPercentage = (minimum / current) * 100;

  const isLow = current < minimum;
  const isMedium = current >= minimum && current < minimum * 1.5;

  let fillColor = "bg-green-500";
  if (isLow) fillColor = "bg-red-500";
  else if (isMedium) fillColor = "bg-yellow-500";

  return (
    <div className="w-full">
      <div className="flex-1 h-7 bg-gray-200 rounded-lg overflow-hidden relative">
        <div
          className={`h-full transition-all duration-300 ${fillColor}`}
          style={{ width: `${Math.min(stockLevelPercentage, 100)}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-800">
            {stockLevelPercentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

const Stock = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [loading, setLoading] = useState(true); // ⭐ Added

  const SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL;

  // Load data from Google Sheet
  useEffect(() => {
    async function loadStockFromSheet() {
      try {
        const response = await fetch(`${SCRIPT_URL}?action=getStockData`);
        const json = await response.json();

        if (json.success) {
          setStockItems(json.stock);

          const stockData: StockItem[] = json.stock as StockItem[];
          const uniqueLocations: string[] = Array.from(
            new Set(stockData.map((i) => i.location))
          );

          setLocations(uniqueLocations);
        }
      } catch (err) {
        console.error("Error fetching stock data:", err);
      } finally {
        setLoading(false); // ⭐ Stop loading
      }
    }

    loadStockFromSheet();
  }, []);

  // Search + filter
  const filteredStockItems = stockItems.filter((item) => {
    const matchSearch =
      item.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchLocation =
      filterLocation === "all" || item.location === filterLocation;

    return matchSearch && matchLocation;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-4 flex flex-col sm:flex-row items-center gap-3">
          
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Serial No or Location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>

          <div className="w-full sm:w-52">
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

        </div>

        {/* ⭐ LOADING SKELETON ⭐ */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        )}

        {/* Table (Hidden while Loading) */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-center">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Serial No</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Location</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Total Capacity</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Total Use</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Total Remaining</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Overview</th>
                </tr>
              </thead>

              <tbody>
                {filteredStockItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">

                    <td className="px-6 py-4">{item.serialNo}</td>
                    <td className="px-6 py-4">{item.location}</td>
                    <td className="px-6 py-4">{item.totalCapacity}</td>
                    <td className="px-6 py-4">{item.totalRemaining}</td>

                    <td className="px-6 py-4">
                      {Number(item.totalCapacity) - Number(item.totalRemaining)}
                    </td>
                   <td className="px-6 py-4">
                    <div className="flex flex-col items-center w-full">

                      {/* Top numbers: Used (left) and Remaining (right) */}
                      <div className="w-full flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>{Number(item.totalCapacity) - Number(item.totalRemaining)}</span>
                        <span>{item.totalRemaining}</span>
                      </div>

                      {/* Percentage Bar */}
                      <div className="w-full mb-1">
                        <StockLevelBar
                          current={Number(item.totalCapacity)}
                          minimum={Number(item.totalRemaining)}
                        />
                      </div>

                      {/* Bottom: Total Capacity only */}
                      <div className="text-xs text-gray-600 mt-1">
                        Total Capacity: {item.totalCapacity}
                      </div>

                    </div>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default Stock;