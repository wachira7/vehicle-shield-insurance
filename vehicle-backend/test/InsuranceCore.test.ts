import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  QUOTE_TYPES,
  createSignedQuote,
  priceQuote,
  quoteDomain,
  randomNonce,
  signQuote,
  vehicleIdFor,
  type Quote,
} from "@vehicle-shield/protocol";

const USDC = (n: number | string) => ethers.parseUnits(String(n), 6);
const DAY = 86_400n;
const YEAR = 365n * DAY;

enum ClaimStatus {
  None,
  Submitted,
  UnderReview,
  Approved,
  Rejected,
  Paid,
}

async function deployFixture() {
  const [admin, quoteSigner, assessor, treasurer, alice, bob, mallory] = await ethers.getSigners();

  const usdc = await ethers.deployContract("MockUSDC");
  const nft = await ethers.deployContract("PolicyNFT", [admin.address]);
  const core = await ethers.deployContract("InsuranceCore", [
    admin.address,
    await usdc.getAddress(),
    await nft.getAddress(),
  ]);
  const coreAddress = await core.getAddress();

  await nft.grantRole(await nft.MINTER_ROLE(), coreAddress);
  await core.grantRole(await core.QUOTE_SIGNER_ROLE(), quoteSigner.address);
  await core.grantRole(await core.ASSESSOR_ROLE(), assessor.address);
  await core.grantRole(await core.TREASURER_ROLE(), treasurer.address);
  await core.grantRole(await core.PAUSER_ROLE(), admin.address);

  for (const user of [alice, bob, mallory]) {
    await usdc.mint(user.address, USDC(10_000));
    await usdc.connect(user).approve(coreAddress, ethers.MaxUint256);
  }
  await usdc.mint(admin.address, USDC(100_000));
  await usdc.approve(coreAddress, ethers.MaxUint256);
  await core.fundPool(USDC(100_000));

  const { chainId } = await ethers.provider.getNetwork();
  const domain = quoteDomain(chainId, coreAddress);

  async function makeQuote(overrides: Partial<Quote> = {}): Promise<Quote> {
    return {
      buyer: alice.address,
      vehicleId: vehicleIdFor("KDA 123A", "test-salt"),
      coverage: USDC(2_000),
      premium: USDC(120),
      deductible: USDC(100),
      duration: YEAR,
      deadline: BigInt(await time.latest()) + 3_600n,
      nonce: randomNonce(),
      ...overrides,
    };
  }

  async function buy(buyer = alice, overrides: Partial<Quote> = {}) {
    const quote = await makeQuote({ buyer: buyer.address, ...overrides });
    const signature = await signQuote(quoteSigner, domain, quote);
    const policyId = await core.nextPolicyId();
    await core.connect(buyer).buyPolicy(quote, signature);
    return { policyId, quote };
  }

  async function submit(policyId: bigint, amount: bigint, from = alice) {
    const claimId = await core.nextClaimId();
    await core.connect(from).submitClaim(policyId, amount, "ipfs://evidence");
    return claimId;
  }

  return { core, nft, usdc, domain, admin, quoteSigner, assessor, treasurer, alice, bob, mallory, makeQuote, buy, submit };
}

describe("InsuranceCore", () => {
  describe("deployment", () => {
    it("wires the token, NFT and admin role", async () => {
      const { core, nft, usdc, admin } = await loadFixture(deployFixture);
      expect(await core.paymentToken()).to.equal(await usdc.getAddress());
      expect(await core.policyNFT()).to.equal(await nft.getAddress());
      expect(await core.hasRole(await core.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
      expect(await core.cancellationFeeBps()).to.equal(1_000n);
    });

    it("rejects zero addresses", async () => {
      const { nft, usdc, admin } = await loadFixture(deployFixture);
      const factory = await ethers.getContractFactory("InsuranceCore");
      await expect(
        factory.deploy(ethers.ZeroAddress, await usdc.getAddress(), await nft.getAddress()),
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
      await expect(
        factory.deploy(admin.address, ethers.ZeroAddress, await nft.getAddress()),
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it("matches the off-chain quote hash", async () => {
      const { core, domain, makeQuote } = await loadFixture(deployFixture);
      const quote = await makeQuote();
      expect(await core.hashQuote(quote)).to.equal(ethers.TypedDataEncoder.hash(domain, QUOTE_TYPES, quote));
    });
  });

  describe("buyPolicy", () => {
    it("takes the premium, mints the policy NFT and records the terms", async () => {
      const { core, nft, usdc, domain, quoteSigner, alice, makeQuote } = await loadFixture(deployFixture);
      const quote = await makeQuote();
      const signature = await signQuote(quoteSigner, domain, quote);

      const tx = await core.connect(alice).buyPolicy(quote, signature);
      await expect(tx)
        .to.emit(core, "PolicyPurchased")
        .withArgs(1n, alice.address, quote.vehicleId, quote.coverage, quote.premium, quote.deductible, anyValue, anyValue);
      await expect(tx).to.changeTokenBalances(usdc, [alice, core], [-quote.premium, quote.premium]);

      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      const policy = await core.getPolicy(1n);
      expect(policy.coverage).to.equal(quote.coverage);
      expect(policy.endTime - policy.startTime).to.equal(YEAR);
      expect(await core.isPolicyActive(1n)).to.equal(true);
      expect(await core.currentPolicyOfVehicle(quote.vehicleId)).to.equal(1n);
      expect(await core.usedQuoteNonces(quote.nonce)).to.equal(true);
    });

    it("rejects a quote issued to someone else", async () => {
      const { core, domain, quoteSigner, bob, makeQuote } = await loadFixture(deployFixture);
      const quote = await makeQuote();
      const signature = await signQuote(quoteSigner, domain, quote);
      await expect(core.connect(bob).buyPolicy(quote, signature)).to.be.revertedWithCustomError(core, "NotQuoteBuyer");
    });

    it("rejects an expired quote", async () => {
      const { core, domain, quoteSigner, alice, makeQuote } = await loadFixture(deployFixture);
      const quote = await makeQuote();
      const signature = await signQuote(quoteSigner, domain, quote);
      await time.increaseTo(quote.deadline + 1n);
      await expect(core.connect(alice).buyPolicy(quote, signature)).to.be.revertedWithCustomError(core, "QuoteExpired");
    });

    it("rejects a reused quote", async () => {
      const { core, domain, quoteSigner, alice, makeQuote } = await loadFixture(deployFixture);
      const quote = await makeQuote();
      const signature = await signQuote(quoteSigner, domain, quote);
      await core.connect(alice).buyPolicy(quote, signature);
      await expect(core.connect(alice).buyPolicy(quote, signature)).to.be.revertedWithCustomError(core, "QuoteAlreadyUsed");
    });

    it("rejects a quote not signed by the pricing service", async () => {
      const { core, domain, mallory, alice, makeQuote } = await loadFixture(deployFixture);
      const quote = await makeQuote();
      const signature = await signQuote(mallory, domain, quote);
      await expect(core.connect(alice).buyPolicy(quote, signature)).to.be.revertedWithCustomError(core, "InvalidQuoteSigner");
    });

    it("rejects a quote whose terms were altered after signing", async () => {
      const { core, domain, quoteSigner, alice, makeQuote } = await loadFixture(deployFixture);
      const quote = await makeQuote();
      const signature = await signQuote(quoteSigner, domain, quote);
      await expect(
        core.connect(alice).buyPolicy({ ...quote, premium: 1n }, signature),
      ).to.be.revertedWithCustomError(core, "InvalidQuoteSigner");
    });

    it("rejects invalid terms", async () => {
      const { core, domain, quoteSigner, alice, makeQuote } = await loadFixture(deployFixture);
      for (const overrides of [
        { premium: 0n },
        { coverage: 0n, deductible: 0n },
        { duration: 0n },
        { deductible: USDC(2_000) },
      ]) {
        const quote = await makeQuote(overrides);
        const signature = await signQuote(quoteSigner, domain, quote);
        await expect(core.connect(alice).buyPolicy(quote, signature)).to.be.revertedWithCustomError(
          core,
          "InvalidQuoteTerms",
        );
      }
    });

    it("blocks a second policy on an insured vehicle until the first ends", async () => {
      const { core, domain, quoteSigner, alice, makeQuote, buy } = await loadFixture(deployFixture);
      await buy();
      const quote = await makeQuote({ deadline: BigInt(await time.latest()) + 2n * YEAR });
      const signature = await signQuote(quoteSigner, domain, quote);
      await expect(core.connect(alice).buyPolicy(quote, signature))
        .to.be.revertedWithCustomError(core, "VehicleAlreadyInsured")
        .withArgs(1n);

      await time.increase(YEAR);
      await expect(core.connect(alice).buyPolicy(quote, signature)).to.emit(core, "PolicyPurchased");
      expect(await core.currentPolicyOfVehicle(quote.vehicleId)).to.equal(2n);
    });

    it("fails without enough allowance", async () => {
      const { core, usdc, domain, quoteSigner, alice, makeQuote } = await loadFixture(deployFixture);
      await usdc.connect(alice).approve(await core.getAddress(), 0n);
      const quote = await makeQuote();
      const signature = await signQuote(quoteSigner, domain, quote);
      await expect(core.connect(alice).buyPolicy(quote, signature)).to.be.revertedWithCustomError(
        usdc,
        "ERC20InsufficientAllowance",
      );
    });

    it("is blocked while paused", async () => {
      const { core, domain, quoteSigner, alice, makeQuote } = await loadFixture(deployFixture);
      await core.pause();
      const quote = await makeQuote();
      const signature = await signQuote(quoteSigner, domain, quote);
      await expect(core.connect(alice).buyPolicy(quote, signature)).to.be.revertedWithCustomError(core, "EnforcedPause");
    });
  });

  describe("quotes from the pricing service", () => {
    it("accepts a quote priced and signed by the shared protocol package", async () => {
      const { core, nft, domain, quoteSigner, alice } = await loadFixture(deployFixture);
      const price = priceQuote(
        {
          year: 2021,
          marketValue: USDC(20_000),
          mileageKm: 80_000,
          condition: 7,
          accidentsLast3Years: 1,
          usage: "private",
        },
        { coverage: USDC(15_000), deductible: USDC(500), durationDays: 180 },
      );
      if (!price.eligible) throw new Error(price.reasons.join(" "));

      const { quote, signature } = await createSignedQuote(
        quoteSigner,
        domain,
        {
          buyer: alice.address,
          vehicleId: vehicleIdFor("KDA 123A", "test-salt"),
          coverage: USDC(15_000),
          premium: price.premium,
          deductible: USDC(500),
          durationDays: 180,
        },
        { nowSeconds: await time.latest() },
      );

      await core.connect(alice).buyPolicy(quote, signature);
      const policy = await core.getPolicy(1n);
      expect(policy.premium).to.equal(price.premium);
      expect(policy.endTime - policy.startTime).to.equal(180n * DAY);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);
    });
  });

  describe("buyPolicyWithPermit", () => {
    it("buys with a permit instead of a prior approval", async () => {
      const { core, usdc, domain, quoteSigner, alice, makeQuote } = await loadFixture(deployFixture);
      const coreAddress = await core.getAddress();
      await usdc.connect(alice).approve(coreAddress, 0n);

      const quote = await makeQuote();
      const signature = await signQuote(quoteSigner, domain, quote);
      const permitDeadline = BigInt(await time.latest()) + 3_600n;
      const permit = ethers.Signature.from(
        await alice.signTypedData(
          { name: "Mock USD Coin", version: "1", chainId: domain.chainId, verifyingContract: await usdc.getAddress() },
          {
            Permit: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
              { name: "value", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          { owner: alice.address, spender: coreAddress, value: quote.premium, nonce: 0n, deadline: permitDeadline },
        ),
      );

      await expect(
        core.connect(alice).buyPolicyWithPermit(quote, signature, permitDeadline, permit.v, permit.r, permit.s),
      ).to.changeTokenBalance(usdc, alice, -quote.premium);
    });
  });

  describe("cancelPolicy", () => {
    it("refunds the unused premium minus the fee and burns the NFT", async () => {
      const { core, nft, usdc, alice, buy } = await loadFixture(deployFixture);
      const { policyId, quote } = await buy();
      const policy = await core.getPolicy(policyId);

      await time.setNextBlockTimestamp(policy.startTime + YEAR / 2n);
      const prorated = (quote.premium * (YEAR / 2n)) / YEAR;
      const expected = prorated - (prorated * 1_000n) / 10_000n;

      const tx = await core.connect(alice).cancelPolicy(policyId);
      await expect(tx).to.emit(core, "PolicyCancelled").withArgs(policyId, alice.address, expected);
      await expect(tx).to.changeTokenBalance(usdc, alice, expected);

      await expect(nft.ownerOf(policyId)).to.be.revertedWithCustomError(nft, "ERC721NonexistentToken");
      expect(await core.isPolicyActive(policyId)).to.equal(false);
      expect(await core.currentPolicyOfVehicle(quote.vehicleId)).to.equal(0n);
    });

    it("only lets the holder cancel", async () => {
      const { core, bob, buy } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      await expect(core.connect(bob).cancelPolicy(policyId)).to.be.revertedWithCustomError(core, "NotPolicyHolder");
    });

    it("refuses with an open claim or a paid claim", async () => {
      const { core, assessor, alice, buy, submit } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      const claimId = await submit(policyId, USDC(500));
      await expect(core.connect(alice).cancelPolicy(policyId)).to.be.revertedWithCustomError(core, "PolicyHasOpenClaims");

      await core.connect(assessor).approveClaim(claimId, USDC(500));
      await core.payClaim(claimId);
      await expect(core.connect(alice).cancelPolicy(policyId)).to.be.revertedWithCustomError(core, "PolicyHasPaidClaims");
    });

    it("refuses after expiry", async () => {
      const { core, alice, buy } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      await time.increase(YEAR);
      await expect(core.connect(alice).cancelPolicy(policyId)).to.be.revertedWithCustomError(core, "PolicyNotActive");
    });
  });

  describe("claims", () => {
    it("runs the full lifecycle and applies the deductible", async () => {
      const { core, usdc, assessor, alice, buy } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      const claimId = await core.nextClaimId();

      await expect(core.connect(alice).submitClaim(policyId, USDC(1_000), "ipfs://evidence"))
        .to.emit(core, "ClaimSubmitted")
        .withArgs(claimId, policyId, alice.address, USDC(1_000), "ipfs://evidence")
        .and.to.emit(core, "ClaimStatusChanged")
        .withArgs(claimId, policyId, ClaimStatus.Submitted, anyValue);
      expect(await core.totalReserved()).to.equal(USDC(1_000));
      expect(await core.remainingCoverage(policyId)).to.equal(USDC(1_000));

      await expect(core.connect(assessor).startReview(claimId))
        .to.emit(core, "ClaimStatusChanged")
        .withArgs(claimId, policyId, ClaimStatus.UnderReview, anyValue);

      await expect(core.connect(assessor).approveClaim(claimId, USDC(800)))
        .to.emit(core, "ClaimApproved")
        .withArgs(claimId, USDC(800), USDC(700));
      expect(await core.totalReserved()).to.equal(USDC(700));

      const payTx = await core.payClaim(claimId);
      await expect(payTx).to.emit(core, "ClaimPaid").withArgs(claimId, alice.address, USDC(700));
      await expect(payTx).to.changeTokenBalance(usdc, alice, USDC(700));

      const claim = await core.getClaim(claimId);
      expect(claim.status).to.equal(ClaimStatus.Paid);
      expect(claim.payoutAmount).to.equal(USDC(700));
      expect((await core.getPolicy(policyId)).paidOut).to.equal(USDC(700));
      expect(await core.remainingCoverage(policyId)).to.equal(USDC(1_300));
      expect(await core.totalReserved()).to.equal(0n);
      expect(await core.getPolicyClaimIds(policyId)).to.deep.equal([claimId]);
    });

    it("caps claims at remaining coverage, counting open claims", async () => {
      const { core, alice, buy, submit } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      await submit(policyId, USDC(1_500));
      await expect(core.connect(alice).submitClaim(policyId, USDC(501), "ipfs://x"))
        .to.be.revertedWithCustomError(core, "ExceedsRemainingCoverage")
        .withArgs(USDC(500));
    });

    it("validates the claimant, policy and inputs", async () => {
      const { core, bob, alice, buy } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      await expect(core.connect(bob).submitClaim(policyId, USDC(1), "ipfs://x")).to.be.revertedWithCustomError(
        core,
        "NotPolicyHolder",
      );
      await expect(core.connect(alice).submitClaim(policyId, 0n, "ipfs://x")).to.be.revertedWithCustomError(
        core,
        "InvalidClaimAmount",
      );
      await expect(core.connect(alice).submitClaim(policyId, USDC(1), "")).to.be.revertedWithCustomError(
        core,
        "EvidenceRequired",
      );
      await time.increase(YEAR);
      await expect(core.connect(alice).submitClaim(policyId, USDC(1), "ipfs://x")).to.be.revertedWithCustomError(
        core,
        "PolicyNotActive",
      );
    });

    it("rejects approvals above the request or within the deductible", async () => {
      const { core, assessor, buy, submit } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      const claimId = await submit(policyId, USDC(500));
      await expect(core.connect(assessor).approveClaim(claimId, USDC(501))).to.be.revertedWithCustomError(
        core,
        "InvalidClaimAmount",
      );
      await expect(core.connect(assessor).approveClaim(claimId, USDC(100))).to.be.revertedWithCustomError(
        core,
        "NothingToPay",
      );
    });

    it("releases the reservation on rejection", async () => {
      const { core, assessor, buy, submit } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      const claimId = await submit(policyId, USDC(500));
      await expect(core.connect(assessor).rejectClaim(claimId, "Damage predates policy"))
        .to.emit(core, "ClaimRejected")
        .withArgs(claimId, "Damage predates policy");
      expect(await core.totalReserved()).to.equal(0n);
      expect(await core.remainingCoverage(policyId)).to.equal(USDC(2_000));
      await expect(core.connect(assessor).approveClaim(claimId, USDC(500)))
        .to.be.revertedWithCustomError(core, "InvalidClaimStatus")
        .withArgs(ClaimStatus.Rejected);
      await expect(core.connect(assessor).rejectClaim(claimId, "again"))
        .to.be.revertedWithCustomError(core, "InvalidClaimStatus")
        .withArgs(ClaimStatus.Rejected);
      await expect(core.connect(assessor).startReview(claimId))
        .to.be.revertedWithCustomError(core, "InvalidClaimStatus")
        .withArgs(ClaimStatus.Rejected);
    });

    it("restricts review actions to assessors", async () => {
      const { core, mallory, buy, submit } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      const claimId = await submit(policyId, USDC(500));
      for (const action of [
        core.connect(mallory).startReview(claimId),
        core.connect(mallory).approveClaim(claimId, USDC(500)),
        core.connect(mallory).rejectClaim(claimId, "no"),
      ]) {
        await expect(action).to.be.revertedWithCustomError(core, "AccessControlUnauthorizedAccount");
      }
    });

    it("pays only approved claims, once", async () => {
      const { core, assessor, buy, submit } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      const claimId = await submit(policyId, USDC(500));
      await expect(core.payClaim(claimId))
        .to.be.revertedWithCustomError(core, "InvalidClaimStatus")
        .withArgs(ClaimStatus.Submitted);
      await core.connect(assessor).approveClaim(claimId, USDC(500));
      await core.payClaim(claimId);
      await expect(core.payClaim(claimId))
        .to.be.revertedWithCustomError(core, "InvalidClaimStatus")
        .withArgs(ClaimStatus.Paid);
    });

    it("pays the current holder after the policy NFT is transferred", async () => {
      const { core, nft, usdc, assessor, alice, bob, buy, submit } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      const claimId = await submit(policyId, USDC(500));
      await core.connect(assessor).approveClaim(claimId, USDC(500));
      await nft.connect(alice).transferFrom(alice.address, bob.address, policyId);
      await expect(core.payClaim(claimId)).to.changeTokenBalance(usdc, bob, USDC(400));
    });

    it("still pays a claim approved after the policy expired", async () => {
      const { core, usdc, assessor, alice, buy, submit } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      const claimId = await submit(policyId, USDC(500));
      await time.increase(YEAR);
      await core.connect(assessor).approveClaim(claimId, USDC(500));
      await expect(core.payClaim(claimId)).to.changeTokenBalance(usdc, alice, USDC(400));
    });

    it("blocks claims and payouts while paused", async () => {
      const { core, assessor, alice, buy, submit } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      const claimId = await submit(policyId, USDC(500));
      await core.connect(assessor).approveClaim(claimId, USDC(500));
      await core.pause();
      await expect(core.connect(alice).submitClaim(policyId, USDC(1), "ipfs://x")).to.be.revertedWithCustomError(
        core,
        "EnforcedPause",
      );
      await expect(core.payClaim(claimId)).to.be.revertedWithCustomError(core, "EnforcedPause");
      await core.unpause();
      await expect(core.payClaim(claimId)).to.emit(core, "ClaimPaid");
    });
  });

  describe("treasury", () => {
    it("never lets withdrawals touch reserved claim funds", async () => {
      const { core, usdc, treasurer, buy, submit } = await loadFixture(deployFixture);
      const { policyId } = await buy();
      await submit(policyId, USDC(1_000));
      const balance = await usdc.balanceOf(await core.getAddress());
      const free = balance - USDC(1_000);
      expect(await core.freeFunds()).to.equal(free);

      await expect(core.connect(treasurer).withdraw(treasurer.address, free + 1n))
        .to.be.revertedWithCustomError(core, "InsufficientFreeFunds")
        .withArgs(free);
      await expect(core.connect(treasurer).withdraw(treasurer.address, free)).to.changeTokenBalance(
        usdc,
        treasurer,
        free,
      );
    });

    it("restricts withdrawals and admin settings", async () => {
      const { core, mallory, treasurer } = await loadFixture(deployFixture);
      await expect(core.connect(mallory).withdraw(mallory.address, 1n)).to.be.revertedWithCustomError(
        core,
        "AccessControlUnauthorizedAccount",
      );
      await expect(core.connect(treasurer).withdraw(ethers.ZeroAddress, 1n)).to.be.revertedWithCustomError(
        core,
        "ZeroAddress",
      );
      await expect(core.connect(mallory).pause()).to.be.revertedWithCustomError(core, "AccessControlUnauthorizedAccount");
      await expect(core.setCancellationFeeBps(5_001)).to.be.revertedWithCustomError(core, "FeeTooHigh");
      await expect(core.setCancellationFeeBps(500)).to.emit(core, "CancellationFeeUpdated").withArgs(500n);
    });
  });

  describe("invariants", () => {
    it("keeps reserves consistent across a random sequence of claim actions", async () => {
      const { core, usdc, assessor, alice, bob, buy } = await loadFixture(deployFixture);
      const holders = [alice, bob];
      const policies: { id: bigint; holder: (typeof holders)[number] }[] = [];
      for (let i = 0; i < 4; i++) {
        const holder = holders[i % 2];
        const { policyId } = await buy(holder, { vehicleId: vehicleIdFor(`CAR ${i}`, "test-salt") });
        policies.push({ id: policyId, holder });
      }

      // Small deterministic PRNG so failures reproduce.
      let seed = 42;
      const rand = (n: number) => {
        seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
        return seed % n;
      };

      const openClaims: bigint[] = [];
      const approvedClaims: bigint[] = [];

      for (let step = 0; step < 60; step++) {
        const action = rand(4);
        if (action === 0) {
          const { id, holder } = policies[rand(policies.length)];
          const remaining = await core.remainingCoverage(id);
          if (remaining > 0n) {
            const amount = BigInt(rand(Number(remaining / 1_000_000n)) + 1) * 1_000_000n;
            openClaims.push(await core.nextClaimId());
            await core.connect(holder).submitClaim(id, amount, "ipfs://x");
          }
        } else if (action === 1 && openClaims.length) {
          const claimId = openClaims.splice(rand(openClaims.length), 1)[0];
          const claim = await core.getClaim(claimId);
          if (claim.requestedAmount > USDC(100)) {
            await core.connect(assessor).approveClaim(claimId, claim.requestedAmount);
            approvedClaims.push(claimId);
          } else {
            await core.connect(assessor).rejectClaim(claimId, "below deductible");
          }
        } else if (action === 2 && openClaims.length) {
          const claimId = openClaims.splice(rand(openClaims.length), 1)[0];
          await core.connect(assessor).rejectClaim(claimId, "random");
        } else if (action === 3 && approvedClaims.length) {
          await core.payClaim(approvedClaims.splice(rand(approvedClaims.length), 1)[0]);
        }

        let reservedSum = 0n;
        for (const { id } of policies) {
          const policy = await core.getPolicy(id);
          expect(policy.paidOut + policy.reserved).to.be.lte(policy.coverage);
          reservedSum += policy.reserved;
        }
        expect(await core.totalReserved()).to.equal(reservedSum);
        expect(await usdc.balanceOf(await core.getAddress())).to.be.gte(reservedSum);
      }
    });
  });
});

describe("PolicyNFT", () => {
  it("only lets the minter mint and burn", async () => {
    const { nft, mallory } = await loadFixture(deployFixture);
    await expect(nft.connect(mallory).mint(mallory.address, 99n)).to.be.revertedWithCustomError(
      nft,
      "AccessControlUnauthorizedAccount",
    );
    await expect(nft.connect(mallory).burn(1n)).to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
  });

  it("supports ERC-721 and serves the base URI", async () => {
    const { nft, buy } = await loadFixture(deployFixture);
    await buy();
    expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true);
    await nft.setBaseURI("https://api.vehicleshield.app/policies/");
    expect(await nft.tokenURI(1n)).to.equal("https://api.vehicleshield.app/policies/1");
  });
});
