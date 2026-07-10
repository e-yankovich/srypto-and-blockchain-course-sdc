import { network } from "hardhat";

import {
  GAME_CHARACTER_URIS,
  OWNER_ADDRESS,
  requireDeployedAddress,
  txUrl,
} from "./config.js";

async function main() {
  const { ethers } = await network.create("hoodi");
  const [owner] = await ethers.getSigners();

  const address = requireDeployedAddress(
    "collection",
    "scripts/deploy-collection.ts",
  );

  const collection = await ethers.getContractAt(
    "GameCharacterCollectionERC1155",
    address,
    owner,
  );

  console.log("Minting the full character collection on hoodi...");
  console.log("  contract: ", address);
  console.log("  to:       ", OWNER_ADDRESS, "(owner / Account 1)");

  const tx = await collection.mintCollection(
    OWNER_ADDRESS,
    GAME_CHARACTER_URIS,
  );
  await tx.wait();

  console.log("\nCollection minted:");
  console.log("  tx hash:  ", tx.hash);
  console.log("  tx:       ", txUrl(tx.hash));

  console.log("\nBalances of owner for token ids 1..10:");
  for (let id = 1n; id <= 10n; id++) {
    const balance = await collection.balanceOf(OWNER_ADDRESS, id);
    console.log(`  token ${id.toString().padStart(2)}: ${balance.toString()}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
