import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import HomePage from './pages/HomePage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import OotdPage from './pages/OotdPage.jsx'
import TodayPage from './pages/TodayPage.jsx'
import JournalPage from './pages/JournalPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

function Redirect({ to }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

function Landing() {
  const { search } = useLocation()
  return search ? <Navigate to={`/wardrobe${search}`} replace /> : <TodayPage />
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <main className="page">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Landing />
                  </RequireAuth>
                }
              />
              <Route path="/wardrobe" element={<RequireAuth><HomePage /></RequireAuth>} />
              <Route path="/studio" element={<RequireAuth><OotdPage /></RequireAuth>} />
              <Route path="/journal" element={<RequireAuth><JournalPage /></RequireAuth>} />
              <Route
                path="/upload"
                element={
                  <RequireAuth>
                    <UploadPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/ootd"
                element={
                  <RequireAuth>
                    <Redirect to="/studio" />
                  </RequireAuth>
                }
              />
              <Route
                path="/calendar"
                element={
                  <RequireAuth>
                    <Navigate to="/journal?view=calendar" replace />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
