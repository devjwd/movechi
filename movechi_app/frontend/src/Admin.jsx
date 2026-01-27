import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Aptos } from "@aptos-labs/ts-sdk"
import { getAptosConfig } from './config/network' // Ensure you have this or standard config
import { Link } from 'react-router-dom'
import './Admin.css'
import './upload-styles.css'

// --- CONSTANTS ---
const OCTAS_PER_APT = 100_000_000
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x361bb3204139e0537679d67b03866f8bb9a10d420e39cbf30c22da71b456b10d"
const MODULE_NAME = import.meta.env.VITE_MODULE_NAME || "main"

// Initialize Client
const aptosClient = new Aptos(getAptosConfig())

// --- HELPERS (module scope so subcomponents can use them) ---
const normalizeAddress = (addr) => addr ? addr.toString().toLowerCase().replace(/^0x/, '') : ''
const formatAddress = (addr) => {
    if (!addr) return ''
    const s = addr.toString()
    const hex = s.startsWith('0x') ? s.slice(2) : s
    if (hex.length <= 8) return `0x${hex}`
    return `0x${hex.slice(0,4)}...${hex.slice(-4)}`
}

function Admin() {
  const { connected, account, signAndSubmitTransaction, disconnect, connect, wallets } = useWallet()
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showWalletModal, setShowWalletModal] = useState(false)
  
  // Game State (Matches Move Structs)
  const [gameState, setGameState] = useState({
    seasonStarted: false,
    seasonEndTime: 0,
    claimWindowActive: false,
    claimEndTime: 0,
    currentSeasonId: 0,
    totalXp: 0,
    ticketsSold: 0,
    paused: false,
    admin: null,
    whitelistCollection: null,
    lastSeasonWinner: null,
    lastSeasonPayout: 0,
    lastSeasonTimestamp: 0
  })
  
  // Wallet Balances for the 4 Robot Vaults + Contract
  const [vaults, setVaults] = useState({
    instant: { bal: 0, addr: null },
    seasonal: { bal: 0, addr: null },
    sponsor: { bal: 0, addr: null },
    reward: { bal: 0, addr: null },
  })

  // Inputs
  const [seasonDuration, setSeasonDuration] = useState(30) // Days
  const [claimDuration, setClaimDuration] = useState(7)   // Days
  const [newCollectionAddr, setNewCollectionAddr] = useState('')
  const [withdrawForm, setWithdrawForm] = useState({ vaultIdx: 0, amount: '' })
  
  // Art Upload State
  const [artForm, setArtForm] = useState({
    title: '',
    artist: '',
    imageUrl: '',
    description: ''
  })
  const [artGallery, setArtGallery] = useState([])

  // Load art gallery from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('movechi_artworks')
      if (stored) {
        setArtGallery(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to load art gallery:', e)
    }
  }, [])

  const handleArtSubmit = () => {
    if (!artForm.title || !artForm.imageUrl) {
      alert('Please fill in title and image URL')
      return
    }

    try {
      const newArtwork = {
        id: Date.now().toString(),
        title: artForm.title,
        artist: artForm.artist || 'Unknown',
        image: artForm.imageUrl,
        description: artForm.description,
        createdAt: new Date().toISOString()
      }
      
      const updated = [...artGallery, newArtwork]
      setArtGallery(updated)
      localStorage.setItem('movechi_artworks', JSON.stringify(updated))
      
      // Notify Art page of update
      window.dispatchEvent(new CustomEvent('artworkUpdated', { detail: updated }))
      
      alert('Artwork added successfully!')
      setArtForm({ title: '', artist: '', imageUrl: '', description: '' })
    } catch (error) {
      alert('Failed to add artwork: ' + error.message)
    }
  }

  const handleDeleteArt = (id) => {
    if (!window.confirm('Are you sure you want to delete this artwork?')) return
    
    try {
      const updated = artGallery.filter(art => art.id !== id)
      setArtGallery(updated)
      localStorage.setItem('movechi_artworks', JSON.stringify(updated))
      
      // Notify Art page of update
      window.dispatchEvent(new CustomEvent('artworkUpdated', { detail: updated }))
      
      alert('Artwork deleted successfully!')
    } catch (error) {
      alert('Delete failed: ' + error.message)
    }
  }

  // --- HELPERS (component-local) ---
  
  const now = Math.floor(Date.now() / 1000)
  const isSeasonActive = gameState.seasonStarted && now <= gameState.seasonEndTime
  const isClaimActive = gameState.claimWindowActive && now <= gameState.claimEndTime
  
  // Security Check
  const isAdmin = useMemo(() => {
    if (!account || !gameState.admin) return false
    return normalizeAddress(account.address) === normalizeAddress(gameState.admin) || 
           normalizeAddress(account.address) === normalizeAddress(CONTRACT_ADDRESS)
  }, [account, gameState.admin])

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;
    setLoading(true)
    try {
      // 1. Fetch GameState Resource
      const resourceType = `${CONTRACT_ADDRESS}::${MODULE_NAME}::GameState`
            const resource = await aptosClient.getAccountResource({
                accountAddress: CONTRACT_ADDRESS,
                resourceType: resourceType
            })

            // resource shape can vary depending on SDK/REST wrapper. Support common shapes.
            const data = resource?.data?.data ?? resource?.data ?? resource
      
            setGameState({
                seasonStarted: data.season_started ?? data.seasonStarted ?? false,
                seasonEndTime: Number(data.season_end_time ?? data.seasonEndTime ?? 0),
                claimWindowActive: data.claim_window_active ?? data.claimWindowActive ?? false,
                claimEndTime: Number(data.claim_end_time ?? data.claimEndTime ?? 0),
                currentSeasonId: Number(data.current_season_id ?? data.currentSeasonId ?? 0),
                totalXp: Number(data.total_global_xp ?? data.totalGlobalXp ?? 0),
                ticketsSold: Number(data.total_tickets ?? data.totalTickets ?? 0),
                paused: data.paused ?? false,
                admin: data.admin ?? data.administrator ?? null,
                whitelistCollection: data.whitelist_collection ?? data.whitelistCollection ?? null,
                lastSeasonWinner: data.last_season_winner ?? data.lastSeasonWinner ?? null,
                lastSeasonPayout: Number(data.last_season_payout ?? data.lastSeasonPayout ?? 0),
                lastSeasonTimestamp: Number(data.last_season_timestamp ?? data.lastSeasonTimestamp ?? 0)
            })

      // 2. Fetch Vault Balances
      // Helper to fetch coin balance
      const getBal = async (cap) => {
        if (!cap || !cap.account) return { bal: 0, addr: 'Not Init' }
        try {
          const coinRes = await aptosClient.getAccountResource({
            accountAddress: cap.account,
            resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
          })
                    const coinValue = coinRes?.data?.coin?.value ?? coinRes?.coin?.value ?? coinRes?.data?.value ?? coinRes?.value
                    return { bal: Number(coinValue ?? 0) / OCTAS_PER_APT, addr: cap.account }
        } catch (e) {
          return { bal: 0, addr: cap.account }
        }
      }

      const [inst, seas, spon, rew] = await Promise.all([
        getBal(data.instant_cap),
        getBal(data.seasonal_cap),
        getBal(data.sponsor_cap),
        getBal(data.reward_cap)
      ])

      setVaults({ instant: inst, seasonal: seas, sponsor: spon, reward: rew })

        } catch (e) {
            console.error("Fetch error:", e)
    } finally {
      setLoading(false)
    }
  }, [refreshTrigger]) 

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- TRANSACTIONS ---
  const handleTx = async (funName, args = [], desc) => {
    if (!account) return
    // Validate contract address before attempting wallet tx to avoid
    // wallet errors like "Hex characters are invalid" when the address
    // is missing or malformed in the env config.
    if (!CONTRACT_ADDRESS) {
      alert('Error: Contract address not configured. Set VITE_CONTRACT_ADDRESS')
      return
    }
    setLoading(true)
    try {
        // Ensure address has 0x prefix (some envs omit it) and use normalized value
        const contractAddr = CONTRACT_ADDRESS.toString().startsWith('0x') ? CONTRACT_ADDRESS : `0x${CONTRACT_ADDRESS}`
                const payload = {
                    data: {
                        function: `${contractAddr}::${MODULE_NAME}::${funName}`,
                        typeArguments: [],
                        functionArguments: args,
                    },
                }
                const response = await signAndSubmitTransaction(payload)
        try { await aptosClient.waitForTransaction?.({ transactionHash: response.hash }) } catch (_) {}
        alert(`${desc} Successful!`)
        setRefreshTrigger(p => p + 1)
    } catch (e) {
        console.error(e)
        alert(`Error: ${e?.message ?? String(e)}`)
    } finally {
        setLoading(false)
    }
  }

  // --- RENDER ---
  if (!connected) return <ConnectScreen setShow={setShowWalletModal} show={showWalletModal} wallets={wallets} connect={connect} />
  
  // Simple check to hide admin panel from non-admins (optional, but good UX)
  if (gameState.admin && !isAdmin) {
      return (
          <div className="login-view">
              <h1 className="text-danger">ACCESS DENIED</h1>
              <p>Connected: {formatAddress(account.address)}</p>
              <p>Admin: {formatAddress(gameState.admin)}</p>
              <button className="btn-secondary" onClick={disconnect}>Disconnect</button>
          </div>
      )
  }

  return (
    <div className="admin-wrapper">
      {/* HEADER */}
      <header className="admin-header">
        <div className="header-left">
            <h1 className="logo-text">ADMIN PORTAL</h1>
            <span className={`status-pill ${gameState.paused ? 'paused' : 'active'}`}>
                {gameState.paused ? 'SYSTEM PAUSED' : 'SYSTEM ONLINE'}
            </span>
        </div>
        <div className="header-right">
            <div className="admin-info">
                <span className="label">Season #{gameState.currentSeasonId}</span>
                <span className="value">{formatAddress(account?.address)}</span>
            </div>
            <div className="contract-info">
                <small>Contract:</small>
                <div className="contract-addr">{CONTRACT_ADDRESS ? formatAddress(CONTRACT_ADDRESS) : 'Not configured'}</div>
            </div>
            <button className="btn-icon" onClick={() => { setRefreshTrigger(p=>p+1) }}>↻</button>
            {connected ? (
                <button className="btn-secondary" onClick={disconnect}>Disconnect</button>
            ) : (
                <button className="btn-primary" onClick={()=>setShowWalletModal(true)}>Connect Wallet</button>
            )}
            <Link to="/" className="btn-secondary">View Portal</Link>
        </div>
      </header>

      <div className="admin-grid">
        
        {/* ROW 1: TREASURY (Vaults) */}
        <section className="card full-width">
            <h2 className="section-title">Treasury Vaults</h2>
            <div className="vaults-grid">
                <VaultCard title="Instant (Jackpot)" data={vaults.instant} icon="⚡" />
                <VaultCard title="Seasonal (Pot)" data={vaults.seasonal} icon="🏆" />
                <VaultCard title="Sponsor (Gas)" data={vaults.sponsor} icon="⛽" />
                <VaultCard title="Reward (XP)" data={vaults.reward} icon="💎" />
            </div>
            <div className="last-result">
                <h3>Last Season Result</h3>
                <div className="result-row"><span>Winner:</span><span>{formatAddress(gameState.lastSeasonWinner)}</span></div>
                <div className="result-row"><span>Payout:</span><span>{(gameState.lastSeasonPayout / OCTAS_PER_APT).toLocaleString(undefined, {minimumFractionDigits:2})} MOVE</span></div>
                <div className="result-row"><span>When:</span><span>{gameState.lastSeasonTimestamp ? new Date(gameState.lastSeasonTimestamp * 1000).toLocaleString() : '--'}</span></div>
            </div>
        </section>

        {/* ROW 2: LIFECYCLE MANAGEMENT */}
        <section className="card full-width">
            <h2 className="section-title">Season Lifecycle</h2>
            <div className="lifecycle-stepper">
                
                {/* STEP 1: START */}
                <div className={`step-box ${!gameState.seasonStarted && !gameState.claimWindowActive ? 'active' : 'inactive'}`}>
                    <div className="step-header">
                        <span className="step-num">1</span>
                        <h3>Start Season</h3>
                    </div>
                    <div className="step-body">
                        {!gameState.seasonStarted && !gameState.claimWindowActive ? (
                            <>
                                <div className="input-group">
                                    <label>Duration (Days)</label>
                                    <input type="number" value={seasonDuration} onChange={e=>setSeasonDuration(Number(e.target.value))} />
                                </div>
                                <button className="btn-primary full" 
                                    onClick={() => handleTx("start_season", [(seasonDuration * 86400).toString()], "Start Season")}>
                                    Initialize Season
                                </button>
                            </>
                        ) : (
                            <p className="status-text success">Season Started</p>
                        )}
                    </div>
                </div>

                {/* STEP 2: ACTIVE SEASON */}
                <div className={`step-box ${gameState.seasonStarted ? 'active' : 'inactive'}`}>
                     <div className="step-header">
                        <span className="step-num">2</span>
                        <h3>In Progress</h3>
                    </div>
                    <div className="step-body">
                        <div className="stat-row">
                            <span>Ends:</span>
                            <span>{gameState.seasonEndTime > 0 ? new Date(gameState.seasonEndTime * 1000).toLocaleDateString() : '--'}</span>
                        </div>
                        <div className="stat-row">
                            <span>Tickets:</span>
                            <span>{gameState.ticketsSold}</span>
                        </div>
                         <div className="stat-row">
                            <span>Global XP:</span>
                            <span>{gameState.totalXp}</span>
                        </div>
                        {isSeasonActive ? (
                             <div className="active-indicator pulsing">Playing...</div>
                        ) : gameState.seasonStarted ? (
                            <div className="active-indicator warning">Time Expired</div>
                        ) : <span className="status-text">--</span>}
                    </div>
                </div>

                {/* STEP 3: DRAW & CLAIM */}
                <div className={`step-box ${gameState.seasonStarted && !isSeasonActive ? 'active' : gameState.claimWindowActive ? 'active' : 'inactive'}`}>
                    <div className="step-header">
                        <span className="step-num">3</span>
                        <h3>Draw & Claim</h3>
                    </div>
                    <div className="step-body">
                        {!gameState.claimWindowActive ? (
                            <>
                                <div className="input-group">
                                    <label>Claim Window (Days)</label>
                                    <input type="number" value={claimDuration} onChange={e=>setClaimDuration(Number(e.target.value))} />
                                </div>
                                <button className="btn-success full"
                                    disabled={!gameState.seasonStarted || isSeasonActive} // Can only draw if started AND time is up
                                    onClick={() => handleTx("draw_seasonal_winner", [(claimDuration * 86400).toString()], "Winner Drawn")}>
                                    Draw Winner & Open Claims
                                </button>
                                {isSeasonActive && <small className="hint">Wait for season end</small>}
                            </>
                        ) : (
                            <>
                                <p className="status-text warn">Claim Window Open</p>
                                <small>Closes: {new Date(gameState.claimEndTime * 1000).toLocaleString()}</small>
                            </>
                        )}
                    </div>
                </div>

                {/* STEP 4: FINALIZE */}
                <div className={`step-box ${gameState.claimWindowActive && !isClaimActive ? 'active' : 'inactive'}`}>
                    <div className="step-header">
                        <span className="step-num">4</span>
                        <h3>Finalize</h3>
                    </div>
                    <div className="step-body">
                        <button className="btn-danger full"
                            disabled={!gameState.claimWindowActive || isClaimActive} // Can only finalize if claim window is active AND time is up
                            onClick={() => handleTx("finalize_season", [], "Season Finalized")}>
                            Finalize & Reset
                        </button>
                        {isClaimActive && <small className="hint">Wait for claim window to close</small>}
                    </div>
                </div>

            </div>
        </section>

        {/* ROW 3: SETTINGS & DANGER */}
        <section className="card">
            <h2 className="section-title">Configuration</h2>
            <div className="form-stack">
                <div className="input-group">
                    <label>Whitelist Collection Address</label>
                    <input type="text" placeholder="0x..." value={newCollectionAddr} onChange={e=>setNewCollectionAddr(e.target.value)} />
                    <small>Current: {formatAddress(gameState.whitelistCollection)}</small>
                </div>
                <button className="btn-secondary" 
                    disabled={!newCollectionAddr}
                    onClick={() => handleTx("set_whitelist_collection", [newCollectionAddr], "Collection Updated")}>
                    Update Collection
                </button>
                
                <div className="divider"></div>
                
                <div className="toggle-row">
                    <span>Game Status</span>
                    <button className={`toggle-btn ${gameState.paused ? 'off' : 'on'}`}
                        onClick={() => handleTx("set_pause", [!gameState.paused], gameState.paused ? "Resumed" : "Paused")}>
                        {gameState.paused ? "RESUME GAME" : "PAUSE GAME"}
                    </button>
                </div>
            </div>
        </section>

        <section className="card danger-zone">
            <h2 className="section-title danger">Emergency Withdraw</h2>
            <div className="form-stack">
                <div className="input-group">
                    <label>From Vault</label>
                    <select value={withdrawForm.vaultIdx} onChange={e=>setWithdrawForm({...withdrawForm, vaultIdx: Number(e.target.value)})}>
                        <option value="0">Instant (Jackpot)</option>
                        <option value="1">Seasonal</option>
                        <option value="2">Sponsor</option>
                        <option value="3">Reward</option>
                    </select>
                </div>
                <div className="input-group">
                    <label>Amount (MOVE)</label>
                    <input type="number" placeholder="0.00" value={withdrawForm.amount} onChange={e=>setWithdrawForm({...withdrawForm, amount: e.target.value})} />
                </div>
                <button className="btn-danger"
                    disabled={!withdrawForm.amount}
                        onClick={() => {
                        const amt = (Number(withdrawForm.amount) * OCTAS_PER_APT).toFixed(0);
                        handleTx("admin_emergency_withdraw", [amt, Number(withdrawForm.vaultIdx)], "Withdraw Complete");
                    }}>
                    🚨 Withdraw Funds
                </button>
            </div>
        </section>

        {/* ART MANAGEMENT SECTION - BOTTOM */}
        <section className="card full-width">
          <h2 className="section-title">🎨 Manage Art Gallery</h2>
          
          <div className="art-form-section">
            <div className="form-grid">
              <div className="form-field full-width">
                <label>Artwork Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Digital Dreams"
                  value={artForm.title}
                  onChange={(e) => setArtForm({...artForm, title: e.target.value})}
                />
              </div>
              <div className="form-field full-width">
                <label>Image URL *</label>
                <input
                  type="url"
                  placeholder="e.g., https://example.com/artwork.jpg"
                  value={artForm.imageUrl}
                  onChange={(e) => setArtForm({...artForm, imageUrl: e.target.value})}
                />
              </div>
              <div className="form-field full-width">
                <label>Artist Name</label>
                <input
                  type="text"
                  placeholder="e.g., Jane Doe"
                  value={artForm.artist}
                  onChange={(e) => setArtForm({...artForm, artist: e.target.value})}
                />
              </div>
              <div className="form-field full-width">
                <label>Description</label>
                <textarea
                  placeholder="Enter artwork description..."
                  value={artForm.description}
                  onChange={(e) => setArtForm({...artForm, description: e.target.value})}
                  rows={2}
                />
              </div>
            </div>
            <button className="btn-primary full" onClick={handleArtSubmit}>
              Add to Gallery
            </button>
          </div>

          {/* Gallery Preview */}
          {artGallery.length > 0 && (
            <div className="gallery-preview">
              <h3>Current Artworks ({artGallery.length})</h3>
              <div className="gallery-grid">
                {artGallery.map((art) => (
                  <div key={art.id} className="gallery-item">
                    <div className="gallery-image">
                      <img src={art.image} alt={art.title} onError={(e) => {e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23333" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="sans-serif"%3EImage Error%3C/text%3E%3C/svg%3E'}} />
                    </div>
                    <div className="gallery-details">
                      <h4>{art.title}</h4>
                      <p className="artist-name">{art.artist}</p>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteArt(art.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

      </div>
      
      {loading && <div className="loading-overlay"><div className="spinner"></div>Processing...</div>}
    </div>
  )
}

// Sub-components
const VaultCard = ({title, data, icon}) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        const addr = data?.addr || ''
        if (!addr) {
            alert('No address to copy')
            return
        }
        try {
            await navigator.clipboard.writeText(addr)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (e) {
            try {
                const ta = document.createElement('textarea')
                ta.value = addr
                document.body.appendChild(ta)
                ta.select()
                document.execCommand('copy')
                document.body.removeChild(ta)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            } catch (err) {
                alert('Copy failed')
            }
        }
    }

    return (
        <div className="vault-card">
            <div className="vault-icon">{icon}</div>
            <div className="vault-info">
                <h4>{title}</h4>
                <div className="vault-bal">{data.bal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <small>MOVE</small></div>
                <div className="vault-addr-row">
                    <div className="vault-addr" title={data.addr}>{formatAddress(data.addr)}</div>
                    <button type="button" className="copy-btn" onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
                </div>
            </div>
        </div>
    )
}

const ConnectScreen = ({setShow, show, wallets, connect}) => (
    <div className="login-view">
        <h1>Admin Console</h1>
        <button className="btn-primary big" onClick={()=>setShow(true)}>Connect Wallet</button>
        {show && (
            <div className="modal-backdrop" onClick={()=>setShow(false)}>
                <div className="modal-content" onClick={e=>e.stopPropagation()}>
                    <h3>Select Wallet</h3>
                    {wallets?.map(w => (
                        <div key={w.name} className="wallet-option" onClick={()=>connect(w.name)}>
                             {w.name}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
)

export default Admin