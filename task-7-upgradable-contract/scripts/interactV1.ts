import hre from "hardhat";

const PROXY_ADDRESS = "0x8A3159e43c3d6c6FcaC52Bf10C180bf44585CBB9";
const RECIPIENT = "0xF146EaC3eBa54e770a6e19AAF8553C66e8410c09";

async function main() {
  const connection = await hre.network.create();
  const { ethers } = connection;

  const [deployer] = await ethers.getSigners();
  console.log("Interacting with account:", deployer.address);

  const token = await ethers.getContractAt("MyTokenV1", PROXY_ADDRESS, deployer);

  const decimals = await token.decimals();
  const mintAmount = ethers.parseUnits("1000", decimals);
  const transferAmount = ethers.parseUnits("100", decimals);

  const mintTx = await token.mint(deployer.address, mintAmount);
  await mintTx.wait();

  const transferTx = await token.transfer(RECIPIENT, transferAmount);
  await transferTx.wait();

  const senderBalance = await token.balanceOf(deployer.address);
  const recipientBalance = await token.balanceOf(RECIPIENT);

  console.log("Mint tx hash:      ", mintTx.hash);
  console.log("Transfer tx hash:  ", transferTx.hash);
  console.log(
    "Sender balance:    ",
    ethers.formatUnits(senderBalance, decimals),
    "MTK",
  );
  console.log(
    "Recipient balance: ",
    ethers.formatUnits(recipientBalance, decimals),
    "MTK",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
