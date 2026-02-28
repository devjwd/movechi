/**
 * useLeaderboard Hook
 * 
 * Custom React hook for managing leaderboard state and data fetching
 * Provides:
 * - Real-time leaderboard data
 * - Player rank and stats
 * - Automatic caching and updates
 * - Event-based synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Aptos } from "@aptos-labs/ts-sdk"
import { getAptosConfig } from '../config/network'
import LeaderboardService from './leaderboardService'
import LeaderboardAggregator from './leaderboardAggregator'

const normalizeAddr = (a) => {
  if (!a) return ''
  const s = a.toString()
  if (!s.startsWith('0x')) return s.toLowerCase()
  const hex = s.slice(2).replace(/^0+/, '')
  return `0x${hex.toLowerCase()}`
}

const CONTRACT_ADDRESS = normalizeAddr(import.meta.env.VITE_CONTRACT_ADDRESS)
const MODULE_NAME = import.meta.env.VITE_MODULE_NAME || "main"

export function useLeaderboard(connected, accountAddress) {
  // Initialize services
  const servicesRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Leaderboard state
  const [gameState, setGameState] = useState({
    seasonId: 1,
    seasonStarted: false,
    seasonEndTime: 0,
    totalGlobalXP: 0,
    prizePool: 0
  })

  const [leaderboardData, setLeaderboardData] = useState({
    players: [],
    totalPlayers: 0,
    globalXP: 0,
    lastUpdated: null
  })

  const [playerRank, setPlayerRank] = useState(null)
  const [playerStats, setPlayerStats] = useState(null)

  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  // Initialize services
  const initServices = useCallback(() => {
    if (!servicesRef.current) {
      const aptosClient = new Aptos(getAptosConfig())
      servicesRef.current = {
        leaderboardService: new LeaderboardService(aptosClient, CONTRACT_ADDRESS, MODULE_NAME),
        aggregator: new LeaderboardAggregator()
      }
    }
    return servicesRef.current
  }, [])

  // Fetch game state
  const fetchGameState = useCallback(async (forceRefresh = false) => {
    try {
      const { leaderboardService } = initServices()
      const state = await leaderboardService.fetchGameState(forceRefresh)

      setGameState({
        seasonId: state.seasonId,
        seasonStarted: state.seasonStarted,
        seasonEndTime: state.seasonEndTime,
        claimWindowActive: state.claimWindowActive,
        totalGlobalXP: state.totalGlobalXP,
        prizePool: state.rewardCap.amount
      })

      return state
    } catch (err) {
      console.error('Failed to fetch game state:', err)
      setError('Failed to load season data')
      return null
    }
  }, [initServices])

  // Fetch user profile
  const fetchUserProfile = useCallback(async (address) => {
    if (!address) return null

    try {
      const { leaderboardService } = initServices()
      const profile = await leaderboardService.fetchUserProfile(address)
      return profile
    } catch (err) {
      console.error('Failed to fetch user profile:', err)
      return null
    }
  }, [initServices])

  // Update player in leaderboard
  const updatePlayerData = useCallback(async (address) => {
    if (!address) return

    try {
      const { aggregator } = initServices()
      const profile = await fetchUserProfile(address)

      if (profile) {
        aggregator.addOrUpdatePlayer({
          address: profile.address,
          xp: profile.xp,
          tickets: profile.tickets,
          stakedNFTs: profile.stakedNFTs,
          totalSpins: profile.totalSpins,
          totalWins: profile.totalWins,
          totalWinnings: profile.totalWinnings,
          winRate: profile.totalSpins > 0 
            ? ((profile.totalWins / profile.totalSpins) * 100).toFixed(2)
            : 0,
          lastActive: new Date().toISOString()
        })

        const rank = aggregator.getPlayerRank(address)
        setPlayerRank(rank)
        setPlayerStats(profile)
      }
    } catch (err) {
      console.error('Failed to update player data:', err)
    }
  }, [initServices, fetchUserProfile])

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async (sortBy = 'xp', forceRefresh = false) => {
    try {
      setLoading(true)
      const { aggregator } = initServices()

      // In production, fetch from indexer and populate aggregator
      // For now, return aggregator's current state
      const result = aggregator.getLeaderboard(sortBy, 100)

      setLeaderboardData({
        players: result.leaderboard,
        totalPlayers: result.totalPlayers,
        globalXP: result.globalXP,
        lastUpdated: new Date()
      })

      setError(null)
      return result
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
      setError('Failed to load leaderboard')
      return null
    } finally {
      setLoading(false)
    }
  }, [initServices])

  // Countdown timer
  useEffect(() => {
    if (!gameState.seasonEndTime) return

    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000)
      const secondsLeft = Math.max(0, gameState.seasonEndTime - now)

      setCountdown({
        days: Math.floor(secondsLeft / 86400),
        hours: Math.floor((secondsLeft % 86400) / 3600),
        minutes: Math.floor((secondsLeft % 3600) / 60),
        seconds: secondsLeft % 60
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState.seasonEndTime])

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        initServices()

        // Fetch game state
        await fetchGameState(true)

        // Fetch leaderboard
        await fetchLeaderboard('xp', true)

        // Fetch current player data if connected
        if (connected && accountAddress) {
          await updatePlayerData(accountAddress)
        }

        setError(null)
      } catch (err) {
        console.error('Failed to load leaderboard data:', err)
        setError('Failed to load leaderboard')
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Refresh leaderboard every 30 seconds
    const interval = setInterval(loadData, 30000)

    return () => clearInterval(interval)
  }, [connected, accountAddress, fetchGameState, fetchLeaderboard, updatePlayerData, initServices])

  // Utility functions
  const calculateRewardShare = useCallback((xp) => {
    if (gameState.totalGlobalXP === 0) return 0
    return ((xp / gameState.totalGlobalXP) * gameState.prizePool).toFixed(2)
  }, [gameState])

  const getPlayersByFilter = useCallback((filter) => {
    const { aggregator } = initServices()
    return aggregator.getPlayersByFilter(filter)
  }, [initServices])

  const getLeaderboardStats = useCallback(() => {
    const { aggregator } = initServices()
    return aggregator.getStats()
  }, [initServices])

  return {
    // State
    loading,
    error,
    gameState,
    leaderboardData,
    playerRank,
    playerStats,
    countdown,

    // Methods
    fetchGameState,
    fetchUserProfile,
    fetchLeaderboard,
    updatePlayerData,
    calculateRewardShare,
    getPlayersByFilter,
    getLeaderboardStats,

    // Service access
    getService: () => servicesRef.current
  }
}

export default useLeaderboard
