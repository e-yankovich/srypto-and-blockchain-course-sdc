import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("GreeterModule", (m) => {
    const name = m.getParameter("name", "Evgeniya");
    const greeter = m.contract("Greeter", [name]);

    return { greeter };
});