import { AptosConfig, Network } from "@aptos-labs/ts-sdk";

export function getAptosConfig() {
  const fullnode = import.meta.env.VITE_FULLNODE_URL || "https://testnet.movementnetwork.xyz/v1";
  const faucet = import.meta.env.VITE_FAUCET_URL || "https://faucet.testnet.movementnetwork.xyz/";
  // Force CUSTOM so we always use the provided Movement fullnode
  return new AptosConfig({ network: Network.CUSTOM, fullnode, faucet });
}

export function getDappConfig() {
  const fullnode = import.meta.env.VITE_FULLNODE_URL || "https://testnet.movementnetwork.xyz/v1";
  const faucet = import.meta.env.VITE_FAUCET_URL || "https://faucet.testnet.movementnetwork.xyz/";
  // Wallet adapter config - just pass URLs without network
  return { fullnode, faucet };
}
