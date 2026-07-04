import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import HomePage from './pages/HomePage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import OotdPage from './pages/OotdPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import { ToastProvider } from './context/ToastContext.jsx'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Navbar />
        <main className="page">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/ootd" element={<OotdPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </ToastProvider>
  )
}
