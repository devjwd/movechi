/**
 * Leaderboard Download Utilities
 * Provides functionality to export leaderboard data in various formats
 */

/**
 * Format leaderboard data for CSV export with addresses included
 * @param {Array} leaderboard - Array of player objects
 * @returns {string} CSV formatted string
 */
export const generateCSV = (leaderboard) => {
  if (!leaderboard || leaderboard.length === 0) {
    return 'No data available'
  }

  // CSV Header
  const headers = [
    'Rank',
    'Address',
    'XP',
    'Tickets',
    'Spins',
    'Winnings (MOVE)',
    'Staked NFTs',
    'Last Day Played'
  ]

  // Convert rows
  const rows = leaderboard.map((player, index) => {
    const winnings = player.winnings ? (player.winnings / 100000000).toFixed(2) : '0.00'
    return [
      (index + 1).toString(),
      player.address || '',
      player.xp || '0',
      player.tickets || '0',
      player.spins || player.nonce || '0',
      winnings,
      player.stakedNfts || '0',
      player.lastDayPlayed || '0'
    ]
  })

  // Escape CSV values
  const escapeCSV = (value) => {
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  // Build CSV
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  return csvContent
}

/**
 * Generate JSON export with addresses included
 * @param {Array} leaderboard - Array of player objects
 * @param {Object} gameState - Game state information
 * @returns {string} JSON formatted string
 */
export const generateJSON = (leaderboard, gameState = null) => {
  const data = {
    exportDate: new Date().toISOString(),
    gameState: gameState || {},
    totalPlayers: leaderboard.length,
    players: leaderboard.map((player, index) => ({
      rank: index + 1,
      address: player.address,
      xp: player.xp || 0,
      tickets: player.tickets || 0,
      spins: player.spins || player.nonce || 0,
      winnings: player.winnings ? (player.winnings / 100000000).toFixed(2) : '0.00',
      stakedNfts: player.stakedNfts || 0,
      lastDayPlayed: player.lastDayPlayed || 0
    }))
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Generate TSV (Tab-Separated Values) export
 * @param {Array} leaderboard - Array of player objects
 * @returns {string} TSV formatted string
 */
export const generateTSV = (leaderboard) => {
  if (!leaderboard || leaderboard.length === 0) {
    return 'No data available'
  }

  const headers = [
    'Rank',
    'Address',
    'XP',
    'Tickets',
    'Spins',
    'Winnings (MOVE)',
    'Staked NFTs',
    'Last Day Played'
  ]

  const rows = leaderboard.map((player, index) => {
    const winnings = player.winnings ? (player.winnings / 100000000).toFixed(2) : '0.00'
    return [
      (index + 1).toString(),
      player.address || '',
      player.xp || '0',
      player.tickets || '0',
      player.spins || player.nonce || '0',
      winnings,
      player.stakedNfts || '0',
      player.lastDayPlayed || '0'
    ].join('\t')
  })

  return [headers.join('\t'), ...rows].join('\n')
}

/**
 * Trigger file download in browser
 * @param {string} content - File content
 * @param {string} filename - Name of the file to download
 * @param {string} mimeType - MIME type of the file
 */
export const downloadFile = (content, filename, mimeType = 'text/plain') => {
  try {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download failed:', error)
    alert('Download failed. Please try again.')
  }
}

/**
 * Download leaderboard as CSV
 * @param {Array} leaderboard - Array of player objects
 * @param {number} seasonId - Season ID for filename
 */
export const downloadLeaderboardCSV = (leaderboard, seasonId = 1) => {
  const csv = generateCSV(leaderboard)
  const filename = `leaderboard-season-${seasonId}-${new Date().toISOString().split('T')[0]}.csv`
  downloadFile(csv, filename, 'text/csv')
}

/**
 * Download leaderboard as JSON
 * @param {Array} leaderboard - Array of player objects
 * @param {Object} gameState - Game state information
 * @param {number} seasonId - Season ID for filename
 */
export const downloadLeaderboardJSON = (leaderboard, gameState = null, seasonId = 1) => {
  const json = generateJSON(leaderboard, gameState)
  const filename = `leaderboard-season-${seasonId}-${new Date().toISOString().split('T')[0]}.json`
  downloadFile(json, filename, 'application/json')
}

/**
 * Download leaderboard as TSV
 * @param {Array} leaderboard - Array of player objects
 * @param {number} seasonId - Season ID for filename
 */
export const downloadLeaderboardTSV = (leaderboard, seasonId = 1) => {
  const tsv = generateTSV(leaderboard)
  const filename = `leaderboard-season-${seasonId}-${new Date().toISOString().split('T')[0]}.tsv`
  downloadFile(tsv, filename, 'text/tab-separated-values')
}
