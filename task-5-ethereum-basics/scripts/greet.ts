import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect();
    const greeter = await ethers.getContractAt(
        "Greeter",
        "0x2652D680586E50E003d8BB7173C6a7D144de6381"
    );
    const result = await greeter.greet();
    console.log("Greet result:", result);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
