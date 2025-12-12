import React from "react";
import { Bell, User } from "lucide-react";
import useAuthStore from "../store/authStore";

interface HeaderProps {
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ children }) => {
  const { user } = useAuthStore();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex justify-between items-center px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          {children}
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Bell
              size={20}
              className="text-gray-500 cursor-pointer hover:text-indigo-600"
            />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </div>
          <div className="flex items-center space-x-2 cursor-pointer">
            <div className="flex justify-center items-center w-9 h-9 bg-indigo-100 rounded-full">
              <User size={20} className="text-indigo-600" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium">{user?.id || "Guest"}</p>
              <p className="text-xs text-gray-500">
                {user?.role === "admin" ? "Administrator" : "Maintenance Team"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;