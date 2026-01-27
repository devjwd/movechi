import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import HomePageHeader from './components/HomePageHeader'
import './About.css'

export default function About() {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="about-page">
      <HomePageHeader activePage="about" />
      
      <main className="about-container">
        <h1>About The Project</h1>
        <p className="subtitle">The Future of On-Chain Gaming on Movement Network</p>
        
        <section className="about-section">
          <h2>What is Movechi?</h2>
          <p>
            Movechi is a gaming platform built on Movement Network that brings together the excitement of spin-based gameplay with real blockchain ownership. Think of it as a game where everything you do actually matters because it's all recorded on the blockchain.
          </p>
          <p>
            Every spin you make, every NFT you stake, every reward you earn is completely transparent and verifiable. We built Movechi because we believe your time and effort in a game should have real value. No hidden algorithms, no shady practices, just fair gameplay backed by smart contracts.
          </p>
        </section>

        <section className="about-section">
          <h2>Our Mission</h2>
          <p>We're focused on three main goals that drive everything we do:</p>
          
          <div className="mission-item">
            <h3>True Ownership</h3>
            <p>
              Your achievements live on the blockchain forever. There are no servers that can shut down or accounts that can be deleted. What you earn is truly yours, protected by the blockchain itself rather than company policies.
            </p>
          </div>

          <div className="mission-item">
            <h3>Community Driven</h3>
            <p>
              Our earliest players aren't just users, they're partners in building this platform. Your feedback directly influences new features, your ideas help shape our roadmap, and your success is how we measure ours.
            </p>
          </div>

          <div className="mission-item">
            <h3>Provably Fair</h3>
            <p>
              We use Movement Network's speed and security to create gameplay that's fast and verifiably random. Every outcome can be audited, every reward distribution is transparent. No hidden tricks, no house manipulation.
            </p>
          </div>
        </section>

        <section className="about-section">
          <h2>What Makes Us Different</h2>
          <p>
            Unlike traditional online games, Movechi runs entirely on blockchain. Our smart contracts handle everything from randomness to rewards, making cheating impossible and fairness provable.
          </p>
          
          <div className="feature-item">
            <h3>Instant Jackpots</h3>
            <p>Chance of Winning up to 50 MOVE tokens on every spin with on-chain randomness that can't be rigged.</p>
          </div>

          <div className="feature-item">
            <h3>NFT Staking Rewards</h3>
            <p>Earn 5 XP daily for each NFT you stake. The more you stake, the more free daily spins you unlock (up to 3 per day).</p>
          </div>

          <div className="feature-item">
            <h3>Seasonal Cycle</h3>
            <p>Compete with players worldwide for XP rankings and claim your share of the seasonal prize pool based on your performance.</p>
          </div>

          <div className="feature-item">
            <h3>Sustainable Economy</h3>
            <p>We've designed a balanced system where 35% goes to jackpots, 35% to seasonal pools, and the rest supports long-term growth.</p>
          </div>
        </section>

        <section className="about-section">
          <h2>About Udhyana Studios</h2>
          <p>
            Movechi is the first major release from Udhyana Studios, a new player in Web3 gaming where traditional wisdom meets modern blockchain technology.
          </p>
          
          <div className="story-box">
            <h3>The Story Behind the Name</h3>
            <p>
              "Udhyana" comes from an ancient word meaning "The Garden." Throughout history, gardens have been places where things grow and flourish with care and attention.
            </p>
            <p>
              That's exactly how we approach our projects at Udhyana Studios. Each game starts as a seed, an idea of what gaming can become when you combine innovation with integrity. We blend cultural heritage with Web3 technology to create experiences that honor tradition while building something new.
            </p>
            <p className="tagline">
              Movechi is the first seed planted in our garden. Watch it grow.
            </p>
          </div>
        </section>

        <section className="about-section cta-box">
          <h2>Join the Movement</h2>
          <p>
            We're just getting started, and we'd love to have you along for the ride. Join our community to get early access to new features, exclusive updates, and a voice in shaping where Movechi goes next.
          </p>
          <div className="social-links">
            <a href="https://discord.gg/movechi" target="_blank" rel="noopener noreferrer" className="social-link discord">
              Join Discord Community
            </a>
            <a href="https://twitter.com/movechi" target="_blank" rel="noopener noreferrer" className="social-link twitter">
              Follow on X
            </a>
          </div>
        </section>

        <div className="footer-nav">
          <button className="back-link" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </main>
    </div>
  )
}