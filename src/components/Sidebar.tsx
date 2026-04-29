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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import useAuthStore from "../store/authStore";

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
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

const Sidebar: React.FC<SidebarProps> = ({ onClose, isCollapsed = false, setIsCollapsed }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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
      {/* Header with Text Only & Collapse Toggle */}
      <div className={`flex items-center px-4 py-5 border-b border-indigo-700 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center flex-1">
          {isCollapsed ? (
            <p className="text-white font-bold text-xl tracking-wide">
              C<span className="text-orange-400">T</span>
            </p>
          ) : (
            <p className="text-white font-bold text-lg tracking-wide">
              Chandan<span className="text-orange-400">Trading</span>
            </p>
          )}
        </div>
        
        {/* Collapse Toggle Button for Desktop */}
        {!onClose && setIsCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 text-indigo-200 rounded-md hover:text-white hover:bg-indigo-800 focus:outline-none transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        )}

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
              title={route.label}
              className={({ isActive }) =>
                `flex items-center rounded-lg transition-all duration-300 ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-4 px-4 py-3'} ${
                  isActive
                    ? "bg-indigo-800 text-white"
                    : "text-indigo-100 hover:bg-indigo-800 hover:text-white"
                }`
              }
              onClick={() => onClose?.()}
            >
              <IconComponent size={22} className="flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-base font-medium whitespace-nowrap animate-fade-in">{route.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout Button */}
      <div className="px-4 py-4 border-t border-indigo-700 space-y-4">
        
        {/* User Info & Bell */}
        <div className={`flex items-center text-indigo-100 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
          <div className="flex items-center space-x-3">
            <div className="flex justify-center items-center w-10 h-10 bg-indigo-800 rounded-full border border-indigo-600 flex-shrink-0">
              <User size={22} className="text-indigo-200" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <p className="text-sm font-semibold text-white whitespace-nowrap">{user?.id || "Guest"}</p>
                <p className="text-xs text-indigo-300 whitespace-nowrap">
                  {user?.role === "admin" ? "Administrator" : "Maintenance Team"}
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="relative animate-fade-in">
              <Bell
                size={20}
                className="text-indigo-200 cursor-pointer hover:text-white transition-colors"
              />
              <span className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full"></span>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            handleLogout();
            onClose?.();
          }}
          title="Logout"
          className={`flex items-center rounded-lg text-indigo-100 hover:bg-indigo-800 hover:text-white transition-all duration-300 ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-4 px-4 py-3 w-full'}`}
        >
          <LogOut size={22} className="flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-base font-medium whitespace-nowrap animate-fade-in">Logout</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;