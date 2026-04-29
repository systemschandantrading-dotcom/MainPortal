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
import { useState } from "react";
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

      {/* User Info & Actions */}
      <div className="px-3 py-3 border-t border-indigo-800 bg-indigo-950/40">
        {/* Collapsible Menu */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            userMenuOpen ? 'max-h-40 opacity-100 mb-2' : 'max-h-0 opacity-0'
          }`}
        >
          {/* Bell Notification inside Menu */}
          <div className="flex items-center justify-between px-4 py-2 rounded-lg text-indigo-200 hover:bg-indigo-800/50 hover:text-white transition-colors cursor-pointer mb-1">
            <div className="flex items-center gap-3">
              <Bell size={20} className="flex-shrink-0" />
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-orange-500"></span>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              handleLogout();
              onClose?.();
            }}
            className="flex items-center gap-3 py-2 px-4 rounded-lg text-indigo-200 hover:bg-indigo-800/50 hover:text-white transition-colors w-full text-left"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>

        {/* User Profile Card (Trigger) */}
        <button 
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center justify-between w-full p-2 rounded-xl bg-indigo-800/40 hover:bg-indigo-800/60 transition-all border border-indigo-700/30 text-indigo-100 group"
        >
          <div className="flex items-center space-x-3">
            <div className="flex justify-center items-center w-10 h-10 bg-indigo-600 rounded-xl shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
              <User size={22} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white leading-tight">{user?.id || "Guest"}</p>
              <p className="text-xs text-indigo-300 leading-tight mt-0.5">
                {user?.role === "admin" ? "Administrator" : "Maintenance Team"}
              </p>
            </div>
          </div>
          <ChevronUp 
            size={18} 
            className={`text-indigo-300 transition-transform duration-300 flex-shrink-0 mr-1 ${
              userMenuOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;