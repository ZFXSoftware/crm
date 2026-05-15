import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/Login'
import ActivatePage from './pages/Activate'
import SalesPerformance from './pages/sales/Performance'
import SalesPipeline from './pages/sales/Pipeline'
import SalesCustomers from './pages/sales/Customers'
import SalesCustomerDetail from './pages/sales/CustomerDetail'
import SalesTargets from './pages/sales/Targets'
import FinanceBills from './pages/finances/Bills'
import FinanceRevenue from './pages/finances/Revenue'
import FinanceROI from './pages/finances/ROI'
import FinanceGrowth from './pages/finances/Growth'
import AdminSettings from './pages/admin/Settings'
import AdminUsers from './pages/admin/Users'
import AdminPermissions from './pages/admin/Permissions'
import AnalyticsReports from './pages/analytics/Reports'
import AnalyticsInsights from './pages/analytics/Insights'
import AnalyticsExports from './pages/analytics/Exports'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/activate" element={<ActivatePage />} />

      {/* Rotas protegidas */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/sales/performance" replace />} />

        <Route path="/sales">
          <Route path="performance" element={<SalesPerformance />} />
          <Route path="pipeline" element={<SalesPipeline />} />
          <Route path="customers" element={<SalesCustomers />} />
          <Route path="customers/:id" element={<SalesCustomerDetail />} />
          <Route path="targets" element={<SalesTargets />} />
        </Route>

        <Route path="/finances">
          <Route path="bills" element={<FinanceBills />} />
          <Route path="revenue" element={<FinanceRevenue />} />
          <Route path="roi" element={<FinanceROI />} />
          <Route path="growth" element={<FinanceGrowth />} />
        </Route>

        <Route path="/admin">
          <Route path="settings" element={<AdminSettings />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="permissions" element={<AdminPermissions />} />
        </Route>

        <Route path="/analytics">
          <Route path="reports" element={<AnalyticsReports />} />
          <Route path="insights" element={<AnalyticsInsights />} />
          <Route path="exports" element={<AnalyticsExports />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
