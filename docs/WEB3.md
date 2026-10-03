# Web3 Provenance & Batch Registry Guide

MediStore: Temple of Asclepius integrates decentralized batch verification using Solidity smart contracts on the Ethereum Sepolia testnet, with an offline mock mode for demonstrations.

---

## 1. Smart Contract Architecture

The contract `contracts/BatchRegistry.sol` is written in Solidity `^0.8.20`:

```solidity
contract BatchRegistry {
    address public immutable owner;
    mapping(bytes32 => bool) private _registeredBatches;
    mapping(bytes32 => uint256) private _batchTimestamps;

    event BatchRegistered(bytes32 indexed batchHash, address indexed registeredBy, uint256 timestamp);

    function registerBatch(bytes32 batchHash) external onlyOwner;
    function isRegistered(bytes32 batchHash) external view returns (bool isVerified);
    function getBatchTimestamp(bytes32 batchHash) external view returns (uint256 timestamp);
}
```

### Verification Flow:
1. The user clicks **Verify on Chain** on any remedy product page.
2. The client calculates the Keccak-256 hash of the batch string:
   $$\text{batchHash} = \text{keccak256}(\text{toUtf8Bytes}(\text{batchId}))$$
3. The client queries `isRegistered(batchHash)` through a read-only RPC provider (or mock ledger).
4. If verified, the gold "Sealed by the Oracle" animation displays with transaction metadata and Etherscan links.

---

## 2. Deploying via Remix IDE (Sepolia Testnet)

To deploy the actual contract to the Ethereum Sepolia network:

1. Navigate to [Remix Ethereum IDE](https://remix.ethereum.org/).
2. Create a new file under `contracts/` named `BatchRegistry.sol`.
3. Copy the code from `contracts/BatchRegistry.sol` into Remix.
4. Go to the **Solidity Compiler** tab:
   - Select compiler version `0.8.20` or higher.
   - Click **Compile BatchRegistry.sol**.
5. Go to the **Deploy & Run Transactions** tab:
   - Environment: Select **Injected Provider - MetaMask**.
   - Make sure your MetaMask network is set to **Sepolia (Chain ID 11155111)**.
   - Click **Deploy** and confirm the transaction in MetaMask (requires a fraction of Sepolia testnet ETH from a free faucet).
6. Copy the deployed contract address.
7. To register a demo batch:
   - Hash a batch string (e.g. `ASC-SAL-8821` -> `0x...` in Keccak-256).
   - Expand your deployed contract in Remix.
   - Enter the `bytes32` hash into `registerBatch` and send the transaction.

---

## 3. Configuring the Application

Set these environment variables in your client `.env`:

```env
# Switch mode between 'mock' and 'live'
VITE_WEB3_MODE=live

# The address of your deployed BatchRegistry.sol on Sepolia
VITE_BATCH_REGISTRY_ADDRESS=0xYourDeployedContractAddressHere

# Free public Sepolia RPC URL (e.g., Infura, Alchemy, or public rpc)
VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

---

## 4. Mock Mode (Zero Internet / Zero Extension)

When `VITE_WEB3_MODE=mock` (the default setting):
- An internal deterministic hash-chain ledger simulates smart contract verification.
- Simulated wallet authentication generates deterministic ephemeral signatures.
- No browser extensions (MetaMask), zero internet connectivity, and zero testnet ETH are required.
- A visible **"Demo Ledger"** seal appears to indicate simulation status to judges.
