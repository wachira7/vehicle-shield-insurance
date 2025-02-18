// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVehicleShield {
    enum VerificationTier { Basic, Medium, Premium }
}

interface IRiskAssessment {
    function assessVehicle(
        string memory _regPlate,
        uint256 _baseValue,
        uint256 _age,
        uint256 _mileage,
        uint8 _condition,
        bool _hasAccidentHistory
    ) external returns (IVehicleShield.VerificationTier, uint256);
    
    function calculatePremium(string memory _regPlate, IVehicleShield.VerificationTier _tier) 
        external view returns (uint256);
}

interface IPolicyNFT {
    function mintPolicy(
        address to, 
        string memory vehicleId,
        IVehicleShield.VerificationTier tier,
        uint256 premium,
        uint256 coverage
    ) external returns (uint256);
    function getPolicyOwner(uint256 policyId) external view returns (address);
    function burnPolicy(uint256 policyId) external;
}