import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { normalizeAddress } from '../utils/addressUtils'

function Header({ activePage = 'spin' }) {
  const { connected, account, disconnect, connect, wallets } = useWallet()
  const [showWalletDropdown, setShowWalletDropdown] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [streak, setStreak] = useState(0)
  const [showStreakTooltip, setShowStreakTooltip] = useState(false)
  const [spinHistory, setSpinHistory] = useState([])
  const [totalJackpot, setTotalJackpot] = useState(0)
  const [moveBalance, setMoveBalance] = useState(0)
  const [effectsEnabled, setEffectsEnabled] = useState(() => {
    try {
      const v = localStorage.getItem('effectsEnabled')
      return v === null ? true : v === 'true'
    } catch { return true }
  })

  const loadStreak = useCallback((address) => {
    try {
      const n = normalizeAddress(address)
      // Get current UTC day (resets at 00:00 UTC)
      const now = new Date()
      const today = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000)
      const key = `streak_${n}`
      const stored = localStorage.getItem(key)
      if (!stored) { setStreak(0); return }
      const data = JSON.parse(stored)
      const lastDay = data.lastDay || 0
      const daysSince = today - lastDay
      if (daysSince >= 2) { setStreak(0) } else { setStreak(data.streak || 0) }
    } catch { setStreak(0) }
  }, [])

  const loadSpinHistory = useCallback((address) => {
    try {
      const n = normalizeAddress(address)
      const key = `spin_history_${n}`
      const stored = localStorage.getItem(key)
      const arr = stored ? JSON.parse(stored) : []
      setSpinHistory(arr)
      try {
        const total = arr.reduce((acc, s) => {
          if (s.prize === 'JACKPOT') {
            const n = Number(String(s.amount).replace(/[^0-9.-]+/g, ''))
            return acc + (isNaN(n) ? 0 : n)
          }
          return acc
        }, 0)
        setTotalJackpot(total)
      } catch(_) { setTotalJackpot(0) }
    } catch {
      setSpinHistory([])
      setTotalJackpot(0)
    }
  }, [])

  useEffect(() => {
    if (connected && account?.address) {
      loadStreak(account.address.toString())
      loadSpinHistory(account.address.toString())
    } else {
      setStreak(0)
      setSpinHistory([])
    }
    
    // Listen for real-time updates from App.jsx
    const handleStreakUpdate = (event) => {
      if (connected && account?.address && event.detail.address === account.address.toString()) {
        setStreak(event.detail.streak)
      }
    }
    
    const handleSpinHistoryUpdate = (event) => {
      if (connected && account?.address && event.detail.address === account.address.toString()) {
        setSpinHistory(event.detail.history)
        // Recalculate total jackpot
        try {
          const total = event.detail.history.reduce((acc, s) => {
            if (s.prize === 'JACKPOT') {
              const n = Number(String(s.amount).replace(/[^0-9.-]+/g, ''))
              return acc + (isNaN(n) ? 0 : n)
            }
            return acc
          }, 0)
          setTotalJackpot(total)
        } catch(_) { setTotalJackpot(0) }
      }
    }
    
    window.addEventListener('streakUpdated', handleStreakUpdate)
    window.addEventListener('spinHistoryUpdated', handleSpinHistoryUpdate)
    
    return () => {
      window.removeEventListener('streakUpdated', handleStreakUpdate)
      window.removeEventListener('spinHistoryUpdated', handleSpinHistoryUpdate)
    }
  }, [connected, account, loadStreak, loadSpinHistory])

  useEffect(() => {
    try { localStorage.setItem('effectsEnabled', String(effectsEnabled)) } catch {}
  }, [effectsEnabled])

  const formatAddress = (address) => address ? `${address.toString().slice(0, 6)}...${address.toString().slice(-4)}` : ''
  
  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const handleDisconnect = async () => { 
    try { 
      await disconnect()
      setShowWalletDropdown(false) 
    } catch (e) {} 
  }

  const handleWalletConnect = async (walletName) => { 
    try { 
      await connect(walletName)
      setShowWalletModal(false) 
    } catch (e) { 
      console.error('Connect error:', e) 
    } 
  }

  return (
    <>
      <nav className="navbar">
        <div className="logo-container">
          <img src="/logo.png" alt="MOVECHI Logo" className="logo-image" onError={(e) => {e.target.style.display='none'}} />
          <span className="logo-text">MOVECHI</span>
        </div>
        <div className="nav-links">
          <Link to="/" className={activePage === 'home' ? 'active' : ''}>HOME</Link>
          <Link to="/spin" className={activePage === 'spin' ? 'active' : ''}>SPIN</Link>
          <Link to="/leaderboard" className={activePage === 'leaderboard' ? 'active' : ''}>LEADERBOARD</Link>
          <Link to="/staking" className={activePage === 'staking' ? 'active' : ''}>STAKING</Link>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
        {connected && (
          <div 
            className="streak-badge"
            onMouseEnter={() => setShowStreakTooltip(true)}
            onMouseLeave={() => setShowStreakTooltip(false)}
          >
            <span className="streak-icon">🔥</span>
            <span className="streak-count">{streak}</span>
            {showStreakTooltip && (
              <div className="streak-tooltip">
                <div className="tooltip-title">
                  {streak > 0 ? `${streak} Day Streak!` : 'Start Your Streak!'}
                </div>
                <div className="tooltip-msg">
                  {streak > 0 ? 'Come back tomorrow to keep it going' : 'Spin daily to build a streak'}
                </div>
                
                {spinHistory.length > 0 && (
                  <>
                    <div className="history-divider"></div>
                    <div className="spin-history-section">
                      <div className="history-header">Recent Spins</div>
                      <div style={{marginBottom:8, fontSize:'0.85rem'}}>Total Jackpot Wins: <strong>{totalJackpot.toLocaleString(undefined, {minimumFractionDigits:2})} MOVE</strong></div>
                      <div className="history-list">
                        {spinHistory.map((spin, idx) => (
                          <div key={idx} className="history-item">
                            <div className="history-prize">
                              <span className="prize-icon">
                                {spin.prize === 'JACKPOT' ? (
                                  <img src="/movement-logo.svg" alt="JACKPOT" className="jackpot-icon" />
                                ) : spin.prize === 'TICKET' ? (
                                  <img src="/ticket-icon.png" alt="TICKET" className="ticket-icon" />
                                ) : spin.prize === 'XP' ? (
                                  <img src="/xp.svg" alt="XP" className="xp-icon" />
                                ) : '⭐'}
                              </span>
                              <span className="prize-name">{spin.amount}</span>
                            </div>
                            <div className="history-meta">
                              <span className={`spin-type ${spin.isFree ? 'free' : 'paid'}`}>
                                {spin.isFree ? 'FREE' : 'PAID'}
                              </span>
                              <span className="spin-time">{formatTimeAgo(spin.timestamp)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {connected ? (
          <div className="wallet-dropdown-container">
            <button className="connect-btn connected" onClick={() => setShowWalletDropdown(!showWalletDropdown)}>
              {formatAddress(account?.address)}
            </button>
            {showWalletDropdown && (
              <div className="wallet-dropdown">
                 <div className="wallet-dropdown-header">
                    <span className="wallet-label">Connected Wallet</span>
                    <span className="wallet-address-full">{formatAddress(account?.address)}</span>
                 </div>
                 <div className="effects-row">
                    <button className={`effects-toggle ${effectsEnabled ? 'on' : 'off'}`} onClick={() => setEffectsEnabled(v => !v)}>
                      Effects: {effectsEnabled ? 'On' : 'Off'}
                    </button>
                 </div>
                 <button className="disconnect-btn" onClick={handleDisconnect}>Disconnect</button>
              </div>
            )}
          </div>
        ) : (
          <button className="connect-btn" onClick={() => setShowWalletModal(true)}>CONNECT</button>
        )}
        </div>
      </nav>

      {showWalletModal && (
        <div className="wallet-modal" onClick={() => setShowWalletModal(false)}>
          <div className="wallet-modal-content" onClick={e => e.stopPropagation()}>
            <div className="wallet-modal-header">
              <h2>Connect Wallet</h2>
            </div>
            <div className="wallet-list">
              {wallets && wallets.length > 0 ? (
                wallets
                  .filter(wallet => {
                    const name = wallet.name.toLowerCase();
                    return !name.includes('google') && !name.includes('apple');
                  })
                  .map((wallet) => (
                    <button key={wallet.name} className="wallet-option" onClick={() => handleWalletConnect(wallet.name)}>
                      {wallet.icon ? (
                        <img src={wallet.icon} alt={wallet.name} className="wallet-icon" />
                      ) : (
                        <div className="wallet-icon placeholder">🪙</div>
                      )}
                      <span className="wallet-name">{wallet.name}</span>
                    </button>
                  ))
              ) : ( <div className="no-wallets"><p>No wallets detected. Install Razor, Nightly, or OKX wallet.</p></div> )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header
