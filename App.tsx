import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MatrizProvider } from './contexts/MatrizContext';
import Landing from './pages/Landing';
import ClientLogin from './pages/auth/ClientLogin';
import ClientRegister from './pages/auth/ClientRegister';
import ClientDashboard from './pages/client/Dashboard';
import BarberDashboard from './pages/barber/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProfessionals from './pages/admin/Professionals';
import AdminSuppliers from './pages/admin/Suppliers';
import AdminProfessionalProfile from './pages/admin/ProfessionalProfile';
import AdminFinancial from './pages/admin/Financial';
import AdminAgenda from './pages/admin/Agenda';
import AdminAgendaOverview from './pages/admin/AgendaOverview';
import AdminAgendaReports from './pages/admin/AgendaReports';
import AdminClients from './pages/admin/Clients';
import AdminClientProfile from './pages/admin/ClientProfile';
import AdminBirthdays from './pages/admin/Birthdays';
import AdminFrequency from './pages/admin/Frequency';
import AdminHistory from './pages/admin/History';
import AdminInventory from './pages/admin/Inventory';
import AdminServices from './pages/admin/Services';
import AdminAtendimento from './pages/admin/Atendimento';
import AdminAtendimentoReports from './pages/admin/AtendimentoReports';
import AdminSettings from './pages/admin/Settings';
import AdminMatrizes from './pages/admin/Matrizes';

import AdminLogin from './pages/auth/AdminLogin';
import AdminSetup from './pages/auth/AdminSetup';
import BarberLogin from './pages/auth/BarberLogin';
import BarberRegister from './pages/auth/BarberRegister';
import SecLogin from './pages/auth/SecLogin';
import SecDashboard from './pages/sec/Dashboard';

import PendingAccess from './pages/PendingAccess';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Guard para verificar se o usuário está logado (usa Supabase Auth)
const RequireAuth: React.FC<{ children: React.ReactElement; allowedRole: string }> = ({ children, allowedRole }) => {
  const { role, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-[#0A0A0A]" />;

  if (!role) {
    if (allowedRole === 'barber') return <Navigate to="/barbeiro" replace />;
    if (allowedRole === 'sec') return <Navigate to="/sec" replace />;
    if (allowedRole === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  if (role !== allowedRole && allowedRole !== 'any') {
    if (role === 'barber') return <Navigate to="/barber/dashboard" replace />;
    if (role === 'sec') return <Navigate to="/sec/dashboard" replace />;
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

// Guard para barbers pendentes de aprovação
const RequireApproval: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { status, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-[#0A0A0A]" />;

  // Bloqueia: sem perfil, pendente de aprovação, ou com acesso revogado
  // fail-safe: qualquer status não reconhecido → sem acesso
  if (!status || status === 'pending' || status === 'rejected') {
    return <Navigate to="/pending-access" replace />;
  }

  return children;
};

import PWAInstallPrompt from './components/PWAInstallPrompt';
import ConfigGuard from './components/ConfigGuard';

const App: React.FC = () => {
  return (
    <ConfigGuard>
    <HashRouter>
      <AuthProvider>
        <MatrizProvider>
        <ThemeProvider>
          <ScrollToTop />
          <div className="font-sans antialiased bg-slate-50 dark:bg-background-dark min-h-screen text-slate-900 dark:text-slate-100">
            <PWAInstallPrompt />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<ClientLogin />} />
              <Route path="/register" element={<ClientRegister />} />

              {/* Client Portal */}
              <Route path="/client" element={<Navigate to="/client/dashboard" replace />} />
              <Route path="/client/dashboard" element={
                <RequireAuth allowedRole="client">
                  <ClientDashboard />
                </RequireAuth>
              } />

              {/* Barber Portal */}
              <Route path="/barbeiro" element={<BarberLogin />} />
              <Route path="/barbeiro/register" element={<BarberRegister />} />
              <Route path="/barber" element={<Navigate to="/barber/dashboard" replace />} />
              <Route path="/barber/dashboard" element={
                <RequireAuth allowedRole="barber">
                  <RequireApproval>
                    <BarberDashboard />
                  </RequireApproval>
                </RequireAuth>
              } />

              {/* Admin Portal */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/setup" element={<AdminSetup />} />
              <Route path="/admin/dashboard" element={<RequireAuth allowedRole="admin"><AdminDashboard /></RequireAuth>} />
              <Route path="/admin/agenda" element={<RequireAuth allowedRole="admin"><AdminAgenda /></RequireAuth>} />
              <Route path="/admin/agenda/visao-geral" element={<RequireAuth allowedRole="admin"><AdminAgendaOverview /></RequireAuth>} />
              <Route path="/admin/agenda/relatorio" element={<RequireAuth allowedRole="admin"><AdminAgendaReports /></RequireAuth>} />
              <Route path="/admin/atendimento" element={<RequireAuth allowedRole="admin"><AdminAtendimento /></RequireAuth>} />
              <Route path="/admin/atendimento/history" element={<RequireAuth allowedRole="admin"><AdminHistory /></RequireAuth>} />
              <Route path="/admin/atendimento/reports" element={<RequireAuth allowedRole="admin"><AdminAtendimentoReports /></RequireAuth>} />
              <Route path="/admin/services" element={<RequireAuth allowedRole="admin"><AdminServices /></RequireAuth>} />
              <Route path="/admin/clients" element={<RequireAuth allowedRole="admin"><AdminClients /></RequireAuth>} />
              <Route path="/admin/clients/birthdays" element={<RequireAuth allowedRole="admin"><AdminBirthdays /></RequireAuth>} />
              <Route path="/admin/clients/frequency" element={<RequireAuth allowedRole="admin"><AdminFrequency /></RequireAuth>} />
              <Route path="/admin/clients/:id" element={<RequireAuth allowedRole="admin"><AdminClientProfile /></RequireAuth>} />
              <Route path="/admin/professionals" element={<RequireAuth allowedRole="admin"><AdminProfessionals /></RequireAuth>} />
              <Route path="/admin/professionals/suppliers" element={<RequireAuth allowedRole="admin"><AdminSuppliers /></RequireAuth>} />
              <Route path="/admin/professionals/:id" element={<RequireAuth allowedRole="admin"><AdminProfessionalProfile /></RequireAuth>} />
              <Route path="/admin/inventory" element={<RequireAuth allowedRole="admin"><AdminInventory /></RequireAuth>} />
              <Route path="/admin/financial" element={<RequireAuth allowedRole="admin"><AdminFinancial /></RequireAuth>} />
              <Route path="/admin/settings" element={<RequireAuth allowedRole="admin"><AdminSettings /></RequireAuth>} />
              <Route path="/admin/matrizes" element={<RequireAuth allowedRole="admin"><AdminMatrizes /></RequireAuth>} />

              {/* Secretary Portal */}
              <Route path="/sec" element={<SecLogin />} />
              <Route path="/sec/dashboard" element={
                <RequireAuth allowedRole="sec">
                  <RequireApproval>
                    <SecDashboard />
                  </RequireApproval>
                </RequireAuth>
              } />

              <Route path="/pending-access" element={<PendingAccess />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </ThemeProvider>
        </MatrizProvider>
      </AuthProvider>
    </HashRouter>
    </ConfigGuard>
  );
};

export default App;
