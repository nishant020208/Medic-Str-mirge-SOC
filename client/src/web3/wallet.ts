import { ethers } from 'ethers';
import { User } from '../types';

export async function signInWithWallet(): Promise<User> {
  const mode = import.meta.env.VITE_WEB3_MODE || 'mock';

  // Step 1: Request single-use nonce from server
  const nonceRes = await fetch('/api/auth/nonce', {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });

  if (!nonceRes.ok) {
    throw new Error('Failed to retrieve authentication nonce from oracle');
  }

  const { nonce, domain } = await nonceRes.json();
  const issuedAt = new Date().toISOString();

  let address: string;
  let signature: string;
  let message: string;

  if (mode === 'live') {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error(
        'No Web3 wallet extension found. Please install MetaMask or use Mock mode.'
      );
    }

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    // Request accounts
    const accounts = await provider.send('eth_requestAccounts', []);
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts selected in wallet');
    }

    address = accounts[0];

    // Ensure Sepolia network
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111n) {
      try {
        await provider.send('wallet_switchEthereumChain', [{ chainId: '0xaa36a7' }]);
      } catch (switchError: any) {
        throw new Error('Please switch your wallet network to Sepolia (Chain ID 11155111)');
      }
    }

    const signer = await provider.getSigner();

    // Standard SIWE formatted message
    message = `${domain} requests your consecration with your Ethereum account:
${address}

Sanctum Authentication Nonce: ${nonce}
Issued At: ${issuedAt}`;

    signature = await signer.signMessage(message);
  } else {
    // Mock Web3 Mode: deterministic test wallet
    // Generate deterministic demo address & sign
    const mockWallet = ethers.Wallet.createRandom();
    address = mockWallet.address;

    message = `${domain || 'medistore.oracle'} requests your consecration with your Ethereum account:
${address}

Sanctum Authentication Nonce: ${nonce}
Issued At: ${issuedAt}`;

    signature = await mockWallet.signMessage(message);
    // Short simulated delay for signature popup feel
    await new Promise((res) => setTimeout(res, 500));
  }

  // Step 2: Send signature to server
  const verifyRes = await fetch('/api/auth/wallet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      address,
      message,
      signature,
      nonce,
    }),
  });

  const verifyData = await verifyRes.json();

  if (!verifyRes.ok) {
    throw new Error(verifyData.error || 'Server rejected cryptographic signature');
  }

  return verifyData.user;
}
