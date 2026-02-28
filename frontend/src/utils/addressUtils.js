/**
 * Address normalization utility
 * Single source of truth for address handling
 */

export const normalizeAddress = (addr) => {
  if (!addr) return ''
  const str = addr.toString()
  if (!str.startsWith('0x')) return str.toLowerCase()
  const hex = str.slice(2).replace(/^0+/, '')
  return `0x${hex.toLowerCase()}`
}

export const validateAddress = (addr) => {
  try {
    const normalized = normalizeAddress(addr)
    return /^0x[a-f0-9]{1,64}$/.test(normalized)
  } catch {
    return false
  }
}

export const formatAddressShort = (addr) => {
  if (!addr) return ''
  const normalized = normalizeAddress(addr)
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`
}

export default { normalizeAddress, validateAddress, formatAddressShort }
