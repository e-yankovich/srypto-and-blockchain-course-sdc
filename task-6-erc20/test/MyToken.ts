import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("MyToken", function () {
  const initialSupply = ethers.parseEther("1000000");

  async function deployMyToken() {
    const [owner, alice, bob] = await ethers.getSigners();
    const MyToken = await ethers.getContractFactory("MyToken");
    const myToken = await MyToken.deploy(initialSupply);
    await myToken.waitForDeployment();
    return { myToken, owner, alice, bob };
  }

  it("assigns the initial supply to the deployer", async function () {
    const { myToken, owner } = await deployMyToken();

    expect(await myToken.balanceOf(owner.address)).to.equal(initialSupply);
    expect(await myToken.totalSupply()).to.equal(initialSupply);
  });

  it("has the correct name and symbol", async function () {
    const { myToken } = await deployMyToken();

    expect(await myToken.name()).to.equal("MyToken");
    expect(await myToken.symbol()).to.equal("MTK");
  });

  it("lets the owner mint and increase a balance", async function () {
    const { myToken, alice } = await deployMyToken();
    const amount = ethers.parseEther("500");

    await myToken.mint(alice.address, amount);

    expect(await myToken.balanceOf(alice.address)).to.equal(amount);
    expect(await myToken.totalSupply()).to.equal(initialSupply + amount);
  });

  it("reverts when a non-owner tries to mint", async function () {
    const { myToken, alice } = await deployMyToken();
    const amount = ethers.parseEther("500");

    await expect(
      myToken.connect(alice).mint(alice.address, amount),
    ).to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount");
  });

  it("transfers tokens between two accounts", async function () {
    const { myToken, owner, alice } = await deployMyToken();
    const amount = ethers.parseEther("250");

    const ownerBefore = await myToken.balanceOf(owner.address);

    await myToken.transfer(alice.address, amount);

    expect(await myToken.balanceOf(alice.address)).to.equal(amount);
    expect(await myToken.balanceOf(owner.address)).to.equal(ownerBefore - amount);
  });

  it("reverts when transferring more than the balance", async function () {
    const { myToken, alice, bob } = await deployMyToken();
    const amount = ethers.parseEther("1");

    await expect(
      myToken.connect(alice).transfer(bob.address, amount),
    ).to.be.revertedWithCustomError(myToken, "ERC20InsufficientBalance");
  });
});
