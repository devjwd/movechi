/**
 * useLeaderboardIndexer.js
 * 
 * React hook for leaderboard state management using LeaderboardIndexer service.
 * Handles data fetching, caching, countdown timer, and real-time updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Aptos } from "@aptos-labs/ts-sdk"
import { getAptosConfig } from '../config/network'
import { LeaderboardIndexer } from '../services/leaderboardIndexer'

const normalizeAddr = (a) => {
  if (!a) return ''
  const s = a.toString()
  if (!s.startsWith('0x')) return s.toLowerCase()
  const hex = s.slice(2).replace(/^0+/, '')
  return `0x${hex.toLowerCase()}`
}

export function useLeaderboardIndexer(testAddresses = []) {
  const indexerRef = useRef(null)
  const [gameState, setGameState] = useState({
    seasonId: 1,
    seasonEndTime: 0,
    totalGlobalXP: 0n,
    rewardCap: 0n,
  })
  const [leaderboard, setLeaderboard] = useState([])
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [playerStats, setPlayerStats] = useState(null)
  const [playerRank, setPlayerRank] = useState(null)
  const [globalStats, setGlobalStats] = useState(null)
  const [sortBy, setSortBy] = useState('xp')
  const [usingCache, setUsingCache] = useState(false)
  const countdownIntervalRef = useRef(null)

  // Initialize indexer once
  useEffect(() => {
    if (!indexerRef.current) {
      const aptosClient = new Aptos(getAptosConfig())
      const contractAddr = normalizeAddr(import.meta.env.VITE_CONTRACT_ADDRESS)
      const moduleName = import.meta.env.VITE_MODULE_NAME || 'main'
      
      indexerRef.current = new LeaderboardIndexer(aptosClient, contractAddr, moduleName)
    }
  }, [])

  // Load cached leaderboard data (fast, instant display)
  const loadCachedData = useCallback(async () => {
    try {
      const response = await fetch('/leaderboard-cache.json')
      if (!response.ok) return null
      
      const cache = await response.json()
      
      // Check if cache is recent (less than 2 minutes old)
      const cacheAge = Date.now() - cache.lastSync
      if (cacheAge > 120000) {
        console.warn('Cache is stale (>2min old), will refresh from chain')
        return null
      }

      console.log(`✅ Loaded cached leaderboard (${cache.players.length} players, ${Math.floor(cacheAge / 1000)}s old)`)
      
      // Map cached data to expected format
      const mappedPlayers = cache.players.map(p => ({
        address: p.address,
        displayAddr: p.displayAddr,
        rank: p.rank,
        xp: p.xpNumber,
        spins: p.nonce,
        winnings: p.winnings,
        tickets: p.tickets,
        stakedNfts: p.stakedNfts,
        lastDayPlayed: p.lastDayPlayed,
      }))

      setLeaderboard(mappedPlayers)
      setGlobalStats(cache.metadata)
      setUsingCache(true)
      
      if (cache.gameState) {
        setGameState({
          seasonId: cache.gameState.seasonId,
          seasonEndTime: cache.gameState.seasonEndTime || 0,
          totalGlobalXP: BigInt(cache.gameState.totalGlobalXP || 0),
          rewardCap: 0n,
        })
      }

      return cache
    } catch (error) {
      console.log('No cache available, will fetch from chain')
      return null
    }
  }, [])

  // Fetch leaderboard data (from chain)
  const fetchLeaderboard = useCallback(async (skipCache = false) => {
    if (!indexerRef.current) return

    try {
      setLoading(true)
      setError(null)
      setUsingCache(false)

      // Fetch leaderboard
      const leaderboardData = await indexerRef.current.fetchLeaderboard(testAddresses)
      setLeaderboard(leaderboardData)

      // Fetch game state (for season info, countdown)
      const gameStateData = await indexerRef.current.gameStateCache.fetch()
      setGameState(gameStateData)

      // Get global stats
      const globalStatsData = indexerRef.current.getGlobalStats()
      setGlobalStats(globalStatsData)

      // Sort leaderboard
      const sorted = indexerRef.current.getLeaderboard(sortBy, 100)
      setLeaderboard(sorted)
      
      console.log('✅ Fetched fresh data from blockchain')
    } catch (err) {
      console.error('useLeaderboardIndexer: fetchLeaderboard error:', err)
      setError(err.message || 'Failed to fetch leaderboard')
    } finally {
      setLoading(false)
    }
  }, [sortBy, testAddresses])

  // Initial load: try cache first, then fetch from chain
  useEffect(() => {
    const initialLoad = async () => {
      // Try loading from cache first for instant display
      const cachedData = await loadCachedData()
      
      if (!cachedData) {
        // No cache or cache is stale, fetch from chain
        await fetchLeaderboard()
      } else {
        // Cache loaded successfully, refresh from chain in background
        setTimeout(() => {
          fetchLeaderboard()
        }, 2000) // Refresh after 2 seconds
      }
    }

    initialLoad()
  }, []) // Run only once on mount

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000)
      const secondsLeft = Math.max(0, gameState.seasonEndTime - now)

      const days = Math.floor(secondsLeft / 86400)
      const hours = Math.floor((secondsLeft % 86400) / 3600)
      const minutes = Math.floor((secondsLeft % 3600) / 60)
      const seconds = secondsLeft % 60

      setCountdown({ days, hours, minutes, seconds })
    }

    updateCountdown()
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    countdownIntervalRef.current = setInterval(updateCountdown, 1000)

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [gameState.seasonEndTime])

  // Auto-refresh leaderboard data (less frequent when using cache)
  useEffect(() => {
    // Refresh every 60 seconds (cache should be updated by backend script)
    const interval = setInterval(() => {
      if (usingCache) {
        // Try loading fresh cache first
        loadCachedData().then(cache => {
          if (!cache) {
            // Cache failed, fetch from chain
            fetchLeaderboard()
          }
        })
      } else {
        // Not using cache, fetch directly
        fetchLeaderboard()
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [usingCache, loadCachedData, fetchLeaderboard])

  // Get player stats
  const getPlayerStats = useCallback(async (address) => {
    if (!indexerRef.current) return null

    try {
      const stats = await indexerRef.current.getPlayerStats(address)
      const rank = indexerRef.current.getPlayerRank(address)
      
      setPlayerStats(stats)
      setPlayerRank(rank)
      return { stats, rank }
    } catch (err) {
      console.error('useLeaderboardIndexer: getPlayerStats error:', err)
      return null
    }
  }, [])

  // Update specific player data
  const updatePlayerData = useCallback(async (address) => {
    if (!indexerRef.current) return

    try {
      const gameStateData = await indexerRef.current.gameStateCache.fetch()
      const profile = await indexerRef.current.profileCache.fetch(address, true) // Force refresh
      
      indexerRef.current.compiler.addOrUpdate(address, profile, gameStateData)
      
      // Refresh leaderboard after update
      const sorted = indexerRef.current.getLeaderboard(sortBy)
      setLeaderboard(sorted)
    } catch (err) {
      console.error('useLeaderboardIndexer: updatePlayerData error:', err)
    }
  }, [sortBy])

  // Change sort order
  const changeSortBy = useCallback((newSortBy) => {
    setSortBy(newSortBy)
    if (indexerRef.current) {
      const sorted = indexerRef.current.getLeaderboard(newSortBy, 100)
      setLeaderboard(sorted)
    }
  }, [])

  // Calculate reward share for player
  const calculateRewardShare = useCallback((playerXP) => {
    if (!gameState || !globalStats) return 0

    const globalXP = gameState.totalGlobalXP || 0n
    const rewardPool = Number(gameState.rewardCap || 0n) / 100000000 // Convert from decimals

    if (globalXP === 0n) return 0

    const share = (playerXP / Number(globalXP)) * rewardPool
    return Math.max(0, share).toFixed(2)
  }, [gameState, globalStats])

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    if (!indexerRef.current) return null
    return indexerRef.current.getCacheStats()
  }, [])

  // Refresh all data
  const refresh = useCallback(async () => {
    await fetchLeaderboard()
  }, [fetchLeaderboard])

  return {
    // State
    gameState,
    leaderboard,
    countdown,
    loading,
    error,
    playerStats,
    playerRank,
    globalStats,
    sortBy,

    // Methods
    fetchLeaderboard,
    getPlayerStats,
    updatePlayerData,
    changeSortBy,
    calculateRewardShare,
    getCacheStats,
    refresh,

    // Service access (advanced)
    indexer: indexerRef.current,
  }
}
