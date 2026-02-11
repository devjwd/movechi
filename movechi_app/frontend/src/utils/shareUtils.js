/**
 * Utility functions for sharing wins on social media
 */

// Array of available win card images (numbered 1-6)
const WIN_CARDS = [
  '/win card1.png',
  '/win card2.png',
  '/win card3.png',
  '/win card4.png',
  '/win card5.png',
  '/win card6.png'
]

/**
 * Get a random win card image
 * @returns {string} Path to a random win card image
 */
export const getRandomWinCard = () => {
  const randomIndex = Math.floor(Math.random() * WIN_CARDS.length)
  return WIN_CARDS[randomIndex]
}

/**
 * Create a shareable jackpot win URL for Twitter/X
 * @param {number} amount - Win amount in MOVE tokens
 * @param {string} cardImage - Optional specific win card image path
 * @returns {object} Object with tweet text and URL
 */
export const createJackpotShareData = (amount, cardImage = null) => {
  const selectedCard = cardImage || getRandomWinCard()
  const shareOrigin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://movechi.app'
  
  // Create the share text with emojis and engagement-friendly language
  const shareText = `🎰 I JUST HIT THE MOVECHI JACKPOT! 🎰\n\n💰 Won: ${amount}\n\n${selectedCard}\n\nCan you beat my luck? Play now at @Movechi_xyz\n\n#MovechiGaming #Jackpot #Web3Gaming`
  
  return {
    text: shareText,
    imageUrl: `${shareOrigin}${selectedCard}`,
    selectedCard
  }
}

/**
 * Generate Twitter/X share intent URL with reward information
 * @param {number} amount - Win amount in MOVE tokens
 * @param {string} cardImage - Optional specific win card image path
 * @returns {string} Twitter share intent URL
 */
export const generateTwitterShareUrl = (amount, cardImage = null) => {
  const selectedCard = cardImage || getRandomWinCard()
  const shareOrigin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://movechi.app'
  
  // Twitter share text - emojis, win amount, and call-to-action
  const shareText = `🎰 I JUST HIT THE MOVECHI JACKPOT! 🎰\n\n💰 Won: ${amount}\n\nCan you beat my luck? Play now at @Movechi_xyz\n\n#MovechiGaming #Jackpot #Web3Gaming`
  
  // Include the card image URL in the tweet
  const imageUrlParam = `${shareOrigin}${selectedCard}`
  
  // Create the share URL with text and the image URL as a reference
  const encodedText = encodeURIComponent(shareText)
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodeURIComponent(shareOrigin)}`
  
  return { 
    url: twitterUrl, 
    imageUrl: imageUrlParam,
    selectedCard 
  }
}

/**
 * Generate a combined share image using canvas (for potential future use)
 * @param {string} winAmount - The win amount string to display
 * @param {string} cardImagePath - Path to the win card image
 * @returns {Promise<string>} Data URL of the combined image
 */
export const generateCombinedShareImage = async (winAmount, cardImagePath = null) => {
  const selectedCard = cardImagePath || getRandomWinCard()
  
  return new Promise((resolve, reject) => {
    // Create a canvas
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630 // Standard social media image size
    
    const ctx = canvas.getContext('2d')
    
    // Load the win card image
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Draw background
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw golden border
      ctx.strokeStyle = '#d4c4a0'
      ctx.lineWidth = 4
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)
      
      // Draw the win card image on the left
      const imgWidth = 400
      const imgHeight = 600
      const imgX = 50
      const imgY = (canvas.height - imgHeight) / 2 + 30
      ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight)
      
      // Draw text on the right
      const textX = imgX + imgWidth + 80
      
      // Title
      ctx.font = 'bold 72px Arial, sans-serif'
      ctx.fillStyle = '#d4c4a0'
      ctx.fillText('JACKPOT!', textX, 150)
      
      // Win amount
      ctx.font = 'bold 96px Arial, sans-serif'
      ctx.fillStyle = '#ffd700'
      ctx.fillText(winAmount, textX, 280)
      
      // Subtitle
      ctx.font = '48px Arial, sans-serif'
      ctx.fillStyle = '#c9b890'
      ctx.fillText('on Movechi', textX, 380)
      
      // CTA
      ctx.font = '32px Arial, sans-serif'
      ctx.fillStyle = '#d4c4a0'
      ctx.fillText('movechi.app', textX, 500)
      
      resolve(canvas.toDataURL('image/png'))
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load win card image'))
    }
    
    img.src = selectedCard
  })
}
