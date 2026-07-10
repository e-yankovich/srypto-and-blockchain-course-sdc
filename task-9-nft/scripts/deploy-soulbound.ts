import { network } from "hardhat";

import {
  OWNER_ADDRESS,
  addressUrl,
  saveDeployedAddress,
  txUrl,
} from "./config.js";

async function main() {
  const { ethers } = await network.create("hoodi");
  const [deployer] = await ethers.getSigners();

  console.log("Deploying SoulboundVisitCardERC721 to hoodi...");
  console.log("  deployer:     ", deployer.address);
  console.log("  initialOwner: ", OWNER_ADDRESS);

  const card = await ethers.deployContract("SoulboundVisitCardERC721", [
    OWNER_ADDRESS,
  ]);
  await card.waitForDeployment();

  const address = await card.getAddress();
  const txHash = card.deploymentTransaction()?.hash;

  saveDeployedAddress("soulbound", address);

  console.log("\nSoulboundVisitCardERC721 deployed:");
  console.log("  address:  ", address);
  console.log("  tx hash:  ", txHash ?? "(unknown)");
  console.log("  contract: ", addressUrl(address));
  if (txHash !== undefined) {
    console.log("  tx:       ", txUrl(txHash));
  }
  console.log("\nSaved address to deployed-addresses.json (field: soulbound)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
