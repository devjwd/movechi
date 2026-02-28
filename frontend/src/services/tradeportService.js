/**
 * TradePort Service
 * Fetches real-time floor price for Movechi NFT collection from TradePort
 */

const COLLECTION_ID = '0x4c28d9362f440dedec5013742fb21fd4693b56add430e9a5874b220b681053ae'
const NETWORK = 'movement'

/**
 * Fetch floor price from TradePort GraphQL API
 * Uses the official TradePort indexer endpoint
 */
export async function fetchMovechiFloorPrice() {
  try {
    // TradePort GraphQL query for collection floor price
    const query = `
      query {
        movement {
          collections(where: { id: { _eq: "${COLLECTION_ID}" } }) {
            id
            title
            floor
            volume
            supply
          }
        }
      }
    `

    const response = await fetch('https://api.indexer.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      console.warn('TradePort API returned non-OK status:', response.status)
      return null
    }

    const data = await response.json()
    
    if (data?.errors) {
      console.warn('TradePort GraphQL errors:', data.errors)
      return null
    }

    const collection = data?.data?.movement?.collections?.[0]
    if (collection?.floor !== undefined && collection.floor !== null) {
      return parseFloat(collection.floor)
    }

    console.warn('No floor price in response:', data)
    return null
  } catch (error) {
    console.error('Floor price fetch error:', error)
    return null
  }
}

/**
 * Subscribe to real-time floor price updates
 * @param {Function} callback - Called with price whenever it updates
 * @param {number} interval - Update interval in ms (default 30000)
 * @returns {Function} Unsubscribe function
 */
export function subscribeToFloorPrice(callback, interval = 30000) {
  // Fetch immediately
  fetchMovechiFloorPrice().then(price => {
    if (price !== null) callback(price)
  })

  // Then poll regularly
  const timerId = setInterval(() => {
    fetchMovechiFloorPrice().then(price => {
      if (price !== null) callback(price)
    })
  }, interval)

  // Return unsubscribe function
  return () => clearInterval(timerId)
}
