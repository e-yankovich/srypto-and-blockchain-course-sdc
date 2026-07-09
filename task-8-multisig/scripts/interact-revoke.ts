import { network } from "hardhat";

const CONTRACT_ADDRESS = "0xF12431dD7BeD17cE97857E7E80CDAcA0A535Cfd6";

async function main() {
  const { ethers } = await network.create("hoodi");

  const signers = await ethers.getSigners();
  if (signers.length < 2) {
    throw new Error(
      `Expected 2 signers (HOODI_PRIVATE_KEY and HOODI_PRIVATE_KEY_2), got ${signers.length}.`
    );
  }

  const [owner1, owner2] = signers;
  const recipient = owner2.address;
  const value = ethers.parseEther("0.001");

  const wallet = await ethers.getContractAt("MultiSigWallet", CONTRACT_ADDRESS);

  console.log("MultiSigWallet revoke flow");
  console.log(`  Contract:  ${CONTRACT_ADDRESS}`);
  console.log(`  Owner 1:   ${owner1.address}`);
  console.log(`  Owner 2:   ${owner2.address}`);
  console.log(`  Recipient: ${recipient} (owner 2)`);
  console.log(`  Value:     ${ethers.formatEther(value)} ETH`);

  // 1. submit
  const txCountBefore = await wallet.getTransactionCount();
  const submitTx = await wallet
    .connect(owner1)
    .submitTransaction(recipient, value, "0x");
  await submitTx.wait();
  const txId = txCountBefore;
  console.log(`\n  submitTransaction tx: ${submitTx.hash}`);
  console.log(`  Transaction id: ${txId}`);
  console.log(
    `    numConfirmations after submit: ${(await wallet.transactions(txId)).numConfirmations}`
  );

  // 2. confirm by one owner
  const confirmTx = await wallet.connect(owner1).confirmTransaction(txId);
  await confirmTx.wait();
  console.log(`\n  confirm (owner 1) tx: ${confirmTx.hash}`);
  console.log(
    `    numConfirmations after confirm: ${(await wallet.transactions(txId)).numConfirmations}`
  );

  // 3. revoke by the same owner
  const revokeTx = await wallet.connect(owner1).revokeConfirmation(txId);
  await revokeTx.wait();
  console.log(`\n  revokeConfirmation (owner 1) tx: ${revokeTx.hash}`);

  const stored = await wallet.transactions(txId);
  console.log(`    numConfirmations after revoke: ${stored.numConfirmations}`);
  console.log(`    executed: ${stored.executed}`);

  if (stored.executed) {
    throw new Error("Unexpected: transaction is executed after revoke");
  }
  console.log("\n  OK: confirmation revoked, transaction not executed.");
}

main().catch((error) => {
  console.error("\nInteraction failed:");
  if (error instanceof Error) {
    console.error(`  ${error.message}`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
