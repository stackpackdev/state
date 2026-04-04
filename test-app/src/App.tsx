import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Contact } from './pages/Contact'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const onLogin = (name: string, email: string) => {
    setUser({ name, email })
    setIsAuthenticated(true)
  }

  const onLogout = () => {
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        {isAuthenticated && <Link to="/dashboard">Dashboard</Link>}
        {isAuthenticated ? (
          <button onClick={onLogout}>Logout</button>
        ) : (
          <button onClick={() => onLogin('Test User', 'test@example.com')} style={{ background: '#28a745', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
            Login
          </button>
        )}
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/dashboard" element={<Dashboard user={user} />} />
      </Routes>
    </BrowserRouter>
  )
}
