import { network } from "hardhat";

const EXPECTED_ACCOUNTS = [
  "0x5c13DA0d74BA90F4D39829Ae83E0DBb5633aB899",
  "0xF146EaC3eBa54e770a6e19AAF8553C66e8410c09",
];

const REQUIRED_CONFIRMATIONS = 2;
const DEPLOY_WAIT_CONFIRMATIONS = 1;

async function main() {
  const { ethers } = await network.create("hoodi");

  const signers = await ethers.getSigners();
  if (signers.length < 2) {
    throw new Error(
      `Expected 2 signers (HOODI_PRIVATE_KEY and HOODI_PRIVATE_KEY_2), got ${signers.length}. ` +
        "Check the accounts configured for the hoodi network in hardhat.config.ts."
    );
  }

  const [signer1, signer2] = signers;
  const owners = [signer1.address, signer2.address];

  console.log("Deploying MultiSigWallet to Hoodi");
  console.log("Signers (verify against MetaMask):");
  console.log(`  Account 1: ${signer1.address}`);
  console.log(`  Account 2: ${signer2.address}`);

  owners.forEach((address, i) => {
    const expected = EXPECTED_ACCOUNTS[i];
    if (expected && address.toLowerCase() !== expected.toLowerCase()) {
      console.warn(
        `  WARNING: Account ${i + 1} (${address}) does not match the expected ${expected}`
      );
    }
  });

  const balance1 = await ethers.provider.getBalance(signer1.address);
  console.log(`  Account 1 balance: ${ethers.formatEther(balance1)} ETH`);

  const factory = await ethers.getContractFactory("MultiSigWallet", signer1);
  const wallet = await factory.deploy(owners, REQUIRED_CONFIRMATIONS);

  const deployTx = wallet.deploymentTransaction();
  console.log(`\nDeployment transaction sent: ${deployTx?.hash}`);
  console.log("Waiting for confirmations...");

  await wallet.waitForDeployment();
  if (deployTx) {
    await deployTx.wait(DEPLOY_WAIT_CONFIRMATIONS);
  }

  const contractAddress = await wallet.getAddress();

  console.log("\nMultiSigWallet deployed");
  console.log(`  Contract address: ${contractAddress}`);
  console.log(`  Deploy tx hash:   ${deployTx?.hash}`);
  console.log(`  Owners:           ${owners.join(", ")}`);
  console.log(`  Required:         ${REQUIRED_CONFIRMATIONS}`);
  console.log(
    `  Etherscan:        https://hoodi.etherscan.io/address/${contractAddress}`
  );
}

main().catch((error) => {
  console.error("\nDeployment failed:");
  if (error instanceof Error) {
    console.error(`  ${error.message}`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
