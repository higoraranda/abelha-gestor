import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppPage from './pages/AppPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ui/ProtectedRoute'
import { personalAccess } from './lib/personalAccess'
import BeeLoader from './components/ui/BeeLoader'

export default function App() {
  return (
    <BeeLoader>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={personalAccess ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/*" element={personalAccess ? <AppPage /> : <ProtectedRoute><AppPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </BeeLoader>
  )
}
