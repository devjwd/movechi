import React from 'react'
import { Link } from 'react-router-dom'
import HomePageHeader from './components/HomePageHeader'
import './home.css'

// Configuration
const MINT_LINK = "https://www.tradeport.xyz/movement/collection/0x4c28d9362f440dedec5013742fb21fd4693b56add430e9a5874b220b681053ae?tab=mint&bottomTab=trades"

function Home() {
  return (
    <div className="home-container">
      <HomePageHeader activePage="home" />

      {/* HERO SECTION */}
      <header className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">LIVE ON MOVEMENT</div>
          <h1 className="hero-title">COLLECT.<br/>SPIN.<br/>EARN.</h1>
          <p className="hero-subtitle">
            The premier character collection on Movement Network. 
            Hold Movechi NFTs to unlock daily free spins, multiplier bonuses, and exclusive jackpot access.
          </p>
          
          <div className="cta-group">
            <a href={MINT_LINK} target="_blank" rel="noreferrer" className="btn-primary">
              MINT CHARACTER
            </a>
            <Link to="/spin" className="btn-secondary">
              ENTER APP
            </Link>
          </div>
        </div>

        {/* HERO VISUAL (3D Card Effect) */}
        <div className="hero-visual">
          <div className="visual-glow"></div>
          <div className="nft-showcase-card float-animation">
            {/* REPLACE WITH YOUR BEST CHARACTER IMAGE */}
            <div className="card-image-wrapper">
                <img 
                  src="/character_preview.png" 
                  alt="Movechi Legendary" 
                  className="hero-nft-img"
                  onError={(e) => {e.target.src='https://via.placeholder.com/400x400/2a2520/c9a961?text=MOVECHI+ART'}} 
                />
            </div>
            <div className="nft-card-footer">
              <div className="nft-info">
                  <span className="nft-collection">MOVECHI GENESIS COLLECTION</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* GALLERY STRIP */}
      <section className="gallery-section">
        <div className="section-header-wrapper">
            <h2 className="section-header">THE COLLECTION</h2>
            <p className="section-sub">Distinct characters. Unique traits. Infinite possibilities.</p>
        </div>
        
        <div className="gallery-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="gallery-card">
              <div className="gallery-img-box">
                  <img 
                    src={`/nft_${i}.png`} 
                    alt={`Movechi #${i}`} 
                    onError={(e) => {e.target.src='https://via.placeholder.com/300x300/3a3530/8a8070?text=NFTPREVIEW'}} 
                  />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="home-footer">
        <div className="footer-content">
            <div className="logo-box">
                <span className="logo-text">MOVECHI</span>
            </div>
            <p>© 2025 MOVECHI_XYZ. BUILT ON MOVEMENT.</p>
        </div>
      </footer>
    </div>
  )
}

export default Home