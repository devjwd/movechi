/**
 * Game configuration constants
 * Single source of truth for all game parameters
 */

export const GAME_CONFIG = {
  // Contract
  COST_PER_SPIN: 100_000_000,  // 1 MOVE in octas
  MAX_PAID_DAILY: 10,
  
  // Staking & XP
  XP_PER_NFT_PER_DAY: 5,
  MAX_UNSTAKE_BATCH: 20,
  STAKE_LOCK_TIME_SECONDS: 86400,  // 24 hours
  
  // Timing
  SECONDS_PER_DAY: 86400,
  
  // Refresh intervals (milliseconds)
  STATS_REFRESH_INTERVAL: 5000,      // 5 seconds
  GLOBAL_STATS_INTERVAL: 5000,        // 5 seconds
  TIMER_UPDATE_INTERVAL: 1000,        // 1 second
  LEADERBOARD_REFRESH: 30000,         // 30 seconds
  
  // Free spin tiers
  FREE_SPIN_TIERS: [
    { nfts: 1, spins: 1 },
    { nfts: 5, spins: 2 },
    { nfts: 10, spins: 3 }
  ],
  
  // UI
  MESSAGE_TIMEOUT: 3000,              // 3 seconds
  WIN_MESSAGE_TIMEOUT: 5000,          // 5 seconds
  SPIN_ANIMATION_DURATION: 5000,      // 5 seconds
  
  // Validation
  CLOCK_SKEW_TOLERANCE: 300,         // ±5 minutes acceptable
}

export const ERROR_CODES = {
  NOT_ADMIN: 100,
  GAME_PAUSED: 101,
  DAILY_PAID_LIMIT: 200,
  DAILY_FREE_LIMIT: 201,
  NO_STAKED_NFTS: 202,
  CLAIM_WINDOW_CLOSED: 404,
  SPONSOR_BROKE: 400,
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
}

export default { GAME_CONFIG, ERROR_CODES }
