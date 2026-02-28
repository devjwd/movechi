/**
 * LeaderboardIndexer.js
 * 
 * Production-grade leaderboard indexing system for Movechi game.
 * Fetches on-chain player data, aggregates statistics, caches results.
 * 
 * Architecture:
 * - GameStateCache: Monitors GameState singleton for season data
 * - PlayerIndex: Tracks all player profiles with lazy loading
 * - LeaderboardCompiler: Ranks and filters players
 * - Cache Manager: Intelligent TTL-based caching with refresh intervals
 * 
 * Design Pattern: Service → Index → Cache → Hook
 */

import { Aptos } from "@aptos-labs/ts-sdk"

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function normalizeAddr(a) {
  if (!a) return ''
  const s = a.toString().toLowerCase()
  // Ensure address starts with 0x
  if (!s.startsWith('0x')) return `0x${s}`
  return s
}

function formatAddr(addr) {
  if (!addr) return 'Unknown'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function parseU128(val) {
  if (!val) return 0n
  if (typeof val === 'bigint') return val
  if (typeof val === 'string') return BigInt(val)
  return BigInt(String(val))
}

function parseU64(val) {
  if (!val) return 0
  if (typeof val === 'bigint') return Number(val)
  if (typeof val === 'string') return parseInt(val, 10)
  return Number(val)
}

// Convert MOVE tokens (8 decimals) to display value
function fromMoveDecimals(amount) {
  const val = parseU128(amount)
  return Number(val) / 100000000
}

// ============================================================================
// GAME STATE CACHE
// ============================================================================

export class GameStateCache {
  constructor(aptosClient, contractAddr, moduleName) {
    this.aptosClient = aptosClient
    this.contractAddr = normalizeAddr(contractAddr)
    this.moduleName = moduleName
    this.cache = null
    this.cacheTime = 0
    this.TTL = 60000 // 60 seconds
    this.listeners = []
  }

  async fetch(forceRefresh = false) {
    const now = Date.now()
    
    // Return cached value if still valid
    if (!forceRefresh && this.cache && (now - this.cacheTime) < this.TTL) {
      return this.cache
    }

    try {
      const resourceType = `${this.contractAddr}::${this.moduleName}::GameState`
      const resource = await this.aptosClient.getAccountResource({
        accountAddress: this.contractAddr,
        resourceType
      })

      const data = resource?.data || resource

      this.cache = {
        seasonId: parseU64(data.current_season_id || 1),
        seasonStarted: data.season_started || false,
        seasonEndTime: parseU64(data.season_end_time || 0),
        claimWindowActive: data.claim_window_active || false,
        totalGlobalXP: parseU128(data.total_global_xp || 0n),
        ticketsSold: parseU64(data.tickets_sold || 0),
        paused: data.paused || false,
        // Vault balances
        rewardCap: parseU128(data.reward_cap?.amount || 0n),
        seasonalCap: parseU128(data.seasonal_cap?.amount || 0n),
        instantCap: parseU128(data.instant_cap?.amount || 0n),
        sponsorCap: parseU128(data.sponsor_cap?.amount || 0n),
      }

      this.cacheTime = now
      this.notifyListeners('gameStateUpdated', this.cache)
      return this.cache
    } catch (error) {
      console.error('GameStateCache.fetch error:', error)
      return this.cache || { seasonId: 1, totalGlobalXP: 0n }
    }
  }

  subscribe(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
    }
  }

  notifyListeners(event, data) {
    this.listeners.forEach(cb => cb(event, data))
  }

  getCacheStats() {
    const now = Date.now()
    const age = now - this.cacheTime
    return {
      isCached: !!this.cache,
      ageMs: age,
      isStale: age > this.TTL,
      nextRefreshMs: Math.max(0, this.TTL - age)
    }
  }
}

// ============================================================================
// PLAYER PROFILE CACHE
// ============================================================================

export class PlayerProfileCache {
  constructor(aptosClient, contractAddr, moduleName) {
    this.aptosClient = aptosClient
    this.contractAddr = normalizeAddr(contractAddr)
    this.moduleName = moduleName
    this.profiles = new Map() // address -> { data, cachedAt }
    this.TTL = 120000 // 2 minutes
    this.accessLog = [] // For analytics
  }

  async fetch(address, forceRefresh = false) {
    const addr = normalizeAddr(address)
    const now = Date.now()
    const cached = this.profiles.get(addr)

    // Return cached if valid
    if (!forceRefresh && cached && (now - cached.cachedAt) < this.TTL) {
      this.logAccess(addr, 'cache_hit')
      return cached.data
    }

    try {
      const resourceType = `${this.contractAddr}::${this.moduleName}::UserProfile`
      const resource = await this.aptosClient.getAccountResource({
        accountAddress: addr,
        resourceType
      })

      if (!resource) {
        // New user - return default profile
        const defaultProfile = {
          xp: 0n,
          tickets: 0,
          paidSpinsToday: 0,
          freeSpinsToday: 0,
          stakedNfts: [],
          lifetimeWins: 0n,
          nonce: 0,
          lastDayPlayed: 0,
        }
        this.profiles.set(addr, { data: defaultProfile, cachedAt: now })
        this.logAccess(addr, 'new_user')
        return defaultProfile
      }

      const data = resource.data || resource
      const profile = {
        xp: parseU128(data.accumulated_xp || 0n),
        tickets: parseU64(data.tickets || 0),
        paidSpinsToday: parseU64(data.paid_spins_today || 0),
        freeSpinsToday: parseU64(data.free_spins_today || 0),
        stakedNfts: data.staked_nfts || [],
        lifetimeWins: parseU128(data.lifetime_wins || 0n),
        nonce: parseU64(data.nonce || 0),
        lastDayPlayed: parseU64(data.last_day_played || 0),
      }

      this.profiles.set(addr, { data: profile, cachedAt: now })
      this.logAccess(addr, 'fetched')
      return profile
    } catch (error) {
      console.warn(`PlayerProfileCache.fetch(${formatAddr(addr)}) error:`, error.message)
      
      // Return cached even if stale on error
      if (cached) {
        this.logAccess(addr, 'error_fallback')
        return cached.data
      }

      // Return default if no cache
      const defaultProfile = {
        xp: 0n,
        tickets: 0,
        paidSpinsToday: 0,
        freeSpinsToday: 0,
        stakedNfts: [],
        lifetimeWins: 0n,
        nonce: 0,
        lastDayPlayed: 0,
      }
      this.logAccess(addr, 'error_default')
      return defaultProfile
    }
  }

  logAccess(addr, type) {
    this.accessLog.push({
      address: addr,
      type,
      timestamp: Date.now()
    })
    // Keep log size bounded
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-500)
    }
  }

  getCacheStats() {
    const stats = {
      cachedProfiles: this.profiles.size,
      totalAccesses: this.accessLog.length,
    }
    
    // Count recent hits/misses (last 100 accesses)
    const recent = this.accessLog.slice(-100)
    stats.recentHitRate = recent.filter(a => a.type === 'cache_hit').length / Math.max(1, recent.length)
    
    return stats
  }

  invalidate(address) {
    this.profiles.delete(normalizeAddr(address))
  }

  invalidateAll() {
    this.profiles.clear()
  }
}

// ============================================================================
// LEADERBOARD COMPILER
// ============================================================================

export class LeaderboardCompiler {
  constructor() {
    this.players = new Map() // address -> playerEntry
  }

  addOrUpdate(address, profile, gameState) {
    const addr = normalizeAddr(address)
    
    // Calculate derived stats
    const totalSpins = parseU64(profile.nonce || 0)
    const winnings = fromMoveDecimals(profile.lifetimeWins)
    const xp = parseU128(profile.xp || 0n)
    const stakedCount = (profile.stakedNfts || []).length

    // Calculate reward share (proportional to global XP)
    const globalXP = parseU128(gameState.totalGlobalXP || 0n)
    const rewardPool = fromMoveDecimals(gameState.rewardCap || 0n)
    const rewardShare = globalXP > 0n ? (Number(xp) / Number(globalXP)) * rewardPool : 0

    const entry = {
      address: addr,
      displayAddr: formatAddr(addr),
      xp: Number(xp),
      tickets: parseU64(profile.tickets || 0),
      spins: totalSpins,
      winnings: parseFloat(winnings.toFixed(2)),
      stakedNfts: stakedCount,
      rewardShare: parseFloat(rewardShare.toFixed(2)),
      lastDayPlayed: parseU64(profile.lastDayPlayed || 0),
    }

    this.players.set(addr, entry)
  }

  getLeaderboard(sortBy = 'xp', limit = null) {
    let sorted = Array.from(this.players.values())

    // Sort by selected field
    switch (sortBy.toLowerCase()) {
      case 'xp':
        sorted.sort((a, b) => b.xp - a.xp)
        break
      case 'winnings':
        sorted.sort((a, b) => b.winnings - a.winnings)
        break
      case 'reward':
        sorted.sort((a, b) => b.rewardShare - a.rewardShare)
        break
      default:
        sorted.sort((a, b) => b.xp - a.xp)
    }

    // Add rank
    sorted = sorted.map((p, idx) => ({
      ...p,
      rank: idx + 1
    }))

    // Apply limit if specified
    if (limit && limit > 0) {
      sorted = sorted.slice(0, limit)
    }

    return sorted
  }

  getPlayerByAddress(address) {
    return this.players.get(normalizeAddr(address))
  }

  getGlobalStats() {
    const players = Array.from(this.players.values())
    if (players.length === 0) {
      return { totalPlayers: 0, totalXp: 0, totalSpins: 0, avgXp: 0 }
    }

    const totalXp = players.reduce((sum, p) => sum + p.xp, 0)
    const totalSpins = players.reduce((sum, p) => sum + p.spins, 0)
    const avgXp = Math.floor(totalXp / players.length)

    return {
      totalPlayers: players.length,
      totalXp,
      totalSpins,
      avgXp,
    }
  }
}

// ============================================================================
// MAIN LEADERBOARD INDEXER SERVICE
// ============================================================================

export class LeaderboardIndexer {
  constructor(aptosClient, contractAddr, moduleName = 'main') {
    this.aptosClient = aptosClient
    this.gameStateCache = new GameStateCache(aptosClient, contractAddr, moduleName)
    this.profileCache = new PlayerProfileCache(aptosClient, contractAddr, moduleName)
    this.compiler = new LeaderboardCompiler()
    this.contractAddr = normalizeAddr(contractAddr)
    this.moduleName = moduleName
    this.knownAddresses = new Set() // Addresses we know about
    this.refreshInterval = null
    this.autoRefreshEnabled = false
  }

  /**
   * Fetch all player addresses from on-chain
   * Reads active_players directly from GameState resource (most reliable method)
   */
  async fetchAllPlayerAddresses() {
    try {
      const resourceType = `${this.contractAddr}::${this.moduleName}::GameState`
      console.log('📡 Fetching GameState from:', this.contractAddr)
      
      const resource = await this.aptosClient.getAccountResource({
        accountAddress: this.contractAddr,
        resourceType
      })

      const data = resource?.data || resource
      const activePlayers = data.active_players || []
      
      if (activePlayers.length > 0) {
        console.log(`✅ Fetched ${activePlayers.length} players from GameState.active_players`)
        return activePlayers.map(addr => normalizeAddr(addr))
      }
      
      console.warn('⚠️ GameState.active_players is empty')
      return []
    } catch (error) {
      console.error('❌ Failed to fetch active_players from GameState:', error.message)
      return []
    }
  }

  /**
   * Fetch leaderboard for specific addresses
   * Useful when you have a list of player addresses to fetch
   */
  async fetchLeaderboardForAddresses(addresses = [], gameState = null) {
    // Fetch GameState if not provided
    if (!gameState) {
      gameState = await this.gameStateCache.fetch()
    }

    // Fetch profiles for all addresses
    const profiles = await Promise.all(
      addresses.map(addr => this.profileCache.fetch(addr))
    )

    // Compile leaderboard
    addresses.forEach((addr, idx) => {
      this.compiler.addOrUpdate(addr, profiles[idx], gameState)
      this.knownAddresses.add(normalizeAddr(addr))
    })

    return this.compiler.getLeaderboard('xp')
  }

  /**
   * Fetch leaderboard from on-chain data
   * Uses get_all_players() view function to get real player addresses
   */
  async fetchLeaderboard(testAddresses = []) {
    try {
      console.log('🔍 LeaderboardIndexer.fetchLeaderboard called')
      const gameState = await this.gameStateCache.fetch()
      console.log('📊 GameState fetched:', {
        seasonId: gameState.seasonId,
        totalGlobalXP: gameState.totalGlobalXP?.toString(),
      })

      // Try to fetch all players from contract first
      let addresses = await this.fetchAllPlayerAddresses()
      console.log('👥 Player addresses fetched:', addresses.length)
      
      // Fallback to test addresses if contract query fails
      if (addresses.length === 0 && testAddresses.length > 0) {
        console.log('⚠️ Using test addresses as fallback')
        addresses = testAddresses
      }
      
      // Final fallback to known addresses
      if (addresses.length === 0) {
        addresses = Array.from(this.knownAddresses)
        console.log('⚠️ Using known addresses fallback:', addresses.length)
      }

      if (addresses.length === 0) {
        console.warn('LeaderboardIndexer: No players found on-chain. Waiting for first player...')
        return []
      }

      console.log('🔄 Fetching profiles for', addresses.length, 'players...')
      return await this.fetchLeaderboardForAddresses(addresses, gameState)
    } catch (error) {
      console.error('LeaderboardIndexer.fetchLeaderboard error:', error)
      return []
    }
  }

  /**
   * Get leaderboard sorted by different metrics
   */
  getLeaderboard(sortBy = 'xp', limit = 100) {
    return this.compiler.getLeaderboard(sortBy, limit)
  }

  /**
   * Get global statistics
   */
  getGlobalStats() {
    return this.compiler.getGlobalStats()
  }

  /**
   * Get specific player data
   */
  async getPlayerStats(address) {
    const addr = normalizeAddr(address)
    
    // Check if we have it compiled
    let player = this.compiler.getPlayerByAddress(addr)
    if (!player) {
      // Fetch and compile
      const gameState = await this.gameStateCache.fetch()
      const profile = await this.profileCache.fetch(addr)
      this.compiler.addOrUpdate(addr, profile, gameState)
      player = this.compiler.getPlayerByAddress(addr)
    }

    return player
  }

  /**
   * Get player rank in current leaderboard
   */
  getPlayerRank(address) {
    const lb = this.compiler.getLeaderboard('xp')
    const rank = lb.findIndex(p => p.address === normalizeAddr(address))
    return rank >= 0 ? rank + 1 : null
  }

  /**
   * Subscribe to game state updates
   */
  onGameStateUpdate(callback) {
    return this.gameStateCache.subscribe((event, data) => {
      if (event === 'gameStateUpdated') {
        callback(data)
      }
    })
  }

  /**
   * Enable auto-refresh of game state
   */
  startAutoRefresh(intervalMs = 30000) {
    if (this.autoRefreshEnabled) return

    this.autoRefreshEnabled = true
    this.refreshInterval = setInterval(() => {
      this.gameStateCache.fetch(true) // Force refresh
    }, intervalMs)
  }

  /**
   * Disable auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
    this.autoRefreshEnabled = false
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      gameState: this.gameStateCache.getCacheStats(),
      profiles: this.profileCache.getCacheStats(),
      knownAddresses: this.knownAddresses.size,
    }
  }
}
