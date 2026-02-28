/**
 * Leaderboard Data Aggregator
 * 
 * Handles real-time aggregation of player stats from:
 * 1. UserProfile resources (XP, tickets, staked NFTs)
 * 2. GameState events (spin outcomes, XP changes)
 * 3. Local tracking (wins, winnings, spins)
 */

class LeaderboardAggregator {
  constructor() {
    this.players = new Map()
    this.globalStats = {
      totalXP: 0,
      totalPlayers: 0,
      totalSpins: 0,
      totalWins: 0
    }
  }

  /**
   * Add or update player in leaderboard
   */
  addOrUpdatePlayer(playerData) {
    const {
      address,
      xp,
      tickets,
      stakedNFTs,
      totalSpins = 0,
      totalWins = 0,
      totalWinnings = 0,
      winRate = 0,
      lastActive = new Date().toISOString()
    } = playerData

    const normalizedAddr = this.normalizeAddress(address)

    // Check if player exists
    const existingPlayer = this.players.get(normalizedAddr)
    const prevXP = existingPlayer?.xp || 0

    // Update global XP total
    this.globalStats.totalXP = this.globalStats.totalXP - prevXP + xp

    // Create or update player entry
    const playerEntry = {
      address: normalizedAddr,
      displayAddress: this.formatAddress(address),
      xp,
      tickets,
      stakedNFTs,
      totalSpins,
      totalWins,
      totalWinnings,
      winRate,
      lastActive,
      rewards: {
        estimatedShare: 0,
        estimatedPayout: 0
      },
      badges: this.generateBadges({
        xp,
        stakedNFTs,
        totalWinnings,
        winRate,
        totalWins
      })
    }

    this.players.set(normalizedAddr, playerEntry)
    this.globalStats.totalPlayers = this.players.size

    return playerEntry
  }

  /**
   * Generate achievement badges for player
   */
  generateBadges(stats) {
    const badges = []

    // XP badges
    if (stats.xp >= 100000) badges.push({ type: 'veteran', label: 'Veteran', icon: '⭐' })
    if (stats.xp >= 50000) badges.push({ type: 'elite', label: 'Elite', icon: '🔱' })

    // Staking badges
    if (stats.stakedNFTs >= 10) badges.push({ type: 'whale', label: 'Whale', icon: '🐳' })
    if (stats.stakedNFTs >= 5) badges.push({ type: 'staker', label: 'Staker', icon: '🔒' })

    // Win rate badges
    if (stats.winRate >= 40) badges.push({ type: 'lucky', label: 'Lucky', icon: '🍀' })
    if (stats.winRate >= 50) badges.push({ type: 'blessed', label: 'Blessed', icon: '✨' })

    // Wealth badges
    if (stats.totalWinnings >= 5000) badges.push({ type: 'rich', label: 'Rich', icon: '💰' })

    // Grind badges
    if (stats.totalWins >= 500) badges.push({ type: 'grinder', label: 'Grinder', icon: '💪' })

    return badges
  }

  /**
   * Calculate leaderboard with rankings
   */
  getLeaderboard(sortBy = 'xp', limit = 100) {
    let players = Array.from(this.players.values())

    // Sort by criteria
    switch (sortBy) {
      case 'xp':
        players.sort((a, b) => b.xp - a.xp)
        break
      case 'wins':
        players.sort((a, b) => b.totalWins - a.totalWins)
        break
      case 'winnings':
        players.sort((a, b) => b.totalWinnings - a.totalWinnings)
        break
      case 'winRate':
        players.sort((a, b) => b.winRate - a.winRate)
        break
      default:
        players.sort((a, b) => b.xp - a.xp)
    }

    // Add ranks and calculate rewards
    const leaderboard = players.slice(0, limit).map((player, index) => ({
      ...player,
      rank: index + 1,
      percentile: ((index / this.globalStats.totalPlayers) * 100).toFixed(2),
      rewards: {
        estimatedShare: ((player.xp / this.globalStats.totalXP) * 100).toFixed(4),
        estimatedPayout: player.xp // This would be multiplied by actual prize pool
      }
    }))

    return {
      leaderboard,
      totalPlayers: this.globalStats.totalPlayers,
      globalXP: this.globalStats.totalXP,
      globalStats: this.globalStats
    }
  }

  /**
   * Get player by address
   */
  getPlayer(address) {
    const normalizedAddr = this.normalizeAddress(address)
    return this.players.get(normalizedAddr)
  }

  /**
   * Get player rank
   */
  getPlayerRank(address, sortBy = 'xp') {
    const leaderboard = this.getLeaderboard(sortBy, this.globalStats.totalPlayers)
    const player = leaderboard.leaderboard.find(p =>
      this.normalizeAddress(p.address) === this.normalizeAddress(address)
    )
    return player || null
  }

  /**
   * Get players by filter
   */
  getPlayersByFilter(filter = {}) {
    let players = Array.from(this.players.values())

    // Apply filters
    if (filter.minXP) {
      players = players.filter(p => p.xp >= filter.minXP)
    }
    if (filter.minStakedNFTs) {
      players = players.filter(p => p.stakedNFTs >= filter.minStakedNFTs)
    }
    if (filter.minWinRate) {
      players = players.filter(p => p.winRate >= filter.minWinRate)
    }
    if (filter.minWinnings) {
      players = players.filter(p => p.totalWinnings >= filter.minWinnings)
    }

    // Sort by XP by default
    players.sort((a, b) => b.xp - a.xp)

    return {
      players,
      count: players.length
    }
  }

  /**
   * Get leaderboard stats
   */
  getStats() {
    return {
      totalPlayers: this.globalStats.totalPlayers,
      totalGlobalXP: this.globalStats.totalXP,
      totalSpins: this.globalStats.totalSpins,
      totalWins: this.globalStats.totalWins,
      averageXP: this.globalStats.totalXP / Math.max(1, this.globalStats.totalPlayers),
      averageWinRate: this.globalStats.totalWins / Math.max(1, this.globalStats.totalSpins)
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.players.clear()
    this.globalStats = {
      totalXP: 0,
      totalPlayers: 0,
      totalSpins: 0,
      totalWins: 0
    }
  }

  /**
   * Normalize address
   */
  normalizeAddress(addr) {
    if (!addr) return ''
    const s = addr.toString()
    if (!s.startsWith('0x')) return s.toLowerCase()
    const hex = s.slice(2).replace(/^0+/, '')
    return `0x${hex.toLowerCase()}`
  }

  /**
   * Format address for display
   */
  formatAddress(addr) {
    const normalized = this.normalizeAddress(addr)
    return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`
  }

  /**
   * Export leaderboard to JSON
   */
  export() {
    return {
      leaderboard: this.getLeaderboard('xp', 1000),
      globalStats: this.globalStats,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Import leaderboard from JSON
   */
  import(data) {
    if (!data || !data.leaderboard) return false

    this.clear()

    data.leaderboard.leaderboard.forEach(player => {
      this.addOrUpdatePlayer({
        address: player.address,
        xp: player.xp,
        tickets: player.tickets,
        stakedNFTs: player.stakedNFTs,
        totalSpins: player.totalSpins,
        totalWins: player.totalWins,
        totalWinnings: player.totalWinnings,
        winRate: player.winRate,
        lastActive: player.lastActive
      })
    })

    return true
  }
}

export default LeaderboardAggregator
