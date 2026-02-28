import { useState, useEffect } from 'react'
import './TxToast.css'

/**
 * Transaction Toast Component
 * Shows a toast notification in the bottom corner when a transaction is confirmed
 * 
 * @param {string} txHash - The transaction hash
 * @param {string} message - Custom message (default: "Transaction Confirmed")
 * @param {function} onClose - Callback when toast is closed
 * @param {number} duration - Auto-hide duration in ms (default: 8000, 0 to disable)
 */
function TxToast({ txHash, message = "Transaction Confirmed", onClose, duration = 8000 }) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (!txHash) return

    // Auto-hide after duration
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [txHash, duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 300)
  }

  if (!txHash || !isVisible) return null

  const explorerUrl = `https://explorer.movementnetwork.xyz/txn/${txHash}?network=mainnet`
  const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`

  return (
    <div className={`tx-toast ${isExiting ? 'exit' : 'enter'}`}>
      <div className="tx-toast-icon">✓</div>
      <div className="tx-toast-content">
        <span className="tx-toast-title">{message}</span>
        <span className="tx-toast-hash">{shortHash}</span>
      </div>
      <a 
        href={explorerUrl} 
        target="_blank" 
        rel="noreferrer" 
        className="tx-toast-link"
      >
        View on Explorer →
      </a>
      <button className="tx-toast-close" onClick={handleClose}>×</button>
    </div>
  )
}

export default TxToast
