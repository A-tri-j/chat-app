import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import ProfilePage from './pages/ProfilePage'
import useStore from './store'

function ProtectedRoute({ children }) {
  const token = useStore((s) => s.token)
  if (!token) return <Navigate to="/login" />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={
          <ProtectedRoute><Chat /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}