import { ethers } from 'ethers';
import { BatchVerificationResult } from '../types';

export const DEMO_MOCK_LEDGER: Record<
  string,
  {
    txHash: string;
    blockNumber: number;
    timestamp: string;
    previousHash: string;
  }
> = {
  // We'll populate with known batch hashes
  DEFAULT: {
    txHash: '0x7a29e4bfd8234c9c10427845f939e2468351f28b7654bcdef981240c4a3b7692',
    blockNumber: 5824901,
    timestamp: '2026-09-18T10:14:00Z',
    previousHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  },
};

const BATCH_REGISTRY_ABI = [
  'function isRegistered(bytes32 batchHash) view returns (bool)',
  'function registerBatch(bytes32 batchHash)',
  'event BatchRegistered(bytes32 indexed batchHash, address indexed registeredBy, uint256 timestamp)',
];

export async function verifyBatchOnChain(batchId: string): Promise<BatchVerificationResult> {
  const mode = import.meta.env.VITE_WEB3_MODE || 'mock';
  const batchHash = ethers.keccak256(ethers.toUtf8Bytes(batchId));

  if (mode === 'live') {
    const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
    const contractAddress = import.meta.env.VITE_BATCH_REGISTRY_ADDRESS;

    if (!rpcUrl || !contractAddress) {
      throw new Error('Live mode requested but VITE_SEPOLIA_RPC_URL or VITE_BATCH_REGISTRY_ADDRESS not configured');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, BATCH_REGISTRY_ABI, provider);

    const isRegistered = await contract.isRegistered(batchHash);

    return {
      batchId,
      hash: batchHash,
      isRegistered,
      network: 'Sepolia (11155111)',
      contractAddress,
    };
  }

  // Mock mode: local hash chain ledger
  // Simulated small delay for realistic oracle consultation
  await new Promise((res) => setTimeout(res, 600));

  // In demo mode, all valid formatted batches starting with MEDI- or BATCH- are registered
  const isRegistered = batchId.startsWith('ASC-') || batchId.startsWith('MEDI-') || batchId.length > 5;

  return {
    batchId,
    hash: batchHash,
    isRegistered,
    network: 'mock',
    txHash: '0x8f2d591b93847e03492aef435b87c29304758b9019234857efab69403819284a',
    blockNumber: 5931042,
    timestamp: new Date().toISOString(),
    contractAddress: '0xAsclepiusBatchRegistryMock0000000000000',
  };
}
