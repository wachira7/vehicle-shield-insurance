// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {PolicyNFT} from "./PolicyNFT.sol";

/// @title InsuranceCore
/// @notice Sells vehicle policies against quotes signed by the off-chain pricing service,
///         holds the premium pool in a stablecoin, and runs the claim lifecycle.
/// @dev Vehicle details and photos stay off-chain. The pricing service only signs a quote
///      for a vehicle it has verified for that buyer, so `vehicleId` is an opaque hash.
contract InsuranceCore is AccessControl, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    bytes32 public constant QUOTE_SIGNER_ROLE = keccak256("QUOTE_SIGNER_ROLE");
    bytes32 public constant ASSESSOR_ROLE = keccak256("ASSESSOR_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    bytes32 public constant QUOTE_TYPEHASH = keccak256(
        "Quote(address buyer,bytes32 vehicleId,uint256 coverage,uint256 premium,uint256 deductible,uint64 duration,uint64 deadline,bytes32 nonce)"
    );

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_CANCELLATION_FEE_BPS = 5_000;

    struct Quote {
        address buyer;
        bytes32 vehicleId;
        uint256 coverage; // maximum total payout over the policy's life
        uint256 premium;
        uint256 deductible; // subtracted from each approved claim
        uint64 duration; // seconds
        uint64 deadline; // quote expiry (unix seconds)
        bytes32 nonce;
    }

    struct Policy {
        bytes32 vehicleId;
        uint256 coverage;
        uint256 premium;
        uint256 deductible;
        uint256 paidOut;
        uint256 reserved; // open claim amounts held against this policy's coverage
        uint64 startTime;
        uint64 endTime;
        bool cancelled;
    }

    enum ClaimStatus {
        None,
        Submitted,
        UnderReview,
        Approved,
        Rejected,
        Paid
    }

    struct Claim {
        uint256 policyId;
        uint256 requestedAmount;
        uint256 payoutAmount;
        string evidenceURI;
        ClaimStatus status;
        uint64 submittedAt;
        uint64 updatedAt;
    }

    IERC20 public immutable paymentToken;
    PolicyNFT public immutable policyNFT;

    mapping(uint256 => Policy) private _policies;
    mapping(uint256 => Claim) private _claims;
    mapping(uint256 => uint256[]) private _policyClaimIds;
    mapping(bytes32 => uint256) public currentPolicyOfVehicle;
    mapping(bytes32 => bool) public usedQuoteNonces;

    uint256 public nextPolicyId = 1;
    uint256 public nextClaimId = 1;
    /// @notice Sum of all open claim amounts; the treasurer can never withdraw below this.
    uint256 public totalReserved;
    uint256 public cancellationFeeBps = 1_000;

    event PolicyPurchased(
        uint256 indexed policyId,
        address indexed buyer,
        bytes32 indexed vehicleId,
        uint256 coverage,
        uint256 premium,
        uint256 deductible,
        uint64 startTime,
        uint64 endTime
    );
    event PolicyCancelled(uint256 indexed policyId, address indexed holder, uint256 refund);
    event ClaimSubmitted(uint256 indexed claimId, uint256 indexed policyId, address indexed claimant, uint256 amount, string evidenceURI);
    event ClaimStatusChanged(uint256 indexed claimId, uint256 indexed policyId, ClaimStatus status, uint64 timestamp);
    event ClaimApproved(uint256 indexed claimId, uint256 approvedAmount, uint256 payoutAmount);
    event ClaimRejected(uint256 indexed claimId, string reason);
    event ClaimPaid(uint256 indexed claimId, address indexed recipient, uint256 amount);
    event PoolFunded(address indexed from, uint256 amount);
    event PoolWithdrawn(address indexed to, uint256 amount);
    event CancellationFeeUpdated(uint256 feeBps);

    error NotQuoteBuyer();
    error QuoteExpired();
    error QuoteAlreadyUsed();
    error InvalidQuoteSigner();
    error InvalidQuoteTerms();
    error VehicleAlreadyInsured(uint256 policyId);
    error NotPolicyHolder();
    error PolicyNotActive();
    error PolicyHasOpenClaims();
    error PolicyHasPaidClaims();
    error InvalidClaimAmount();
    error ExceedsRemainingCoverage(uint256 remaining);
    error EvidenceRequired();
    error InvalidClaimStatus(ClaimStatus status);
    error NothingToPay();
    error InsufficientFreeFunds(uint256 available);
    error FeeTooHigh();
    error ZeroAddress();

    constructor(address admin, IERC20 paymentToken_, PolicyNFT policyNFT_) EIP712("VehicleShield", "1") {
        if (admin == address(0) || address(paymentToken_) == address(0) || address(policyNFT_) == address(0)) {
            revert ZeroAddress();
        }
        paymentToken = paymentToken_;
        policyNFT = policyNFT_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ---------------------------------------------------------------------
    // Buying and cancelling
    // ---------------------------------------------------------------------

    function buyPolicy(Quote calldata quote, bytes calldata signature)
        external
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        return _buyPolicy(quote, signature);
    }

    /// @notice Same as `buyPolicy`, approving the premium with an EIP-2612 permit in the same transaction.
    /// @dev The permit is wrapped in try/catch so a front-run permit doesn't block the purchase.
    function buyPolicyWithPermit(
        Quote calldata quote,
        bytes calldata signature,
        uint256 permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused nonReentrant returns (uint256) {
        try IERC20Permit(address(paymentToken)).permit(msg.sender, address(this), quote.premium, permitDeadline, v, r, s) {}
        catch {}
        return _buyPolicy(quote, signature);
    }

    function _buyPolicy(Quote calldata quote, bytes calldata signature) private returns (uint256 policyId) {
        if (quote.buyer != msg.sender) revert NotQuoteBuyer();
        if (block.timestamp > quote.deadline) revert QuoteExpired();
        if (usedQuoteNonces[quote.nonce]) revert QuoteAlreadyUsed();
        if (quote.coverage == 0 || quote.premium == 0 || quote.duration == 0 || quote.deductible >= quote.coverage) {
            revert InvalidQuoteTerms();
        }

        {
            address signer = ECDSA.recover(_hashTypedDataV4(_hashQuote(quote)), signature);
            if (!hasRole(QUOTE_SIGNER_ROLE, signer)) revert InvalidQuoteSigner();

            uint256 existing = currentPolicyOfVehicle[quote.vehicleId];
            if (existing != 0 && isPolicyActive(existing)) revert VehicleAlreadyInsured(existing);
        }

        usedQuoteNonces[quote.nonce] = true;
        policyId = nextPolicyId++;
        uint64 start = uint64(block.timestamp);

        _policies[policyId] = Policy({
            vehicleId: quote.vehicleId,
            coverage: quote.coverage,
            premium: quote.premium,
            deductible: quote.deductible,
            paidOut: 0,
            reserved: 0,
            startTime: start,
            endTime: start + quote.duration,
            cancelled: false
        });
        currentPolicyOfVehicle[quote.vehicleId] = policyId;

        paymentToken.safeTransferFrom(msg.sender, address(this), quote.premium);
        policyNFT.mint(msg.sender, policyId);

        _emitPurchased(policyId, quote);
    }

    function _emitPurchased(uint256 policyId, Quote calldata quote) private {
        Policy storage policy = _policies[policyId];
        emit PolicyPurchased(
            policyId,
            msg.sender,
            quote.vehicleId,
            quote.coverage,
            quote.premium,
            quote.deductible,
            policy.startTime,
            policy.endTime
        );
    }

    /// @notice Cancel an active policy with no claim history and refund the unused premium, minus a fee.
    function cancelPolicy(uint256 policyId) external nonReentrant returns (uint256 refund) {
        if (policyNFT.ownerOf(policyId) != msg.sender) revert NotPolicyHolder();
        if (!isPolicyActive(policyId)) revert PolicyNotActive();
        Policy storage policy = _policies[policyId];
        if (policy.reserved != 0) revert PolicyHasOpenClaims();
        if (policy.paidOut != 0) revert PolicyHasPaidClaims();

        refund = cancellationRefund(policyId);
        policy.cancelled = true;
        if (currentPolicyOfVehicle[policy.vehicleId] == policyId) {
            delete currentPolicyOfVehicle[policy.vehicleId];
        }

        policyNFT.burn(policyId);
        if (refund != 0) paymentToken.safeTransfer(msg.sender, refund);

        emit PolicyCancelled(policyId, msg.sender, refund);
    }

    // ---------------------------------------------------------------------
    // Claims
    // ---------------------------------------------------------------------

    function submitClaim(uint256 policyId, uint256 amount, string calldata evidenceURI)
        external
        whenNotPaused
        returns (uint256 claimId)
    {
        if (policyNFT.ownerOf(policyId) != msg.sender) revert NotPolicyHolder();
        if (!isPolicyActive(policyId)) revert PolicyNotActive();
        if (amount == 0) revert InvalidClaimAmount();
        if (bytes(evidenceURI).length == 0) revert EvidenceRequired();

        Policy storage policy = _policies[policyId];
        uint256 remaining = remainingCoverage(policyId);
        if (amount > remaining) revert ExceedsRemainingCoverage(remaining);

        policy.reserved += amount;
        totalReserved += amount;

        claimId = nextClaimId++;
        uint64 now_ = uint64(block.timestamp);
        _claims[claimId] = Claim({
            policyId: policyId,
            requestedAmount: amount,
            payoutAmount: 0,
            evidenceURI: evidenceURI,
            status: ClaimStatus.Submitted,
            submittedAt: now_,
            updatedAt: now_
        });
        _policyClaimIds[policyId].push(claimId);

        emit ClaimSubmitted(claimId, policyId, msg.sender, amount, evidenceURI);
        emit ClaimStatusChanged(claimId, policyId, ClaimStatus.Submitted, now_);
    }

    function startReview(uint256 claimId) external onlyRole(ASSESSOR_ROLE) {
        Claim storage claim = _claims[claimId];
        if (claim.status != ClaimStatus.Submitted) revert InvalidClaimStatus(claim.status);
        _setStatus(claimId, claim, ClaimStatus.UnderReview);
    }

    /// @notice Approve a claim for up to the requested amount. The policy deductible is subtracted
    ///         on-chain, and only the payout stays reserved.
    function approveClaim(uint256 claimId, uint256 approvedAmount) external onlyRole(ASSESSOR_ROLE) {
        Claim storage claim = _claims[claimId];
        if (claim.status != ClaimStatus.Submitted && claim.status != ClaimStatus.UnderReview) {
            revert InvalidClaimStatus(claim.status);
        }
        if (approvedAmount == 0 || approvedAmount > claim.requestedAmount) revert InvalidClaimAmount();

        Policy storage policy = _policies[claim.policyId];
        uint256 payout = approvedAmount > policy.deductible ? approvedAmount - policy.deductible : 0;
        if (payout == 0) revert NothingToPay();

        uint256 released = claim.requestedAmount - payout;
        policy.reserved -= released;
        totalReserved -= released;
        claim.payoutAmount = payout;

        emit ClaimApproved(claimId, approvedAmount, payout);
        _setStatus(claimId, claim, ClaimStatus.Approved);
    }

    function rejectClaim(uint256 claimId, string calldata reason) external onlyRole(ASSESSOR_ROLE) {
        Claim storage claim = _claims[claimId];
        if (claim.status != ClaimStatus.Submitted && claim.status != ClaimStatus.UnderReview) {
            revert InvalidClaimStatus(claim.status);
        }

        _policies[claim.policyId].reserved -= claim.requestedAmount;
        totalReserved -= claim.requestedAmount;

        emit ClaimRejected(claimId, reason);
        _setStatus(claimId, claim, ClaimStatus.Rejected);
    }

    /// @notice Pay an approved claim to the current policy holder. Anyone may trigger it.
    function payClaim(uint256 claimId) external whenNotPaused nonReentrant {
        Claim storage claim = _claims[claimId];
        if (claim.status != ClaimStatus.Approved) revert InvalidClaimStatus(claim.status);

        Policy storage policy = _policies[claim.policyId];
        uint256 amount = claim.payoutAmount;
        address recipient = policyNFT.ownerOf(claim.policyId);

        policy.reserved -= amount;
        policy.paidOut += amount;
        totalReserved -= amount;
        _setStatus(claimId, claim, ClaimStatus.Paid);

        paymentToken.safeTransfer(recipient, amount);
        emit ClaimPaid(claimId, recipient, amount);
    }

    // ---------------------------------------------------------------------
    // Treasury and admin
    // ---------------------------------------------------------------------

    function fundPool(uint256 amount) external {
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        emit PoolFunded(msg.sender, amount);
    }

    /// @notice Withdraw surplus funds. Open claims stay covered.
    function withdraw(address to, uint256 amount) external onlyRole(TREASURER_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 available = freeFunds();
        if (amount > available) revert InsufficientFreeFunds(available);
        paymentToken.safeTransfer(to, amount);
        emit PoolWithdrawn(to, amount);
    }

    function setCancellationFeeBps(uint256 feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (feeBps > MAX_CANCELLATION_FEE_BPS) revert FeeTooHigh();
        cancellationFeeBps = feeBps;
        emit CancellationFeeUpdated(feeBps);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function isPolicyActive(uint256 policyId) public view returns (bool) {
        Policy storage policy = _policies[policyId];
        return policy.startTime != 0 && !policy.cancelled && block.timestamp >= policy.startTime
            && block.timestamp < policy.endTime;
    }

    function remainingCoverage(uint256 policyId) public view returns (uint256) {
        Policy storage policy = _policies[policyId];
        return policy.coverage - policy.paidOut - policy.reserved;
    }

    function cancellationRefund(uint256 policyId) public view returns (uint256) {
        if (!isPolicyActive(policyId)) return 0;
        Policy storage policy = _policies[policyId];
        uint256 unused = policy.endTime - block.timestamp;
        uint256 duration = policy.endTime - policy.startTime;
        return (policy.premium * unused * (BPS - cancellationFeeBps)) / (duration * BPS);
    }

    function freeFunds() public view returns (uint256) {
        uint256 balance = paymentToken.balanceOf(address(this));
        return balance > totalReserved ? balance - totalReserved : 0;
    }

    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        return _policies[policyId];
    }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        return _claims[claimId];
    }

    function getPolicyClaimIds(uint256 policyId) external view returns (uint256[] memory) {
        return _policyClaimIds[policyId];
    }

    function hashQuote(Quote calldata quote) external view returns (bytes32) {
        return _hashTypedDataV4(_hashQuote(quote));
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _hashQuote(Quote calldata quote) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                QUOTE_TYPEHASH,
                quote.buyer,
                quote.vehicleId,
                quote.coverage,
                quote.premium,
                quote.deductible,
                quote.duration,
                quote.deadline,
                quote.nonce
            )
        );
    }

    function _setStatus(uint256 claimId, Claim storage claim, ClaimStatus status) private {
        uint64 now_ = uint64(block.timestamp);
        claim.status = status;
        claim.updatedAt = now_;
        emit ClaimStatusChanged(claimId, claim.policyId, status, now_);
    }
}
