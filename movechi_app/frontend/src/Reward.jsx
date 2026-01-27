import { useState, useEffect, useCallback } from 'react'
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Aptos } from "@aptos-labs/ts-sdk"
import { getAptosConfig } from './config/network'
import Header from './components/Header'
import './Reward.css'

// --- CONFIGURATION ---
const aptosClient = new Aptos(getAptosConfig())

// Ensure these match your deployed address
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x361bb3204139e0537679d67b03866f8bb9a10d420e39cbf30c22da71b456b10d" 
const MODULE_NAME = import.meta.env.VITE_MODULE_NAME || "main"
const COIN_TYPE = "0x1::aptos_coin::AptosCoin"

// Normalize contract/account address (strip leading zeros after 0x)
const normalizeAddr = (a) => {
  if (!a) return ''
  const s = a.toString()
  if (!s.startsWith('0x')) return s.toLowerCase()
  const hex = s.slice(2).replace(/^0+/, '')
  return `0x${hex.toLowerCase()}`
}
function Reward() {
  const { connected, account, signAndSubmitTransaction, disconnect, connect, wallets } = useWallet()
  const [showWalletDropdown, setShowWalletDropdown] = useState(false)
  
  // --- STATE ---
  const [loading, setLoading] = useState(false)
  const [claimStatus, setClaimStatus] = useState(null) // 'success', 'error', null
  const [claimMessage, setClaimMessage] = useState('')
  const [txHash, setTxHash] = useState('')
  
  // Game Data
  const [isSeasonOver, setIsSeasonOver] = useState(false)
  const [isClaimWindowActive, setIsClaimWindowActive] = useState(false)
  const [seasonEndDate, setSeasonEndDate] = useState(null)
  const [claimEndDate, setClaimEndDate] = useState(null)
  
  // Stats
  const [totalXpGlobal, setTotalXpGlobal] = useState(0)
  const [rewardPoolBalance, setRewardPoolBalance] = useState(0) // The pot available for XP claims
  
  // User Data
  const [userXp, setUserXp] = useState(0)
  const [userSharePct, setUserSharePct] = useState(0)
  const [estimatedReward, setEstimatedReward] = useState(0)

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Game State using Aptos SDK
      const resourceType = `${CONTRACT_ADDRESS}::${MODULE_NAME}::GameState`
      
      const resource = await aptosClient.getAccountResource({
        accountAddress: CONTRACT_ADDRESS,
        resourceType: resourceType
      })
      
      const gameData = resource?.data?.data ?? resource?.data ?? resource
      
      // Time calculations (season_end_time is in seconds timestamp)
      const currentTime = Math.floor(Date.now() / 1000)
      const seasonEndTime = Number(gameData.season_end_time || 0)
      const claimEndTime = Number(gameData.claim_end_time || 0)
      const seasonStarted = gameData.season_started || false
      const claimWindowActive = gameData.claim_window_active || false
      
      // Season is over when season_started is false OR current time > season_end_time
      const seasonOver = !seasonStarted || (seasonEndTime > 0 && currentTime > seasonEndTime)
      
      setIsSeasonOver(seasonOver)
      setIsClaimWindowActive(claimWindowActive)
      setSeasonEndDate(seasonEndTime > 0 ? new Date(seasonEndTime * 1000).toLocaleDateString() : "TBD")
      setClaimEndDate(claimEndTime > 0 ? new Date(claimEndTime * 1000).toLocaleDateString() : "TBD")
      setTotalXpGlobal(Number(gameData.total_global_xp || 0))

      // 2. Fetch Reward Vault Balance (This is where claim_season_rewards pays from)
      try {
        const rewardCapAddr = gameData.reward_cap?.account
        if (rewardCapAddr) {
          try {
            const balance = await aptosClient.getAccountCoinAmount({
              accountAddress: rewardCapAddr,
              coinType: "0x1::aptos_coin::AptosCoin"
            })
            setRewardPoolBalance(Number(balance) / 100000000)
          } catch (e) {
            console.warn("Error fetching reward pool balance:", e)
          }
        }
      } catch (e) {
        console.warn("Error fetching reward pool balance:", e)
      }

      // 3. Fetch User Specific Data
      if (connected && account?.address) {
        try {
          const userAddr = typeof account.address === 'string' ? account.address : account.address.toString()
          const userProfileType = `${CONTRACT_ADDRESS}::${MODULE_NAME}::UserProfile`
          
          try {
            const profileRes = await aptosClient.getAccountResource({
              accountAddress: userAddr,
              resourceType: userProfileType
            })
            
            const udata = profileRes?.data?.data ?? profileRes?.data ?? profileRes
            const xpRaw = udata.accumulated_xp ?? udata.accumulatedXp ?? 0
            let xp = 0
            try {
              if (typeof xpRaw === 'string') xp = Number(BigInt(xpRaw))
              else xp = Number(xpRaw)
            } catch (e) { xp = Number(xpRaw || 0) }
            setUserXp(xp)
            console.log('User XP fetched:', xp)
          } catch (e) {
            // 404 is expected if user has never interacted
            if (e?.status === 404 || e?.message?.includes('404') || e?.message?.includes('not found')) {
              setUserXp(0)
            } else {
              throw e
            }
          }
        } catch (e) {
          console.log("Error fetching user profile:", e)
          setUserXp(0)
        }
      }
    } catch (e) {
      console.error("Critical fetch error:", e)
    }
  }, [connected, account])

  // --- RECALCULATE SHARE ---
  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    // Calculate User Share
    if (totalXpGlobal > 0 && userXp > 0) {
        const share = (userXp / totalXpGlobal) 
        setUserSharePct(share * 100)
        
        // Estimate reward: (User XP / Global XP) * Vault Balance
        const estimated = share * rewardPoolBalance
        setEstimatedReward(estimated)
    } else {
        setUserSharePct(0)
        setEstimatedReward(0)
    }
  }, [totalXpGlobal, userXp, rewardPoolBalance])

  // --- CLAIM HANDLER ---
  const handleClaim = async () => {
    if (!connected || !account) return alert("Please connect wallet first")
    if (userXp <= 0) return alert("You have no XP to claim")
    
    setLoading(true)
    setClaimStatus(null)
    setClaimMessage('')
    setTxHash('')

    try {
        const payload = {
          data: {
            function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::claim_season_rewards`,
            typeArguments: [],
            functionArguments: [],
          },
        }

        const response = await signAndSubmitTransaction(payload)
        
        // Show immediate feedback, then wait for confirmation
        setClaimMessage('Transaction submitted... waiting for confirmation.')
        setClaimStatus('pending')
        
        await aptosClient.waitForTransaction({ transactionHash: response.hash })
        
        setClaimStatus('success')
        setTxHash(response.hash)
        setClaimMessage(`Successfully claimed ${estimatedReward.toFixed(2)} MOVE tokens!`)
        console.log('Claim successful:', response.hash)
        
        // Refresh data to show XP is now 0 (Claimed)
        setTimeout(() => fetchData(), 2000)

    } catch (error) {
        console.error("Claim failed", error)
        setClaimStatus('error')
        
        // User-friendly error mapping
        let errorMsg = 'Transaction failed. Please try again.'
        const errorStr = error?.message?.toLowerCase() || error?.toString?.().toLowerCase() || ''
        
        if (errorStr.includes('102') || errorStr.includes('season')) errorMsg = 'Season has not ended yet. Wait for season conclusion to claim rewards.'
        else if (errorStr.includes('401') || errorStr.includes('nothing')) errorMsg = 'No XP to claim. You may have already claimed or did not participate.'
        else if (errorStr.includes('402') || errorStr.includes('empty')) errorMsg = 'Reward pool is empty. Admin needs to fund it.'
        else if (errorStr.includes('rejected')) errorMsg = 'Transaction rejected by wallet.'
        
        setClaimMessage(errorMsg)
    } finally {
        setLoading(false)
    }
  }

  // --- HELPERS ---
  const formatAddress = (address) => address ? `${address.toString().slice(0, 6)}...${address.toString().slice(-4)}` : ''
  const handleDisconnect = async () => { try { await disconnect(); setShowWalletDropdown(false) } catch (e) {} }
  const handleConnect = async () => {
    try {
      if (wallets && wallets.length > 0) {
        await connect(wallets[0].name)
      }
    } catch (e) {
      console.error('Wallet connect failed', e)
    }
  }

  return (
    <div className="reward-page">
      <Header activePage="reward" />

      <div className="reward-container">
        <header className="reward-header">
            <h1 className="page-title">SEASON REWARDS</h1>
            <p className="page-subtitle">
                {isClaimWindowActive
                 ? `Claim window is OPEN until ${claimEndDate}. Claim your rewards now!` 
                 : isSeasonOver
                 ? "Season has ended. Waiting for admin to open claim window."
                 : `Season ends on ${seasonEndDate}. Keep earning XP to increase your share.`}
            </p>
            <button 
              className="sync-btn" 
              onClick={() => fetchData()}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#c9a961',
                color: '#0d0c0b',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
              disabled={loading}
            >
              {loading ? "SYNCING..." : "↻ SYNC DATA"}
            </button>
        </header>

        <div className="reward-grid">
            
            {/* 1. POOL STATS CARD */}
            <div className="reward-card highlight">
                <div className="card-label">REWARD POOL (XP ALLOCATION)</div>
                <div className="pool-amount">
                    <div className="coin-circle">M</div>
                    {rewardPoolBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <div className="pool-subtext">TOTAL TOKENS TO DISTRIBUTE</div>
                
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{width: isSeasonOver ? '100%' : '65%'}}></div>
                </div>
                
                <div className="season-status-row">
                    <span>STATUS: <span className={isSeasonOver ? "status-ended" : "status-active"}>
                        {isSeasonOver ? "SEASON ENDED" : "LIVE"}
                    </span></span>
                    <span>TOTAL GLOBAL XP: {totalXpGlobal.toLocaleString()}</span>
                </div>
            </div>

            {/* 2. USER STATS CARD */}
            <div className="reward-card">
                <div className="card-label">YOUR PERFORMANCE</div>
                
                <div className="user-stat-row">
                    <div className="user-stat">
                        <span className="stat-title">YOUR XP</span>
                        <span className="stat-num xp-color">{userXp.toLocaleString()}</span>
                    </div>
                    <div className="user-stat">
                        <span className="stat-title">SHARE %</span>
                        <span className="stat-num">{userSharePct.toFixed(4)}%</span>
                    </div>
                </div>

                <div className="divider"></div>

                <div className="allocation-section">
                    <div className="allocation-row">
                        <span>ESTIMATED CLAIM</span>
                    </div>
                    <div className="estimated-value">
                        ≈ {estimatedReward.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} MOVE
                    </div>
                </div>
            </div>

            {/* 3. CLAIM ACTION CARD */}
            <div className="reward-card action-card">
                <div className="card-label">CLAIM REWARD</div>
                
                {!isClaimWindowActive ? (
                    <div className="locked-state">
                        <div className="lock-icon">🔒</div>
                        <h3>{isSeasonOver ? 'WAITING FOR CLAIM WINDOW' : 'POOL LOCKED'}</h3>
                        <p>{isSeasonOver ? 'Admin will open the claim window soon. Check back later!' : 'Rewards distribute when the season ends and claim window opens.'}</p>
                        <button className="claim-btn disabled" disabled>
                            {isSeasonOver ? 'CLAIM WINDOW NOT OPEN' : 'SEASON IN PROGRESS'}
                        </button>
                    </div>
                ) : (
                    <div className="unlocked-state">
                        <div className="unlock-icon">🔓</div>
                        <h3>CLAIMS OPEN</h3>
                        <p className="claim-deadline">Claim before: {claimEndDate}</p>
                        
                        {!connected ? (
                          <button className="claim-btn active" onClick={handleConnect} disabled={!wallets || wallets.length === 0}>
                            {wallets && wallets.length > 0 ? 'CONNECT WALLET' : 'NO WALLET FOUND'}
                          </button>
                        ) : userXp > 0 ? (
                            <>
                                <p>You are eligible to claim your share!</p>
                                <button 
                                    className="claim-btn active" 
                                    onClick={handleClaim}
                                    disabled={loading}
                                >
                                    {loading ? "PROCESSING..." : "🎁 CLAIM TOKENS"}
                                </button>
                            </>
                        ) : (
                            <>
                                <p>No unclaimed XP found. You may have already claimed or did not participate this season.</p>
                                <button className="claim-btn disabled" disabled>NOTHING TO CLAIM</button>
                            </>
                        )}

                        {/* STATUS MESSAGES */}
                        {claimStatus === 'success' && (
                            <div className="success-msg">
                                ✅ {claimMessage}
                                {txHash && <a href={`https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`} target="_blank" rel="noreferrer" style={{display:'block', fontSize:'0.8rem', color:'var(--success)', marginTop:'5px'}}>View Transaction</a>}
                            </div>
                        )}
                        {claimStatus === 'error' && (
                            <div className="error-msg">❌ {claimMessage}</div>
                        )}
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  )
}

export default Reward