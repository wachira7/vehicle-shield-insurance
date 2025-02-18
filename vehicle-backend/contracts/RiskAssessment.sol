// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IVehicleShield.sol";

contract RiskAssessment is Ownable, IRiskAssessment {
    struct VehicleRisk {
        uint256 baseValue;
        uint256 age;
        uint256 mileage;
        uint8 condition;
        uint8 riskScore;
        bool hasAccidentHistory;
        uint256 lastAssessment;
    }
    
    struct PremiumFactors {
        uint256 baseRate;
        uint256 ageMultiplier;
        uint256 conditionMultiplier;
        uint256 accidentPenalty;
    }

    mapping(string => VehicleRisk) public vehicleRisks;
    mapping(IVehicleShield.VerificationTier => PremiumFactors) public tierPremiums;
    
    event RiskAssessed(string regPlate, uint8 riskScore, IVehicleShield.VerificationTier tier);
    
    constructor() Ownable(msg.sender) {
        tierPremiums[IVehicleShield.VerificationTier.Basic] = PremiumFactors(0.01 ether, 2, 5, 10);
        tierPremiums[IVehicleShield.VerificationTier.Medium] = PremiumFactors(0.02 ether, 1, 3, 7);
        tierPremiums[IVehicleShield.VerificationTier.Premium] = PremiumFactors(0.03 ether, 1, 2, 5);
    }

    function assessVehicle(
        string memory _regPlate,
        uint256 _baseValue,
        uint256 _age,
        uint256 _mileage,
        uint8 _condition,
        bool _hasAccidentHistory
    ) external returns (IVehicleShield.VerificationTier, uint256) {
        require(_condition <= 10, "Condition must be 1-10");
        require(_mileage <= 1000000, "Invalid mileage");
        
        uint8 riskScore = calculateRiskScore(_age, _mileage, _condition, _hasAccidentHistory);
        
        vehicleRisks[_regPlate] = VehicleRisk({
            baseValue: _baseValue,
            age: _age,
            mileage: _mileage,
            condition: _condition,
            riskScore: riskScore,
            hasAccidentHistory: _hasAccidentHistory,
            lastAssessment: block.timestamp
        });

        IVehicleShield.VerificationTier tier = determineTier(_baseValue, riskScore);
        uint256 premium = calculatePremium(_regPlate, tier);
        
        emit RiskAssessed(_regPlate, riskScore, tier);
        
        return (tier, premium);
    }
    
    function calculateRiskScore(
        uint256 _age,
        uint256 _mileage,
        uint8 _condition,
        bool _hasAccidentHistory
    ) public pure returns (uint8) {
        uint256 score = 100;
        score = score - (_age * 2);
        score = score - ((_mileage / 10000) * 3);
        score = score + (_condition * 5);
        if (_hasAccidentHistory) {
            score = score - 20;
        }
        if (score > 100) score = 100;
        if (score < 0) score = 0;
        return uint8(score);
    }
    
    function determineTier(uint256 _baseValue, uint8 _riskScore) public pure returns (IVehicleShield.VerificationTier) {
        if (_baseValue >= 0.2 ether && _riskScore >= 80) {
            return IVehicleShield.VerificationTier.Premium;
        } else if (_baseValue >= 0.1 ether && _riskScore >= 60) {
            return IVehicleShield.VerificationTier.Medium;
        }
        return IVehicleShield.VerificationTier.Basic;
    }
    
    function calculatePremium(
        string memory _regPlate, 
        IVehicleShield.VerificationTier _tier
    ) public view returns (uint256) {
        VehicleRisk storage risk = vehicleRisks[_regPlate];
        PremiumFactors storage factors = tierPremiums[_tier];
        
        uint256 premium = factors.baseRate;
        premium += (risk.age * factors.ageMultiplier);
        premium += ((10 - risk.condition) * factors.conditionMultiplier);
        if (risk.hasAccidentHistory) {
            premium += factors.accidentPenalty;
        }
        return premium;
    }

    function updatePremiumFactors(
        IVehicleShield.VerificationTier _tier,
        uint256 _baseRate,
        uint256 _ageMultiplier,
        uint256 _conditionMultiplier,
        uint256 _accidentPenalty
    ) external onlyOwner {
        tierPremiums[_tier] = PremiumFactors({
            baseRate: _baseRate,
            ageMultiplier: _ageMultiplier,
            conditionMultiplier: _conditionMultiplier,
            accidentPenalty: _accidentPenalty
        });
    }

    function getVehicleRisk(string memory _regPlate) 
        external 
        view 
        returns (VehicleRisk memory) {
        return vehicleRisks[_regPlate];
    }
}