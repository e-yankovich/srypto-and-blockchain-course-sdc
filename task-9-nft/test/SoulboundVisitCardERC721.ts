import { expect } from "chai";
import { network } from "hardhat";

// Hardhat 3: obtain an isolated network connection with ethers + network helpers.
const { ethers, networkHelpers } = await network.create();
const { loadFixture } = networkHelpers;

const CARD_URI =
  "ipfs://bafkreig7dknr45syvz6vm3pbjk26ijx2na66ydzbslbwvgpsmsdyldjsby";
const CARD_URI_2 = "ipfs://second-student-card-uri";

// Deploys a fresh contract with `owner` as the initial (contract) owner.
async function deployFixture() {
  const [owner, student1, student2, nonOwner] = await ethers.getSigners();
  const card = await ethers.deployContract("SoulboundVisitCardERC721", [
    owner.address,
  ]);
  return { card, owner, student1, student2, nonOwner };
}

// Deploys and mints token id 1 to `student1`.
async function mintedFixture() {
  const ctx = await deployFixture();
  await ctx.card.connect(ctx.owner).mint(ctx.student1.address, CARD_URI);
  return ctx;
}

describe("SoulboundVisitCardERC721", function () {
  describe("Deployment", function () {
    it("has the correct name and symbol", async function () {
      const { card } = await loadFixture(deployFixture);
      expect(await card.name()).to.equal("Student Visit Card");
      expect(await card.symbol()).to.equal("SVC");
    });

    it("sets the deployer as the contract owner", async function () {
      const { card, owner } = await loadFixture(deployFixture);
      expect(await card.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("lets the owner mint a card and stores the token URI", async function () {
      const { card, owner, student1 } = await loadFixture(deployFixture);

      await card.connect(owner).mint(student1.address, CARD_URI);

      expect(await card.balanceOf(student1.address)).to.equal(1n);
      expect(await card.ownerOf(1n)).to.equal(student1.address);
      expect(await card.tokenURI(1n)).to.equal(CARD_URI);
    });

    it("emits a Transfer event from the zero address on mint", async function () {
      const { card, owner, student1 } = await loadFixture(deployFixture);

      await expect(card.connect(owner).mint(student1.address, CARD_URI))
        .to.emit(card, "Transfer")
        .withArgs(ethers.ZeroAddress, student1.address, 1n);
    });

    it("reverts when a non-owner tries to mint", async function () {
      const { card, student1, nonOwner } = await loadFixture(deployFixture);

      await expect(
        card.connect(nonOwner).mint(student1.address, CARD_URI),
      )
        .to.be.revertedWithCustomError(card, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
    });

    it("reverts when minting a second card to the same student", async function () {
      const { card, owner, student1 } = await loadFixture(mintedFixture);

      await expect(
        card.connect(owner).mint(student1.address, CARD_URI),
      ).to.be.revertedWith("Student already has a visit card");
    });

    it("lets a second student receive their own distinct card", async function () {
      const { card, owner, student1, student2 } =
        await loadFixture(mintedFixture);

      await card.connect(owner).mint(student2.address, CARD_URI_2);

      expect(await card.balanceOf(student1.address)).to.equal(1n);
      expect(await card.balanceOf(student2.address)).to.equal(1n);
      expect(await card.ownerOf(1n)).to.equal(student1.address);
      expect(await card.ownerOf(2n)).to.equal(student2.address);
      expect(await card.tokenURI(2n)).to.equal(CARD_URI_2);
    });
  });

  describe("Soulbound behavior — transfers blocked", function () {
    it("blocks transferFrom by the token holder", async function () {
      const { card, student1, student2 } = await loadFixture(mintedFixture);

      await expect(
        card
          .connect(student1)
          .transferFrom(student1.address, student2.address, 1n),
      ).to.be.revertedWith("Soulbound: transfers are disabled");
    });

    it("blocks safeTransferFrom by the token holder", async function () {
      const { card, student1, student2 } = await loadFixture(mintedFixture);

      await expect(
        card
          .connect(student1)
          ["safeTransferFrom(address,address,uint256)"](
            student1.address,
            student2.address,
            1n,
          ),
      ).to.be.revertedWith("Soulbound: transfers are disabled");
    });

    it("blocks the contract owner (admin) from moving someone else's token", async function () {
      const { card, owner, student1, student2 } =
        await loadFixture(mintedFixture);

      await expect(
        card
          .connect(owner)
          .transferFrom(student1.address, student2.address, 1n),
      ).to.be.revertedWith("Soulbound: transfers are disabled");
    });
  });

  describe("Soulbound behavior — approvals disabled", function () {
    it("reverts approve() regardless of the caller", async function () {
      const { card, owner, student1, student2, nonOwner } =
        await loadFixture(mintedFixture);

      await expect(
        card.connect(student1).approve(student2.address, 1n),
      ).to.be.revertedWith("Soulbound: approvals are disabled");

      await expect(
        card.connect(owner).approve(student2.address, 1n),
      ).to.be.revertedWith("Soulbound: approvals are disabled");

      await expect(
        card.connect(nonOwner).approve(student2.address, 1n),
      ).to.be.revertedWith("Soulbound: approvals are disabled");
    });

    it("reverts setApprovalForAll()", async function () {
      const { card, student1, student2 } = await loadFixture(mintedFixture);

      await expect(
        card.connect(student1).setApprovalForAll(student2.address, true),
      ).to.be.revertedWith("Soulbound: approvals are disabled");
    });

    it("leaves getApproved() as the zero address after a failed approve", async function () {
      const { card, student1, student2 } = await loadFixture(mintedFixture);

      await expect(
        card.connect(student1).approve(student2.address, 1n),
      ).to.be.revertedWith("Soulbound: approvals are disabled");

      expect(await card.getApproved(1n)).to.equal(ethers.ZeroAddress);
    });
  });
});
