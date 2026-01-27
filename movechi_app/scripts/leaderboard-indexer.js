/**
 * Leaderboard Indexer Script
 * 
 * Syncs on-chain player data to local cache for fast leaderboard access.
 * Run periodically via cron or as a background service.
 * 
 * Usage:
 *   node scripts/leaderboard-indexer.js              # One-time sync
 *   node scripts/leaderboard-indexer.js --watch      # Continuous sync (every 30s)
 *   node scripts/leaderboard-indexer.js --interval 60 # Custom interval
 */

import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk"
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  FULLNODE_URL: process.env.VITE_FULLNODE_URL || "https://testnet.movementnetwork.xyz/v1",
  CONTRACT_ADDRESS: process.env.VITE_CONTRACT_ADDRESS || "0xa00435865d8a71fc68e7dc7724f2f37c6ec1848161ad1e086583b02bf0be5574",
  MODULE_NAME: process.env.VITE_MODULE_NAME || "main",
  CACHE_FILE: path.join(__dirname, '../frontend/public/leaderboard-cache.json'),
  BATCH_SIZE: 10, // Fetch profiles in batches to avoid rate limits
  BATCH_DELAY: 500, // ms delay between batches
}

// ============================================================================
// UTILITIES
// ============================================================================

function normalizeAddr(a) {
  if (!a) return ''
  const s = a.toString()
  if (!s.startsWith('0x')) return s.toLowerCase()
  const hex = s.slice(2).replace(/^0+/, '')
  return `0x${hex.toLowerCase()}`
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// INDEXER CLASS
// ============================================================================

class LeaderboardIndexer {
  constructor() {
    const aptosConfig = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: CONFIG.FULLNODE_URL
    })
    this.aptos = new Aptos(aptosConfig)
    this.contractAddr = normalizeAddr(CONFIG.CONTRACT_ADDRESS)
    this.moduleName = CONFIG.MODULE_NAME
    this.cache = {
      lastSync: 0,
      gameState: null,
      players: [],
      metadata: {
        totalPlayers: 0,
        totalXP: 0,
        totalSpins: 0,
        avgXP: 0,
      }
    }
  }

  /**
   * Fetch all player addresses from contract
   */
  async fetchAllPlayerAddresses() {
    try {
      console.log('📋 Fetching player list from contract...')
      const payload = {
        function: `${this.contractAddr}::${this.moduleName}::get_all_players`,
        type_arguments: [],
        arguments: []
      }
      
      const result = await this.aptos.view({ payload })
      
      if (result && result[0]) {
        const addresses = result[0].map(addr => normalizeAddr(addr))
        console.log(`✅ Found ${addresses.length} players`)
        return addresses
      }
      
      console.warn('⚠️  No players found')
      return []
    } catch (error) {
      console.error('❌ Failed to fetch player addresses:', error.message)
      return []
    }
  }

  /**
   * Fetch GameState resource
   */
  async fetchGameState() {
    try {
      console.log('🎮 Fetching game state...')
      const resourceType = `${this.contractAddr}::${this.moduleName}::GameState`
      const resource = await this.aptos.getAccountResource({
        accountAddress: this.contractAddr,
        resourceType
      })

      const data = resource?.data || resource

      return {
        seasonId: parseU64(data.current_season_id || 1),
        seasonStarted: data.season_started || false,
        seasonEndTime: parseU64(data.season_end_time || 0),
        totalGlobalXP: parseU128(data.total_global_xp || 0n).toString(),
        totalTickets: parseU64(data.total_tickets || 0),
        paused: data.paused || false,
      }
    } catch (error) {
      console.error('❌ Failed to fetch game state:', error.message)
      return null
    }
  }

  /**
   * Fetch UserProfile for a single address
   */
  async fetchUserProfile(address) {
    try {
      const addr = normalizeAddr(address)
      const resourceType = `${this.contractAddr}::${this.moduleName}::UserProfile`
      const resource = await this.aptos.getAccountResource({
        accountAddress: addr,
        resourceType
      })

      if (!resource) return null

      const data = resource.data || resource
      
      return {
        address: addr,
        xp: parseU128(data.accumulated_xp || 0n).toString(),
        tickets: parseU64(data.tickets || 0),
        lifetimeWins: parseU128(data.lifetime_wins || 0n).toString(),
        nonce: parseU64(data.nonce || 0),
        stakedNfts: (data.staked_nfts || []).length,
        lastDayPlayed: parseU64(data.last_day_played || 0),
        paidSpinsToday: parseU64(data.paid_spins_today || 0),
        freeSpinsToday: parseU64(data.free_spins_today || 0),
      }
    } catch (error) {
      // Player might not have profile yet
      return null
    }
  }

  /**
   * Fetch profiles in batches to avoid rate limits
   */
  async fetchAllProfiles(addresses) {
    const profiles = []
    const batches = []
    
    // Split into batches
    for (let i = 0; i < addresses.length; i += CONFIG.BATCH_SIZE) {
      batches.push(addresses.slice(i, i + CONFIG.BATCH_SIZE))
    }

    console.log(`📦 Fetching ${addresses.length} profiles in ${batches.length} batches...`)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`  Batch ${i + 1}/${batches.length} (${batch.length} players)...`)
      
      const batchProfiles = await Promise.all(
        batch.map(addr => this.fetchUserProfile(addr))
      )
      
      profiles.push(...batchProfiles.filter(p => p !== null))
      
      // Delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await sleep(CONFIG.BATCH_DELAY)
      }
    }

    return profiles
  }

  /**
   * Calculate rankings and metadata
   */
  processLeaderboard(profiles) {
    // Sort by XP descending
    const sorted = [...profiles].sort((a, b) => {
      const xpA = BigInt(a.xp)
      const xpB = BigInt(b.xp)
      return xpA > xpB ? -1 : xpA < xpB ? 1 : 0
    })

    // Add ranks
    const ranked = sorted.map((player, index) => ({
      ...player,
      rank: index + 1,
      displayAddr: `${player.address.slice(0, 6)}...${player.address.slice(-4)}`,
      winnings: Number(BigInt(player.lifetimeWins)) / 100000000,
      xpNumber: Number(BigInt(player.xp)),
    }))

    // Calculate metadata
    const totalXP = ranked.reduce((sum, p) => sum + p.xpNumber, 0)
    const totalSpins = ranked.reduce((sum, p) => sum + p.nonce, 0)

    return {
      players: ranked,
      metadata: {
        totalPlayers: ranked.length,
        totalXP,
        totalSpins,
        avgXP: ranked.length > 0 ? Math.floor(totalXP / ranked.length) : 0,
      }
    }
  }

  /**
   * Main sync function
   */
  async sync() {
    console.log('\n🔄 Starting leaderboard sync...')
    console.log(`⏰ ${new Date().toISOString()}`)
    console.log(`📍 Contract: ${this.contractAddr}`)
    
    try {
      // Fetch game state
      const gameState = await this.fetchGameState()
      if (!gameState) {
        throw new Error('Failed to fetch game state')
      }

      // Fetch all player addresses
      const addresses = await this.fetchAllPlayerAddresses()
      if (addresses.length === 0) {
        console.log('⚠️  No players to index yet')
        this.cache = {
          lastSync: Date.now(),
          gameState,
          players: [],
          metadata: { totalPlayers: 0, totalXP: 0, totalSpins: 0, avgXP: 0 }
        }
        this.saveCache()
        return
      }

      // Fetch all profiles
      const profiles = await this.fetchAllProfiles(addresses)
      console.log(`✅ Successfully fetched ${profiles.length}/${addresses.length} profiles`)

      // Process leaderboard
      const { players, metadata } = this.processLeaderboard(profiles)

      // Update cache
      this.cache = {
        lastSync: Date.now(),
        gameState,
        players,
        metadata,
      }

      // Save to file
      this.saveCache()

      console.log('\n📊 Leaderboard Stats:')
      console.log(`   Total Players: ${metadata.totalPlayers}`)
      console.log(`   Total XP: ${metadata.totalXP.toLocaleString()}`)
      console.log(`   Total Spins: ${metadata.totalSpins.toLocaleString()}`)
      console.log(`   Average XP: ${metadata.avgXP.toLocaleString()}`)
      console.log(`   Top Player: ${players[0]?.displayAddr || 'N/A'} (${players[0]?.xpNumber.toLocaleString() || 0} XP)`)
      console.log('\n✅ Sync complete!\n')

    } catch (error) {
      console.error('❌ Sync failed:', error.message)
      throw error
    }
  }

  /**
   * Save cache to file
   */
  saveCache() {
    try {
      const dir = path.dirname(CONFIG.CACHE_FILE)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      fs.writeFileSync(
        CONFIG.CACHE_FILE,
        JSON.stringify(this.cache, null, 2),
        'utf8'
      )
      console.log(`💾 Cache saved to ${CONFIG.CACHE_FILE}`)
    } catch (error) {
      console.error('❌ Failed to save cache:', error.message)
    }
  }

  /**
   * Load cache from file
   */
  loadCache() {
    try {
      if (fs.existsSync(CONFIG.CACHE_FILE)) {
        const data = fs.readFileSync(CONFIG.CACHE_FILE, 'utf8')
        this.cache = JSON.parse(data)
        console.log(`📂 Loaded cache from ${CONFIG.CACHE_FILE}`)
        console.log(`   Last sync: ${new Date(this.cache.lastSync).toISOString()}`)
        console.log(`   Players: ${this.cache.players.length}`)
        return true
      }
    } catch (error) {
      console.error('⚠️  Failed to load cache:', error.message)
    }
    return false
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const watchMode = args.includes('--watch')
  const intervalArg = args.find(arg => arg.startsWith('--interval='))
  const interval = intervalArg 
    ? parseInt(intervalArg.split('=')[1]) * 1000 
    : 30000 // 30 seconds default

  const indexer = new LeaderboardIndexer()

  // Load existing cache
  indexer.loadCache()

  if (watchMode) {
    console.log(`\n🔁 Watch mode enabled (syncing every ${interval / 1000}s)`)
    console.log('Press Ctrl+C to stop\n')

    // Initial sync
    await indexer.sync()

    // Periodic sync
    setInterval(async () => {
      await indexer.sync()
    }, interval)

  } else {
    // One-time sync
    await indexer.sync()
    process.exit(0)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...')
  process.exit(0)
})

main().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
