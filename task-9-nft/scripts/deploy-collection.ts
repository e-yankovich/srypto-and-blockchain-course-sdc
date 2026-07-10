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

  console.log("Deploying GameCharacterCollectionERC1155 to hoodi...");
  console.log("  deployer:     ", deployer.address);
  console.log("  initialOwner: ", OWNER_ADDRESS);

  const collection = await ethers.deployContract(
    "GameCharacterCollectionERC1155",
    [OWNER_ADDRESS],
  );
  await collection.waitForDeployment();

  const address = await collection.getAddress();
  const txHash = collection.deploymentTransaction()?.hash;

  saveDeployedAddress("collection", address);

  console.log("\nGameCharacterCollectionERC1155 deployed:");
  console.log("  address:  ", address);
  console.log("  tx hash:  ", txHash ?? "(unknown)");
  console.log("  contract: ", addressUrl(address));
  if (txHash !== undefined) {
    console.log("  tx:       ", txUrl(txHash));
  }
  console.log("\nSaved address to deployed-addresses.json (field: collection)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
