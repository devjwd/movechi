/**
 * Environment validation
 * Ensures all required variables are set before app runs
 */

export const validateEnvironment = () => {
  const required = {
    VITE_CONTRACT_ADDRESS: 'Smart contract address',
    VITE_MODULE_NAME: 'Move module name',
    VITE_FULLNODE_URL: 'Aptos/Movement RPC endpoint',
    VITE_COLLECTION_ID: 'NFT collection address'
  }
  
  const missing = []
  const configured = []
  
  Object.entries(required).forEach(([key, description]) => {
    const value = import.meta.env[key]
    if (value) {
      configured.push(`✓ ${key}`)
    } else {
      missing.push(`  ${key} - ${description}`)
    }
  })
  
  if (missing.length > 0) {
    console.error(
      '\n❌ Missing environment variables:\n' +
      missing.join('\n') +
      '\n\n📝 Copy .env.local.example to .env.local and fill in all values.\n'
    )
    throw new Error('Environment configuration incomplete')
  }
  
  // Log configured variables in dev only
  if (import.meta.env.DEV) {
    console.log('✅ Environment configured:\n' + configured.join('\n'))
  }
}

export default validateEnvironment
