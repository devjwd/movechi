import { StrictMode, Suspense, lazy } from 'react'
import ErrorBoundary from './ErrorBoundary.jsx'
import Preloader from './components/Preloader.jsx'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react"
import { getDappConfig } from "./config/network"
import validateEnvironment from './utils/validateEnv'
import './index.css'

// Validate environment before anything else
validateEnvironment()
const App = lazy(() => import('./App.jsx'))
const Home = lazy(() => import('./home.jsx'))
const Admin = lazy(() => import('./Admin.jsx'))
const Reward = lazy(() => import('./Reward.jsx'))
const Staking = lazy(() => import('./Staking.jsx'))
const Docs = lazy(() => import('./Docs.jsx'))
const Leaderboard = lazy(() => import('./Leaderboard.jsx'))
const Art = lazy(() => import('./Art.jsx'))
const FAQ = lazy(() => import('./FAQ.jsx'))
const About = lazy(() => import('./About.jsx'))
const NotFound = lazy(() => import('./NotFound.jsx'))

const config = getDappConfig()

function AppRouter() {
  return (
    <Router>
      <Suspense fallback={<Preloader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/spin" element={<App />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/reward" element={<Reward />} />
          <Route path="/staking" element={<Staking />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/art" element={<Art />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
    <AptosWalletAdapterProvider
      plugins={[]}
      autoConnect={true}
      dappConfig={config}
      onError={(error) => {}}
    >
      <AppRouter />
    </AptosWalletAdapterProvider>
    </ErrorBoundary>
  </StrictMode>,
)
