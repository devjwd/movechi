/**
 * Leaderboard Service
 * Handles all leaderboard data fetching, caching, and real-time updates
 * 
 * Architecture:
 * - Fetches real on-chain data from GameState and UserProfiles
 * - Implements intelligent caching with TTL
 * - Provides real-time leaderboard aggregation
 * - Tracks player statistics (XP, tickets, spins, winnings)
 */

import { Aptos } from "@aptos-labs/ts-sdk"

class LeaderboardService {
  constructor(aptosClient, contractAddress, moduleName) {
    this.aptosClient = aptosClient
    this.contractAddress = contractAddress
    this.moduleName = moduleName
    
    // Cache management
    this.cache = {
      leaderboard: null,
      gameState: null,
      playerProfiles: new Map(),
      timestamps: {
        leaderboard: 0,
        gameState: 0
      }
    }
    
    // Cache TTL in milliseconds
    this.CACHE_TTL = {
      leaderboard: 30000,    // 30 seconds
      gameState: 60000,      // 60 seconds
      playerProfile: 120000  // 2 minutes
    }
    
    // Leaderboard update event listeners
    this.listeners = []
  }

  /**
   * Normalize address format
   */
  normalizeAddr(addr) {
    if (!addr) return ''
    const s = addr.toString()
    if (!s.startsWith('0x')) return s.toLowerCase()
    const hex = s.slice(2).replace(/^0+/, '')
    return `0x${hex.toLowerCase()}`
  }

  /**
   * Format address for display
   */
  formatAddress(addr, length = 12) {
    if (!addr) return 'Unknown'
    const normalized = this.normalizeAddr(addr)
    return `${normalized.slice(0, length)}...${normalized.slice(-4)}`
  }

  /**
   * Fetch GameState (season info, global stats, prize pool)
   */
  async fetchGameState(forceRefresh = false) {
    const now = Date.now()
    
    // Return cached if still valid
    if (
      !forceRefresh &&
      this.cache.gameState &&
      now - this.cache.timestamps.gameState < this.CACHE_TTL.gameState
    ) {
      return this.cache.gameState
    }

    try {
      const gameStateType = `${this.contractAddress}::${this.moduleName}::GameState`
      const resource = await this.aptosClient.getAccountResource({
        accountAddress: this.contractAddress,
        resourceType: gameStateType
      })

      const data = resource?.data || resource
      
      const gameState = {
        seasonId: Number(data.current_season_id || 1),
        seasonStarted: Boolean(data.season_started),
        seasonEndTime: Number(data.season_end_time || 0),
        claimWindowActive: Boolean(data.claim_window_active),
        claimEndTime: Number(data.claim_end_time || 0),
        totalGlobalXP: this.parseU128(data.total_global_xp),
        ticketsSold: Number(data.tickets_sold || 0),
        paused: Boolean(data.paused),
        admin: data.admin,
        instantCap: {
          amount: this.parseU64(data.instant_cap?.amount)
        },
        seasonalCap: {
          amount: this.parseU64(data.seasonal_cap?.amount)
        },
        rewardCap: {
          amount: this.parseU64(data.reward_cap?.amount)
        }
      }

      // Update cache
      this.cache.gameState = gameState
      this.cache.timestamps.gameState = now
      
      return gameState
    } catch (error) {
      console.error('Failed to fetch GameState:', error)
      return this.cache.gameState || this.getDefaultGameState()
    }
  }

  /**
   * Fetch individual user profile
   */
  async fetchUserProfile(userAddress) {
    const normalizedAddr = this.normalizeAddr(userAddress)
    const now = Date.now()
    
    // Check cache
    const cached = this.cache.playerProfiles.get(normalizedAddr)
    if (cached && now - cached.timestamp < this.CACHE_TTL.playerProfile) {
      return cached.data
    }

    try {
      const userProfileType = `${this.contractAddress}::${this.moduleName}::UserProfile`
      const resource = await this.aptosClient.getAccountResource({
        accountAddress: normalizedAddr,
        resourceType: userProfileType
      })

      if (!resource) {
        return null
      }

      const data = resource?.data || resource
      
      const userProfile = {
        address: normalizedAddr,
        xp: this.parseU128(data.accumulated_xp),
        tickets: Number(data.tickets || 0),
        paidSpinsToday: Number(data.paid_spins_today || 0),
        freeSpinsToday: Number(data.free_spins_today || 0),
        stakedNFTs: Array.isArray(data.staked_nfts) 
          ? data.staked_nfts.length 
          : Number(data.staked_nfts_count || 0),
        lastDayPlayed: Number(data.last_day_played || 0),
        totalSpins: Number(data.total_spins || 0),
        totalWins: Number(data.total_wins || 0),
        totalWinnings: this.parseU64(data.total_winnings || 0)
      }

      // Cache result
      this.cache.playerProfiles.set(normalizedAddr, {
        data: userProfile,
        timestamp: now
      })

      return userProfile
    } catch (error) {
      if (error?.status === 404 || error?.message?.includes('404')) {
        // New user profile doesn't exist yet
        return null
      }
      console.error(`Failed to fetch user profile for ${userAddress}:`, error)
      return null
    }
  }

  /**
   * Fetch leaderboard by aggregating on-chain data
   * 
   * NOTE: This fetches from GameState ticket_ledger and staking_ledger
   * For production, implement an indexer service to query all user profiles efficiently
   */
  async fetchLeaderboard(forceRefresh = false) {
    const now = Date.now()
    
    if (
      !forceRefresh &&
      this.cache.leaderboard &&
      now - this.cache.timestamps.leaderboard < this.CACHE_TTL.leaderboard
    ) {
      return this.cache.leaderboard
    }

    try {
      const gameState = await this.fetchGameState()
      
      // In production, you would:
      // 1. Use an indexer service (e.g., Aptos Indexer API) to query all UserProfile resources
      // 2. Or maintain an off-chain leaderboard cache updated by event listeners
      // 3. Or implement pagination to fetch users from the contract
      
      // For now, we'll return a placeholder structure that can be populated
      // by an indexer or event-based system
      const leaderboard = {
        seasonId: gameState.seasonId,
        totalGlobalXP: gameState.totalGlobalXP,
        totalPlayers: 0,
        players: [],
        prizePool: gameState.rewardCap.amount,
        lastUpdated: now
      }

      this.cache.leaderboard = leaderboard
      this.cache.timestamps.leaderboard = now

      return leaderboard
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
      return this.cache.leaderboard || {
        seasonId: 1,
        totalGlobalXP: 0,
        totalPlayers: 0,
        players: [],
        prizePool: 0,
        lastUpdated: now
      }
    }
  }

  /**
   * Get current player's leaderboard position
   */
  async getPlayerRank(playerAddress, forceRefresh = false) {
    try {
      const userProfile = await this.fetchUserProfile(playerAddress)
      if (!userProfile) return null

      const leaderboard = await this.fetchLeaderboard(forceRefresh)
      
      // Find player rank in leaderboard
      const sorted = [...leaderboard.players]
        .sort((a, b) => b.xp - a.xp)
      
      const rank = sorted.findIndex(p => 
        this.normalizeAddr(p.address) === this.normalizeAddr(playerAddress)
      )

      return {
        rank: rank >= 0 ? rank + 1 : null,
        totalPlayers: sorted.length,
        xp: userProfile.xp,
        percentile: rank >= 0 ? ((rank / sorted.length) * 100).toFixed(2) : null,
        share: leaderboard.totalGlobalXP > 0 
          ? ((userProfile.xp / leaderboard.totalGlobalXP) * 100).toFixed(4)
          : 0
      }
    } catch (error) {
      console.error('Failed to get player rank:', error)
      return null
    }
  }

  /**
   * Calculate player's estimated reward share
   */
  calculateRewardShare(playerXP, totalGlobalXP, prizePool) {
    if (totalGlobalXP === 0 || prizePool === 0) return 0
    return (playerXP / totalGlobalXP) * prizePool
  }

  /**
   * Parse u128 values from contract (can be string or number)
   */
  parseU128(value) {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      try {
        return Number(BigInt(value))
      } catch {
        return 0
      }
    }
    return 0
  }

  /**
   * Parse u64 values from contract
   */
  parseU64(value) {
    return this.parseU128(value)
  }

  /**
   * Get default GameState structure
   */
  getDefaultGameState() {
    return {
      seasonId: 1,
      seasonStarted: false,
      seasonEndTime: 0,
      claimWindowActive: false,
      claimEndTime: 0,
      totalGlobalXP: 0,
      ticketsSold: 0,
      paused: false,
      instantCap: { amount: 0 },
      seasonalCap: { amount: 0 },
      rewardCap: { amount: 0 }
    }
  }

  /**
   * Register listener for leaderboard updates
   */
  onLeaderboardUpdate(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Notify all listeners of leaderboard update
   */
  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Leaderboard listener error:', error)
      }
    })
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.cache = {
      leaderboard: null,
      gameState: null,
      playerProfiles: new Map(),
      timestamps: {
        leaderboard: 0,
        gameState: 0
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      gameState: this.cache.gameState ? 'cached' : 'empty',
      leaderboard: this.cache.leaderboard ? `${this.cache.leaderboard.players.length} players` : 'empty',
      playerProfiles: this.cache.playerProfiles.size,
      timestamps: this.cache.timestamps
    }
  }
}

export default LeaderboardService
