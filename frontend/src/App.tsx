import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Website from "./pages/Website";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Website />} />
        <Route
          path="/admin"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
