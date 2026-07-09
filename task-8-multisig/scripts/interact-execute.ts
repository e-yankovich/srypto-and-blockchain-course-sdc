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

  console.log("MultiSigWallet execute flow");
  console.log(`  Contract:  ${CONTRACT_ADDRESS}`);
  console.log(`  Owner 1:   ${owner1.address}`);
  console.log(`  Owner 2:   ${owner2.address}`);
  console.log(`  Recipient: ${recipient} (owner 2)`);
  console.log(`  Value:     ${ethers.formatEther(value)} ETH`);

  const recipientBalanceStart = await ethers.provider.getBalance(recipient);
  console.log(
    `\n  Recipient balance (start): ${ethers.formatEther(recipientBalanceStart)} ETH`
  );

  // 0. fund the wallet so it can perform the transfer
  const walletBalance = await ethers.provider.getBalance(CONTRACT_ADDRESS);
  console.log(`  Wallet balance: ${ethers.formatEther(walletBalance)} ETH`);
  if (walletBalance < value) {
    const fundTx = await owner1.sendTransaction({
      to: CONTRACT_ADDRESS,
      value,
    });
    await fundTx.wait();
    console.log(`  fund wallet tx: ${fundTx.hash}`);
    console.log(
      `  Wallet balance after funding: ${ethers.formatEther(
        await ethers.provider.getBalance(CONTRACT_ADDRESS)
      )} ETH`
    );
  }

  // 1. submit
  const txCountBefore = await wallet.getTransactionCount();
  const submitTx = await wallet
    .connect(owner1)
    .submitTransaction(recipient, value, "0x");
  await submitTx.wait();
  const txId = txCountBefore;
  console.log(`\n  submitTransaction tx: ${submitTx.hash}`);
  console.log(`  Transaction id: ${txId}`);

  // 2. confirm by both owners
  const confirmTx1 = await wallet.connect(owner1).confirmTransaction(txId);
  await confirmTx1.wait();
  console.log(`  confirm (owner 1) tx: ${confirmTx1.hash}`);
  console.log(
    `    numConfirmations: ${(await wallet.transactions(txId)).numConfirmations}`
  );

  const confirmTx2 = await wallet.connect(owner2).confirmTransaction(txId);
  await confirmTx2.wait();
  console.log(`  confirm (owner 2) tx: ${confirmTx2.hash}`);
  console.log(
    `    numConfirmations: ${(await wallet.transactions(txId)).numConfirmations}`
  );

  // 3. execute — measure recipient balance right around it for a clean delta
  const recipientBalanceBeforeExec = await ethers.provider.getBalance(recipient);
  const executeTx = await wallet.connect(owner1).executeTransaction(txId);
  await executeTx.wait();
  console.log(`\n  executeTransaction tx: ${executeTx.hash}`);

  const stored = await wallet.transactions(txId);
  console.log(`    executed: ${stored.executed}`);

  const recipientBalanceEnd = await ethers.provider.getBalance(recipient);
  console.log(
    `\n  Recipient balance (before execute): ${ethers.formatEther(
      recipientBalanceBeforeExec
    )} ETH`
  );
  console.log(
    `  Recipient balance (after execute):  ${ethers.formatEther(
      recipientBalanceEnd
    )} ETH`
  );
  console.log(
    `  Delta from execute: ${ethers.formatEther(
      recipientBalanceEnd - recipientBalanceBeforeExec
    )} ETH`
  );
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
