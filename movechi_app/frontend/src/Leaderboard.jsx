import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { useLeaderboardIndexer } from './hooks/useLeaderboardIndexer'
import Header from './components/Header'
import './Leaderboard.css'

function Leaderboard() {
  const { connected, account } = useWallet()
  const {
    gameState,
    leaderboard,
    countdown,
    loading,
    globalStats,
    sortBy,
    changeSortBy,
    refresh,
  } = useLeaderboardIndexer() // No test addresses - will fetch from contract

  // Local filtering state
  const [filteredLeaderboard, setFilteredLeaderboard] = useState([])
  const [filterActive, setFilterActive] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [floorPrice, setFloorPrice] = useState(null)
  const [floorPriceLoading, setFloorPriceLoading] = useState(false)

  // Fetch MOVECHI floor price from Tradeport
  useEffect(() => {
    const fetchFloorPrice = async () => {
      try {
        setFloorPriceLoading(true)
        // Fetch collection stats from Tradeport API
        const response = await fetch(
          'https://api.tradeport.xyz/collections/0x4c28d9362f440dedec5013742fb21fd4693b56add430e9a5874b220b681053ae/stats'
        )
        if (response.ok) {
          const data = await response.json()
          if (data.floor_price) {
            setFloorPrice(data.floor_price)
          }
        }
      } catch (error) {
        console.log('Could not fetch floor price:', error.message)
      } finally {
        setFloorPriceLoading(false)
      }
    }

    fetchFloorPrice()
    // Refresh floor price every 60 seconds
    const interval = setInterval(fetchFloorPrice, 60000)
    return () => clearInterval(interval)
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = [...leaderboard]

    // Filter by criteria
    if (filterActive === 'stakers') {
      filtered = filtered.filter(p => p.stakedNfts > 0)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.address.toLowerCase().includes(query) ||
        p.displayAddr.toLowerCase().includes(query)
      )
    }

    setFilteredLeaderboard(filtered)
  }, [leaderboard, filterActive, searchQuery])

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never'
    const now = Date.now() / 1000
    const diff = now - timestamp
    
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const formatMoveTokens = (amount) => {
    return (amount / 100000000).toFixed(2)
  }

  const getRankBadge = (rank) => {
    if (rank === 1) return '👑'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return ''
  }

  return (
    <div className="leaderboard-container">
      <Header activePage="leaderboard" />

      {/* Main Content */}
      <div className="leaderboard-content">
        {/* Season Info Cards */}
        <div className="leaderboard-stats-grid">
          <div className="stat-card">
            <span className="stat-label">CURRENT SEASON</span>
            <span className="stat-value">{gameState.seasonId}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">ENDS IN</span>
            <span className="stat-value">
              {countdown.days}d {countdown.hours}h {countdown.minutes}m
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">MOVECHI FLOOR PRICE</span>
            <span className="stat-value">
              {floorPriceLoading ? 'Loading...' : floorPrice ? `${floorPrice.toFixed(2)} MOVE` : 'N/A'}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">TOTAL PLAYERS</span>
            <span className="stat-value">{globalStats?.totalPlayers || 0}</span>
          </div>
        </div>

        {/* Filter Section */}
        <div className="leaderboard-filter-section">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filterActive === 'all' ? 'active' : ''}`}
              onClick={() => setFilterActive('all')}
            >
              All Players
            </button>
            <button 
              className={`filter-btn ${filterActive === 'stakers' ? 'active' : ''}`}
              onClick={() => setFilterActive('stakers')}
            >
              NFT Stakers
            </button>
          </div>
          <input
            type="text"
            className="search-input"
            placeholder="Search by address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Leaderboard Table */}
        {loading ? (
          <div className="leaderboard-loading">leaderboard Loading....</div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="leaderboard-empty">
            <p>No players found yet. Be the first to spin and get on the leaderboard!</p>
            <Link to="/spin" className="refresh-btn">Start Playing</Link>
          </div>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>PLAYER</th>
                <th>SPINS</th>
                <th onClick={() => changeSortBy('winnings')} style={{ cursor: 'pointer' }}>
                  WINNINGS {sortBy === 'winnings' ? '↓' : ''}
                </th>
                <th>NFTs STAKED</th>
                <th onClick={() => changeSortBy('xp')} style={{ cursor: 'pointer' }}>
                  TOTAL XP {sortBy === 'xp' ? '↓' : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaderboard.map((player) => (
                <tr key={player.address} className={player.rank <= 3 ? `rank-${player.rank}` : ''}>
                  <td className="rank-cell">
                    {getRankBadge(player.rank)} {player.rank}
                  </td>
                  <td className="player-cell">
                    <strong>{player.displayAddr}</strong>
                  </td>
                  <td>{player.spins}</td>
                  <td className="winnings-cell">
                    {player.winnings > 0 ? `${player.winnings.toFixed(2)} MOVE` : '0 MOVE'}
                  </td>
                  <td>{player.stakedNfts}</td>
                  <td>{player.xp.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Leaderboard
