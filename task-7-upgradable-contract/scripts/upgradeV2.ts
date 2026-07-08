import hre from "hardhat";
import { upgrades } from "@openzeppelin/hardhat-upgrades";

const PROXY_ADDRESS = "0x8A3159e43c3d6c6FcaC52Bf10C180bf44585CBB9";

async function main() {
  const connection = await hre.network.create();
  const { ethers } = connection;
  const upgradesApi = await upgrades(hre, connection);

  const [deployer] = await ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);

  const oldImpl =
    await upgradesApi.erc1967.getImplementationAddress(PROXY_ADDRESS);

  const MyTokenV2 = await ethers.getContractFactory("MyTokenV2");
  const token = await upgradesApi.upgradeProxy(PROXY_ADDRESS, MyTokenV2);

  const upgradeTx = (
    token as unknown as {
      deployTransaction?: { wait(): Promise<unknown> };
    }
  ).deployTransaction;
  if (upgradeTx !== undefined) {
    await upgradeTx.wait();
  }

  const newImpl =
    await upgradesApi.erc1967.getImplementationAddress(PROXY_ADDRESS);

  console.log("Proxy address:        ", PROXY_ADDRESS);
  console.log("Old implementation:   ", oldImpl);
  console.log("New implementation:   ", newImpl);
  console.log("version():            ", await token.version());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
