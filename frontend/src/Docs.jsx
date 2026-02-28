import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Docs.css';

const Docs = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('intro');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section');
      let current = '';

      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        if (window.scrollY >= sectionTop - 150) {
          current = section.getAttribute('id');
        }
      });

      if (current) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    setIsMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="docs-layout">
      {/* --- MOBILE HEADER --- */}
      <div className="mobile-header">
        <span className="brand-text">MOVECHI DOCS</span>
        <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* --- SIDEBAR NAVIGATION --- */}
      <nav className={`docs-sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="brand">
            MOVECHI
          </Link>
        </div>

        <div className="sidebar-content">
          {/* Getting Started */}
          <div className="nav-group">
            <div className="nav-label">Getting Started</div>
            <button onClick={() => scrollToSection('intro')} className={`nav-item ${activeSection === 'intro' ? 'active' : ''}`}>Introduction</button>
            <button onClick={() => scrollToSection('quickstart')} className={`nav-item ${activeSection === 'quickstart' ? 'active' : ''}`}>Quick Start</button>
            <button onClick={() => scrollToSection('wallet-setup')} className={`nav-item ${activeSection === 'wallet-setup' ? 'active' : ''}`}>Wallet Setup</button>
          </div>

          {/* Problem & Solution */}
          <div className="nav-group">
            <div className="nav-label">Overview</div>
            <button onClick={() => scrollToSection('problem-solution')} className={`nav-item ${activeSection === 'problem-solution' ? 'active' : ''}`}>Problem &amp; Solution</button>
            <button onClick={() => scrollToSection('innovation')} className={`nav-item ${activeSection === 'innovation' ? 'active' : ''}`}>Innovation Highlights</button>
          </div>

          {/* Core Features */}
          <div className="nav-group">
            <div className="nav-label">Core Features</div>
            <button onClick={() => scrollToSection('nft-collection')} className={`nav-item ${activeSection === 'nft-collection' ? 'active' : ''}`}>NFT Collection</button>
            <button onClick={() => scrollToSection('staking')} className={`nav-item ${activeSection === 'staking' ? 'active' : ''}`}>Staking System</button>
            <button onClick={() => scrollToSection('spin-game')} className={`nav-item ${activeSection === 'spin-game' ? 'active' : ''}`}>Spin &amp; Win Game</button>
          </div>

          {/* Spin Mechanics */}
          <div className="nav-group">
            <div className="nav-label">Spin Mechanics</div>
            <button onClick={() => scrollToSection('spin-mechanics')} className={`nav-item ${activeSection === 'spin-mechanics' ? 'active' : ''}`}>How Spins Work</button>
            <button onClick={() => scrollToSection('free-spins')} className={`nav-item ${activeSection === 'free-spins' ? 'active' : ''}`}>Free Spins</button>
            <button onClick={() => scrollToSection('paid-spins')} className={`nav-item ${activeSection === 'paid-spins' ? 'active' : ''}`}>Paid Spins</button>
          </div>

          {/* Rewards & Economy */}
          <div className="nav-group">
            <div className="nav-label">Rewards &amp; Economy</div>
            <button onClick={() => scrollToSection('xp-system')} className={`nav-item ${activeSection === 'xp-system' ? 'active' : ''}`}>XP System</button>
            <button onClick={() => scrollToSection('seasonal-economy')} className={`nav-item ${activeSection === 'seasonal-economy' ? 'active' : ''}`}>Seasonal Economy</button>
            <button onClick={() => scrollToSection('raffle-tickets')} className={`nav-item ${activeSection === 'raffle-tickets' ? 'active' : ''}`}>Raffle Tickets</button>
          </div>

          {/* Technical */}
          <div className="nav-group">
            <div className="nav-label">Technical</div>
            <button onClick={() => scrollToSection('tech-stack')} className={`nav-item ${activeSection === 'tech-stack' ? 'active' : ''}`}>Technology Stack</button>
            <button onClick={() => scrollToSection('smart-contract')} className={`nav-item ${activeSection === 'smart-contract' ? 'active' : ''}`}>Smart Contract</button>
            <button onClick={() => scrollToSection('vault-system')} className={`nav-item ${activeSection === 'vault-system' ? 'active' : ''}`}>4 Vault System</button>
            <button onClick={() => scrollToSection('entry-functions')} className={`nav-item ${activeSection === 'entry-functions' ? 'active' : ''}`}>Entry Functions</button>
            <button onClick={() => scrollToSection('error-codes')} className={`nav-item ${activeSection === 'error-codes' ? 'active' : ''}`}>Error Codes</button>
          </div>

          {/* Integration */}
          <div className="nav-group">
            <div className="nav-label">Integration</div>
            <button onClick={() => scrollToSection('integration')} className={`nav-item ${activeSection === 'integration' ? 'active' : ''}`}>Integration Guide</button>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="docs-main">
        <div className="docs-content-wrapper">

          {/* ============================================= */}
          {/* INTRODUCTION */}
          {/* ============================================= */}
          <section id="intro">
            <h1>🏆 Movechi: NFT Gaming Meets DeFi</h1>
            <p className="lead">
              A next-generation NFT gaming platform on Movement Network combining collectibles, staking, and provably fair gameplay mechanics.
            </p>

            <div className="callout info">
              <strong className="callout-title">🌟 About Movechi</strong>
              <p>
                Movechi is a decentralized NFT gaming platform built on Movement Network that combines collectibles with an interactive earning system. Mint unique NFT characters, stake them for daily XP rewards, and spin the wheel for a chance to win jackpots and raffle tickets.
              </p>
            </div>

            <div className="callout tip">
              <strong className="callout-title">Official Domain</strong>
              <p>
                Access the official Movechi experience at <a href="https://movechi.xyz" target="_blank" rel="noopener noreferrer">movechi.xyz</a>.
              </p>
            </div>

            <h3>Key Features</h3>
            <ul>
              <li><strong>NFT Collection:</strong> Unique character collection on Movement Network</li>
              <li><strong>Staking Rewards:</strong> 5 XP per NFT per day, claimed daily</li>
              <li><strong>Spin &amp; Win Game:</strong> Wheel-based game with jackpot, raffle tickets, and XP bonuses</li>
              <li><strong>Seasonal Mechanics:</strong> Season-based gameplay with winner selection and claim windows</li>
              <li><strong>On-Chain Randomness:</strong> Provably fair outcomes using Movement Network's randomness</li>
            </ul>

            <h3>📊 Project Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-value">652</div>
                <div className="metric-label">Lines of Move Code</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">9</div>
                <div className="metric-label">Entry Functions</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">20+</div>
                <div className="metric-label">Error Codes</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">4</div>
                <div className="metric-label">Vault System</div>
              </div>
            </div>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* QUICK START */}
          {/* ============================================= */}
          <section id="quickstart">
            <h2>🚀 Quick Start</h2>

            <h3>Step 1: Connect Your Wallet</h3>
            <p>Click the CONNECT button in the top-right corner and select your wallet (Razor, Nightly, or Leap).</p>

            <h3>Step 2: Get MOVE Tokens</h3>
            <p>Ensure you have MOVE tokens in your wallet for gas fees and spins. You can acquire MOVE from supported exchanges.</p>

            <h3>Step 3: Explore the App</h3>
            <ul>
              <li><a href="https://movechi.xyz/" target="_blank" rel="noopener noreferrer">movechi.xyz/</a> - Home page with collection info</li>
              <li><a href="https://movechi.xyz/spin" target="_blank" rel="noopener noreferrer">movechi.xyz/spin</a> - Main spin &amp; win game</li>
              <li><a href="https://movechi.xyz/staking" target="_blank" rel="noopener noreferrer">movechi.xyz/staking</a> - Stake NFTs and manage rewards</li>
            </ul>

            <div className="callout success">
              <strong className="callout-title">✓ Ready to Go</strong>
              <p>Once your wallet is connected with MOVE tokens, you're ready to start playing!</p>
            </div>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* WALLET SETUP */}
          {/* ============================================= */}
          <section id="wallet-setup">
            <h2>🔧 Wallet Setup</h2>

            <h3>Network Details</h3>
            <table className="docs-table">
              <tbody>
                <tr><td><strong>Network Name</strong></td><td>Movement Network Mainnet</td></tr>
                <tr><td><strong>RPC URL</strong></td><td>https://mainnet.movementnetwork.xyz/v1</td></tr>
                <tr><td><strong>Chain ID</strong></td><td>126</td></tr>
              </tbody>
            </table>

            <h3>Supported Wallets</h3>
            <ul>
              <li><strong>Razor Wallet</strong> - Recommended</li>
              <li><strong>Nightly Wallet</strong></li>
              <li><strong>Leap Wallet</strong></li>
            </ul>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* PROBLEM & SOLUTION */}
          {/* ============================================= */}
          <section id="problem-solution">
            <h2>🎯 Problem &amp; Solution</h2>

            <h3>The Problem</h3>
            <div className="callout warning">
              <strong className="callout-title">⚠️ Current NFT Gaming Challenges</strong>
              <ul>
                <li><strong>Utility Gap:</strong> Most NFT collections lack real utility beyond speculation</li>
                <li><strong>Engagement Drop-off:</strong> Users lose interest after minting with no ongoing incentives</li>
                <li><strong>Unfair Randomness:</strong> Off-chain RNG systems are opaque and unverifiable</li>
                <li><strong>Unsustainable Economics:</strong> Many play-to-earn models collapse due to poor tokenomics</li>
                <li><strong>Addiction Risks:</strong> Unlimited gambling mechanics can exploit vulnerable users</li>
              </ul>
            </div>

            <h3>Our Solution</h3>
            <div className="callout success">
              <strong className="callout-title">✓ Movechi's Approach</strong>
              <ol>
                <li>
                  <strong>Real Utility Through Staking:</strong> NFT holders earn 5 XP per NFT daily by staking, creating passive value beyond market speculation. XP unlocks free spins and increases raffle chances.
                </li>
                <li>
                  <strong>Sustained Engagement via Seasonal Gameplay:</strong> 3-phase seasonal system keeps users returning: Active season (daily spins) → Claim window (reward collection) → Finalization (winner announcement).
                </li>
                <li>
                  <strong>Provably Fair On-Chain Randomness:</strong> All spin outcomes use Movement Network's native randomness module. Every result is verifiable on-chain, eliminating trust issues.
                </li>
                <li>
                  <strong>Sustainable 4-Vault Economics:</strong> Revenue distribution: 35% Instant Wins, 35% Seasonal Jackpot, 20% Reward Pool, 10% Admin. Balanced design prevents economic collapse.
                </li>
                <li>
                  <strong>Responsible Gaming Features:</strong> Daily spin limits, free spin tiers based on staking commitment, and transparent odds (9% jackpot, 46% tickets, 45% XP).
                </li>
              </ol>
            </div>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* INNOVATION HIGHLIGHTS */}
          {/* ============================================= */}
          <section id="innovation">
            <h2>💡 Innovation Highlights</h2>

            <h3>Technical Innovations</h3>

            <h4>1️⃣ Multi-Vault Resource Account Architecture</h4>
            <p>Movechi implements a sophisticated 4-vault system using Move's resource account capabilities:</p>
            <ul>
              <li><strong>Instant Vault:</strong> SignerCapability for immediate jackpot payouts (35% of revenue)</li>
              <li><strong>Seasonal Vault:</strong> Accumulates funds for end-of-season winner (35% of revenue)</li>
              <li><strong>Sponsor Vault:</strong> Admin-funded rewards pool for promotions and events</li>
              <li><strong>Reward Vault:</strong> Distributes daily XP claim bonuses (20% of revenue)</li>
            </ul>

            <h4>2️⃣ Composite Key Design for Raffle Tickets</h4>
            <p>Custom <code>TicketKey</code> struct combining season ID + ticket number enables efficient ticket tracking across multiple seasons:</p>
            <pre className="code-block">{`struct TicketKey has store, drop, copy {
    season: u64,
    ticket_id: u64
}`}</pre>
            <p>This design allows O(1) ticket lookups and prevents cross-season ticket contamination.</p>

            <h4>3️⃣ Time-Based State Machine</h4>
            <p>Seasonal system implements a finite state machine with time-based transitions:</p>
            <ul>
              <li><strong>State 1:</strong> Active Season (7-30 days) - users play, earn tickets</li>
              <li><strong>State 2:</strong> Claim Window (3-7 days) - winner can claim prize</li>
              <li><strong>State 3:</strong> Finalized - admin can start new season</li>
            </ul>

            <h3>Gameplay Innovations</h3>

            <h4>4️⃣ Tiered Free Spin System</h4>
            <p>Free spins scale with staking commitment, rewarding long-term holders:</p>
            <table className="docs-table">
              <thead>
                <tr><th>Staked NFTs</th><th>Free Spins/Day</th><th>Value/Day</th></tr>
              </thead>
              <tbody>
                <tr><td>1-4 NFTs</td><td>1 spin</td><td>1 MOVE/day</td></tr>
                <tr><td>5-9 NFTs</td><td>2 spins</td><td>2 MOVE/day</td></tr>
                <tr><td>10+ NFTs</td><td>3 spins</td><td>3 MOVE/day</td></tr>
              </tbody>
            </table>

            <h4>5️⃣ Dual Currency Design (XP + Tickets)</h4>
            <p>Players accumulate two assets with distinct purposes:</p>
            <ul>
              <li><strong>XP (Experience Points):</strong> Earned daily (5/NFT), claimed for bonus rewards, tracks engagement</li>
              <li><strong>Raffle Tickets:</strong> Earned via spins (46% chance), entries for seasonal jackpot</li>
            </ul>

            <h4>6️⃣ Native Randomness Module</h4>
            <p>Leverages Movement's <code>aptos_framework::randomness</code> for secure RNG:</p>
            <pre className="code-block">{`let rand = randomness::u64_range(0, 100);
if (rand < 9) {
    // Jackpot (9%)
} else if (rand < 55) {
    // Ticket (46%)
} else {
    // XP (45%)
}`}</pre>
            <p>Validator-generated entropy ensures outcomes are unpredictable and tamper-proof.</p>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* NFT COLLECTION */}
          {/* ============================================= */}
          <section id="nft-collection">
            <h2>🖼️ NFT Collection</h2>
            <p>Movechi NFTs are unique digital characters on Movement Network. Each NFT represents a collectible character.</p>

            <h3>Collection Details</h3>
            <table className="docs-table">
              <tbody>
                <tr><td><strong>Network</strong></td><td>Movement Network</td></tr>
                <tr><td><strong>Standard</strong></td><td>Aptos Token Standard</td></tr>
              </tbody>
            </table>

            <div className="callout info">
              <strong className="callout-title">💡 Tip</strong>
              <p>Minting gives you immediate access to staking rewards and free daily spins. Consider minting multiple characters to increase earnings.</p>
            </div>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* STAKING SYSTEM */}
          {/* ============================================= */}
          <section id="staking">
            <h2>📦 Staking System</h2>
            <p>Earn XP passively by locking your NFTs in the vault contract. 24-hour lock period after staking to prevent free spin abuse.</p>

            <h3>Earning Rates</h3>
            <table className="docs-table">
              <tbody>
                <tr><td><strong>Base Rate</strong></td><td>5 XP per NFT per day</td></tr>
                <tr><td><strong>Claim Frequency</strong></td><td>Once per 24 hours</td></tr>
                <tr><td><strong>Lock Period</strong></td><td>24 hours after staking</td></tr>
              </tbody>
            </table>

            <h3>How to Stake</h3>
            <ol>
              <li>Navigate to the Staking page</li>
              <li>Select NFTs to stake from your wallet</li>
              <li>Click "STAKE" and approve the transaction</li>
              <li>Start earning 5 XP per NFT immediately</li>
            </ol>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* SPIN & WIN GAME */}
          {/* ============================================= */}
          <section id="spin-game">
            <h2>🎰 Spin &amp; Win Game</h2>
            <p>Welcome to the heart of Movechi - an interactive wheel-based game where you can win instant jackpots, earn raffle tickets for season-end drawings, and accumulate XP for proportional rewards.</p>

            <div className="callout info">
              <strong className="callout-title">💡 What Makes It Special</strong>
              <p>Every spin is provably fair using on-chain randomness. Whether you're using free spins from staking or paid spins, you have the same chance to win big!</p>
            </div>

            <h3>Quick Stats</h3>
            <table className="docs-table">
              <tbody>
                <tr><td><strong>Jackpot Chance</strong></td><td>9% - Win 2-4.5 MOVE instantly</td></tr>
                <tr><td><strong>Raffle Ticket Chance</strong></td><td>46% - Entry into season-end drawing</td></tr>
                <tr><td><strong>XP Bonus Chance</strong></td><td>45% - Get 100 XP instantly</td></tr>
                <tr><td><strong>Paid Spin Cost</strong></td><td>1 MOVE per spin</td></tr>
                <tr><td><strong>Max Paid Spins/Day</strong></td><td>10 spins</td></tr>
                <tr><td><strong>Free Spins/Day</strong></td><td>1-3 based on staked NFTs</td></tr>
              </tbody>
            </table>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* SPIN MECHANICS */}
          {/* ============================================= */}
          <section id="spin-mechanics">
            <h2>🎲 Spin Mechanics</h2>

            <h3>How Each Spin Works</h3>
            <p>Every spin follows a transparent, verifiable process that ensures fairness and prevents manipulation.</p>

            <h4>Step-by-Step Spin Process</h4>
            <ol>
              <li><strong>Initiate Spin:</strong> User clicks SPIN button (paid or free)</li>
              <li><strong>Payment Processing:</strong> Paid: 1 MOVE withdrawn from user wallet / Free: 1 MOVE withdrawn from Sponsor Vault</li>
              <li><strong>Fund Distribution:</strong> Payment split across 4 vaults</li>
              <li><strong>Random Generation:</strong> On-chain randomness generates number 0-99</li>
              <li><strong>Outcome Determination:</strong> 0-8 → Jackpot (9%) | 9-54 → Raffle Ticket (46%) | 55-99 → XP Bonus (45%)</li>
              <li><strong>Reward Payout:</strong> Prize credited immediately to user</li>
              <li><strong>Event Emission:</strong> On-chain event logged for transparency</li>
            </ol>

            <h3>Outcome Probability Table</h3>
            <table className="docs-table">
              <thead>
                <tr><th>Outcome</th><th>Roll Range</th><th>Chance</th><th>Reward</th></tr>
              </thead>
              <tbody>
                <tr><td>🎰 Jackpot</td><td>0-8</td><td>9%</td><td>2-4.5 MOVE</td></tr>
                <tr><td>🎫 Raffle Ticket</td><td>9-54</td><td>46%</td><td>1 Season Ticket</td></tr>
                <tr><td>⭐ XP Bonus</td><td>55-99</td><td>45%</td><td>100 XP</td></tr>
              </tbody>
            </table>

            <div className="callout warning">
              <strong className="callout-title">⚠️ Jackpot Fallback</strong>
              <p>If you win a jackpot but the Instant Vault has insufficient balance, you automatically receive 100 XP as a consolation prize instead.</p>
            </div>

            <h3>Randomness &amp; Fairness</h3>
            <p>Movechi uses a provably fair system:</p>
            <ul>
              <li>✓ Uses cryptographic hash function (SHA-256)</li>
              <li>✓ Includes timestamp (unpredictable microseconds)</li>
              <li>✓ Includes user address (unique per player)</li>
              <li>✓ Includes nonce (increments each spin)</li>
              <li>✓ All inputs are on-chain and verifiable</li>
              <li>✓ Cannot be predicted or manipulated</li>
            </ul>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* FREE SPINS SYSTEM */}
          {/* ============================================= */}
          <section id="free-spins">
            <h2>🎁 Free Spins System</h2>

            <h3>How Free Spins Work</h3>
            <p>Free spins are a reward for staking NFTs. They work exactly like paid spins (same odds, same rewards) but are subsidized by the protocol.</p>

            <h4>Sponsor Wallet Funding</h4>
            <p>The free spin system is powered by a dedicated Sponsor Vault:</p>
            <ul>
              <li><strong>Admin Pre-Funding:</strong> Team deposits MOVE tokens into Sponsor Vault</li>
              <li><strong>Per-Spin Cost:</strong> Each free spin withdraws exactly 1 MOVE from Sponsor Vault</li>
              <li><strong>Same Distribution:</strong> Funds split using same 10/35/35/20 formula as paid spins</li>
              <li><strong>No User Cost:</strong> Players pay nothing - fully subsidized</li>
            </ul>

            <h3>Free Spin Allocation</h3>
            <table className="docs-table">
              <thead>
                <tr><th>Staked NFTs</th><th>Free Spins/Day</th><th>Daily Subsidy</th></tr>
              </thead>
              <tbody>
                <tr><td>0 NFTs</td><td>0 spins</td><td>0 MOVE</td></tr>
                <tr><td>1-4 NFTs</td><td>1 spin</td><td>1 MOVE</td></tr>
                <tr><td>5-9 NFTs</td><td>2 spins</td><td>2 MOVE</td></tr>
                <tr><td>10+ NFTs</td><td>3 spins</td><td>3 MOVE</td></tr>
              </tbody>
            </table>

            <h3>Daily Reset Mechanics</h3>
            <ul>
              <li><strong>Reset Time:</strong> Midnight UTC (00:00)</li>
              <li><strong>Counter Reset:</strong> <code>free_spins_today</code> resets to 0</li>
              <li><strong>Automatic:</strong> Checked on first action each day</li>
            </ul>

            <div className="callout success">
              <strong className="callout-title">✓ Pro Tip</strong>
              <p>Stake 10+ NFTs to maximize your free daily spins (3/day = 90 spins/month = 90 MOVE value in subsidized gameplay!)</p>
            </div>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* PAID SPINS SYSTEM */}
          {/* ============================================= */}
          <section id="paid-spins">
            <h2>💳 Paid Spins System</h2>

            <h3>Overview</h3>
            <p>Paid spins allow gameplay beyond your free spin allocation. Each spin costs 1 MOVE and has the same odds as free spins.</p>

            <h4>Paid Spin Rules</h4>
            <table className="docs-table">
              <tbody>
                <tr><td><strong>Cost Per Spin</strong></td><td>1 MOVE</td></tr>
                <tr><td><strong>Daily Limit</strong></td><td>10 paid spins per day</td></tr>
                <tr><td><strong>Reset Time</strong></td><td>Midnight UTC</td></tr>
                <tr><td><strong>Payment Method</strong></td><td>Direct withdrawal from wallet</td></tr>
                <tr><td><strong>Same Odds</strong></td><td>9% jackpot, 46% ticket, 45% XP</td></tr>
              </tbody>
            </table>

            <h3>Where Your Money Goes</h3>
            <h4>Fund Distribution (Per 1 MOVE Spin)</h4>
            <table className="docs-table">
              <thead>
                <tr><th>Vault</th><th>Share</th><th>Amount</th><th>Purpose</th></tr>
              </thead>
              <tbody>
                <tr><td>Team Treasury</td><td>10%</td><td>0.1 MOVE</td><td>Development, operations</td></tr>
                <tr><td>Instant Vault</td><td>35%</td><td>0.35 MOVE</td><td>Jackpot prizes</td></tr>
                <tr><td>Seasonal Vault</td><td>35%</td><td>0.35 MOVE</td><td>Season-end raffle jackpot</td></tr>
                <tr><td>Reward Vault</td><td>20%</td><td>0.2 MOVE</td><td>XP-based payouts</td></tr>
              </tbody>
            </table>

            <div className="callout info">
              <strong className="callout-title">💡 Sustainable Economy</strong>
              <p>70% of every paid spin goes directly back to players through instant prizes (35%), season jackpots (35%), and XP rewards (20%). The 10% team fee ensures long-term development.</p>
            </div>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* XP SYSTEM */}
          {/* ============================================= */}
          <section id="xp-system">
            <h2>⭐ Rewards &amp; XP System</h2>

            <h3>XP Sources</h3>
            <table className="docs-table">
              <thead>
                <tr><th>Source</th><th>Amount</th><th>Frequency</th><th>Notes</th></tr>
              </thead>
              <tbody>
                <tr><td>Staking</td><td>5 XP per NFT</td><td>Daily claim</td><td>Must claim every 24h</td></tr>
                <tr><td>Spin (XP Bonus)</td><td>100 XP</td><td>Per spin win (45%)</td><td>Instant credit</td></tr>
                <tr><td>Spin (Jackpot Fallback)</td><td>100 XP</td><td>When vault insufficient</td><td>Consolation prize</td></tr>
              </tbody>
            </table>

            <h3>XP Accumulation Example</h3>
            <p><strong>Player with 5 Staked NFTs + Daily Spins:</strong></p>
            <table className="docs-table">
              <tbody>
                <tr><td>Daily Staking Claim</td><td>5 NFTs × 5 = 25 XP</td></tr>
                <tr><td>3 Free Spins (assume 1 XP win)</td><td>1 × 100 = 100 XP</td></tr>
                <tr><td>5 Paid Spins (assume 2 XP wins)</td><td>2 × 100 = 200 XP</td></tr>
                <tr><td><strong>Total Daily XP</strong></td><td><strong>325 XP</strong></td></tr>
                <tr><td><strong>Monthly (30 days)</strong></td><td><strong>9,750 XP</strong></td></tr>
              </tbody>
            </table>

            <h3>XP Payout Mechanics</h3>
            <p>At season end, XP determines your share of the Reward Vault:</p>
            <pre className="code-block">{`Your Payout = (Your XP / Total Global XP) × Reward Vault Balance

Example:
- You earned: 10,000 XP
- Total global XP: 500,000 XP
- Reward Vault: 200 MOVE

Your share = (10,000 / 500,000) × 200 = 4 MOVE`}</pre>

            <div className="callout warning">
              <strong className="callout-title">⚠️ Critical: Claim Window</strong>
              <p>You MUST claim your XP rewards during the claim window after season ends. Unclaimed XP is forfeited!</p>
            </div>

            <h3>XP Properties</h3>
            <ul>
              <li><strong>Non-Transferable:</strong> XP is account-bound, cannot be traded</li>
              <li><strong>Season-Specific:</strong> XP resets each season</li>
              <li><strong>Accumulated:</strong> XP adds up throughout the season</li>
              <li><strong>Proportional Value:</strong> More XP = larger share of reward pool</li>
              <li><strong>Claim Required:</strong> Must manually claim during claim window</li>
            </ul>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* SEASONAL ECONOMY */}
          {/* ============================================= */}
          <section id="seasonal-economy">
            <h2>🎯 Seasonal Economy</h2>
            <p>Complete breakdown of how the Movechi economy functions, from spins to fund distribution to seasonal mechanics.</p>

            <h3>🔄 3-Phase Season Lifecycle</h3>

            <h4>Phase 1: Active Season</h4>
            <ul>
              <li><strong>Duration:</strong> Set by admin (e.g., 30 days)</li>
              <li><strong>Activities Allowed:</strong> Stake NFTs, claim daily XP, spin wheel, earn tickets</li>
              <li><strong>XP Accumulation:</strong> Active - all XP is tracked</li>
              <li><strong>Jackpot Pool:</strong> Growing from paid spins (35% of each spin)</li>
            </ul>

            <h4>Phase 2: Claim Window</h4>
            <ul>
              <li><strong>Duration:</strong> 24-48 hours (admin-defined)</li>
              <li><strong>Triggered By:</strong> Admin calls <code>draw_seasonal_winner()</code></li>
              <li><strong>Jackpot Drawing:</strong> Winner selected from all raffle tickets via on-chain randomness</li>
              <li><strong>Activities Allowed:</strong> ONLY claim season rewards - no staking, spinning, or XP earning</li>
              <li><strong>XP Payout:</strong> Users claim proportional share of Reward Vault based on their XP</li>
            </ul>

            <h4>Phase 3: Season Finalization</h4>
            <ul>
              <li><strong>Triggered By:</strong> Admin calls <code>finalize_season()</code> after claim window expires</li>
              <li><strong>Fund Rollback:</strong> All unclaimed funds from 4 vaults return to admin</li>
              <li><strong>XP Reset:</strong> Global XP counter set to 0</li>
              <li><strong>Ticket Reset:</strong> Ticket counter resets to 0</li>
              <li><strong>Season ID Increment:</strong> Season ID increases (e.g., 1 → 2)</li>
            </ul>

            <h3>💡 Economic Scenarios</h3>
            <h4>Example: 30-Day Season with 1000 Spins</h4>
            <table className="docs-table">
              <thead>
                <tr><th>Category</th><th>Calculation</th><th>Amount</th></tr>
              </thead>
              <tbody>
                <tr><td>Total Revenue</td><td>1000 spins × 1 MOVE</td><td>1000 MOVE</td></tr>
                <tr><td>Team Share</td><td>1000 × 10%</td><td>100 MOVE</td></tr>
                <tr><td>Instant Prizes Paid</td><td>~90 jackpots × 3 MOVE avg</td><td>~270 MOVE</td></tr>
                <tr><td>Season Raffle Pool</td><td>1000 × 35%</td><td>350 MOVE</td></tr>
                <tr><td>XP Reward Pool</td><td>1000 × 20%</td><td>200 MOVE</td></tr>
                <tr><td><strong>Player Returns</strong></td><td>270 + 350 + 200</td><td><strong>820 MOVE (82%)</strong></td></tr>
              </tbody>
            </table>

            <div className="callout success">
              <strong className="callout-title">✓ Sustainable Tokenomics</strong>
              <p>The 4-vault system ensures balanced distribution: instant gratification (jackpots), long-term incentives (XP rewards), and seasonal excitement (raffle), while maintaining team sustainability (10% fee).</p>
            </div>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* RAFFLE TICKETS */}
          {/* ============================================= */}
          <section id="raffle-tickets">
            <h2>🎫 Raffle Tickets &amp; Winner Selection</h2>

            <h3>Ticket System Overview</h3>
            <p>Raffle tickets are your entry into the season-end jackpot drawing. The more tickets you accumulate, the higher your chances of winning the entire Seasonal Vault.</p>

            <h4>How Tickets are Stored</h4>
            <pre className="code-block">{`TicketKey {
  season: current_season_id,     // e.g., 1
  ticket_id: global_ticket_number // e.g., 1, 2, 3...
}

Examples:
Season 1, Ticket #1 → owned by 0xABC...
Season 1, Ticket #2 → owned by 0xDEF...
Season 1, Ticket #3 → owned by 0xABC... (same player, 2 tickets!)`}</pre>

            <h3>How to Get Tickets</h3>
            <ul>
              <li><strong>Spin Outcome:</strong> 46% chance per spin (roll 9-54)</li>
              <li><strong>Multiple Entries:</strong> You can own unlimited tickets</li>
              <li><strong>Sequential IDs:</strong> Tickets numbered 1, 2, 3... in order received</li>
              <li><strong>Season Isolation:</strong> Tickets reset every season</li>
            </ul>

            <h3>Winner Selection Process</h3>
            <ol>
              <li><strong>Season Ends:</strong> Admin stops season, no more spins allowed</li>
              <li><strong>Admin Triggers:</strong> Calls <code>draw_seasonal_winner()</code></li>
              <li><strong>Random Seed:</strong> Uses current timestamp in microseconds</li>
              <li><strong>Winner Calculation:</strong> <code>winning_ticket_id = (timestamp % total_tickets) + 1</code></li>
              <li><strong>Lookup Winner:</strong> Find owner address of winning ticket</li>
              <li><strong>Prize Payout:</strong> Entire Seasonal Vault transferred to winner</li>
              <li><strong>Record History:</strong> Winner, amount, and timestamp saved on-chain</li>
            </ol>

            <h3>Winning Probability</h3>
            <table className="docs-table">
              <thead>
                <tr><th>Your Tickets</th><th>Total Pool</th><th>Win Chance</th><th>Odds</th></tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>100</td><td>1%</td><td>1 in 100</td></tr>
                <tr><td>10</td><td>100</td><td>10%</td><td>1 in 10</td></tr>
                <tr><td>50</td><td>1000</td><td>5%</td><td>1 in 20</td></tr>
                <tr><td>100</td><td>1000</td><td>10%</td><td>1 in 10</td></tr>
              </tbody>
            </table>

            <div className="callout success">
              <strong className="callout-title">✓ Strategy Tip</strong>
              <p>Active players who spin daily accumulate more tickets. With 46% ticket chance and 10 spins/day, you can expect ~4-5 tickets per day, which adds up to 120-150 tickets in a 30-day season!</p>
            </div>

            <h3>Ticket Transparency</h3>
            <ul>
              <li>✓ All tickets stored on-chain (verifiable)</li>
              <li>✓ Sequential assignment (no skipping numbers)</li>
              <li>✓ Random drawing using cryptographic timestamp</li>
              <li>✓ Winner selection in single transaction (atomic)</li>
              <li>✓ Historical record preserved forever</li>
            </ul>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* TECHNOLOGY STACK */}
          {/* ============================================= */}
          <section id="tech-stack">
            <h2>🛠️ Technology Stack</h2>

            <h3>Blockchain Layer</h3>
            <h4>Movement Network (Aptos VM)</h4>
            <ul>
              <li><strong>Language:</strong> Move (652 lines)</li>
              <li><strong>Framework:</strong> Aptos Framework v1.x</li>
              <li><strong>Modules Used:</strong> coin, object, randomness, timestamp, signer, vector, event</li>
              <li><strong>Network:</strong> Movement Network</li>
            </ul>

            <h3>Frontend Stack</h3>
            <h4>React + Modern Tooling</h4>
            <ul>
              <li><strong>Framework:</strong> React 18.3.1</li>
              <li><strong>Build Tool:</strong> Vite 5.4.11 (fast HMR, optimized builds)</li>
              <li><strong>Routing:</strong> React Router DOM 7.1.1</li>
              <li><strong>Blockchain SDK:</strong> @aptos-labs/ts-sdk 1.32.0</li>
              <li><strong>Wallet Adapter:</strong> @aptos-labs/wallet-adapter-react 3.9.3</li>
              <li><strong>Deployment:</strong> Vercel</li>
            </ul>

            <h3>Development Tools</h3>
            <ul>
              <li><strong>Aptos CLI:</strong> Contract compilation, testing, and publishing</li>
              <li><strong>PowerShell Scripts:</strong> Automated build/deploy workflows</li>
              <li><strong>VS Code:</strong> Primary IDE with Move language support</li>
              <li><strong>Git/GitHub:</strong> Version control and collaboration</li>
            </ul>

            <h3>Smart Contract Architecture</h3>
            <pre className="code-block">{`movechi::main
├── Resources
│   ├── GameState (singleton)
│   │   ├── 4 SignerCapabilities (vault management)
│   │   ├── Seasonal state machine
│   │   └── Global ledgers (tickets, staking)
│   └── UserProfile (per-address)
│       ├── Gameplay stats (spins, wins, XP)
│       └── Staked NFT tracking
├── Entry Functions (9)
│   ├── stake_nfts() / unstake_nfts()
│   ├── claim_daily_xp()
│   ├── spin_paid() / spin_free_staker()
│   ├── claim_season_rewards()
│   └── Admin: start/draw/finalize season
└── View Functions (8)
    ├── get_user_profile()
    ├── get_season_info()
    └── is_checked_in_today()`}</pre>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* SMART CONTRACT */}
          {/* ============================================= */}
          <section id="smart-contract">
            <h2>📜 Smart Contract Overview</h2>
            <p>Deep dive into the Movechi smart contract architecture built with Move language on Movement Network.</p>

            <h3>Tech Stack</h3>
            <table className="docs-table">
              <tbody>
                <tr><td><strong>Language</strong></td><td>Move (v1.0)</td></tr>
                <tr><td><strong>Blockchain</strong></td><td>Movement Network</td></tr>
                <tr><td><strong>Framework</strong></td><td>aptos_framework, aptos_token_objects</td></tr>
                <tr><td><strong>Random Source</strong></td><td>SHA-256 hash (timestamp + address + nonce)</td></tr>
                <tr><td><strong>Token Standard</strong></td><td>Aptos Token Objects (Digital Assets)</td></tr>
              </tbody>
            </table>

            <h3>🗂️ Resources &amp; Structs</h3>

            <h4>GameState (Global Resource)</h4>
            <p>Stored at <code>@movechi</code> address, manages all global game state.</p>
            <pre className="code-block">{`struct GameState has key {
  admin: address,                    // Admin address
  paused: bool,                      // Emergency pause flag
  config: GameConfig,                // Game configuration
  whitelist_collection: address,     // Allowed NFT collection
  
  // Season Management
  season_started: bool,              // Is season active?
  season_end_time: u64,              // Unix timestamp
  claim_window_active: bool,         // Is claim window open?
  claim_end_time: u64,               // Claim deadline
  current_season_id: u64,            // Current season number
  
  // Global Counters
  total_tickets: u64,                // Total raffle tickets issued
  total_global_xp: u128,             // Sum of all player XP
  
  // Historical Data
  last_season_winner: address,       // Previous winner
  last_season_payout: u64,           // Amount won
  last_season_timestamp: u64,        // When won
  
  // Ledgers & Tables
  ticket_ledger: Table<TicketKey, address>,
  staking_ledger: Table<address, address>,
  
  // Vault Capabilities
  instant_cap: SignerCapability,     // For jackpot payouts
  seasonal_cap: SignerCapability,    // For raffle jackpot
  sponsor_cap: SignerCapability,     // For free spins
  reward_cap: SignerCapability,      // For XP rewards
  
  events: EventHandle<GameEvent>,
}`}</pre>

            <h4>UserProfile (Per-User Resource)</h4>
            <p>Stored at each user's address, tracks individual progress.</p>
            <pre className="code-block">{`struct UserProfile has key {
  nonce: u64,                        // Spin counter for randomness
  tickets: u64,                      // Raffle tickets owned
  lifetime_wins: u64,                // Total jackpot winnings
  
  // Daily Limits
  last_day_played: u64,              // Last day spun (UTC)
  paid_spins_today: u64,             // Paid spins used today
  free_spins_today: u64,             // Free spins used today
  
  // Staking
  staked_nfts: vector<address>,      // List of staked NFT addresses
  stake_timestamps: Table<address, u64>, // When each NFT was staked
  
  // XP System
  last_day_claimed: u64,             // Last XP claim day
  accumulated_xp: u128,              // Total XP this season
  last_season_played: u64,           // Season ID (for resets)
}`}</pre>

            <h4>Supporting Structs</h4>
            <pre className="code-block">{`struct GameConfig has store, drop, copy {
  cost_per_spin: u64,           // 1 MOVE = 100_000_000
  max_paid_spins_daily: u64,    // 10
  chance_jackpot: u64,          // 9 (out of 100)
  chance_ticket: u64,           // 46 (out of 100)
  jackpot_min: u64,             // 2 MOVE
  jackpot_max: u64,             // 4.5 MOVE
}

struct TicketKey has copy, drop, store {
  season: u64,       // Season ID
  ticket_id: u64,    // Unique ticket number
}

struct AdminCap has key, store, drop {}
// Grants admin privileges to holder`}</pre>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* 4 VAULT SYSTEM */}
          {/* ============================================= */}
          <section id="vault-system">
            <h2>🏦 4 Vault System</h2>
            <p>Movechi uses 4 separate resource accounts to manage funds. Each vault has a specific purpose and is controlled by a SignerCapability stored in GameState.</p>

            <h3>Vault Architecture</h3>
            <table className="docs-table">
              <thead>
                <tr><th>Vault</th><th>Purpose</th><th>Funding Source</th><th>Payout Trigger</th></tr>
              </thead>
              <tbody>
                <tr><td>Instant Vault</td><td>Jackpot prizes</td><td>35% of each spin</td><td>2-4.5 MOVE when jackpot hit</td></tr>
                <tr><td>Seasonal Vault</td><td>Raffle jackpot</td><td>35% of each spin</td><td>Entire balance to raffle winner</td></tr>
                <tr><td>Sponsor Vault</td><td>Free spin subsidy</td><td>Admin pre-funding</td><td>1 MOVE per free spin</td></tr>
                <tr><td>Reward Vault</td><td>XP-based rewards</td><td>20% of each spin</td><td>Proportional to XP at season end</td></tr>
              </tbody>
            </table>

            <h3>Vault Creation &amp; Management</h3>
            <pre className="code-block">{`// In init_module()
let (instant_signer, instant_cap) = 
  account::create_resource_account(admin, b"instant");
  
let (seasonal_signer, seasonal_cap) = 
  account::create_resource_account(admin, b"seasonal");
  
let (sponsor_signer, sponsor_cap) = 
  account::create_resource_account(admin, b"sponsor");
  
let (reward_signer, reward_cap) = 
  account::create_resource_account(admin, b"reward");

// Register each vault to hold AptosCoin
coin::register<AptosCoin>(&instant_signer);
coin::register<AptosCoin>(&seasonal_signer);
coin::register<AptosCoin>(&sponsor_signer);
coin::register<AptosCoin>(&reward_signer);

// Store capabilities in GameState
game.instant_cap = instant_cap;
game.seasonal_cap = seasonal_cap;
game.sponsor_cap = sponsor_cap;
game.reward_cap = reward_cap;`}</pre>

            <h3>Fund Distribution Logic</h3>
            <pre className="code-block">{`fun distribute_funds(game: &mut GameState, payment: Coin<AptosCoin>) {
  let total = coin::value(&payment);
  
  // Calculate shares
  let team_share = total * 10 / 100;      // 10%
  let instant_share = total * 35 / 100;   // 35%
  let seasonal_share = total * 35 / 100;  // 35%
  // Remaining 20% stays in payment coin for reward vault
  
  // Extract shares
  let team_coin = coin::extract(&mut payment, team_share);
  let instant_coin = coin::extract(&mut payment, instant_share);
  let seasonal_coin = coin::extract(&mut payment, seasonal_share);
  
  // Deposit to destinations
  coin::deposit(game.admin, team_coin);
  coin::deposit(get_vault_address(&game.instant_cap), instant_coin);
  coin::deposit(get_vault_address(&game.seasonal_cap), seasonal_coin);
  coin::deposit(get_vault_address(&game.reward_cap), payment);
}`}</pre>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* ENTRY FUNCTIONS */}
          {/* ============================================= */}
          <section id="entry-functions">
            <h2>⚙️ Entry Functions</h2>

            <h3>Admin Functions</h3>

            <h4>start_season</h4>
            <pre className="code-block">{`public entry fun start_season(
  admin: &signer,
  duration_seconds: u64
)`}</pre>
            <p><strong>Description:</strong> Begins a new season with specified duration.</p>
            <p><strong>Requirements:</strong> AdminCap, no active season, claim window closed</p>
            <p><strong>Sets:</strong> <code>season_started = true</code>, <code>season_end_time = now + duration</code></p>

            <h4>draw_seasonal_winner</h4>
            <pre className="code-block">{`public entry fun draw_seasonal_winner(
  admin: &signer,
  claim_duration_seconds: u64
)`}</pre>
            <p><strong>Description:</strong> Selects raffle winner and opens claim window.</p>
            <p><strong>Logic:</strong></p>
            <ul>
              <li>Random ticket: <code>(timestamp % total_tickets) + 1</code></li>
              <li>Pays entire Seasonal Vault to winner</li>
              <li>Opens claim window for XP rewards</li>
              <li>Saves winner info to GameState</li>
            </ul>

            <h4>finalize_season</h4>
            <pre className="code-block">{`public entry fun finalize_season(admin: &signer)`}</pre>
            <p><strong>Description:</strong> Closes season and resets for next one.</p>
            <p><strong>Actions:</strong></p>
            <ul>
              <li>Rollback unclaimed funds from all vaults to admin</li>
              <li>Reset <code>total_global_xp</code> and <code>total_tickets</code> to 0</li>
              <li>Increment <code>current_season_id</code></li>
              <li>Set <code>claim_window_active = false</code></li>
            </ul>

            <h3>User Functions - Staking</h3>

            <h4>stake_nfts</h4>
            <pre className="code-block">{`public entry fun stake_nfts(
  user: &signer,
  nft_objects: vector<Object<Token>>
)`}</pre>
            <p><strong>Requirements:</strong></p>
            <ul>
              <li>Game not paused</li>
              <li>NFTs from whitelisted collection</li>
              <li>User owns the NFTs</li>
            </ul>
            <p><strong>Actions:</strong></p>
            <ul>
              <li>Transfers NFTs to Instant Vault address</li>
              <li>Adds NFT addresses to <code>user.staked_nfts</code></li>
              <li>Records stake timestamp for each NFT</li>
              <li>Updates staking ledger</li>
            </ul>

            <h4>unstake_nfts</h4>
            <pre className="code-block">{`public entry fun unstake_nfts(
  user: &signer,
  nft_objects: vector<Object<Token>>
)`}</pre>
            <p><strong>Requirements:</strong></p>
            <ul>
              <li>NFTs are staked</li>
              <li>24 hours passed since staking</li>
              <li>Max 20 NFTs per transaction</li>
            </ul>

            <h4>claim_daily_xp</h4>
            <pre className="code-block">{`public entry fun claim_daily_xp(user: &signer)`}</pre>
            <p><strong>Requirements:</strong></p>
            <ul>
              <li>Season is active</li>
              <li>At least 1 NFT staked</li>
              <li>Not claimed yet today</li>
            </ul>
            <p><strong>Formula:</strong> <code>XP = staked_count × 5</code></p>

            <h3>User Functions - Spinning</h3>

            <h4>spin_paid</h4>
            <pre className="code-block">{`public entry fun spin_paid(user: &signer)`}</pre>
            <p><strong>Requirements:</strong></p>
            <ul>
              <li>Game not paused</li>
              <li>Season active</li>
              <li>Under daily limit (10 spins)</li>
              <li>User has 1 MOVE</li>
            </ul>

            <h4>spin_free_staker</h4>
            <pre className="code-block">{`public entry fun spin_free_staker(user: &signer)`}</pre>
            <p><strong>Requirements:</strong></p>
            <ul>
              <li>Game not paused</li>
              <li>Season active</li>
              <li>At least 1 NFT staked</li>
              <li>Under free spin limit (1-3 based on stakes)</li>
              <li>Sponsor Vault has balance</li>
            </ul>

            <h3>User Functions - Rewards</h3>

            <h4>claim_season_rewards</h4>
            <pre className="code-block">{`public entry fun claim_season_rewards(user: &signer)`}</pre>
            <p><strong>Requirements:</strong></p>
            <ul>
              <li>Claim window is open</li>
              <li>Before claim deadline</li>
              <li>User has XP from this season</li>
              <li>Reward Vault has balance</li>
            </ul>
            <p><strong>Formula:</strong> <code>payout = (user_xp / total_global_xp) × reward_vault_balance</code></p>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* ERROR CODES */}
          {/* ============================================= */}
          <section id="error-codes">
            <h2>🚨 Error Codes</h2>

            <h3>Admin Errors (100-199)</h3>
            <table className="docs-table">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>100</td><td>E_NOT_ADMIN</td><td>Caller doesn't have AdminCap</td></tr>
                <tr><td>101</td><td>E_GAME_PAUSED</td><td>Attempting action while paused</td></tr>
                <tr><td>102</td><td>E_SEASON_NOT_ENDED</td><td>Trying to draw winner before season ends</td></tr>
                <tr><td>103</td><td>E_SEASON_ALREADY_STARTED</td><td>Starting season when one is active</td></tr>
                <tr><td>104</td><td>E_SEASON_NOT_ACTIVE</td><td>Action requires active season</td></tr>
              </tbody>
            </table>

            <h3>Spin Errors (200-299)</h3>
            <table className="docs-table">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>200</td><td>E_DAILY_PAID_LIMIT</td><td>Already spun 10 times today (paid)</td></tr>
                <tr><td>201</td><td>E_DAILY_FREE_LIMIT</td><td>Used all free spins for today</td></tr>
                <tr><td>202</td><td>E_NO_STAKED_NFTS</td><td>Trying free spin with 0 staked NFTs</td></tr>
                <tr><td>203</td><td>E_ALREADY_CLAIMED_TODAY</td><td>Already claimed XP today</td></tr>
              </tbody>
            </table>

            <h3>NFT/Staking Errors (300-399)</h3>
            <table className="docs-table">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>300</td><td>E_NOT_OWNER</td><td>Trying to stake NFT you don't own</td></tr>
                <tr><td>301</td><td>E_WRONG_COLLECTION</td><td>NFT not from whitelisted collection</td></tr>
                <tr><td>302</td><td>E_STAKE_LOCKED_24H</td><td>Unstaking before 24 hours passed</td></tr>
                <tr><td>303</td><td>E_NOT_STAKED</td><td>Trying to unstake NFT not staked</td></tr>
              </tbody>
            </table>

            <h3>Reward/Vault Errors (400-499)</h3>
            <table className="docs-table">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>400</td><td>E_SPONSOR_BROKE</td><td>Sponsor Vault insufficient for free spin</td></tr>
                <tr><td>401</td><td>E_NOTHING_TO_CLAIM</td><td>User has 0 XP to claim</td></tr>
                <tr><td>402</td><td>E_REWARD_VAULT_EMPTY</td><td>Reward Vault has no balance</td></tr>
                <tr><td>403</td><td>E_INVALID_VAULT</td><td>Invalid vault ID in admin function</td></tr>
                <tr><td>404</td><td>E_CLAIM_WINDOW_CLOSED</td><td>Trying to claim outside window</td></tr>
                <tr><td>405</td><td>E_CLAIM_WINDOW_ACTIVE</td><td>Action not allowed during claim window</td></tr>
                <tr><td>406</td><td>E_WINDOW_NOT_FINISHED</td><td>Finalizing before claim window ends</td></tr>
              </tbody>
            </table>

            <h3>Batch Errors (500-599)</h3>
            <table className="docs-table">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>501</td><td>E_BATCH_TOO_LARGE</td><td>Unstaking more than 20 NFTs at once</td></tr>
              </tbody>
            </table>
          </section>

          <hr className="divider" />

          {/* ============================================= */}
          {/* INTEGRATION GUIDE */}
          {/* ============================================= */}
          <section id="integration">
            <h2>🔌 Integration Guide</h2>

            <h3>Frontend Setup</h3>
            <h4>Installation</h4>
            <pre className="code-block">{`npm install
cd frontend
npm install
npm run dev`}</pre>

            <h3>Using Aptos Wallet Adapter</h3>
            <pre className="code-block">{`import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";

function MyComponent() {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  
  // Configure for Movement Network Mainnet
  const config = new AptosConfig({ 
    fullnode: "https://mainnet.movementnetwork.xyz/v1"
  });
  const aptos = new Aptos(config);
  
  const handleSpin = async () => {
    if (!connected) return;
    
    const payload = {
      function: \`\${CONTRACT_ADDRESS}::main::spin_paid\`,
      type_arguments: [],
      arguments: []
    };
    
    try {
      const response = await signAndSubmitTransaction({ payload });
      await aptos.waitForTransaction({ transactionHash: response.hash });
      console.log("Spin successful!", response);
    } catch (error) {
      console.error("Spin failed:", error);
    }
  };
  
  return <button onClick={handleSpin}>SPIN</button>;
}`}</pre>

            <h3>Reading On-Chain Data</h3>
            <pre className="code-block">{`// Get user status
const getUserStatus = async (userAddress) => {
  try {
    const result = await aptos.view({
      function: \`\${CONTRACT_ADDRESS}::main::get_user_status\`,
      type_arguments: [],
      arguments: [userAddress]
    });
    
    const [paidSpins, freeSpins, tickets, xp, stakedCount] = result;
    return { paidSpins, freeSpins, tickets, xp, stakedCount };
  } catch (error) {
    console.error("Failed to get user status:", error);
    return null;
  }
};

// Check if claimed today
const isCheckedIn = async (userAddress) => {
  const result = await aptos.view({
    function: \`\${CONTRACT_ADDRESS}::main::is_checked_in_today\`,
    type_arguments: [],
    arguments: [userAddress]
  });
  return result[0]; // boolean
};`}</pre>

            <h3>Staking NFTs Example</h3>
            <pre className="code-block">{`const stakeNFTs = async (nftAddresses) => {
  if (!connected || !account) return;
  
  // Convert addresses to Object<Token> format
  const nftObjects = nftAddresses.map(addr => ({
    inner: addr
  }));
  
  const payload = {
    function: \`\${CONTRACT_ADDRESS}::main::stake_nfts\`,
    type_arguments: [],
    arguments: [nftObjects]
  };
  
  try {
    const response = await signAndSubmitTransaction({ payload });
    await aptos.waitForTransaction({ transactionHash: response.hash });
    console.log("Staked successfully!");
  } catch (error) {
    // Handle specific error codes
    if (error.message.includes("301")) {
      alert("Wrong NFT collection!");
    } else if (error.message.includes("300")) {
      alert("You don't own these NFTs!");
    }
  }
};`}</pre>

            <div className="callout success">
              <strong className="callout-title">✓ Production Ready</strong>
              <p>The contract includes comprehensive error handling, event emission for tracking, and gas-optimized batch operations. All randomness is verifiable on-chain.</p>
            </div>
          </section>

          {/* --- FOOTER --- */}
          <div className="docs-footer">
            <p>© 2026 Movechi. All rights reserved.</p>
            <p>
              <Link to="/terms">Terms &amp; Conditions</Link>
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Docs;
