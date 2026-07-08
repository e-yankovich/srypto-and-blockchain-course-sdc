// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title MyTokenV1
/// @notice Upgradeable ERC20 token using the UUPS proxy pattern.
contract MyTokenV1 is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // Lock the implementation contract so it can't be initialized directly.
        _disableInitializers();
    }

    /// @notice Initializer used in place of a constructor for upgradeable contracts.
    /// @param initialOwner Address that receives ownership and mint rights.
    function initialize(address initialOwner) public initializer {
        __ERC20_init("MyToken", "MTK");
        __Ownable_init(initialOwner);
    }

    /// @notice Mint new tokens. Restricted to the owner.
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // `transfer` is inherited unchanged from ERC20Upgradeable.

    /// @dev Authorizes contract upgrades. Only the owner may upgrade.
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
