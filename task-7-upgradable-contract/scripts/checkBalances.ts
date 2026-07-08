import hre from "hardhat";

const PROXY_ADDRESS = "0x8A3159e43c3d6c6FcaC52Bf10C180bf44585CBB9";
const DEPLOYER = "0x5c13DA0d74BA90F4D39829Ae83E0DBb5633aB899";
const RECIPIENT = "0xF146EaC3eBa54e770a6e19AAF8553C66e8410c09";

async function main() {
  const connection = await hre.network.create();
  const { ethers } = connection;

  const token = await ethers.getContractAt("MyTokenV1", PROXY_ADDRESS);

  const decimals = await token.decimals();
  const deployerBalance = await token.balanceOf(DEPLOYER);
  const recipientBalance = await token.balanceOf(RECIPIENT);

  console.log("Balances AFTER upgrade to V2");
  console.log(
    "Deployer balance:  ",
    ethers.formatUnits(deployerBalance, decimals),
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
