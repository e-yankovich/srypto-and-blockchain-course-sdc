import { existsSync, readFileSync, writeFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/** Account 1 — contract owner / deployer (signer[0] on the hoodi network). */
export const OWNER_ADDRESS = "0x5c13DA0d74BA90F4D39829Ae83E0DBb5633aB899";

/** Account 2 — the student's wallet that receives the soulbound visit card. */
export const STUDENT_ADDRESS = "0xF146EaC3eBa54e770a6e19AAF8553C66e8410c09";

// ---------------------------------------------------------------------------
// Metadata URIs
// ---------------------------------------------------------------------------

/** Metadata URI for the soulbound ERC-721 visit card. */
export const SOULBOUND_CARD_URI =
  "ipfs://bafkreig7dknr45syvz6vm3pbjk26ijx2na66ydzbslbwvgpsmsdyldjsby";

/** Per-character metadata URIs, ordered by token id (index 0 -> token id 1). */
export const GAME_CHARACTER_URIS = [
  "ipfs://bafkreibojirxyo3wzd5rhzjsandpp6eqlchgy53ezz2gyraltq3w6lo5aq", // 1  Blaze
  "ipfs://bafkreidnyotlac7wqqpgfmsa6eujoyuej5sy7eekmvg3gr2fw7nm5sxje4", // 2  Sky
  "ipfs://bafkreidozrbgaycypgieijquleirg3e25cnwi5ajmwls3ewgpkgpgtenpu", // 3  Moss
  "ipfs://bafkreif7mw5nad5t65zvzig7cudhjoez5kzfpdrmt4dlrtfl4dnaqc7gd4", // 4  Sunny
  "ipfs://bafkreiftduuse67gnempoumsr5nxca4hd2gfcayp6bnhsnvejx3qgs2niu", // 5  Lilac
  "ipfs://bafkreibwrxfxs75ptcqwsruaa2c37ny46ekwnvw7wmpghwjfrla75xuw6y", // 6  Coral
  "ipfs://bafkreiafvoiepla2ppwjclshmwpgwzgljboajhs37v7dzjljc7ycqti6sa", // 7  Frost
  "ipfs://bafkreifmlhtnlqhbqvoji3pzurgfha4chwvsniraqnfjcyc6unio67xtje", // 8  Shadow
  "ipfs://bafkreihkx73nfg2qu76mtqqbofm7oz7gw2r6qeusate3hpglqsnujzts7i", // 9  Amber
  "ipfs://bafkreibnznqncy77kgkzj5h367nmx5unbtenpvgryhtuulqm2evushzbxi", // 10 Pearl
];

// ---------------------------------------------------------------------------
// Hoodi block explorer helpers
// ---------------------------------------------------------------------------

const HOODI_EXPLORER = "https://hoodi.etherscan.io";

export const txUrl = (hash: string): string => `${HOODI_EXPLORER}/tx/${hash}`;
export const addressUrl = (address: string): string =>
  `${HOODI_EXPLORER}/address/${address}`;

// ---------------------------------------------------------------------------
// Deployed-address bookkeeping (deployed-addresses.json at the project root)
// ---------------------------------------------------------------------------

type ContractKey = "soulbound" | "collection";
type DeployedAddresses = Partial<Record<ContractKey, string>>;

// Resolve the file relative to this module so it works regardless of cwd.
const ADDRESSES_FILE = new URL("../deployed-addresses.json", import.meta.url);

function readAll(): DeployedAddresses {
  if (!existsSync(ADDRESSES_FILE)) {
    return {};
  }
  return JSON.parse(readFileSync(ADDRESSES_FILE, "utf8")) as DeployedAddresses;
}

/**
 * Persists a single contract address without clobbering the other fields.
 * Creates deployed-addresses.json if it does not exist yet.
 */
export function saveDeployedAddress(key: ContractKey, address: string): void {
  const all = readAll();
  all[key] = address;
  writeFileSync(ADDRESSES_FILE, `${JSON.stringify(all, null, 2)}\n`);
}

/**
 * Reads a previously deployed contract address, throwing a clear error
 * (pointing at the deploy script to run first) when it is missing.
 */
export function requireDeployedAddress(
  key: ContractKey,
  deployScript: string,
): string {
  const address = readAll()[key];
  if (address === undefined) {
    throw new Error(
      `No "${key}" address found in deployed-addresses.json — run ${deployScript} first`,
    );
  }
  return address;
}
