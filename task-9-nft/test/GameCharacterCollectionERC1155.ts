import { expect } from "chai";
import { network } from "hardhat";

// Hardhat 3: obtain an isolated network connection with ethers + network helpers.
const { ethers, networkHelpers } = await network.create();
const { loadFixture } = networkHelpers;

// Metadata URIs ordered by token id (URIS[0] -> id 1, ... URIS[9] -> id 10).
const URIS = [
  "ipfs://bafkreibojirxyo3wzd5rhzjsandpp6eqlchgy53ezz2gyraltq3w6lo5aq", // 1 Blaze
  "ipfs://bafkreidnyotlac7wqqpgfmsa6eujoyuej5sy7eekmvg3gr2fw7nm5sxje4", // 2 Sky
  "ipfs://bafkreidozrbgaycypgieijquleirg3e25cnwi5ajmwls3ewgpkgpgtenpu", // 3 Moss
  "ipfs://bafkreif7mw5nad5t65zvzig7cudhjoez5kzfpdrmt4dlrtfl4dnaqc7gd4", // 4 Sunny
  "ipfs://bafkreiftduuse67gnempoumsr5nxca4hd2gfcayp6bnhsnvejx3qgs2niu", // 5 Lilac
  "ipfs://bafkreibwrxfxs75ptcqwsruaa2c37ny46ekwnvw7wmpghwjfrla75xuw6y", // 6 Coral
  "ipfs://bafkreiafvoiepla2ppwjclshmwpgwzgljboajhs37v7dzjljc7ycqti6sa", // 7 Frost
  "ipfs://bafkreifmlhtnlqhbqvoji3pzurgfha4chwvsniraqnfjcyc6unio67xtje", // 8 Shadow
  "ipfs://bafkreihkx73nfg2qu76mtqqbofm7oz7gw2r6qeusate3hpglqsnujzts7i", // 9 Amber
  "ipfs://bafkreibnznqncy77kgkzj5h367nmx5unbtenpvgryhtuulqm2evushzbxi", // 10 Pearl
];

const IDS = Array.from({ length: 10 }, (_, i) => BigInt(i + 1));
const AMOUNTS = Array.from({ length: 10 }, () => 1n);

// Deploys a fresh contract with `owner` as the initial (contract) owner.
async function deployFixture() {
  const [owner, studentWallet, otherAddress, nonOwner] =
    await ethers.getSigners();
  const collection = await ethers.deployContract(
    "GameCharacterCollectionERC1155",
    [owner.address],
  );
  return { collection, owner, studentWallet, otherAddress, nonOwner };
}

// Deploys and mints the full collection (ids 1..10, one each) to `studentWallet`.
async function mintedFixture() {
  const ctx = await deployFixture();
  await ctx.collection
    .connect(ctx.owner)
    .mintCollection(ctx.studentWallet.address, URIS);
  return ctx;
}

describe("GameCharacterCollectionERC1155", function () {
  describe("Deployment", function () {
    it("sets the deployer as the contract owner", async function () {
      const { collection, owner } = await loadFixture(deployFixture);
      expect(await collection.owner()).to.equal(owner.address);
    });
  });

  describe("Batch minting", function () {
    it("mints one of each token id 1..10 to the target address", async function () {
      const { collection, studentWallet } = await loadFixture(mintedFixture);

      for (const id of IDS) {
        expect(
          await collection.balanceOf(studentWallet.address, id),
        ).to.equal(1n);
      }
    });

    it("stores the individual URI for each of the 10 token ids", async function () {
      const { collection } = await loadFixture(mintedFixture);

      for (let i = 0; i < URIS.length; i++) {
        expect(await collection.uri(BigInt(i + 1))).to.equal(URIS[i]);
      }
    });

    it("reverts when a non-owner tries to mint the collection", async function () {
      const { collection, studentWallet, nonOwner } =
        await loadFixture(deployFixture);

      await expect(
        collection
          .connect(nonOwner)
          .mintCollection(studentWallet.address, URIS),
      )
        .to.be.revertedWithCustomError(collection, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
    });

    it("emits a TransferBatch event for the whole batch", async function () {
      const { collection, owner, studentWallet } =
        await loadFixture(deployFixture);

      await expect(
        collection
          .connect(owner)
          .mintCollection(studentWallet.address, URIS),
      )
        .to.emit(collection, "TransferBatch")
        .withArgs(
          owner.address,
          ethers.ZeroAddress,
          studentWallet.address,
          IDS,
          AMOUNTS,
        );
    });
  });

  describe("Standard transfers (not restricted)", function () {
    it("allows the holder to safeTransferFrom a single token id", async function () {
      const { collection, studentWallet, otherAddress } =
        await loadFixture(mintedFixture);

      await collection
        .connect(studentWallet)
        .safeTransferFrom(
          studentWallet.address,
          otherAddress.address,
          1n,
          1n,
          "0x",
        );

      expect(
        await collection.balanceOf(studentWallet.address, 1n),
      ).to.equal(0n);
      expect(
        await collection.balanceOf(otherAddress.address, 1n),
      ).to.equal(1n);
    });

    it("allows the holder to safeBatchTransferFrom multiple token ids", async function () {
      const { collection, studentWallet, otherAddress } =
        await loadFixture(mintedFixture);

      await collection
        .connect(studentWallet)
        .safeBatchTransferFrom(
          studentWallet.address,
          otherAddress.address,
          [2n, 3n],
          [1n, 1n],
          "0x",
        );

      expect(
        await collection.balanceOf(studentWallet.address, 2n),
      ).to.equal(0n);
      expect(
        await collection.balanceOf(studentWallet.address, 3n),
      ).to.equal(0n);
      expect(
        await collection.balanceOf(otherAddress.address, 2n),
      ).to.equal(1n);
      expect(
        await collection.balanceOf(otherAddress.address, 3n),
      ).to.equal(1n);
    });

    it("reverts a transfer attempted by someone who is neither owner nor approved", async function () {
      const { collection, studentWallet, otherAddress } =
        await loadFixture(mintedFixture);

      await expect(
        collection
          .connect(otherAddress)
          .safeTransferFrom(
            studentWallet.address,
            otherAddress.address,
            1n,
            1n,
            "0x",
          ),
      )
        .to.be.revertedWithCustomError(
          collection,
          "ERC1155MissingApprovalForAll",
        )
        .withArgs(otherAddress.address, studentWallet.address);
    });
  });

  describe("Approvals (not restricted)", function () {
    it("lets a holder setApprovalForAll and reports it via isApprovedForAll", async function () {
      const { collection, studentWallet, otherAddress } =
        await loadFixture(mintedFixture);

      await collection
        .connect(studentWallet)
        .setApprovalForAll(otherAddress.address, true);

      expect(
        await collection.isApprovedForAll(
          studentWallet.address,
          otherAddress.address,
        ),
      ).to.equal(true);
    });

    it("lets an approved operator transfer on the holder's behalf", async function () {
      const { collection, studentWallet, otherAddress } =
        await loadFixture(mintedFixture);

      await collection
        .connect(studentWallet)
        .setApprovalForAll(otherAddress.address, true);

      await collection
        .connect(otherAddress)
        .safeTransferFrom(
          studentWallet.address,
          otherAddress.address,
          1n,
          1n,
          "0x",
        );

      expect(
        await collection.balanceOf(otherAddress.address, 1n),
      ).to.equal(1n);
      expect(
        await collection.balanceOf(studentWallet.address, 1n),
      ).to.equal(0n);
    });

    it("stops working once the approval is revoked", async function () {
      const { collection, studentWallet, otherAddress } =
        await loadFixture(mintedFixture);

      await collection
        .connect(studentWallet)
        .setApprovalForAll(otherAddress.address, true);
      await collection
        .connect(studentWallet)
        .setApprovalForAll(otherAddress.address, false);

      await expect(
        collection
          .connect(otherAddress)
          .safeTransferFrom(
            studentWallet.address,
            otherAddress.address,
            1n,
            1n,
            "0x",
          ),
      )
        .to.be.revertedWithCustomError(
          collection,
          "ERC1155MissingApprovalForAll",
        )
        .withArgs(otherAddress.address, studentWallet.address);
    });
  });
});
