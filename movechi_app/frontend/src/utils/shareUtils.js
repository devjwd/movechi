/**
 * Utility functions for sharing wins on social media
 */


/**
 * Create a shareable jackpot win URL for Twitter/X
 * @param {number} amount - Win amount in MOVE tokens
 * @returns {object} Object with tweet text and URL (no hashtags or cards)
 */
export const createJackpotShareData = (amount) => {
  const shareOrigin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://movechi.app'
  
  // Create the share text with emojis and engagement-friendly language (no hashtags)
  const shareText = `🎰 I JUST HIT THE MOVECHI JACKPOT! 🎰\n\n💰 Won: ${amount}\n\nCan you beat my luck? Play now at @Movechi_xyz`
  
  return {
    text: shareText,
    url: `${shareOrigin}`
  }
}

/**
 * Generate Twitter/X share intent URL with reward information
 * @param {number} amount - Win amount in MOVE tokens
 * @returns {string} Twitter share intent URL (hashtags removed, no card)
 */
export const generateTwitterShareUrl = (amount) => {
  const shareOrigin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://movechi.app'
  
  // Twitter share text - emojis, win amount, and call-to-action (hashtags removed)
  const shareText = `I JUST HIT THE MOVECHI JACKPOT! \n\n💰 Won: ${amount}\n\nCan you beat my luck? Play now at @Movechi_xyz`
  
  const encodedText = encodeURIComponent(shareText)
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodeURIComponent(shareOrigin)}`
  
  return { 
    url: twitterUrl
  }
}

/**
 * Generate a combined share image using canvas (for potential future use)
 * @param {string} winAmount - The win amount string to display
 * @param {string} cardImagePath - Path to the win card image
 * @returns {Promise<string>} Data URL of the combined image
 */
export const generateCombinedShareImage = async (winAmount, cardImagePath = null) => {
  // previously we supported a win card graphic; cards have been removed, so only draw text
  const selectedCard = cardImagePath || ''
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630 // Standard social media image size
    const ctx = canvas.getContext('2d')
    
    // Draw background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw golden border
    ctx.strokeStyle = '#d4c4a0'
    ctx.lineWidth = 4
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)
    
    // If a card path is provided, draw it, otherwise skip
    if (selectedCard) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const imgWidth = 400
        const imgHeight = 600
        const imgX = 50
        const imgY = (canvas.height - imgHeight) / 2 + 30
        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight)
        drawTextArea()
      }
      img.onerror = () => {
        drawTextArea()
      }
      img.src = selectedCard
    } else {
      drawTextArea()
    }

    function drawTextArea() {
      // draw text on the right (or full width if no card)
      const offsetX = selectedCard ? 50 + 400 + 80 : 50
      const textX = offsetX
      
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
  })
}
