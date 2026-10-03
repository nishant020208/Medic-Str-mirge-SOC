// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BatchRegistry
 * @dev Consecrated ledger for MediStore: Temple of Asclepius.
 * Stores cryptographically verified pharmaceutical batch hashes to prevent counterfeits.
 */
contract BatchRegistry {
    address public immutable owner;

    // Mapping from Keccak-256 batch hash to registration status
    mapping(bytes32 => bool) private _registeredBatches;
    mapping(bytes32 => uint256) private _batchTimestamps;

    event BatchRegistered(
        bytes32 indexed batchHash,
        address indexed registeredBy,
        uint256 timestamp
    );

    error Unauthorized();
    error BatchAlreadyRegistered();
    error InvalidHash();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Registers a new pharmaceutical batch hash into the immutable temple ledger
     * @param batchHash Keccak-256 hash of the batch identifier
     */
    function registerBatch(bytes32 batchHash) external onlyOwner {
        if (batchHash == bytes32(0)) revert InvalidHash();
        if (_registeredBatches[batchHash]) revert BatchAlreadyRegistered();

        _registeredBatches[batchHash] = true;
        _batchTimestamps[batchHash] = block.timestamp;

        emit BatchRegistered(batchHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Verifies if a batch hash is recorded in the temple ledger
     * @param batchHash Keccak-256 hash to query
     * @return isVerified True if registered, false otherwise
     */
    function isRegistered(bytes32 batchHash) external view returns (bool isVerified) {
        return _registeredBatches[batchHash];
    }

    /**
     * @notice Retrieves registration timestamp of a verified batch
     * @param batchHash Keccak-256 hash to query
     * @return timestamp Unix timestamp of registration, or 0 if unregistered
     */
    function getBatchTimestamp(bytes32 batchHash) external view returns (uint256 timestamp) {
        return _batchTimestamps[batchHash];
    }
}
