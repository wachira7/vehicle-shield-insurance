// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IVehicleShield.sol";


contract InsuranceCore is ReentrancyGuard, Ownable {
    IPolicyNFT public policyNFT;
    IRiskAssessment public riskAssessment;
    
    enum VerificationStatus { Pending, Verified, Rejected }
    
    
    struct VehiclePhotos {
        string frontHash;
        string backHash;
        string leftHash;
        string rightHash;
        string mirrorLeftHash;
        string mirrorRightHash;
        uint256 uploadDate;
        bool isComplete;
    }
    
    struct Vehicle {
        string regPlate;
        string make;
        string model;
        uint256 year;
        address owner;
        VerificationStatus status;
        IVehicleShield.VerificationTier tier;
        uint256 lastVerificationDate;
        bool isRegistered;
    }
    
    struct Policy {
        uint256 coverage;
        uint256 startDate;
        uint256 endDate;
        bool isActive;
        IVehicleShield.VerificationTier tier;
    }
    
    struct Claim {
        uint256 claimId;
        uint256 policyId;
        string description;
        string photoHash;
        uint256 amount;
        bool isProcessed;
        bool isPaid;
    }
    
    mapping(string => Vehicle) public vehicles;
    mapping(string => VehiclePhotos) public vehiclePhotos;
    mapping(uint256 => Policy) public policies;
    mapping(uint256 => Claim) public claims;
    mapping(IVehicleShield.VerificationTier => uint256) public coverageLimits;
    
    uint256 private _nextClaimId = 1;
    
    event VehicleRegistered(string regPlate, address owner, IVehicleShield.VerificationTier tier);
    event PhotosUploaded(string regPlate, uint256 uploadDate);
    event VerificationStatusUpdated(string regPlate, VerificationStatus status);
    event PolicyCreated(uint256 indexed policyId, address indexed owner, string vehicleId);
    event ClaimSubmitted(uint256 indexed claimId, uint256 indexed policyId);
    event ClaimProcessed(uint256 indexed claimId, bool approved);
    event ClaimPaid(uint256 indexed claimId, uint256 amount);

    constructor(address _policyNFTAddress, address _riskAssessmentAddress) Ownable(msg.sender) {
        policyNFT = IPolicyNFT(_policyNFTAddress);
        riskAssessment = IRiskAssessment(_riskAssessmentAddress);
        
        coverageLimits[IVehicleShield.VerificationTier.Basic] = 0.05 ether;
        coverageLimits[IVehicleShield.VerificationTier.Medium] = 0.1 ether;
        coverageLimits[IVehicleShield.VerificationTier.Premium] = 0.2 ether;
    }

    function registerVehicle(
        string memory _regPlate,
        string memory _make,
        string memory _model,
        uint256 _year,
        uint256 _baseValue,
        uint256 _mileage,
        uint8 _condition,
        bool _hasAccidentHistory
    ) external {
        require(!vehicles[_regPlate].isRegistered, "Vehicle already registered");
        require(_year <= block.timestamp / 365 days + 1970, "Invalid year");
        
         (IVehicleShield.VerificationTier tier, ) = riskAssessment.assessVehicle(
            _regPlate,
            _baseValue,
            block.timestamp / 365 days + 1970 - _year,
            _mileage,
            _condition,
            _hasAccidentHistory
        );

        vehicles[_regPlate] = Vehicle({
            regPlate: _regPlate,
            make: _make,
            model: _model,
            year: _year,
            owner: msg.sender,
            status: VerificationStatus.Pending,
            tier: tier,
            lastVerificationDate: block.timestamp,
            isRegistered: true
        });
        
        emit VehicleRegistered(_regPlate, msg.sender, tier);
    }
    
    function uploadVehiclePhotos(
        string memory _regPlate,
        string memory _frontHash,
        string memory _backHash,
        string memory _leftHash,
        string memory _rightHash,
        string memory _mirrorLeftHash,
        string memory _mirrorRightHash
    ) external {
        require(vehicles[_regPlate].owner == msg.sender, "Not vehicle owner");
        require(!vehiclePhotos[_regPlate].isComplete, "Photos already uploaded");
        
        vehiclePhotos[_regPlate] = VehiclePhotos({
            frontHash: _frontHash,
            backHash: _backHash,
            leftHash: _leftHash,
            rightHash: _rightHash,
            mirrorLeftHash: _mirrorLeftHash,
            mirrorRightHash: _mirrorRightHash,
            uploadDate: block.timestamp,
            isComplete: true
        });
        
        emit PhotosUploaded(_regPlate, block.timestamp);
    }
    
    function updateVerificationStatus(
        string memory _regPlate,
        VerificationStatus _status
    ) external onlyOwner {
        require(vehicles[_regPlate].isRegistered, "Vehicle not registered");
        require(vehiclePhotos[_regPlate].isComplete, "Photos not uploaded");
        
        vehicles[_regPlate].status = _status;
        vehicles[_regPlate].lastVerificationDate = block.timestamp;
        
        emit VerificationStatusUpdated(_regPlate, _status);
    }

    function createPolicy(
        string memory _regPlate,
        uint256 _duration,
        uint256 _coverage
    ) external payable nonReentrant returns (uint256) {
        Vehicle storage vehicle = vehicles[_regPlate];
        require(vehicle.isRegistered, "Vehicle not registered");
        require(vehicle.owner == msg.sender, "Not vehicle owner");
        require(vehicle.status == VerificationStatus.Verified, "Vehicle not verified");
        require(_coverage <= coverageLimits[vehicle.tier], "Coverage exceeds tier limit");
        
        uint256 requiredPremium = riskAssessment.calculatePremium(_regPlate, vehicle.tier);  
        require(msg.value >= requiredPremium, "Insufficient premium payment");  
        require(_duration > 0, "Invalid duration");
        
        uint256 policyId = policyNFT.mintPolicy(msg.sender, _regPlate, vehicle.tier, requiredPremium, _coverage);
        
        policies[policyId] = Policy({
            coverage: _coverage,
            startDate: block.timestamp,
            endDate: block.timestamp + _duration,
            isActive: true,
            tier: vehicle.tier
        });
        
        emit PolicyCreated(policyId, msg.sender, _regPlate);
        return policyId;
    }
    
    function submitClaim(
        uint256 _policyId,
        string memory _description,
        string memory _photoHash,
        uint256 _amount
    ) external nonReentrant returns (uint256) {
        require(policies[_policyId].isActive, "Policy not active");
        require(policyNFT.getPolicyOwner(_policyId) == msg.sender, "Not policy owner");
        
        uint256 claimId = _nextClaimId++;
        claims[claimId] = Claim({
            claimId: claimId,
            policyId: _policyId,
            description: _description,
            photoHash: _photoHash,
            amount: _amount,
            isProcessed: false,
            isPaid: false
        });
        
        emit ClaimSubmitted(claimId, _policyId);
        return claimId;
    }
    
    function processClaim(uint256 _claimId, bool _approved) external onlyOwner {
        Claim storage claim = claims[_claimId];
        require(!claim.isProcessed, "Claim already processed");
        
        claim.isProcessed = true;
        if (_approved) {
            _processPayout(claim);
        }
        
        emit ClaimProcessed(_claimId, _approved);
    }
    
    function _processPayout(Claim storage _claim) private {
        require(!_claim.isPaid, "Claim already paid");
        require(address(this).balance >= _claim.amount, "Insufficient contract balance");
        
        address payable recipient = payable(policyNFT.getPolicyOwner(_claim.policyId));
        _claim.isPaid = true;
        
        (bool sent, ) = recipient.call{value: _claim.amount}("");
        require(sent, "Failed to send payment");
        
        emit ClaimPaid(_claim.claimId, _claim.amount);
    }
    
    receive() external payable {}
}