import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Slip from "./pages/Slip";
import Pete from "./pages/Pete";
import Purchase from "./pages/Purchaseinout";
import Master from "./pages/Master";
import VehicleApproval from "./pages/Vehicalapproval";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import Inventory from "./pages/Inventory";
import Stock from "./pages/Stock";

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
         <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/purchase" replace />} />
          {/* PURCHASE */}
          <Route
            path="purchase"
            element={
              <ProtectedRoute requiredPage="purchase">
                <Purchase />
              </ProtectedRoute>
            }
          />
          {/* SLIP (NEW & IMPORTANT) */}
          <Route
            path="slip"
            element={
              <ProtectedRoute requiredPage="slip">
                <Slip />
              </ProtectedRoute>
            }
          />

          {/* Admin only routes */}
          <Route
            path="/master"
            element={
              <ProtectedRoute requiredPage="master">
                <Master />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute requiredPage="inventory">
                <Inventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <ProtectedRoute requiredPage="stock">
                <Stock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase"
            element={
              <ProtectedRoute requiredPage="purchase">
                <Purchase />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pete"
            element={
              <ProtectedRoute requiredPage="pete">
                <Pete />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredPage="settings">
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Shared routes */}
          <Route path="vehicle-approval" element={<VehicleApproval />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;