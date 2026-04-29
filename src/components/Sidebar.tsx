import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FileText,
  User,
  ShoppingCart,
  Truck,
  Settings as SettingsIcon,
  LogOut,
  X,
  BookOpen,
  Package,
  Database,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Bell,
  ChevronUp,
} from "lucide-react";
import useAuthStore from "../store/authStore";

interface SidebarProps {
  onClose?: () => void;
}

// Define the route mapping configuration
const routeConfig = {
  'master': {
    path: '/master',
    label: 'Master',
    icon: BookOpen,
    defaultRole: 'admin'
  },
  'inventory': {
    path: '/inventory',
    label: 'Inventory',
    icon: Package,
    defaultRole: 'admin'
  },
  'stock': {
    path: '/stock',
    label: 'Stock',
    icon: Database,
    defaultRole: 'admin'
  },
  'purchase': {
    path: '/purchase',
    label: 'Purchase',
    icon: ShoppingCart,
    defaultRole: 'admin'
  },
  'vehicle-approval': {
    path: '/vehicle-approval',
    label: 'VehicleApproval',
    icon: Truck,
    defaultRole: 'user' // Available to all users by default
  },
  // 'slip': {
  //   path: '/slip',
  //   label: 'Slip',
  //   icon: FileText,
  //   defaultRole: 'user'
  // },
  'getin': {
    path: '/getin',
    label: 'Get In',
    icon: ArrowDownLeft,
    defaultRole: 'user'
  },
  'getout': {
    path: '/getout',
    label: 'Get Out',
    icon: ArrowUpRight,
    defaultRole: 'user'
  },
  'invoice': {
    path: '/invoice',
    label: 'Invoice',
    icon: Receipt,
    defaultRole: 'user'
  },
  'pete': {
    path: '/pete',
    label: 'Pete',
    icon: User,
    defaultRole: 'admin'
  },
  'settings': {
    path: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    defaultRole: 'admin'
  }
};

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profileExpanded, setProfileExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Function to check if user has access to a specific page
  const hasPageAccess = (pageKey: string): boolean => {
    const route = routeConfig[pageKey as keyof typeof routeConfig];

    // If no user is logged in, non-public routes are not visible
    if (!user) return false;

    // Allow everyone to access Master
    if (pageKey.toLowerCase() === 'master') return true;

    // If user is admin, they have access to all pages by default
    if (user.role === 'admin') return true;

    // Get the page access list from user data
    const pageAccess = user.pageAccess || '';

    if (!pageAccess) {
      // If no page access is defined on the user, deny non-public routes
      return false;
    }

    // Parse the comma-separated page access list
    const allowedPages = pageAccess.split(',').map(page => page.trim().toLowerCase());

    // Check if the requested page is in the allowed list
    return allowedPages.includes(pageKey.toLowerCase());
  };

  // Get all accessible routes for the current user
  const getAccessibleRoutes = () => {
    return Object.entries(routeConfig).filter(([pageKey]) => 
      hasPageAccess(pageKey)
    );
  };

  const accessibleRoutes = getAccessibleRoutes();

  return (
    <div className="flex flex-col h-full bg-indigo-900 ">
      {/* Header with Text Only */}
      <div className="flex justify-between items-center px-4 py-5 border-b border-indigo-700">
        <div className="flex items-center flex-1">
          <p className="text-white font-bold text-lg tracking-wide">
            Chandan<span className="text-orange-400">Trading</span>
          </p>
        </div>
        {onClose && (
          <button
            onClick={() => onClose?.()}
            className="p-2 text-indigo-200 rounded-md lg:hidden hover:text-white focus:outline-none flex-shrink-0"
          >
            <span className="sr-only">Close sidebar</span>
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="overflow-y-auto flex-1 px-4 py-6 space-y-2">
        {accessibleRoutes.map(([pageKey, route]) => {
          const IconComponent = route.icon;
          return (
            <NavLink
              key={pageKey}
              to={route.path}
              className={({ isActive }) =>
                `flex items-center gap-4 py-3 px-4 rounded-lg transition-colors ${
                  isActive
                    ? "bg-indigo-800 text-white"
                    : "text-indigo-100 hover:bg-indigo-800 hover:text-white"
                }`
              }
              onClick={() => onClose?.()}
            >
              <IconComponent size={22} className="flex-shrink-0" />
              <span className="text-base font-medium">{route.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout Button */}
      <div className="px-4 py-3 border-t border-indigo-800 bg-indigo-950/40">
        {/* Accordion Header: Profile Avatar & Info */}
        <div 
          onClick={() => setProfileExpanded(!profileExpanded)}
          className="flex items-center justify-between p-2 rounded-xl hover:bg-indigo-800/50 cursor-pointer transition-all duration-300 ease-in-out group"
        >
          <div className="flex items-center space-x-3">
            <div className="flex justify-center items-center w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-900/50 group-hover:scale-105 transition-all duration-300">
              <User size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors">
                {user?.id || "Guest"}
              </span>
              <span className="text-xs text-indigo-300/80">
                {user?.role === "admin" ? "Administrator" : "Maintenance Team"}
              </span>
            </div>
          </div>
          <ChevronUp 
            size={18} 
            className={`text-indigo-300 transition-transform duration-300 ${profileExpanded ? 'rotate-180' : ''}`} 
          />
        </div>

        {/* Accordion Content */}
        <div className={`grid transition-all duration-300 ease-in-out ${profileExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden space-y-3">
            <div className="h-[1px] bg-indigo-800/50 w-full my-1"></div>
            
            {/* Notifications/Bell */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-900/40 border border-indigo-800/30 text-indigo-200 hover:text-white hover:bg-indigo-800/40 transition-all">
              <span className="text-sm font-medium flex items-center gap-2">
                <Bell size={16} className="text-indigo-400" />
                Notifications
              </span>
              <span className="flex items-center justify-center bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] shadow-sm shadow-orange-950/50 animate-pulse">
                1
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                handleLogout();
                onClose?.();
              }}
              className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-red-200 hover:bg-red-500/20 hover:text-red-100 transition-all duration-200 w-full font-medium"
            >
              <LogOut size={18} className="text-red-400" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;