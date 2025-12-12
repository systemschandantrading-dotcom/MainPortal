import { useEffect, useState } from "react";
import { Search } from "lucide-react";

const formatDate = (d: string) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-GB"); // DD/MM/YYYY
};

const InventoryPage = () => {
  const SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL;

  const [inventory, setInventory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterItemName, setFilterItemName] = useState("");
  const [itemNameList, setItemNameList] = useState<string[]>([]);

  // ⭐ NEW loading state
  const [loading, setLoading] = useState(true);

  // ===============================
  // FETCH INVENTORY FROM SHEET
  // ===============================
  useEffect(() => {
    if (!SCRIPT_URL) return;

    const fetchInventory = async () => {
      try {
        const url = `${SCRIPT_URL}?action=fetchInventory`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.success) {
          const inv: Array<{ serialNo: string; itemName: string }> =
            json.inventory;

          setInventory(json.inventory);

          const items = [...new Set(inv.map((x) => x.itemName))];
          setItemNameList(items);
        }
      } catch (err) {
        console.error("Error fetching inventory:", err);
      } finally {
        setLoading(false); // ⭐ STOP LOADING
      }
    };

    fetchInventory();
  }, [SCRIPT_URL]);

  // ===============================
  // APPLY FILTERS
  // ===============================
  const filteredInventory = inventory.filter((item) => {
    const s = searchTerm.toLowerCase();

    const matchesSearch =
      item.serialNo.toLowerCase().includes(s) ||
      item.itemName.toLowerCase().includes(s);

    const matchesItemName =
      filterItemName === "" || item.itemName === filterItemName;

    return matchesSearch && matchesItemName;
  });

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto p-2 sm:p-4">
        
        {/* HEADER */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6 mb-3 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
            Inventory Management
          </h1>

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
                placeholder="Search by Serial or Item Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Item Name Filter */}
            <select
              value={filterItemName}
              onChange={(e) => setFilterItemName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Items</option>
              {itemNameList.map((nm, i) => (
                <option key={i} value={nm}>
                  {nm}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ⭐ LOADING EFFECT ⭐ */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
          </div>
        )}

        {/* DESKTOP TABLE (Hides while loading) */}
        {!loading && (
          <div className="hidden sm:block bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      Serial No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Item Name
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      Total IN
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      Total Out
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      Current Balance
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      Last In Date
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      Last Out Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-center">
                        {item.serialNo}
                      </td>
                      <td className="px-4 py-3 text-sm text-left font-medium">
                        {item.itemName}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {item.totalIn}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {item.totalOut}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {item.currentBalance}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {formatDate(item.lastInDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {formatDate(item.lastOutDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredInventory.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No inventory entries found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
