import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import AdminClients from "./pages/AdminClients";
import AdminFollowups from "./pages/AdminFollowups";
import AdminRequests from "./pages/AdminRequests";
import AdminReports from "./pages/AdminReports";
import AdminServices from "./pages/AdminServices";
import AdminSettings from "./pages/AdminSettings";
import ContactPage from "./pages/ContactPage";
import Dashboard from "./pages/Dashboard";
import ServicePage from "./pages/ServicePage";
import Website from "./pages/Website";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Website />} />
        <Route path="/contacto" element={<ContactPage />} />
        <Route path="/servicios/:slug" element={<ServicePage />} />
        <Route
          path="/admin"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path="/admin/solicitudes"
          element={
            <Layout>
              <AdminRequests />
            </Layout>
          }
        />
        <Route
          path="/admin/clientes"
          element={
            <Layout>
              <AdminClients />
            </Layout>
          }
        />
        <Route
          path="/admin/seguimiento"
          element={
            <Layout>
              <AdminFollowups />
            </Layout>
          }
        />
        <Route
          path="/admin/servicios"
          element={
            <Layout>
              <AdminServices />
            </Layout>
          }
        />
        <Route
          path="/admin/reportes"
          element={
            <Layout>
              <AdminReports />
            </Layout>
          }
        />
        <Route
          path="/admin/ajustes"
          element={
            <Layout>
              <AdminSettings />
            </Layout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
