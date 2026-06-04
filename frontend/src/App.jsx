import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import DashboardLayout from "./components/DashboardLayout.jsx";
import Login       from "./pages/Login.jsx";
import Register    from "./pages/Register.jsx";
import Dashboard   from "./pages/Dashboard.jsx";
import Transfer    from "./pages/Transfer.jsx";
import Transactions from "./pages/Transactions.jsx";
import Cards       from "./pages/Cards.jsx";
import Security    from "./pages/Security.jsx";
import Profile     from "./pages/Profile.jsx";

function PrivateRoute({ children }) {
  return localStorage.getItem("nb_token") ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"        element={<Navigate to="/dashboard" replace />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="transfer"     element={<Transfer />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="cards"        element={<Cards />} />
            <Route path="security"     element={<Security />} />
            <Route path="profile"      element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
