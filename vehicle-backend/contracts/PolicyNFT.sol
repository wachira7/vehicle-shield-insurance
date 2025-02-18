// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IVehicleShield.sol";

contract PolicyNFT is ERC721, Ownable, IPolicyNFT {
    struct PolicyMetadata {
        string vehicleId;
        uint256 createdAt;
        IVehicleShield.VerificationTier tier;
        uint256 premium;
        uint256 coverage;
    }
    
    mapping(uint256 => PolicyMetadata) private _policies;
    uint256 private _nextPolicyId = 1;
    address private _insuranceCoreAddress;
    
    constructor() ERC721("VehicleShield Policy", "VSP") Ownable(msg.sender) {}
    
    modifier onlyInsuranceCore() {
        require(msg.sender == _insuranceCoreAddress, "Caller is not InsuranceCore");
        _;
    }
    
    function setInsuranceCoreAddress(address insuranceCoreAddress) external onlyOwner {
        _insuranceCoreAddress = insuranceCoreAddress;
    }
    
    function mintPolicy(
        address to, 
        string memory vehicleId,
        IVehicleShield.VerificationTier tier,
        uint256 premium,
        uint256 coverage
    ) external onlyInsuranceCore returns (uint256) {
        uint256 policyId = _nextPolicyId++;
        _policies[policyId] = PolicyMetadata(
            vehicleId,
            block.timestamp,
            tier,
            premium,
            coverage
        );
        _safeMint(to, policyId);
        return policyId;
    }
    
    function getPolicyOwner(uint256 policyId) external view returns (address) {
        return ownerOf(policyId);
    }
    
    function getPolicyMetadata(uint256 policyId) external view returns (PolicyMetadata memory) {
        return _policies[policyId];
    }
    
    function burnPolicy(uint256 policyId) external onlyInsuranceCore {
        _burn(policyId);
        delete _policies[policyId];
    }
}