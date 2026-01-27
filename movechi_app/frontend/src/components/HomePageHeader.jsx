import React from 'react'
import { Link } from 'react-router-dom'

export default function HomePageHeader({ activePage }) {
  return (
    <header className="home-page-header">
      <div className="home-header-logo">
        <img src="/logo.png" alt="MOVECHI Logo" className="home-logo-image" />
        <span className="home-logo-text">MOVECHI</span>
      </div>
      <nav className="home-header-nav">
        <Link to="/" className={activePage === 'home' ? 'active' : ''}>HOME</Link>
        <Link to="/art" className={activePage === 'art' ? 'active' : ''}>ART</Link>
        <Link to="/faq" className={activePage === 'faq' ? 'active' : ''}>FAQ</Link>
        <Link to="/about" className={activePage === 'about' ? 'active' : ''}>ABOUT</Link>
      </nav>
      <Link to="/spin" className="home-enter-app-btn">
        ENTER APP
      </Link>
    </header>
  )
}
