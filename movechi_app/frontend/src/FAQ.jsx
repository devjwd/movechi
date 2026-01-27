import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import HomePageHeader from './components/HomePageHeader'
import './home.css'
import './FAQ.css'

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      id: 1,
      question: "What is MOVECHI?",
      answer: "MOVECHI is an on-chain gaming platform on Movement Network where you can mint NFT characters, stake them for daily XP rewards, and spin a prize wheel to win MOVE tokens, raffle tickets, and XP bonuses."
    },
    {
      id: 2,
      question: "How do I get started?",
      answer: "Download a Movement Network-compatible wallet (Petra, OKX Wallet, or Pontem), mint a MOVECHI NFT from our collection, then connect your wallet to the app. You can instantly start earning!"
    },
    {
      id: 3,
      question: "What are free spins?",
      answer: "If you hold staked MOVECHI NFTs, you get free daily spins based on your collection size: 1–4 NFTs = 1 free spin, 5–9 NFTs = 2 free spins, 10+ NFTs = 3 free spins. Resets daily at midnight UTC."
    },
    {
      id: 4,
      question: "How much does a paid spin cost?",
      answer: "Each paid spin costs 1 MOVE token. Paid spins have no daily limits, so you can spin as many times as you want if you have the balance."
    },
    {
      id: 5,
      question: "How do I earn XP and why does it matter?",
      answer: "Stake your NFTs to earn 5 XP per NFT daily (claim once per day). XP ranks you on the global leaderboard and determines your share of seasonal reward pools at the end of each season."
    },
    {
      id: 6,
      question: "What is staking and how does it work?",
      answer: "Staking locks your NFTs in the contract to earn daily rewards. Stake instantly, but wait 24 hours before unstaking. Staked NFTs unlock free spins and daily XP rewards automatically."
    },
    {
      id: 7,
      question: "What can I win from the spin wheel?",
      answer: "The wheel has three outcomes: (1) JACKPOT — random MOVE tokens, (2) RAFFLE TICKET — entry into seasonal drawings, (3) XP BONUS — bonus XP on top of daily claims. Win details appear instantly after each spin."
    },
    {
      id: 8,
      question: "How do seasons and rewards work?",
      answer: "Each season runs for a set duration (typically 30 days). Your final XP determines your share of the seasonal reward pool. Winners are drawn from raffle tickets, and payouts are proportional to your rank."
    },
    {
      id: 9,
      question: "Where can I view my stats and leaderboard rank?",
      answer: "Visit the LEADERBOARD page to see global XP rankings, your current position, and proportional reward share. Your stats update in real-time after every spin and daily XP claim."
    },
    {
      id: 10,
      question: "Is there a gas fee for transactions?",
      answer: "Yes, all blockchain transactions (spins, staking, unstaking, XP claims) require Movement Network gas fees in MOVE tokens. Keep a small balance for gas costs in addition to spin costs."
    }
  ]

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="faq-container">
      <HomePageHeader activePage="faq" />
      
      <div className="faq-content">
        <div className="faq-header">
          <h1>FREQUENTLY ASKED QUESTIONS</h1>
          <p>Find answers to common questions about MOVECHI</p>
        </div>

        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={faq.id} className="faq-item">
              <button
                className={`faq-question ${openIndex === index ? 'open' : ''}`}
                onClick={() => toggleFAQ(index)}
              >
                <span className="faq-number">{faq.id}</span>
                <span className="faq-text">{faq.question}</span>
                <span className="faq-toggle">
                  {openIndex === index ? '−' : '+'}
                </span>
              </button>
              
              {openIndex === index && (
                <div className="faq-answer">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="faq-cta">
          <p>Still have questions?</p>
          <Link to="/docs" className="faq-link">
            Read the Full Documentation →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default FAQ
