import { expect } from "chai";
import { network } from "hardhat";

describe("MultiSigWallet", function () {
  let ethers: Awaited<ReturnType<typeof network.create>>["ethers"];
  let wallet: any;
  let owner1: any;
  let owner2: any;
  let nonOwner: any;
  let recipient: any;

  async function deployWallet(owners: string[], required: number) {
    const factory = await ethers.getContractFactory("MultiSigWallet");
    const deployed = await factory.deploy(owners, required);
    await deployed.waitForDeployment();
    return deployed;
  }

  beforeEach(async function () {
    const connection = await network.create();
    ethers = connection.ethers;
    [owner1, owner2, nonOwner, recipient] = await ethers.getSigners();
    wallet = await deployWallet([owner1.address, owner2.address], 2);
  });

  describe("Deployment", function () {
    it("stores the owners, required and isOwner flags", async function () {
      expect(await wallet.getOwners()).to.deep.equal([
        owner1.address,
        owner2.address,
      ]);
      expect(await wallet.required()).to.equal(2n);
      expect(await wallet.isOwner(owner1.address)).to.equal(true);
      expect(await wallet.isOwner(owner2.address)).to.equal(true);
      expect(await wallet.isOwner(nonOwner.address)).to.equal(false);
    });

    it("reverts when the owners list is empty", async function () {
      await expect(deployWallet([], 1)).to.be.revertedWith(
        "owners list is empty"
      );
    });

    it("reverts when required is zero", async function () {
      await expect(
        deployWallet([owner1.address, owner2.address], 0)
      ).to.be.revertedWith("invalid number of required confirmations");
    });

    it("reverts when required is greater than the number of owners", async function () {
      await expect(
        deployWallet([owner1.address, owner2.address], 3)
      ).to.be.revertedWith("invalid number of required confirmations");
    });

    it("reverts when an owner is the zero address", async function () {
      await expect(
        deployWallet([owner1.address, ethers.ZeroAddress], 1)
      ).to.be.revertedWith("owner is the zero address");
    });

    it("reverts when owners contain a duplicate", async function () {
      await expect(
        deployWallet([owner1.address, owner1.address], 1)
      ).to.be.revertedWith("duplicate owner");
    });
  });

  describe("Submitting transactions", function () {
    it("lets an owner submit a transaction and emits SubmitTransaction", async function () {
      await expect(
        wallet.connect(owner1).submitTransaction(recipient.address, 0, "0x")
      )
        .to.emit(wallet, "SubmitTransaction")
        .withArgs(owner1.address, 0, recipient.address, 0, "0x");

      expect(await wallet.getTransactionCount()).to.equal(1n);

      const stored = await wallet.transactions(0);
      expect(stored.to).to.equal(recipient.address);
      expect(stored.value).to.equal(0n);
      expect(stored.executed).to.equal(false);
      expect(stored.numConfirmations).to.equal(0n);
    });

    it("reverts when a non-owner submits a transaction", async function () {
      await expect(
        wallet.connect(nonOwner).submitTransaction(recipient.address, 0, "0x")
      ).to.be.revertedWith("caller is not an owner");
    });
  });

  describe("Confirming transactions", function () {
    beforeEach(async function () {
      await wallet.connect(owner1).submitTransaction(recipient.address, 0, "0x");
    });

    it("lets both owners confirm, increments numConfirmations and emits", async function () {
      await expect(wallet.connect(owner1).confirmTransaction(0))
        .to.emit(wallet, "ConfirmTransaction")
        .withArgs(owner1.address, 0);
      expect((await wallet.transactions(0)).numConfirmations).to.equal(1n);
      expect(await wallet.hasConfirmed(0, owner1.address)).to.equal(true);

      await expect(wallet.connect(owner2).confirmTransaction(0))
        .to.emit(wallet, "ConfirmTransaction")
        .withArgs(owner2.address, 0);
      expect((await wallet.transactions(0)).numConfirmations).to.equal(2n);
      expect(await wallet.hasConfirmed(0, owner2.address)).to.equal(true);
    });

    it("reverts when the same owner confirms twice", async function () {
      await wallet.connect(owner1).confirmTransaction(0);
      await expect(
        wallet.connect(owner1).confirmTransaction(0)
      ).to.be.revertedWith("transaction already confirmed");
    });

    it("reverts when a non-owner confirms", async function () {
      await expect(
        wallet.connect(nonOwner).confirmTransaction(0)
      ).to.be.revertedWith("caller is not an owner");
    });

    it("reverts when confirming a non-existent transaction", async function () {
      await expect(
        wallet.connect(owner1).confirmTransaction(99)
      ).to.be.revertedWith("transaction does not exist");
    });
  });

  describe("Revoking confirmations", function () {
    beforeEach(async function () {
      await wallet.connect(owner1).submitTransaction(recipient.address, 0, "0x");
      await wallet.connect(owner1).confirmTransaction(0);
    });

    it("lets a confirming owner revoke, decrements numConfirmations and emits", async function () {
      expect((await wallet.transactions(0)).numConfirmations).to.equal(1n);

      await expect(wallet.connect(owner1).revokeConfirmation(0))
        .to.emit(wallet, "RevokeConfirmation")
        .withArgs(owner1.address, 0);

      expect((await wallet.transactions(0)).numConfirmations).to.equal(0n);
      expect(await wallet.hasConfirmed(0, owner1.address)).to.equal(false);
    });

    it("reverts when an owner who did not confirm tries to revoke", async function () {
      await expect(
        wallet.connect(owner2).revokeConfirmation(0)
      ).to.be.revertedWith("transaction not confirmed");
    });
  });

  describe("Executing transactions", function () {
    const value = 1_000_000_000_000_000_000n; // 1 ether

    beforeEach(async function () {
      await owner1.sendTransaction({
        to: await wallet.getAddress(),
        value,
      });
      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, value, "0x");
    });

    it("reverts when executed below the required threshold", async function () {
      await wallet.connect(owner1).confirmTransaction(0);
      await expect(
        wallet.connect(owner1).executeTransaction(0)
      ).to.be.revertedWith("not enough confirmations");
    });

    it("executes once the threshold is met, sets executed, emits and moves Ether", async function () {
      await wallet.connect(owner1).confirmTransaction(0);
      await wallet.connect(owner2).confirmTransaction(0);

      const before = await ethers.provider.getBalance(recipient.address);

      await expect(wallet.connect(owner1).executeTransaction(0))
        .to.emit(wallet, "ExecuteTransaction")
        .withArgs(owner1.address, 0);

      const after = await ethers.provider.getBalance(recipient.address);
      expect(after - before).to.equal(value);
      expect((await wallet.transactions(0)).executed).to.equal(true);
    });

    it("reverts when executing an already executed transaction", async function () {
      await wallet.connect(owner1).confirmTransaction(0);
      await wallet.connect(owner2).confirmTransaction(0);
      await wallet.connect(owner1).executeTransaction(0);

      await expect(
        wallet.connect(owner2).executeTransaction(0)
      ).to.be.revertedWith("transaction already executed");
    });

    it("reverts when a non-owner executes", async function () {
      await wallet.connect(owner1).confirmTransaction(0);
      await wallet.connect(owner2).confirmTransaction(0);

      await expect(
        wallet.connect(nonOwner).executeTransaction(0)
      ).to.be.revertedWith("caller is not an owner");
    });

    it("reverts when executing a non-existent transaction", async function () {
      await expect(
        wallet.connect(owner1).executeTransaction(99)
      ).to.be.revertedWith("transaction does not exist");
    });
  });
});
