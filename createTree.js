import { createSignerFromKeypair, generateSigner, signerIdentity, signerPayer, publicKey } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createTree, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import 'dotenv/config';
import fs from "fs";

async function createMerkleTree() {
    // Connect to Solana Devnet
    const umi = createUmi(process.env.RPC_URL).use(mplBubblegum())
    //const connection = new Connection(clusterApiUrl("devnet"));

    const keypairPath = process.env.WALLET_KEYPAIR_PATH;
    if (!keypairPath) {
        throw new Error("WALLET_KEYPAIR_PATH is not defined in .env");
    }

    const secret = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath)));
    const myKeypair = umi.eddsa.createKeypairFromSecretKey(secret);
    const signer = createSignerFromKeypair(umi, myKeypair);

    // Generate a new keypair for the Merkle Tree
    const merkleTree = generateSigner(umi);

    // ✅ Explicitly set signer identity
    umi.use(signerIdentity(signer)); // Ensures signer is the transaction authority

    // Define Merkle Tree size
    const maxDepth = 14;       // Allows 2^14 (16,384 NFTs)
    const maxBufferSize = 64;  // Adjust as needed

    try {
        // Create the Merkle Tree on-chain
        const builder = await createTree(umi, {
            merkleTree,
            maxDepth,
            maxBufferSize,
            treeCreator: signer.publicKey,
        });

        console.log("Transaction Builder:", builder);

        // ✅ Send transaction and confirm
        const txResult = await builder.sendAndConfirm(umi);

        console.log(`✅ Merkle Tree Created! Address: ${merkleTree.publicKey}`);
        return merkleTree.publicKey;
    } catch (error) {
        console.error("❌ Error creating Merkle Tree:", error);
    }
}

// Run the function
createMerkleTree().catch(console.error);
