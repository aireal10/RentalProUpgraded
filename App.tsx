
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from './hooks/useApi';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Units from './pages/Units';
import Tenants from './pages/Tenants';
import Contracts from './pages/Contracts';
import Invoices from './pages/Invoices';
import LeasePayments from './pages/LeasePayments';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Partners from './pages/Partners';
import History from './pages/History';
import Settings from './pages/Settings';
import PasswordScreen from './components/PasswordScreen';

const AUTH_KEY = 'rental_pro_authenticated';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem(AUTH_KEY) === 'true');

  const handleLoginSuccess = () => {
    sessionStorage.setItem(AUTH_KEY, 'true');
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <PasswordScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <QueryClientProvider>
      <SettingsProvider>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/units" element={<Units />} />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/rentpayments" element={<Invoices />} />
              <Route path="/leasepayments" element={<LeasePayments />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </HashRouter>
      </SettingsProvider>
    </QueryClientProvider>
  );
}
