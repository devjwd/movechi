import { useState, useEffect, useRef, useCallback } from 'react'
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Aptos } from "@aptos-labs/ts-sdk"
import { getAptosConfig } from './config/network'
import { normalizeAddress } from './utils/addressUtils'
import { logger } from './utils/logger'
import { GAME_CONFIG } from './constants/gameConfig'
import { generateTwitterShareUrl } from './utils/shareUtils'
import Header from './components/Header'
import TxToast from './components/TxToast'
import './App.css'

// --- CONFIGURATION ---
const aptosClient = new Aptos(getAptosConfig())
const rawContract = import.meta.env.VITE_CONTRACT_ADDRESS || "0xfb232241c37c2006ccfd2d36a0ac18f8baff7fa06a3336ba88cfebcfc7a54ac3"
const CONTRACT_ADDRESS = normalizeAddress(rawContract)
const MODULE_NAME = import.meta.env.VITE_MODULE_NAME || "main"

// --- VISUAL PRIZES (6 Segments, 3 Logical Outcomes) ---
const prizes = [
  { icon: '/movement-logo.svg', name: 'JACKPOT', color: '#d4c4a0', type: 'image', rewardType: 'JACKPOT' }, 
  { icon: '/ticket-icon.png', name: 'RAFFLE TICKET', color: '#d4c4a0', type: 'image', rewardType: 'TICKET' }, 
  { icon: '/xp.svg', name: 'XP BONUS', color: '#c9b890', type: 'image', rewardType: 'XP' }, 
  { icon: '/movement-logo.svg', name: 'JACKPOT', color: '#d4c4a0', type: 'image', rewardType: 'JACKPOT' }, 
  { icon: '/ticket-icon.png', name: 'RAFFLE TICKET', color: '#d4c4a0', type: 'image', rewardType: 'TICKET' }, 
  { icon: '/xp.svg', name: 'XP BONUS', color: '#c9b890', type: 'image', rewardType: 'XP' }, 
]

function App() {
  // --- STATE ---
  const [moveBalance, setMoveBalance] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [effectsEnabled, setEffectsEnabled] = useState(() => {
    try {
      const v = localStorage.getItem('effectsEnabled')
      return v === null ? true : v === 'true'
    } catch { return true }
  })
  const [isMobile, setIsMobile] = useState(false)
  
  // Timers
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 }) // Season End
  const [resetTimer, setResetTimer] = useState("") // Daily Reset
  
  const [showWalletDropdown, setShowWalletDropdown] = useState(false)
  
  const [quickPopup, setQuickPopup] = useState(null)
  const [userStats, setUserStats] = useState({ xp: 0, tickets: 0, paidSpinsToday: 0, freeSpinsToday: 0, spinsUsedToday: 0, stakedCount: 0 })
  const [streak, setStreak] = useState(0)
  const [showStreakTooltip, setShowStreakTooltip] = useState(false)
  const [spinHistory, setSpinHistory] = useState([])
  
  // Messages
  const [txStatus, setTxStatus] = useState(null)
  const [winMessage, setWinMessage] = useState(null) // "Honest work" etc.
  
  // Transaction Toast
  const [confirmedTxHash, setConfirmedTxHash] = useState(null)

    const [seasonData, setSeasonData] = useState({
      active: true,
      paused: false,
      end: 0,
      cost: 1, 
      ticketsSold: 0,
      poolValue: 0,
      globalXP: 0,
      seasonId: 0,
      maxPaidDaily: 0
    })
  
  const wheelRef = useRef(null)
  const spinSoundRef = useRef(null)
  const winSoundRef = useRef(null)
  const xpSoundRef = useRef(null)
  const ticketSoundRef = useRef(null)
  const { connect, disconnect, connected, account, wallets, signAndSubmitTransaction } = useWallet()

  // --- WALLET & BALANCE ---
  const fetchBalance = useCallback(async (forceRefresh = false) => {
    if (connected && account?.address) {
      try {
        const resource = await aptosClient.getAccountCoinAmount({
          accountAddress: account.address.toString(),
          coinType: "0x1::aptos_coin::AptosCoin"
        })
        const balance = Number(resource) / 100000000
        setMoveBalance(balance)
      } catch (error) {
        logger.error('fetchBalance error:', error)
      }
    } else {
      setMoveBalance(0)
    }
  }, [connected, account])

  // --- DATA FETCHING ---
  const fetchUserStats = useCallback(async (forceRefresh = false) => {
    if (!connected || !account?.address) {
      logger.debug('fetchUserStats: Not connected or no account')
      return
    }
    try {
      const resourceType = `${CONTRACT_ADDRESS}::${MODULE_NAME}::UserProfile`
      logger.debug('Fetching user stats for:', account.address.toString(), resourceType)
      
      try {
        const resource = await aptosClient.getAccountResource({
          accountAddress: account.address.toString(),
          resourceType: resourceType
        })

        const p = (resource?.data?.data ?? resource?.data ?? resource) || {}
        logger.debug('UserProfile data received:', p)
        
        const lastPlayedRaw = p.last_day_played ?? p.last_played_day ?? 0
        let paid = Number(p.paid_spins_today || 0)
        let free = Number(p.free_spins_today || 0)
        const tickets = Number(p.tickets || 0)
        const stakedCount = Array.isArray(p.staked_nfts) ? p.staked_nfts.length : Number(p.staked_nfts_count || 0)

        // Locally reset daily counters if the on-chain profile day is behind current UTC day
        try {
          const currentDay = Math.floor(Date.now() / 1000 / 86400)
          let lastDay = 0
          if (typeof lastPlayedRaw === 'string') {
            lastDay = Number(BigInt(lastPlayedRaw))
          } else {
            lastDay = Number(lastPlayedRaw || 0)
          }
          if (lastDay < currentDay) {
            paid = 0
            free = 0
          }
        } catch (e) {
          logger.warn('Daily reset calc failed, keeping on-chain counts', e)
        }
        
        let xp = 0
        try {
          const xpRaw = p.accumulated_xp || 0
          if (typeof xpRaw === 'string') {
            xp = Number(BigInt(xpRaw))
          } else {
            xp = Number(xpRaw)
          }
        } catch (e) {
          logger.error('XP parse error', e)
          xp = Number(p.accumulated_xp || 0)
        }

        const stats = { xp, tickets, paidSpinsToday: paid, freeSpinsToday: free, spinsUsedToday: paid + free, stakedCount }
        logger.debug('User Stats Updated:', stats)
        setUserStats(stats)
        return stats
      } catch (e) {
        // 404 is expected if user has never interacted
        if (e?.status === 404 || e?.message?.includes('404') || e?.message?.includes('not found')) {
          logger.debug('UserProfile not found (new user)')
          setUserStats({ xp: 0, tickets: 0, paidSpinsToday: 0, freeSpinsToday: 0, spinsUsedToday: 0, stakedCount: 0 })
          return
        }
        throw e
      }
    } catch (error) {
      logger.error('fetchUserStats error', error)
      logger.error('Account: ' + account?.address)
      logger.error('Contract: ' + CONTRACT_ADDRESS)
    }
    return null
  }, [connected, account])

  const fetchGlobalStats = useCallback(async (forceRefresh = false) => {
    try {
      const resourceType = `${CONTRACT_ADDRESS}::${MODULE_NAME}::GameState`
      logger.debug('Fetching global stats from:', CONTRACT_ADDRESS, resourceType)
      
      const resource = await aptosClient.getAccountResource({
        accountAddress: CONTRACT_ADDRESS,
        resourceType: resourceType
      })

      const data = resource?.data?.data ?? resource?.data ?? resource
      logger.debug('GameState data received:', data)

      const seasonEndTimestamp = Number(data.season_end_time || 0)
      const globalXP = Number(data.total_global_xp || 0)
      const seasonId = Number(data.current_season_id || 0)
        
      let poolValue = 0
      try {
        const seasonalCapAddr = data.seasonal_cap?.account
        if (seasonalCapAddr) {
          const balance = await aptosClient.getAccountCoinAmount({
            accountAddress: seasonalCapAddr,
            coinType: "0x1::aptos_coin::AptosCoin"
          })
          poolValue = Number(balance) / 100000000
        }
      } catch (e) {
          logger.warn('Error fetching pool balance:', e)
      }
        
      setSeasonData({
        active: !!data.season_started,
        paused: !!data.paused,
        end: seasonEndTimestamp,
        cost: Number(data.config?.cost_per_spin || 0) / 100000000,
        ticketsSold: Number(data.total_tickets || 0),
        poolValue,
        globalXP,
        seasonId,
        maxPaidDaily: Number(data.config?.max_paid_spins_daily || 0)
      })
      logger.debug('Global stats updated:', { active: !!data.season_started, paused: !!data.paused, poolValue, globalXP })
    } catch (error) {
      logger.error("Error fetching game stats:", error)
      logger.error("Contract address:", CONTRACT_ADDRESS)
      logger.error("Module name:", MODULE_NAME)
      // Set default values on error to prevent UI from breaking
      setSeasonData(prev => ({
        ...prev,
        active: false,
        paused: true
      }))
    }
  }, [])


  const updateStreak = useCallback((address) => {
    try {
      const n = normalizeAddress(address)
      // Get current UTC day (resets at 00:00 UTC)
      const now = new Date()
      const today = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000)
      const key = `streak_${n}`
      const stored = localStorage.getItem(key)
      let newStreak = 1
      if (stored) {
        const data = JSON.parse(stored)
        const lastDay = data.lastDay || 0
        if (today === lastDay) {
          newStreak = data.streak || 1
        } else if (today === lastDay + 1) {
          newStreak = (data.streak || 0) + 1
        }
      }
      localStorage.setItem(key, JSON.stringify({ streak: newStreak, lastDay: today }))
      setStreak(newStreak)
      // Dispatch custom event to notify Header component
      window.dispatchEvent(new CustomEvent('streakUpdated', { detail: { address: n, streak: newStreak } }))
    } catch {}
  }, [])

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

  const saveSpinToHistory = useCallback((address, prize, amount, isFree) => {
    try {
      const n = normalizeAddress(address)
      const key = `spin_history_${n}`
      const stored = localStorage.getItem(key)
      const history = stored ? JSON.parse(stored) : []
      const newSpin = { prize, amount, isFree, timestamp: Date.now() }
      history.unshift(newSpin)
      if (history.length > 10) history.pop()
      localStorage.setItem(key, JSON.stringify(history))
      setSpinHistory(history)
      // Dispatch custom event to notify Header component
      window.dispatchEvent(new CustomEvent('spinHistoryUpdated', { detail: { address: n, history } }))
    } catch {}
  }, [])

  const loadSpinHistory = useCallback((address) => {
    try {
      const n = normalizeAddress(address)
      const key = `spin_history_${n}`
      const stored = localStorage.getItem(key)
      setSpinHistory(stored ? JSON.parse(stored) : [])
    } catch {
      setSpinHistory([])
    }
  }, [])

  useEffect(() => {
    try {
      spinSoundRef.current = new Audio('/spin-sound.mp3')
      spinSoundRef.current.volume = 0.45
      winSoundRef.current = new Audio('/win.mp3')
      winSoundRef.current.volume = 0.6
      xpSoundRef.current = new Audio('/xp.mp3')
      xpSoundRef.current.volume = 0.6
      ticketSoundRef.current = new Audio('/ticket.mp3')
      ticketSoundRef.current.volume = 0.6
    } catch {}
  }, [])

  useEffect(() => {
    // detect mobile for particle reduction
    try {
      const mm = window.matchMedia('(max-width: 600px)')
      const ua = navigator?.userAgent || ''
      setIsMobile(mm.matches || /Mobi|Android/i.test(ua))
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('effectsEnabled', String(effectsEnabled)) } catch {}
  }, [effectsEnabled])

  const particleCount = effectsEnabled ? (isMobile ? 12 : 28) : 0

  // Immediate fetch on wallet connect, then poll every 5s for fresh data
  useEffect(() => {
    fetchGlobalStats(true)
    if(connected && account?.address) {
        fetchBalance(true)
        fetchUserStats(true)
        loadStreak(account.address.toString())
        loadSpinHistory(account.address.toString())
    } else {
        setStreak(0)
        setSpinHistory([])
    }
    const interval = setInterval(() => {
      if(connected && account?.address) {
        fetchBalance(false)
        fetchUserStats(false)
      }
      fetchGlobalStats(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [connected, account, fetchBalance, fetchUserStats, fetchGlobalStats, loadStreak, loadSpinHistory])

  // --- TIMERS ---
  useEffect(() => {
    let isActive = true
    
    const timer = setInterval(() => {
      if (!isActive) return
      
      const now = new Date()
      const nowTs = Math.floor(now.getTime() / 1000)

      // 1. Season Countdown
      if (seasonData.end > 0) {
        const diff = seasonData.end - nowTs
        if (diff > 0) {
          setCountdown({ 
            days: Math.floor(diff / 86400),
            hours: Math.floor((diff % 86400) / 3600), 
            minutes: Math.floor((diff % 3600) / 60), 
            seconds: diff % 60 
          })
        } else {
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        }
      }

      // 2. Daily Reset Timer (UTC Midnight)
      const midnight = new Date(now)
      midnight.setUTCHours(24, 0, 0, 0)
      const resetDiff = midnight - now
      const rh = Math.floor(resetDiff / 3600000)
      const rm = Math.floor((resetDiff % 3600000) / 60000)
      setResetTimer(`${rh}h ${rm}m`)

    }, 1000)
    
    return () => {
      isActive = false
      clearInterval(timer)
    }
  }, [seasonData.end])

  // --- GAMEPLAY LOGIC ---
  const spinWheelToResult = (targetRewardType, amount, rollResult, wasFree = false) => {
    // Pick deterministic index for the reward type (first match) so the pointer aligns
    const prizeIndex = prizes.findIndex(p => p.rewardType === targetRewardType)
    if (prizeIndex === -1) { setIsSpinning(false); return; }

    const segmentAngle = 360 / prizes.length 
    // Pointer is at 0 deg (top); aim at center of the segment
    const targetAngle = 360 - (prizeIndex * segmentAngle) - (segmentAngle / 2)
    const extraSpins = 5 * 360
    
    const currentRotationMod = rotation % 360
    const newRotation = rotation + (360 - currentRotationMod) + extraSpins + targetAngle

    try {
      spinSoundRef.current?.pause()
      if (spinSoundRef.current) spinSoundRef.current.currentTime = 0
      spinSoundRef.current?.play().catch(() => {})
    } catch {}

    setRotation(newRotation)

    // Result after animation
    setTimeout(() => {
      setIsSpinning(false)
      const prizeData = prizes[prizeIndex]
      
      let displayAmount = amount
      let message = ""

      if (targetRewardType === 'JACKPOT') {
          displayAmount = (amount / 100000000).toFixed(2) + " MOVE"
          message = "JACKPOT! You won big!"
      } else if (targetRewardType === 'XP') {
          displayAmount = amount + " XP"
          message = "Experience Gained"
      } else if (targetRewardType === 'TICKET') {
          displayAmount = "+" + amount + " Ticket"
          message = "Raffle Entry Secured"
      }

      const resultObj = { ...prizeData, displayAmount, roll: rollResult }

      // Set Win Message
      setWinMessage(message)
      // Clear win message after 5 seconds
      setTimeout(() => setWinMessage(null), 5000)

      // Save to history
      if (connected && account?.address) {
        saveSpinToHistory(account.address.toString(), targetRewardType, displayAmount, wasFree)
      }

      if (targetRewardType === 'JACKPOT') {
        try {
          winSoundRef.current?.pause()
          winSoundRef.current && (winSoundRef.current.currentTime = 0)
          winSoundRef.current?.play().catch(() => {})
        } catch {}
        setResult(resultObj)
      } else {
        // Play specific sounds for non-jackpot rewards
        try {
          if (targetRewardType === 'XP') {
            xpSoundRef.current?.pause()
            xpSoundRef.current && (xpSoundRef.current.currentTime = 0)
            xpSoundRef.current?.play().catch(() => {})
          } else if (targetRewardType === 'TICKET') {
            ticketSoundRef.current?.pause()
            ticketSoundRef.current && (ticketSoundRef.current.currentTime = 0)
            ticketSoundRef.current?.play().catch(() => {})
          }
        } catch {}

        setQuickPopup(resultObj)
        setTimeout(() => setQuickPopup(null), 4000)
      }
    }, 6000) 
  }

  const processTransactionResult = async (hash, wasFree = false) => {
    const maxRetries = 5
    let attempt = 0
    
    const attemptFetch = async () => {
      attempt++
      try {
        setTxStatus(`Confirming transaction (attempt ${attempt}/${maxRetries})...`)
        const txDetails = await aptosClient.waitForTransaction({ 
          transactionHash: hash,
          options: { timeoutSecs: 30 }
        })

        let finalRewardType = 'XP'
        let finalAmount = 100
        let rollResult = 99

        if (txDetails.events) {
            const ev = txDetails.events.find(e => e.type.includes(`${MODULE_NAME}::GameEvent`))
            if (ev && ev.data) {
                const eventType = parseInt(ev.data.event_type)
                const amount = parseInt(ev.data.amount)
                rollResult = parseInt(ev.data.meta)

                // event_type: 1=XP/Ticket, 2=Jackpot
                if (eventType === 2) { finalRewardType = 'JACKPOT'; finalAmount = amount } 
                else if (amount === 0) { finalRewardType = 'TICKET'; finalAmount = 1 } 
                else { finalRewardType = 'XP'; finalAmount = amount }
            }
        }
        
        spinWheelToResult(finalRewardType, finalAmount, rollResult, wasFree)
        
        // Show transaction toast
        setConfirmedTxHash(hash)
        
        // Force immediate refresh of on-chain state after transaction confirmation
        setTxStatus('Syncing state...')
        await Promise.all([
          fetchUserStats(true),
          fetchBalance(true),
          fetchGlobalStats(true)
        ])
        
        setTxStatus(null)
        
        // Update streak
        if (connected && account?.address) {
          updateStreak(account.address.toString())
        }
      } catch (e) {
        logger.error(`Fetch attempt ${attempt} failed:`, e)
        
        if (attempt < maxRetries) {
          // Retry with exponential backoff (100ms * attempt)
          await new Promise(r => setTimeout(r, 100 * attempt))
          return attemptFetch()
        } else {
          setIsSpinning(false)
          setTxStatus(null)
          setWinMessage("Transaction confirmed. Refreshing your rewards...")
          setTimeout(() => setWinMessage(null), 4000)
          
          // Force refresh even on failure
          try {
            await Promise.all([
              fetchUserStats(true),
              fetchBalance(true),
              fetchGlobalStats(true)
            ])
          } catch (err) {
            logger.error('Force refresh failed:', err)
          }
        }
      }
    }
    
    return attemptFetch()
  }

  const handleSpin = async () => {
    const isSeasonEnded = seasonData.end > 0 && Math.floor(Date.now() / 1000) >= seasonData.end

    if (isSpinning || !connected) {
        return
    }
    if (isSeasonEnded) {
      setWinMessage("Season ended")
      setTimeout(() => setWinMessage(null), 3000)
      return
    }
    if (!seasonData.active) {
        setWinMessage("Season not active yet 🛑")
        setTimeout(() => setWinMessage(null), 3000)
        return
    }
    if (seasonData.paused) {
        setWinMessage("Game paused by admin 🛑")
        setTimeout(() => setWinMessage(null), 3000)
        return
    }

    // Check if user has any spins remaining
    const stakedCount = Number(userStats?.stakedCount || 0)
    const usedPaid = Number(userStats?.paidSpinsToday || 0)
    const usedFree = Number(userStats?.freeSpinsToday || 0)
    const maxPaid = Number(seasonData?.maxPaidDaily || 0)
    const allowedFree = stakedCount >= 10 ? 3 : (stakedCount >= 5 ? 2 : (stakedCount >= 1 ? 1 : 0))
    const remainingPaid = Math.max(0, maxPaid - usedPaid)
    const remainingFree = Math.max(0, allowedFree - usedFree)
    
    if (remainingPaid === 0 && remainingFree === 0) {
        setWinMessage("Daily limit reached! Come back in " + resetTimer)
        setTimeout(() => setWinMessage(null), 5000)
        return
    }

    // Refresh user stats to get an up-to-date free spin count before choosing free vs paid
    try {
      await fetchUserStats(true)
    } catch (e) { /* ignore */ }

    setIsSpinning(true)
    setTxStatus('Confirm in Wallet...')
    setWinMessage(null)

    const tryFree = async () => {
      const payload = {
        data: {
          function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::spin_free_staker`,
          typeArguments: [],
          functionArguments: [],
        },
      }
      const response = await signAndSubmitTransaction(payload)
      return response.hash
    }

    const tryPaid = async () => {
      if (moveBalance < seasonData.cost) {
        throw new Error('INSUFFICIENT_BALANCE')
      }
      const payload = {
        data: {
          function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::spin_paid`,
          typeArguments: [],
          functionArguments: [],
        },
      }
      const response = await signAndSubmitTransaction(payload)
      return response.hash
    }

    try {
      let hash = null
      let wasFree = false

      // Compute remaining free spins from the freshest `userStats` state
      const stakedCount = Number(userStats?.stakedCount || 0)
      const usedFree = Number(userStats?.freeSpinsToday || 0)
      const allowedFree = stakedCount >= 10 ? 3 : (stakedCount >= 5 ? 2 : (stakedCount >= 1 ? 1 : 0))
      const remainingFree = Math.max(0, allowedFree - usedFree)
      const shouldTryFree = remainingFree > 0

      if (shouldTryFree) {
        try {
          hash = await tryFree()
          wasFree = true
        } catch (errorFree) {
          const errMsg = errorFree?.message || ''
          // 201 = free limit reached, 202 = no staked NFTs
          const isFreeLimit = errMsg.includes('201')
          const isNoStake = errMsg.includes('202')
          if (!isFreeLimit && !isNoStake) {
            throw errorFree
          }
          // fallback to paid spin if possible
          hash = await tryPaid()
          wasFree = false
        }
      } else {
        // No staked NFTs -> go straight to paid spin
        hash = await tryPaid()
        wasFree = false
      }

      setTxStatus('Spinning...')
      processTransactionResult(hash, wasFree)
    } catch (error) {
      logger.error('Spin failed:', error)
      setIsSpinning(false)
      setTxStatus(null)
      const errMsg = error?.message || ''
      if (errMsg.includes('INSUFFICIENT_BALANCE')) {
        setWinMessage('Low Balance: Need 1 MOVE')
      } else if (errMsg.includes('201')) {
        setWinMessage('Daily free spin limit reached! 🛑')
      } else if (errMsg.includes('202')) {
        setWinMessage('Stake an NFT to unlock free spins 🛑')
      } else if (errMsg.includes('400')) {
        setWinMessage('Sponsor wallet empty - contact admin')
      } else {
        setWinMessage('Transaction Failed ❌')
      }
      setTimeout(() => setWinMessage(null), 3000)
    }
  }

  // --- RENDER HELPERS ---
  const getStatusContent = () => {
    const isSeasonEnded = seasonData.end > 0 && Math.floor(Date.now() / 1000) >= seasonData.end

    if (txStatus) return <span className="status-pulse">{txStatus}</span>
    if (winMessage) return <span className="status-highlight">{winMessage}</span>
    if (!connected) return <span>Connect Wallet to Play</span>
    if (isSeasonEnded) return <span className="status-error">Season ended</span>
    if (seasonData.paused) return <span className="status-error">Game paused by admin</span>
    if (!seasonData.active) return <span className="status-error">Season not active</span>

    const usedPaid = Number(userStats?.paidSpinsToday || 0)
    const usedFree = Number(userStats?.freeSpinsToday || 0)
    const stakedCount = Number(userStats?.stakedCount || 0)

    const maxPaid = Number(seasonData?.maxPaidDaily || 0)
    const remainingPaid = Math.max(0, maxPaid - usedPaid)

    // Determine allowed free spins based on staked count (matches on-chain logic)
    const allowedFree = stakedCount >= 10 ? 3 : (stakedCount >= 5 ? 2 : (stakedCount >= 1 ? 1 : 0))
    const remainingFree = Math.max(0, allowedFree - usedFree)

    // Debug: log computed values to help troubleshoot why timer is shown
    logger.debug('Status calc:', { usedPaid, usedFree, stakedCount, maxPaid, remainingPaid, allowedFree, remainingFree, resetTimer })

    // Show remaining counts while either paid or free remaining are > 0, otherwise show reset timer.
    if (remainingPaid > 0 || remainingFree > 0) {
      return (
        <span>
          Free: <span className="status-mono">{remainingFree}</span> &nbsp;|&nbsp; Paid: <span className="status-mono">{remainingPaid}</span>
        </span>
      )
    }

    if (moveBalance < seasonData.cost) return <span className="status-error">Low Balance: Need {seasonData.cost} MOVE (free spin will auto-apply if available)</span>

    return <span>Daily Limit Resets in: <span className="status-mono">{resetTimer}</span></span>
  }

  const formatAddress = (address) => address ? `${address.toString().slice(0, 6)}...${address.toString().slice(-4)}` : ''
  const formatTime = (num) => String(num).padStart(2, '0')
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
  const handleDisconnect = async () => { try { await disconnect(); setShowWalletDropdown(false) } catch (e) {} }

  return (
    <div className="app">
      <Header activePage="spin" />

      <main className="main-content">
        <h1 className="page-title">SPIN & WIN</h1>

        <div className="content-grid">
          <div className="left-panel">
            <div className="panel-box">
              <div className="stats-row">
                <div className="stat-item">
                  <div className="stat-label">YOUR BALANCE</div>
                  <div className="stat-value-group">
                    {!connected ? '--' : (
                      <>
                        <span className="val-move">{moveBalance.toFixed(2)} MOVE</span>
                        <span className="val-xp">{userStats.xp.toLocaleString()} XP</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">SEASON ENDS IN</div>
                  <div className="countdown-value">
                    {formatTime(countdown.days)}:{formatTime(countdown.hours)}:{formatTime(countdown.minutes)}:{formatTime(countdown.seconds)}
                  </div>
                </div>
              </div>
            </div>

            <div className="prize-card seasonal-reward-card">
              <div className="seasonal-grand-prize">
                <div className="seasonal-prize-image">
                  <img src="/coins.png" alt="Prize Pool" />
                </div>
                <div className="seasonal-prize-info">
                  <h3 className="seasonal-prize-title">SEASONAL GRAND PRIZE</h3>
                  <p className="seasonal-prize-desc">At the conclusion of the season, one winner will be automatically selected to claim the entire prize pool.</p>
                  <div className="seasonal-prize-stats">
                    <div className="seasonal-stat">
                      <div className="seasonal-stat-label">Prize Pool</div>
                      <div className="seasonal-stat-value">{seasonData.poolValue.toLocaleString(undefined, {maximumFractionDigits: 0})} Move</div>
                    </div>
                    <div className="seasonal-stat">
                      <div className="seasonal-stat-label">All Tickets</div>
                      <div className="seasonal-stat-value">{seasonData.ticketsSold.toLocaleString()}</div>
                    </div>
                    <div className="seasonal-stat">
                      <div className="seasonal-stat-label">Your Tickets</div>
                      <div className="seasonal-stat-value">{userStats.tickets}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="right-panel">
            <div className="wheel-container">
              <div className="spin-cost-label">{seasonData.cost} MOVE / SPIN</div>
              <div className="spin-wheel">
                <div className="wheel-pointer"></div>
                <div ref={wheelRef} className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>
                  {prizes.map((prize, index) => {
                    const segmentAngle = 360 / prizes.length
                    const angle = (index * segmentAngle) + (segmentAngle / 2)
                    // Use percentage-based positioning for responsiveness
                    const radiusPercent = 30 // 30% from center
                    const xPercent = 50 + radiusPercent * Math.cos((angle - 90) * Math.PI / 180)
                    const yPercent = 50 + radiusPercent * Math.sin((angle - 90) * Math.PI / 180)
                    
                    return (
                      <div key={index} className="segment-icon" style={{
                          position: 'absolute', 
                          left: `${xPercent}%`, 
                          top: `${yPercent}%`,
                          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                          width: '11%', 
                          height: '11%', 
                          display: 'flex', 
                          alignItems: 'center',
                          justifyContent: 'center', 
                          fontSize: prize.type === 'text' ? '1.5rem' : '2rem',
                          color: '#fff', 
                          fontWeight: 'bold', 
                          zIndex: 5, 
                          textAlign: 'center',
                          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}
                      >
                        {prize.type === 'image' ? (
                          <img src={prize.icon} alt={prize.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : prize.icon}
                      </div>
                    )
                  })}
                </div>
                {(() => {
                  const isSeasonEnded = seasonData.end > 0 && Math.floor(Date.now() / 1000) >= seasonData.end
                  const stakedCount = Number(userStats?.stakedCount || 0)
                  const usedPaid = Number(userStats?.paidSpinsToday || 0)
                  const usedFree = Number(userStats?.freeSpinsToday || 0)
                  const maxPaid = Number(seasonData?.maxPaidDaily || 0)
                  const allowedFree = stakedCount >= 10 ? 3 : (stakedCount >= 5 ? 2 : (stakedCount >= 1 ? 1 : 0))
                  const remainingPaid = Math.max(0, maxPaid - usedPaid)
                  const remainingFree = Math.max(0, allowedFree - usedFree)
                  const canSpinNow = (remainingPaid > 0 || remainingFree > 0) && !isSpinning && connected && seasonData.active && !isSeasonEnded
                  const isDisabled = isSpinning || !connected || (remainingPaid === 0 && remainingFree === 0) || !seasonData.active || isSeasonEnded
                  
                  return (
                    <div className={`wheel-center ${canSpinNow ? 'can-spin' : ''}`} onClick={handleSpin} style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: (!seasonData.active || isSeasonEnded) ? 0.5 : 1 }}>
                      <span>{isSpinning ? "..." : (connected ? "SPIN" : "CONNECT")}</span>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* NEW STATUS BOX REPLACING OLD TEXT */}
            <div className="status-box">
               {getStatusContent()}
            </div>

            
            
            <div className="free-spin-hint" style={{textAlign:'center', marginTop:'0.5rem'}}>
              Stake NFTs to unlock 1-3 free daily spins!
            </div>
          </div>
        </div>
      </main>

      {result && (
        <div className="result-modal" onClick={() => setResult(null)}>
          <div className="result-content" onClick={e => e.stopPropagation()}>
            {/* Particle effect removed; rays kept */}
            <div className="result-icon-wrap">
              {/* Animated sunburst/rays behind token */}
              {effectsEnabled && <div className="result-rays" aria-hidden="true"></div>}
              <div className="result-orbit"></div>
              <div className="result-burst"></div>
              <div className="result-icon-lg"><img src={result.icon} alt={result.name} /></div>
            </div>
            <h2>JACKPOT!</h2>
            <p className="win-amount">{result.displayAmount}</p>
            <div className="result-actions">
              {(() => {
                const shareData = generateTwitterShareUrl(result.displayAmount)
                return (
                  <a className="share-btn" href={shareData.url} target="_blank" rel="noreferrer" title={`Share your ${result.displayAmount} jackpot win`}> 
                    Share on X
                  </a>
                )
              })()}
              <button className="modal-primary-btn" onClick={() => setResult(null)}>Back</button>
            </div>
          </div>
        </div>
      )}
      
      {quickPopup && (
        <div className="quick-popup">
          <div className="quick-popup-content">
             {/* Splash particles effect */}
             <div className="popup-particles">
               {[...Array(12)].map((_, i) => {
                 const angle = (i / 12) * Math.PI * 2;
                 const distance = 80 + Math.random() * 40;
                 const tx = Math.cos(angle) * distance;
                 const ty = Math.sin(angle) * distance;
                 return (
                   <div 
                     key={i} 
                     className="particle"
                     style={{
                       '--tx': `${tx}px`,
                       '--ty': `${ty}px`,
                       left: '50%',
                       top: '50%',
                       animationDelay: `${i * 0.05}s`,
                       background: quickPopup.rewardType === 'XP' ? '#c9b890' : '#d4c4a0'
                     }}
                   />
                 );
               })}
             </div>
             <div className="popup-icon">
                {quickPopup.type === 'image' ? <img src={quickPopup.icon}/> : quickPopup.icon}
             </div>
             <div className="popup-text">
                 <span className="popup-amount">{quickPopup.displayAmount}</span>
                 <span className="popup-msg">{winMessage}</span>
             </div>
          </div>
        </div>
      )}
      
      {/* Transaction Toast */}
      {confirmedTxHash && (
        <TxToast 
          txHash={confirmedTxHash}
          message="Spin Confirmed!"
          onClose={() => setConfirmedTxHash(null)}
          duration={8000}
        />
      )}
    </div>
  )
}

export default App
