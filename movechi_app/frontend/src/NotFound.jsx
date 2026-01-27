import React from 'react'
import { Link } from 'react-router-dom'
import './NotFound.css'

function NotFound() {
  return (
    <div className="notfound-container">
      <div className="notfound-content">
        <div className="notfound-number">404</div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="notfound-suggestions">
          <p className="suggestions-title">Try these pages instead:</p>
          <div className="suggestion-buttons">
            <Link to="/" className="suggestion-btn">
              🏠 Home
            </Link>
            <Link to="/spin" className="suggestion-btn">
              🎮 Play Game
            </Link>
            <Link to="/staking" className="suggestion-btn">
              📊 Staking
            </Link>
            <Link to="/leaderboard" className="suggestion-btn">
              🏆 Leaderboard
            </Link>
            <Link to="/art" className="suggestion-btn">
              🎨 Gallery
            </Link>
            <Link to="/reward" className="suggestion-btn">
              💰 Rewards
            </Link>
          </div>
        </div>

        <div className="notfound-contact">
          <p>Still need help? <a href="https://docs.movechi.app" target="_blank" rel="noreferrer">Check our docs</a></p>
        </div>
      </div>

      <div className="notfound-animation">
        <div className="floating-element">🎲</div>
        <div className="floating-element">🎨</div>
        <div className="floating-element">🏆</div>
      </div>
    </div>
  )
}

export default NotFound
