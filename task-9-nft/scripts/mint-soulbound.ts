import { network } from "hardhat";

import {
  SOULBOUND_CARD_URI,
  STUDENT_ADDRESS,
  requireDeployedAddress,
  txUrl,
} from "./config.js";

async function main() {
  const { ethers } = await network.create("hoodi");
  const [owner] = await ethers.getSigners();

  const address = requireDeployedAddress(
    "soulbound",
    "scripts/deploy-soulbound.ts",
  );

  const card = await ethers.getContractAt(
    "SoulboundVisitCardERC721",
    address,
    owner,
  );

  console.log("Minting soulbound visit card on hoodi...");
  console.log("  contract: ", address);
  console.log("  to:       ", STUDENT_ADDRESS);
  console.log("  tokenURI: ", SOULBOUND_CARD_URI);

  const tx = await card.mint(STUDENT_ADDRESS, SOULBOUND_CARD_URI);
  const receipt = await tx.wait();

  // Recover the minted tokenId from the Transfer(from=0x0, to, tokenId) event.
  let tokenId: bigint | undefined;
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = card.interface.parseLog(log);
      if (parsed?.name === "Transfer") {
        tokenId = parsed.args.tokenId as bigint;
        break;
      }
    } catch {
      // Not a log emitted by this contract — ignore.
    }
  }

  console.log("\nCard minted:");
  console.log("  tx hash:  ", tx.hash);
  console.log("  tx:       ", txUrl(tx.hash));

  if (tokenId === undefined) {
    console.log("  tokenId:   (Transfer event not found)");
    return;
  }

  const uri = await card.tokenURI(tokenId);
  console.log("  tokenId:  ", tokenId.toString());
  console.log("  tokenURI: ", uri);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
