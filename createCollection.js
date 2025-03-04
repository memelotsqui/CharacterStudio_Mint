import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import { Keypair, Connection, clusterApiUrl } from "@solana/web3.js";
import 'dotenv/config';
import fs from "fs";

// Load your wallet (Make sure to use a funded devnet wallet)
const keypairPath = process.env.WALLET_KEYPAIR_PATH;
if (!keypairPath) {
    throw new Error("WALLET_KEYPAIR_PATH is not defined in .env");
}
const secretKey = JSON.parse(fs.readFileSync(keypairPath));
const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

console.log(wallet);

const connection = new Connection(clusterApiUrl("devnet"));
const metaplex = new Metaplex(connection).use(keypairIdentity(wallet));

async function createCollection() {
    const { nft } = await metaplex.nfts().create({
        name: "MemesWardrobe",
        symbol: "WB",
        uri: "", // Change this to your metadata link
        sellerFeeBasisPoints: 500, // 5% royalty
        isCollection: true,
    });

    console.log("✅ Collection Created! Address:", nft.address.toBase58());
    return nft;
}

// EXEY7dfrTfdVhfxmmmR15PUCgX4egsmNYZu8dRS53jsJ 
createCollection();
