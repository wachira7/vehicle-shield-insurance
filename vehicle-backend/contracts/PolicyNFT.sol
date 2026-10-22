// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PolicyNFT
/// @notice One token per insurance policy. Whoever holds the token receives claim payouts,
///         so a policy can follow the vehicle when it is sold.
contract PolicyNFT is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    string private _baseTokenURI;

    constructor(address admin) ERC721("VehicleShield Policy", "VSP") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function mint(address to, uint256 policyId) external onlyRole(MINTER_ROLE) {
        _safeMint(to, policyId);
    }

    function burn(uint256 policyId) external onlyRole(MINTER_ROLE) {
        _burn(policyId);
    }

    function setBaseURI(string calldata baseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
