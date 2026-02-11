import { useState, useEffect, useCallback } from 'react'
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk"
import Header from './components/Header'
import TxToast from './components/TxToast'
import './Staking.css'

// --- CONFIGURATION ---
const movementConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: 'https://testnet.movementnetwork.xyz/v1',
  indexer: 'https://indexer.testnet.movementnetwork.xyz/v1/graphql', 
})

const aptosClient = new Aptos(movementConfig)

// 1. YOUR CONTRACT INFO
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x361bb3204139e0537679d67b03866f8bb9a10d420e39cbf30c22da71b456b10d"
const MODULE_NAME = "main" // Assuming your module is named 'main' inside the address above

// 2. YOUR SPECIFIC COLLECTION ID (Mainnet)
const DEFAULT_COLLECTION_ID = import.meta.env.VITE_COLLECTION_ID || "0x4c28d9362f440dedec5013742fb21fd4693b56add430e9a5874b220b681053ae"

const SECONDS_PER_DAY = 86400;

function Staking() {
  const { connected, account, signAndSubmitTransaction, disconnect } = useWallet()
  const [showWalletDropdown, setShowWalletDropdown] = useState(false)
  
  // --- STATE ---
  const [loading, setLoading] = useState(false)
  const [txStatus, setTxStatus] = useState(null)
  const [collectionId, setCollectionId] = useState(DEFAULT_COLLECTION_ID)
  
  // Transaction Toast
  const [confirmedTxHash, setConfirmedTxHash] = useState(null)
  const [txToastMessage, setTxToastMessage] = useState('')
  
  // Data
  const [walletNfts, setWalletNfts] = useState([])
  const [stakedNfts, setStakedNfts] = useState([])
  
  // Selection
  const [selectedWalletIds, setSelectedWalletIds] = useState([])
  const [selectedStakedIds, setSelectedStakedIds] = useState([])
  
  // Stats
  const [dailyYield, setDailyYield] = useState(0)
  const [isClaimable, setIsClaimable] = useState(false)
  const [nextClaimTime, setNextClaimTime] = useState(null)

  // --- FETCH COLLECTION ID FROM CONTRACT ---
  const fetchCollectionId = useCallback(async () => {
    try {
      const resourceType = `${CONTRACT_ADDRESS}::main::GameState`
      const resource = await aptosClient.getAccountResource({
        accountAddress: CONTRACT_ADDRESS,
        resourceType: resourceType
      })
      const gameState = resource?.data?.data || resource?.data || resource
      if (gameState?.whitelist_collection) {
        const collAddr = gameState.whitelist_collection
        const normalized = collAddr.startsWith('0x') ? collAddr.toLowerCase() : `0x${collAddr.toLowerCase()}`
        setCollectionId(normalized)
        console.log("Collection ID from contract:", normalized)
      }
    } catch (e) {
      console.warn("Could not fetch collection ID from contract, using default:", e)
      setCollectionId(DEFAULT_COLLECTION_ID)
    }
  }, [])

  useEffect(() => {
    fetchCollectionId()
  }, [])

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    if (!connected || !account) return

    try {
        const userAddr = account.address.toString()

        // 1. Fetch User Profile from Contract (Move Resource)
        const resourceType = `${CONTRACT_ADDRESS}::${MODULE_NAME}::UserProfile`
        
        let profileData = null
        try {
            const resource = await aptosClient.getAccountResource({
                accountAddress: userAddr,
                resourceType: resourceType
            })
            profileData = resource
        } catch (e) {
            // 404 is expected if user has never interacted
            console.log("User profile not found (new user).")
        }

        // --- PROCESS STAKED NFTS (RIGHT PANEL) ---
        if (profileData) {
            const stakedAddrs = profileData.staked_nfts || []
            
            // Map staked addresses to display objects
            // Note: Since these are locked in the contract, we use a placeholder image
            // unless we fetch metadata individually.
            const stakedObjs = stakedAddrs.map((addr, idx) => ({
                id: addr,
                name: `Staked #${idx + 1}`, 
                uri: 'https://placehold.co/400x400/1a1815/c9a961?text=LOCKED' 
            }))
            setStakedNfts(stakedObjs)

            // Check Claim Status
            const lastClaim = Number(profileData.last_day_claimed || 0)
            const nowSeconds = Math.floor(Date.now() / 1000)
            const currentDay = Math.floor(nowSeconds / SECONDS_PER_DAY)
            
            const canClaim = lastClaim < currentDay && stakedAddrs.length > 0
            setIsClaimable(canClaim)
            
            // Calculate Next Claim Time for UI
            if (!canClaim && stakedAddrs.length > 0) {
                 const nextDayStart = (currentDay + 1) * SECONDS_PER_DAY
                 const date = new Date(nextDayStart * 1000)
                 setNextClaimTime(date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}))
            } else {
                setNextClaimTime(null)
            }
            
            setDailyYield(stakedAddrs.length * 5) // 5 XP per NFT logic
        } else {
            setStakedNfts([])
            setIsClaimable(false)
            setDailyYield(0)
        }

        // --- PROCESS WALLET NFTS (LEFT PANEL) ---
        // Fetch all tokens owned by the user
        const ownedTokens = await aptosClient.getAccountOwnedTokens({
            accountAddress: userAddr
        });

        console.log("Raw owned tokens:", ownedTokens);

        // Filter STRICTLY by your Collection ID
        const myCollectionTokens = ownedTokens.filter(token => {
            // Handle both v1 and v2 token standards if necessary, usually current_token_data.collection_id
            const tokenCollId = token.current_token_data?.collection_id
            const normalizedTokenCollId = tokenCollId ? (tokenCollId.startsWith('0x') ? tokenCollId.toLowerCase() : `0x${tokenCollId.toLowerCase()}`) : null
            const normalizedCollId = collectionId.startsWith('0x') ? collectionId.toLowerCase() : `0x${collectionId.toLowerCase()}`
            return normalizedTokenCollId === normalizedCollId
        }).map(token => {
            // For Aptos Digital Assets (Token Objects), we need the storage_id which is the object address
            const objectAddress = token.storage_id || token.token_data_id;
            console.log("Token object address:", objectAddress, "Name:", token.current_token_data?.token_name);
            return {
                id: objectAddress,
                name: token.current_token_data?.token_name || "Unknown NFT",
                uri: token.current_token_data?.token_uri || 'https://placehold.co/400x400/2a2520/e8dcc8?text=Movechi'
            }
        });

        console.log("Filtered collection tokens:", myCollectionTokens);
        setWalletNfts(myCollectionTokens)

    } catch (e) {
        console.error("Fetch error", e)
    }
  }, [connected, account, collectionId])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 10 seconds to catch updates
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  // --- ACTIONS ---

  const toggleWalletSelect = (id) => {
    if (selectedWalletIds.includes(id)) {
        setSelectedWalletIds(prev => prev.filter(i => i !== id))
    } else {
        setSelectedWalletIds(prev => [...prev, id])
    }
  }

  const toggleStakedSelect = (id) => {
    if (selectedStakedIds.includes(id)) {
        setSelectedStakedIds(prev => prev.filter(i => i !== id))
    } else {
        setSelectedStakedIds(prev => [...prev, id])
    }
  }

  const handleStake = async () => {
    if (selectedWalletIds.length === 0) return
    setLoading(true)
    setTxStatus("Sign in wallet...")
    try {
                console.log("Staking NFTs with addresses:", selectedWalletIds);
                // Convert address strings to proper format for Object<Token> vector
                const nftAddresses = selectedWalletIds
                    .map((id) => {
                        if (!id) return null
                        return id.startsWith('0x') ? id : `0x${id}`
                    })
                    .filter(Boolean)
                if (nftAddresses.length === 0) {
                    throw new Error('No valid NFT addresses to stake')
                }
                console.log("Formatted NFT addresses:", nftAddresses);
        
                                const payload = {
                                    data: {
                                        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::stake_nfts`,
                                        typeArguments: [],
                                        functionArguments: [nftAddresses],
                                    }
                                }
                                console.log("Stake payload:", payload);
                                const response = await signAndSubmitTransaction(payload)
        console.log("Transaction submitted:", response);
        setTxStatus("Staking...")
        await aptosClient.waitForTransaction({ transactionHash: response.hash })
        
        setTxStatus("Staked Successfully! 🛡️")
        setConfirmedTxHash(response.hash)
        setTxToastMessage("NFT Staked Successfully!")
        setSelectedWalletIds([])
        // Small delay to allow indexer/chain to update
        setTimeout(fetchData, 1000)
    } catch (e) {
        console.error("Stake error:", e)
        const errStr = e?.message || e?.toString() || 'Unknown error';
        console.error("Error details:", errStr);
        
        if (errStr.includes("101") || errStr.includes("E_GAME_PAUSED")) {
            setTxStatus("⚠️ Game is paused")
        } else if (errStr.includes("301") || errStr.includes("E_WRONG_COLLECTION")) {
            setTxStatus("⚠️ Wrong collection")
        } else if (errStr.includes("300") || errStr.includes("E_NOT_OWNER")) {
            setTxStatus("⚠️ Not NFT owner")
        } else {
            setTxStatus("Stake Failed: " + errStr)
        }
    } finally {
        setTimeout(() => setTxStatus(null), 5000)
        setLoading(false)
    }
  }

  const handleUnstake = async () => {
    if (selectedStakedIds.length === 0) return
    setLoading(true)
    setTxStatus("Sign in wallet...")
    try {
        // Convert address strings to proper format
        const nftAddresses = selectedStakedIds.map(id => {
            if (!id.startsWith('0x')) return '0x' + id;
            return id;
        });
        
                                const payload = {
                                    data: {
                                        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::unstake_nfts`,
                                        typeArguments: [],
                                        functionArguments: [nftAddresses],
                                    }
                                }
                                const response = await signAndSubmitTransaction(payload)
        setTxStatus("Unstaking...")
        await aptosClient.waitForTransaction({ transactionHash: response.hash })
        
        setTxStatus("Unstaked Successfully! 🔓")
        setConfirmedTxHash(response.hash)
        setTxToastMessage("NFT Unstaked Successfully!")
        setSelectedStakedIds([])
        setTimeout(fetchData, 1000)
    } catch (e) {
        console.error(e)
        const errStr = e.toString()
        if (errStr.includes("302")) { 
            setTxStatus("⚠️ Locked: Must wait 24h")
        } else if (errStr.includes("301")) {
            setTxStatus("⚠️ Batch Limit Exceeded")
        } else {
            setTxStatus("Unstake Failed")
        }
    } finally {
        setTimeout(() => setTxStatus(null), 4000)
        setLoading(false)
    }
  }

  const handleClaimXP = async () => {
    setLoading(true)
    setTxStatus("Claiming daily XP...")
    try {
                                const payload = {
                                    data: {
                                        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::claim_daily_xp`,
                                        typeArguments: [],
                                        functionArguments: [],
                                    }
                                }
                                const response = await signAndSubmitTransaction(payload)
        await aptosClient.waitForTransaction({ transactionHash: response.hash })
        setTxStatus(`Claimed ${dailyYield} XP! ⚡`)
        setConfirmedTxHash(response.hash)
        setTxToastMessage(`Claimed ${dailyYield} XP!`)
        
        setIsClaimable(false)
        setTimeout(fetchData, 1000)
    } catch (e) {
        const errMsg = e?.toString?.() || ''
        if (errMsg.includes('104')) setTxStatus("⚠️ Season not active")
        else if (errMsg.includes('203')) setTxStatus("⚠️ Already claimed today")
        else setTxStatus("Claim failed")
    } finally {
        setTimeout(() => setTxStatus(null), 4000)
        setLoading(false)
    }
  }

  // --- HELPERS ---
  const handleDisconnect = async () => { try { await disconnect(); setShowWalletDropdown(false) } catch (e) {} }

  return (
    <div className="staking-page">
      <Header activePage="staking" />

      <div className="staking-container">
        
        {/* STATS HEADER */}
        <div className="staking-stats-bar">
            <div className="stat-block">
                <span className="stat-lbl">TOTAL STAKED</span>
                <span className="stat-val">{stakedNfts.length}</span>
            </div>
            <div className="stat-block">
                <span className="stat-lbl">DAILY YIELD</span>
                <span className="stat-val highlight">{dailyYield} XP</span>
            </div>
            <div className="stat-block claim-block">
                <span className="stat-lbl">STATUS</span>
                {isClaimable ? (
                    <button className="claim-xp-btn" onClick={handleClaimXP} disabled={loading}>
                        CLAIM {dailyYield} XP
                    </button>
                ) : (
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                         <span className="stat-val claimed">ALL CAUGHT UP</span>
                         {nextClaimTime && <span style={{fontSize: '0.8rem', color:'#666'}}>Next: {nextClaimTime}</span>}
                    </div>
                )}
            </div>
        </div>

        {txStatus && <div className="staking-status-msg">{txStatus}</div>}

        <div className="staking-split-view">
            
            {/* LEFT: WALLET */}
            <div className="nft-panel">
                <div className="panel-header">
                    <h2>IN WALLET ({walletNfts.length})</h2>
                    <p>Select items to stake.</p>
                </div>
                
                <div className="nft-grid">
                    {!connected && <div className="empty-state">Connect Wallet</div>}
                    {connected && walletNfts.length === 0 && <div className="empty-state">No Movechi Found</div>}
                    {walletNfts.map(nft => (
                        <div 
                            key={nft.id} 
                            className={`nft-card ${selectedWalletIds.includes(nft.id) ? 'selected' : ''}`}
                            onClick={() => toggleWalletSelect(nft.id)}
                        >
                            <img src={nft.uri} alt={nft.name} onError={(e)=>{e.target.src='https://placehold.co/400?text=IMG'}} />
                            <div className="nft-name">{nft.name}</div>
                            {selectedWalletIds.includes(nft.id) && <div className="check-mark">✓</div>}
                        </div>
                    ))}
                </div>

                <div className="panel-action">
                    <button 
                        className={`action-btn stake ${selectedWalletIds.length === 0 ? 'disabled' : ''}`}
                        onClick={handleStake}
                        disabled={selectedWalletIds.length === 0 || loading}
                    >
                        {loading ? "PROCESSING..." : `STAKE ${selectedWalletIds.length > 0 ? `(${selectedWalletIds.length})` : ''}`}
                    </button>
                </div>
            </div>

            {/* ARROW ICON */}
            <div className="transfer-icon">⇄</div>

            {/* RIGHT: STAKED */}
            <div className={`nft-panel active-panel`}>
                <div className="panel-header">
                    <h2>STAKED VAULT ({stakedNfts.length})</h2>
                    <p>Earning 5 XP per day. 24h Lock.</p>
                </div>

                <div className="nft-grid">
                    {!connected && <div className="empty-state">Connect Wallet</div>}
                    {connected && stakedNfts.length === 0 && <div className="empty-state">Vault Empty</div>}
                    {stakedNfts.map(nft => (
                        <div 
                            key={nft.id} 
                            className={`nft-card ${selectedStakedIds.includes(nft.id) ? 'selected' : ''}`}
                            onClick={() => toggleStakedSelect(nft.id)}
                        >
                            <img src={nft.uri} alt={nft.name} onError={(e)=>{e.target.src='https://placehold.co/400?text=IMG'}} />
                            <div className="nft-name">{nft.name}</div>
                            <div className="status-badge">EARNING</div>
                            {selectedStakedIds.includes(nft.id) && <div className="check-mark red">✕</div>}
                        </div>
                    ))}
                </div>

                <div className="panel-action">
                    <button 
                        className={`action-btn unstake ${selectedStakedIds.length === 0 ? 'disabled' : ''}`}
                        onClick={handleUnstake}
                        disabled={selectedStakedIds.length === 0 || loading}
                    >
                        {loading ? "PROCESSING..." : `UNSTAKE ${selectedStakedIds.length > 0 ? `(${selectedStakedIds.length})` : ''}`}
                    </button>
                </div>
            </div>

        </div>
      </div>
      
      {/* Transaction Toast */}
      {confirmedTxHash && (
        <TxToast 
          txHash={confirmedTxHash}
          message={txToastMessage}
          onClose={() => setConfirmedTxHash(null)}
          duration={8000}
        />
      )}
    </div>
  )
}

export default Staking