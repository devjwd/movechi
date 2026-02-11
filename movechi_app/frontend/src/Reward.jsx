import { useState, useEffect, useCallback } from 'react'
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Aptos } from "@aptos-labs/ts-sdk"
import { getAptosConfig } from './config/network'
import { getRandomWinCard } from './utils/shareUtils'
import './Reward.css'

// --- CONFIGURATION ---
const aptosClient = new Aptos(getAptosConfig())
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x361bb3204139e0537679d67b03866f8bb9a10d420e39cbf30c22da71b456b10d" 
const MODULE_NAME = import.meta.env.VITE_MODULE_NAME || "main"

function Reward() {
  const { connected, account, signAndSubmitTransaction, disconnect, connect, wallets } = useWallet()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  
  // Wizard Step: 'welcome' | 'loading' | 'no-reward' | 'congrats' | 'spins' | 'xp' | 'reward' | 'claimed'
  const [step, setStep] = useState('welcome')
  
  // Claim State
  const [claiming, setClaiming] = useState(false)
  const [claimStatus, setClaimStatus] = useState(null)
  const [claimMessage, setClaimMessage] = useState('')
  const [txHash, setTxHash] = useState('')
  const [claimedAmount, setClaimedAmount] = useState(0)
  
  // Game Data
  const [isClaimWindowActive, setIsClaimWindowActive] = useState(false)
  const [totalXpGlobal, setTotalXpGlobal] = useState(0)
  const [rewardPoolBalance, setRewardPoolBalance] = useState(0)
  const [totalPlayers, setTotalPlayers] = useState(0)
  
  // User Data
  const [userXp, setUserXp] = useState(0)
  const [userSharePct, setUserSharePct] = useState(0)
  const [estimatedReward, setEstimatedReward] = useState(0)
  const [userTickets, setUserTickets] = useState(0)
  const [userLifetimeWins, setUserLifetimeWins] = useState(0)
  const [userPercentile, setUserPercentile] = useState(0)
  const [hasReward, setHasReward] = useState(false)
  const [hasAlreadyClaimed, setHasAlreadyClaimed] = useState(false)

  // Check localStorage for claimed status on mount
  useEffect(() => {
    if (connected && account?.address) {
      const claimedKey = `movechi_claimed_${account.address.toString()}`
      const stored = localStorage.getItem(claimedKey)
      if (stored) {
        const data = JSON.parse(stored)
        setClaimedAmount(data.amount)
        setTxHash(data.txHash || '')
        setHasAlreadyClaimed(true)
      }
    }
  }, [connected, account])

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    try {
      const resourceType = `${CONTRACT_ADDRESS}::${MODULE_NAME}::GameState`
      const resource = await aptosClient.getAccountResource({
        accountAddress: CONTRACT_ADDRESS,
        resourceType: resourceType
      })
      
      const gameData = resource?.data?.data ?? resource?.data ?? resource
      const claimWindowActive = gameData.claim_window_active || false
      const globalXp = Number(gameData.total_global_xp || 0)
      const activePlayers = gameData.active_players?.length || 100
      
      setIsClaimWindowActive(claimWindowActive)
      setTotalXpGlobal(globalXp)
      setTotalPlayers(activePlayers)

      // Fetch Reward Pool Balance
      let poolBalance = 0
      try {
        const rewardCapAddr = gameData.reward_cap?.account
        if (rewardCapAddr) {
          const balance = await aptosClient.getAccountCoinAmount({
            accountAddress: rewardCapAddr,
            coinType: "0x1::aptos_coin::AptosCoin"
          })
          poolBalance = Number(balance) / 100000000
          setRewardPoolBalance(poolBalance)
        }
      } catch (e) {
        console.warn("Error fetching reward pool:", e)
      }

      // Fetch User Profile
      if (connected && account?.address) {
        const userAddr = typeof account.address === 'string' ? account.address : account.address.toString()
        const userProfileType = `${CONTRACT_ADDRESS}::${MODULE_NAME}::UserProfile`
        
        try {
          const profileRes = await aptosClient.getAccountResource({
            accountAddress: userAddr,
            resourceType: userProfileType
          })
          
          const udata = profileRes?.data?.data ?? profileRes?.data ?? profileRes
          
          // Check if already claimed
          const alreadyClaimed = udata.claimed_amount ?? 0
          if (alreadyClaimed > 0) {
            const claimedVal = typeof alreadyClaimed === 'string' ? Number(BigInt(alreadyClaimed)) : Number(alreadyClaimed)
            const claimedTokens = claimedVal / 100000000
            setClaimedAmount(claimedTokens)
            setHasAlreadyClaimed(true)
            return 'already-claimed'
          }
          
          // XP
          const xpRaw = udata.accumulated_xp ?? 0
          let xp = typeof xpRaw === 'string' ? Number(BigInt(xpRaw)) : Number(xpRaw)
          setUserXp(xp)
          
          // Tickets/Spins
          const ticketsRaw = udata.tickets ?? 0
          const tickets = typeof ticketsRaw === 'string' ? Number(BigInt(ticketsRaw)) : Number(ticketsRaw)
          setUserTickets(tickets)
          
          // Lifetime MOVE wins
          const winsRaw = udata.lifetime_wins ?? 0
          let wins = typeof winsRaw === 'string' ? Number(BigInt(winsRaw)) : Number(winsRaw)
          wins = wins / 100000000
          setUserLifetimeWins(wins)
          
          // Calculate share and reward
          if (globalXp > 0 && xp > 0) {
            const share = xp / globalXp
            setUserSharePct(share * 100)
            const estimated = share * poolBalance
            setEstimatedReward(estimated)
            // Calculate percentile (simplified - assumes you're above average if you have XP)
            const avgXp = globalXp / activePlayers
            const percentile = Math.min(99, Math.max(1, Math.round((xp / avgXp) * 50 + 25)))
            setUserPercentile(percentile)
            setHasReward(true)
            return true
          } else {
            setUserSharePct(0)
            setEstimatedReward(0)
            setUserPercentile(0)
            setHasReward(false)
            return false
          }
        } catch (e) {
          if (e?.status === 404 || e?.message?.includes('404') || e?.message?.includes('not found')) {
            setUserXp(0)
            setUserTickets(0)
            setUserLifetimeWins(0)
            setHasReward(false)
            return false
          }
          throw e
        }
      }
      return false
    } catch (e) {
      console.error("Fetch error:", e)
      return false
    }
  }, [connected, account])

  // When wallet connects, start loading and check rewards
  useEffect(() => {
    if (connected && account) {
      // Check localStorage first
      const claimedKey = `movechi_claimed_${account.address.toString()}`
      const stored = localStorage.getItem(claimedKey)
      
      if (stored) {
        // User already claimed, show claimed page immediately after loading
        setStep('loading')
        setTimeout(() => {
          setStep('claimed')
        }, 1500)
      } else {
        // Normal flow - check contract
        setStep('loading')
        fetchData().then(result => {
          setTimeout(() => {
            if (result === 'already-claimed') {
              setStep('claimed')
            } else if (result === true) {
              setStep('congrats')
            } else {
              setStep('no-reward')
            }
          }, 2000) // Show loading for 2 seconds
        })
      }
    } else {
      setStep('welcome')
    }
  }, [connected, account, fetchData])

  // --- CLAIM HANDLER ---
  const handleClaim = async () => {
    if (!connected || !account) return
    
    setClaiming(true)
    setClaimStatus(null)
    setClaimMessage('')
    setTxHash('')

    try {
      const payload = {
        data: {
          function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::claim_season_rewards`,
          typeArguments: [],
          functionArguments: [],
        },
      }

      const response = await signAndSubmitTransaction(payload)
      await aptosClient.waitForTransaction({ transactionHash: response.hash })
      
      setClaimStatus('success')
      setTxHash(response.hash)
      setClaimedAmount(estimatedReward)
      setClaimMessage(`Successfully claimed ${estimatedReward.toFixed(4)} MOVE tokens!`)
      setHasAlreadyClaimed(true)
      setStep('claimed')
      
      // Save to localStorage
      if (account?.address) {
        const claimedKey = `movechi_claimed_${account.address.toString()}`
        localStorage.setItem(claimedKey, JSON.stringify({
          amount: estimatedReward,
          txHash: response.hash,
          timestamp: Date.now()
        }))
      }
      
      setTimeout(() => fetchData(), 2000)
    } catch (error) {
      console.error("Claim failed", error)
      setClaimStatus('error')
      const errorStr = error?.message?.toLowerCase() || ''
      
      if (errorStr.includes('102') || errorStr.includes('season')) 
        setClaimMessage('Season has not ended yet.')
      else if (errorStr.includes('401') || errorStr.includes('nothing')) 
        setClaimMessage('No rewards to claim.')
      else if (errorStr.includes('402') || errorStr.includes('empty')) 
        setClaimMessage('Reward pool is empty.')
      else if (errorStr.includes('rejected')) 
        setClaimMessage('Transaction rejected.')
      else 
        setClaimMessage('Transaction failed. Please try again.')
    } finally {
      setClaiming(false)
    }
  }

  // --- HELPERS ---
  const formatAddress = (address) => address ? `${address.toString().slice(0, 6)}...${address.toString().slice(-4)}` : ''
  
  const handleWalletSelection = async (walletName) => {
    if (!acceptedTerms) {
      alert('Please accept the Terms and Conditions to continue')
      return
    }
    try {
      await connect(walletName)
      setShowWalletModal(false)
      setAcceptedTerms(false)
    } catch (e) {
      console.error('Wallet connect failed', e)
    }
  }

  const nextStep = () => {
    if (step === 'congrats') setStep('spins')
    else if (step === 'spins') setStep('xp')
    else if (step === 'xp') setStep('reward')
  }

  // --- RENDER STEPS ---
  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="step-container fade-in">
            <img src="/movechi2.png" alt="Claim rewards" className="step-icon welcome-icon" />
            <h1 className="step-title">Claim Your Rewards</h1>
            <p className="step-text">Connect your wallet to check if you're eligible for rewards</p>
            <button className="primary-btn" onClick={() => setShowWalletModal(true)}>
              <span className="btn-icon"></span>
              Connect Wallet
            </button>
          </div>
        )
      
      case 'loading':
        return (
          <div className="step-container fade-in">
            <div className="loading-spinner-large"></div>
            <h1 className="step-title">Checking Eligibility...</h1>
            <p className="step-text">Please wait while we verify your rewards</p>
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )
      
      case 'no-reward':
        return (
          <div className="step-container fade-in">
            <img src="/movechi4.png" alt="No rewards" className="step-icon sad" />
            <h1 className="step-title">No Rewards Found</h1>
            <p className="step-text">
              Sorry, we couldn't find any rewards for this wallet.<br/>
              You may not have participated in this season or have already claimed.
            </p>
            <div className="wallet-info">
              <span>Connected:</span> {formatAddress(account?.address)}
            </div>
            <button className="secondary-btn" onClick={() => disconnect()}>
              Try Another Wallet
            </button>
          </div>
        )
      
      case 'congrats':
        return (
          <div className="step-container fade-in">
            <div className="confetti-bg"></div>
            <img src="/movechi5.png" alt="Congratulations" className="step-icon bounce congrats-icon" />
            <h1 className="step-title glow">Congratulations!</h1>
            <p className="step-text">
              Thank you for being part of the MoveChi<br/>
              You have rewards waiting for you.
            </p>
            <div className="wallet-info success">
              <span>✓</span> {formatAddress(account?.address)}
            </div>
            <button className="primary-btn pulse" onClick={nextStep}>
              Continue
              <span className="btn-arrow">→</span>
            </button>
          </div>
        )
      
      case 'spins':
        return (
          <div className="step-container fade-in">
            <div className="stat-showcase">
              <img src="/movechi6.png" alt="Total Spins" className="showcase-icon spins-icon" />
              <div className="showcase-value">{userTickets.toLocaleString()}</div>
              <div className="showcase-label">Total Spins</div>
            </div>
            <p className="step-text highlight">
              You spun the wheel <strong>{userTickets.toLocaleString()}</strong> times!
              {userLifetimeWins > 0 && (
                <><br/>And won <strong>{userLifetimeWins.toFixed(2)} MOVE</strong> from jackpots 💰</>
              )}
            </p>
            <button className="primary-btn" onClick={nextStep}>
              Next
              <span className="btn-arrow">→</span>
            </button>
          </div>
        )
      
      case 'xp':
        return (
          <div className="step-container fade-in">
            <div className="stat-showcase gold">
              <img src="/movechi7.png" alt="Total XP Earned" className="showcase-icon xp-icon" />
              <div className="showcase-value">{userXp.toLocaleString()}</div>
              <div className="showcase-label">Total XP Earned</div>
            </div>
            <p className="step-text highlight">
              Amazing! You outperformed <strong>{userPercentile}%</strong> of all players!
            </p>
            <button className="primary-btn glow-btn" onClick={nextStep}>
              Show My Reward
              <span className="btn-arrow">→</span>
            </button>
          </div>
        )
      
      case 'reward':
        return (
          <div className="step-container fade-in">
            <div className="reward-showcase">
              <div className="reward-glow"></div>
              <img src="/movechi3.png" alt="Your Reward" className="reward-icon" />
              <div className="reward-amount">
                <span className="amount-value">{estimatedReward.toFixed(4)} $MOVE</span>
              </div>
              <div className="reward-label">Your Reward</div>
            </div>
            
            {isClaimWindowActive ? (
              <>
                <button 
                  className="claim-btn-large" 
                  onClick={handleClaim}
                  disabled={claiming}
                >
                  {claiming ? (
                    <>
                      <span className="btn-spinner"></span>
                      Claiming...
                    </>
                  ) : (
                    <>
                       Claim Now
                    </>
                  )}
                </button>
                {claimStatus === 'error' && (
                  <div className="error-msg">{claimMessage}</div>
                )}
              </>
            ) : (
              <div className="claim-locked-msg">
                <span className="lock-icon">🔒</span>
                Claim window not yet open. Check back soon!
              </div>
            )}
          </div>
        )
      
      case 'claimed':
        return (
          <div className="step-container fade-in">
            <div className="confetti-bg active"></div>
            <img src="/movechi1.png" alt="Claim Successful" className="step-icon bounce claimed-icon" />
            <h1 className="step-title glow">Claim Successful!</h1>
            <p className="step-text">
              You've claimed <strong>{claimedAmount.toFixed(4)} MOVE</strong> tokens!
            </p>
            <div className="action-buttons">
              {txHash && (
                <a 
                  href={`https://explorer.movementnetwork.xyz/txn/${txHash}?network=mainnet`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="tx-link-btn"
                >
                  View Transaction →
                </a>
              )}
              <button 
                className="share-twitter-btn"
                onClick={() => {
                  const winCard = getRandomWinCard()
                  const tweetText = `🎉 Just claimed ${claimedAmount.toFixed(4)} $MOVE on @Movechi_xyz! 🏆🎮\n\n${winCard}\n\nJoin the game and earn rewards:\nmovechi.xyz\n\n#MovechiGaming #Web3`
                  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
                  window.open(tweetUrl, '_blank', 'noopener,noreferrer')
                }}
              >
                Share on 𝕏
              </button>
            </div>
            <p className="step-text small">
              {txHash ? 'Thank you for being part of MoveChI! 🙏' : 'Your rewards have been claimed. Thank you for being part of MoveChI! 🙏'}
            </p>
            <button 
              className="return-home-btn"
              onClick={() => window.location.href = '/'}
            >
              Return to Home 
            </button>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="reward-page">
      {/* Progress Indicator */}
      {connected && step !== 'welcome' && step !== 'loading' && step !== 'no-reward' && (
        <div className="progress-bar">
          <div className={`progress-dot ${['congrats', 'spins', 'xp', 'reward', 'claimed'].includes(step) ? 'active' : ''}`}></div>
          <div className={`progress-line ${['spins', 'xp', 'reward', 'claimed'].includes(step) ? 'active' : ''}`}></div>
          <div className={`progress-dot ${['spins', 'xp', 'reward', 'claimed'].includes(step) ? 'active' : ''}`}></div>
          <div className={`progress-line ${['xp', 'reward', 'claimed'].includes(step) ? 'active' : ''}`}></div>
          <div className={`progress-dot ${['xp', 'reward', 'claimed'].includes(step) ? 'active' : ''}`}></div>
          <div className={`progress-line ${['reward', 'claimed'].includes(step) ? 'active' : ''}`}></div>
          <div className={`progress-dot ${['reward', 'claimed'].includes(step) ? 'active' : ''}`}></div>
        </div>
      )}

      <div className="reward-content">
        {renderStep()}
      </div>

      {/* WALLET MODAL */}
      {showWalletModal && (
        <div className="wallet-modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="wallet-modal-content" onClick={e => e.stopPropagation()}>
            <div className="wallet-modal-header">
              <h2>Connect Wallet</h2>
            </div>
            <div className="wallet-list">
              {wallets && wallets.length > 0 ? (
                wallets
                  .filter(wallet => {
                    const name = wallet.name.toLowerCase()
                    return !name.includes('google') && !name.includes('apple')
                  })
                  .map((wallet) => (
                    <button 
                      key={wallet.name} 
                      className="wallet-option" 
                      onClick={() => handleWalletSelection(wallet.name)}
                      disabled={!acceptedTerms}
                    >
                      {wallet.icon ? (
                        <img src={wallet.icon} alt={wallet.name} className="wallet-icon" />
                      ) : (
                        <div className="wallet-icon placeholder">🪙</div>
                      )}
                      <span className="wallet-name">{wallet.name}</span>
                    </button>
                  ))
              ) : (
                <p className="no-wallets">No wallets available</p>
              )}
            </div>
            <div className="wallet-terms-container">
              <label className="terms-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="terms-checkbox"
                />
                <span className="checkbox-text">
                  I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="terms-link">Terms and Conditions</a>
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reward
