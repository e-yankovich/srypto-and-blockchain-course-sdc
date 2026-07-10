// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SoulboundVisitCardERC721
/// @notice A non-transferable ("soulbound") ERC-721 visit card. Each student
///         address may hold exactly one unique, permanently bound token.
/// @dev Built on OpenZeppelin v5.x. Transfer blocking is implemented by
///      overriding `_update` (the v4 `_beforeTokenTransfer` hook no longer exists).
contract SoulboundVisitCardERC721 is ERC721, ERC721URIStorage, Ownable {
    /// @notice Incrementing id assigned to the next minted token (starts at 1).
    uint256 private _nextTokenId = 1;

    /// @param initialOwner Address that will own the contract and be allowed to mint.
    constructor(address initialOwner)
        ERC721("Student Visit Card", "SVC")
        Ownable(initialOwner)
    {}

    /// @notice Mints exactly one soulbound visit card to `to` with its own metadata URI.
    /// @dev Reverts if `to` already holds a card, enforcing "one unique token per student".
    /// @param to  Recipient (student) address.
    /// @param uri Per-token metadata URI (e.g. an ipfs:// link).
    /// @return tokenId The id of the freshly minted token.
    function mint(address to, string memory uri) external onlyOwner returns (uint256 tokenId) {
        require(balanceOf(to) == 0, "Student already has a visit card");

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // ---------------------------------------------------------------------
    // Soulbound logic
    // ---------------------------------------------------------------------

    /// @dev Central transfer hook in OZ v5. `from` is the current owner of the
    ///      token (address(0) on mint). We allow only mint (from == 0) and burn
    ///      (to == 0); any owner-to-owner transfer is rejected.
    ///      Note: `_update` clears approvals via the *internal* `_approve`, so the
    ///      public `approve`/`setApprovalForAll` overrides below do not break minting.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: transfers are disabled");
        }
        return super._update(to, tokenId, auth);
    }

    /// @dev Approvals are meaningless for a soulbound token: always revert.
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert("Soulbound: approvals are disabled");
    }

    /// @dev Operator approvals are meaningless for a soulbound token: always revert.
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert("Soulbound: approvals are disabled");
    }

    // ---------------------------------------------------------------------
    // Required overrides (ERC721 + ERC721URIStorage)
    // ---------------------------------------------------------------------

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
