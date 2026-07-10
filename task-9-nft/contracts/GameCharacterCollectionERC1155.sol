// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155URIStorage} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title GameCharacterCollectionERC1155
/// @notice A freely transferable ERC-1155 collection of 10 game characters
///         (token ids 1..10), each with its own individually stored metadata URI.
/// @dev Built on OpenZeppelin v5.x. Standard transfer/approval behaviour is kept
///      untouched. Per-token URIs are supplied by the caller (deploy/mint scripts)
///      rather than hardcoded here.
contract GameCharacterCollectionERC1155 is ERC1155, ERC1155URIStorage, Ownable {
    /// @notice Number of distinct characters in the collection (token ids 1..10).
    uint256 public constant TOTAL_CHARACTERS = 10;

    /// @param initialOwner Address that will own the contract and be allowed to mint.
    /// @dev The base URI is left empty; every token id gets its own URI via `_setURI`.
    constructor(address initialOwner) ERC1155("") Ownable(initialOwner) {}

    /// @notice Mints one copy of every character (token ids 1..10) to `to` in a single
    ///         batch, and stores each token's individual metadata URI.
    /// @param to   Recipient of the whole collection.
    /// @param uris Exactly `TOTAL_CHARACTERS` metadata URIs, ordered by token id
    ///             (uris[0] -> id 1, uris[1] -> id 2, ...).
    function mintCollection(address to, string[] calldata uris) external onlyOwner {
        require(uris.length == TOTAL_CHARACTERS, "uris length must be 10");

        uint256[] memory ids = new uint256[](TOTAL_CHARACTERS);
        uint256[] memory amounts = new uint256[](TOTAL_CHARACTERS);

        for (uint256 i = 0; i < TOTAL_CHARACTERS; i++) {
            uint256 tokenId = i + 1;
            ids[i] = tokenId;
            amounts[i] = 1;
            _setURI(tokenId, uris[i]);
        }

        _mintBatch(to, ids, amounts, "");
    }

    // ---------------------------------------------------------------------
    // Required override (ERC1155 + ERC1155URIStorage both declare `uri`)
    // ---------------------------------------------------------------------

    function uri(uint256 tokenId)
        public
        view
        override(ERC1155, ERC1155URIStorage)
        returns (string memory)
    {
        return super.uri(tokenId);
    }
}
