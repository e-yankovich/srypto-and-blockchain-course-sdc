import { network } from "hardhat";

import {
  OWNER_ADDRESS,
  STUDENT_ADDRESS,
  requireDeployedAddress,
  txUrl,
} from "./config.js";

// Token ids being transferred from Account 1 to Account 2.
const TOKEN_IDS = [8n, 10n]; // 8 = Shadow, 10 = Pearl
const AMOUNTS = [1n, 1n];

async function printBalances(
  collection: Awaited<ReturnType<typeof getCollection>>,
  label: string,
) {
  console.log(`\nBalances (${label}):`);
  for (const id of TOKEN_IDS) {
    const ownerBalance = await collection.balanceOf(OWNER_ADDRESS, id);
    const studentBalance = await collection.balanceOf(STUDENT_ADDRESS, id);
    console.log(
      `  token ${id.toString().padStart(2)}:  owner=${ownerBalance.toString()}  student=${studentBalance.toString()}`,
    );
  }
}

async function getCollection(
  ethers: Awaited<ReturnType<typeof network.create>>["ethers"],
  address: string,
  signer: Awaited<ReturnType<Awaited<ReturnType<typeof network.create>>["ethers"]["getSigners"]>>[number],
) {
  return ethers.getContractAt(
    "GameCharacterCollectionERC1155",
    address,
    signer,
  );
}

async function main() {
  const { ethers } = await network.create("hoodi");
  const [owner] = await ethers.getSigners();

  const address = requireDeployedAddress(
    "collection",
    "scripts/deploy-collection.ts",
  );

  const collection = await getCollection(ethers, address, owner);

  console.log("Transferring characters from Account 1 to Account 2 on hoodi...");
  console.log("  contract: ", address);
  console.log("  from:     ", OWNER_ADDRESS, "(owner / Account 1)");
  console.log("  to:       ", STUDENT_ADDRESS, "(student / Account 2)");
  console.log("  token ids:", TOKEN_IDS.map((id) => id.toString()).join(", "));

  await printBalances(collection, "before");

  const tx = await collection.safeBatchTransferFrom(
    OWNER_ADDRESS,
    STUDENT_ADDRESS,
    TOKEN_IDS,
    AMOUNTS,
    "0x",
  );
  await tx.wait();

  await printBalances(collection, "after");

  console.log("\nTransfer complete:");
  console.log("  tx hash:  ", tx.hash);
  console.log("  tx:       ", txUrl(tx.hash));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
