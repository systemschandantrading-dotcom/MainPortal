import React, { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Users,
  Plus,
  Edit,
  Trash2,
  X,
} from "lucide-react";

// Apps Script endpoint from your .env
const SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL as string;

// --- USER FORM MODAL COMPONENT ---
const PAGE_LIST = [
  "Master",
  "Inventory",
  "Stock",
  "Purchase",
  "Slip",
  "Pete",
  "Settings",
  "Vehicle-Approval",
];

const UserFormModal = ({ userToEdit, onClose, onSave }: any) => {
  const [formData, setFormData] = useState<any>(
    userToEdit || {
      employeeName: "",
      username: "",
      password: "",
      role: "User",
      pageAccess: [],
    }
  );

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        employeeName: userToEdit.employeeName,
        username: userToEdit.username,
        password: "",
        role: userToEdit.role,
        pageAccess: userToEdit.pageAccess
          ? userToEdit.pageAccess.split(",")
          : [],
      });
    } else {
      setFormData({
        employeeName: "",
        username: "",
        password: "",
        role: "User",
        pageAccess: [],
      });
    }
  }, [userToEdit]);

  const handleCheckbox = (page: string) => {
    setFormData((prev: any) => {
      const selected = prev.pageAccess.includes(page)
        ? prev.pageAccess.filter((p: string) => p !== page)
        : [...prev.pageAccess, page];

      return { ...prev, pageAccess: selected };
    });
  };

  const handleSubmit = () => {
    if (!formData.employeeName || !formData.username) {
      alert("Please fill all required fields");
      return;
    }

    if (!userToEdit && !formData.password) {
      alert("Password is required");
      return;
    }

    const finalData = {
      ...formData,
      pageAccess: formData.pageAccess.join(","),
    };

    onSave(finalData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4 z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold">
            {userToEdit ? "Edit User" : "Add New User"}
          </h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="space-y-4">
          {/* Employee Name */}
          <div>
            <label className="font-semibold text-sm">Employee Name *</label>
            <input
              type="text"
              name="employeeName"
              value={formData.employeeName}
              onChange={(e) =>
                setFormData({ ...formData, employeeName: e.target.value })
              }
              className="w-full border px-3 py-2 rounded-lg"
            />
          </div>

          {/* Username */}
          <div>
            <label className="font-semibold text-sm">Username (ID) *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="w-full border px-3 py-2 rounded-lg"
            />
          </div>

          {/* Role */}
          <div>
            <label className="font-semibold text-sm">Role *</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full border px-3 py-2 rounded-lg bg-white"
            >
              <option value="Admin">Admin</option>
              <option value="User">User</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="font-semibold text-sm">
              {userToEdit ? "New Password (optional)" : "Password *"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full border px-3 py-2 rounded-lg pr-10"
              />
              <button
                className="absolute right-3 top-2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Page Access */}
          <div>
            <label className="font-semibold text-sm">Page Access</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PAGE_LIST.map((page) => (
                <label key={page} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.pageAccess.includes(page)}
                    onChange={() => handleCheckbox(page)}
                  />
                  {page}
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg mt-4"
          >
            {userToEdit ? "Update User" : "Add User"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN SETTINGS COMPONENT ---
const Settings: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]); // ← starts empty until sheet fetch
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // -------------------------
  // Helper: parse sheet rows to user objects
  // -------------------------
  // Accepts either:
  // - array of arrays with header row as first item
  // - array of objects already
  const parseSheetUsers = (rows: any): any[] => {
  if (!rows || rows.length === 0) return [];

  const header = rows[0].map((h: any) => String(h).trim());
  const dataRows = rows.slice(1);

  return dataRows
    .filter((r: any[]) => r[0] !== "") // ignore empty rows
    .map((rowArr: any[], idx: number) => {
      const obj: any = {};
      header.forEach((h: string, i: number) => {
        obj[h] = rowArr[i] !== undefined ? rowArr[i] : "";
      });

      return {
        rowNumber: idx + 2, // Google Sheet row number
        employeeName: obj["User Name"] || "",
        username: obj["User ID"] || "",
        password: obj["Pass"] || "",
        role: obj["Role"] || "",          //  <-- FIXED: now reads the correct column
        pageAccess: obj["Page Access"] || "",
        deploymentLink: obj["Deployment Link"] || "",
      };
    });
};

  // -------------------------
  // Fetch all users from sheet
  // -------------------------
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=getAllUsers`);
      const data = await res.json();

      // data.users could be an array-of-arrays or array-of-objects depending on Apps Script
      const rows = data?.users ?? data?.data ?? [];
      const parsed = parseSheetUsers(rows);
      setUsers(parsed);
    } catch (err) {
      console.error("Error fetching users from sheet:", err);
      showToast("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------
  // Add new user (sends to Apps Script)
  // -------------------------
  const addUserToSheet = async (user: any) => {
    try {
      const payload = {
        ...user,
      };
      await fetch(`${SCRIPT_URL}?action=addUser`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await fetchUsers();
      showToast(`User ${user.employeeName} added successfully.`);
    } catch (err) {
      console.error("Error adding user:", err);
      showToast("Failed to add user");
    }
  };

  // -------------------------
  // Update user in sheet
  // Prefer rowNumber when available (works with array-of-arrays fetch)
  // -------------------------
  const updateUserInSheet = async (originalUser: any, updatedUser: any) => {
    try {
      const payload = {
        rowNumber: originalUser?.rowNumber ?? null,
        identifier: originalUser?.username ?? originalUser?.id ?? null,
        updatedData: updatedUser,
      };
      await fetch(`${SCRIPT_URL}?action=updateUser`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await fetchUsers();
      showToast(`User ${updatedUser.employeeName} updated successfully.`);
    } catch (err) {
      console.error("Error updating user:", err);
      showToast("Failed to update user");
    }
  };

  // -------------------------
  // Delete user in sheet
  // -------------------------
  const deleteUserFromSheet = async (user: any) => {
    try {
      const payload = {
        rowNumber: user?.rowNumber ?? null,
        identifier: user?.username ?? user?.id ?? null,
      };
      await fetch(`${SCRIPT_URL}?action=deleteUser`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await fetchUsers();
      showToast(`User ${user.employeeName} deleted successfully.`);
    } catch (err) {
      console.error("Error deleting user:", err);
      showToast("Failed to delete user");
    }
  };

  // -------------------------
  // UI handlers
  // -------------------------
  const openAddModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleSaveUser = (userData: any) => {
    if (editingUser) {
      // update
      updateUserInSheet(editingUser, userData);
    } else {
      // add
      addUserToSheet(userData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteUser = (userIdOrObj: any, userName?: any) => {
    // If first arg is object, handle that; else it might be id and name passed.
    let userObj: any = null;
    if (typeof userIdOrObj === "object") {
      userObj = userIdOrObj;
    } else {
      userObj =
        users.find((u: any) => u.id === userIdOrObj) || { id: userIdOrObj, employeeName: userName };
    }

    if (window.confirm(`Are you sure you want to delete user ${userObj.employeeName}?`)) {
      deleteUserFromSheet(userObj);
    }
  };

  const getInitials = (name: any) =>
    (name || "")
      .split(" ")
      .map((n: any) => n[0] || "")
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getAvatarColor = (name: any) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-indigo-500",
    ];
    return colors[(name || "").length % colors.length];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {toastMessage && (
        <div className="fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white font-semibold z-50">
          {toastMessage}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* ADD BUTTON */}
        <div className="flex justify-end mb-6">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition shadow-md text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Add New User</span>
            <span className="sm:hidden">Add User</span>
          </button>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading users...</div>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
                      Role
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
                      ID (Username)
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
                      Page Access
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-full ${getAvatarColor(
                              u.employeeName
                            )} text-white font-bold text-sm`}
                          >
                            {getInitials(u.employeeName)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {u.employeeName}
                            </div>
                            <div className="text-xs text-gray-500">{u.role}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            u.role === "Admin"
                              ? "bg-red-100 text-red-800"
                              : u.role === "User"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-indigo-600 font-mono">
                        {u.username}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {u.pageAccess || "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-2 text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
                            title="Edit User"
                          >
                            <Edit size={18} />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-2 text-red-600 rounded-lg hover:bg-red-50 transition"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium">No user accounts found</p>
              <p className="text-sm mt-1">
                Click "Add New User" to create your first user account
              </p>
            </div>
          )}
        </div>

        {/* MOBILE VERSION */}
        <div className="lg:hidden space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              Loading users...
            </div>
          ) : users.length > 0 ? (
            users.map((u: any) => (
              <div
                key={u.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-full ${getAvatarColor(
                        u.employeeName
                      )} text-white font-bold`}
                    >
                      {getInitials(u.employeeName)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{u.employeeName}</div>
                      <div className="text-xs text-gray-500">{u.employeeCode}</div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      u.pageAccess === "Admin"
                        ? "bg-red-100 text-red-800"
                        : u.pageAccess === "User"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {u.pageAccess}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {/* <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Department:</span>
                    <span className="text-gray-900 font-medium">{u.department}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Phone:</span>
                    <span className="text-gray-900 font-medium">{u.phoneNumber}</span>
                  </div> */}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Username:</span>
                    <span className="text-indigo-600 font-mono font-medium">
                      {u.username}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(u)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition font-medium"
                  >
                    <Edit size={16} />
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteUser(u)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition font-medium"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium">No user accounts found</p>
              <p className="text-sm mt-1">
                Click "Add New User" to create your first user account
              </p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <UserFormModal
          userToEdit={editingUser}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
};

export default Settings;
