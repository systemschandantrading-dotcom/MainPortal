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
  'slip': {
    path: '/',
    label: 'Slip',
    icon: FileText,
    defaultRole: 'user' // Available to all users by default
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Function to check if user has access to a specific page
  const hasPageAccess = (pageKey: string): boolean => {
    const route = routeConfig[pageKey as keyof typeof routeConfig];

    // Always allow routes that are public by default
    if (route?.defaultRole === 'user') return true;

    // If no user is logged in, non-public routes are not visible
    if (!user) return false;

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
      <div className="px-4 py-4 border-t border-indigo-700 space-y-2">
        
        {/* Logout Button */}
        <button
          onClick={() => {
            handleLogout();
            onClose?.();
          }}
          className="flex items-center gap-4 py-3 px-4 rounded-lg text-indigo-100 hover:bg-indigo-800 hover:text-white transition-colors w-full"
        >
          <LogOut size={22} className="flex-shrink-0" />
          <span className="text-base font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;