import Bundlr from "@bundlr-network/client";
import 'dotenv/config';

// Load your Solana wallet keypair
const bundlr = new Bundlr("https://node1.bundlr.network", "solana", process.env.BundlrWallet);
const testMetadata = {
    name: "My NFT",
    description: "This is a test NFT3",
    image: "https://example.com/image2.png"
};

// Function to upload JSON metadata
async function uploadMetadata(metadata) {

    await bundlr.ready();

    // Fund your Bundlr balance with SOL (minimum: 0.01 SOL)
    const balance = await bundlr.getLoadedBalance();
    console.log("Current Bundlr balance:", balance.toString());

    if (balance.toNumber() < 1000000) { // Less than 0.001 AR (adjust as needed)
        console.log("Funding Bundlr wallet...");
        await bundlr.fund(1000000); // Adds ~0.001 AR worth of SOL
    }

    // JSON metadata to upload


    // Convert metadata to a Buffer
    const data = Buffer.from(JSON.stringify(metadata));

    // Upload to Arweave
    const tx = await bundlr.upload(data, { tags: [{ name: "Content-Type", value: "application/json" }] });
    console.log("✅ Metadata uploaded! Arweave URL:", `https://arweave.net/${tx.id}`);
}

// Run the function
uploadMetadata(testMetadata).catch(console.error);
