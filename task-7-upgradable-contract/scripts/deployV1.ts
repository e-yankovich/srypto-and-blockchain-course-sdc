import hre from "hardhat";
import { upgrades } from "@openzeppelin/hardhat-upgrades";

async function main() {
  const connection = await hre.network.create();
  const { ethers } = connection;
  const upgradesApi = await upgrades(hre, connection);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const MyTokenV1 = await ethers.getContractFactory("MyTokenV1");

  const token = await upgradesApi.deployProxy(MyTokenV1, [deployer.address], {
    kind: "uups",
    initializer: "initialize",
  });
  await token.waitForDeployment();

  const proxyAddress = await token.getAddress();
  const implAddress =
    await upgradesApi.erc1967.getImplementationAddress(proxyAddress);

  console.log("MyTokenV1 proxy deployed to:      ", proxyAddress);
  console.log("MyTokenV1 implementation deployed:", implAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
