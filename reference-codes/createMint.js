import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { none  } from '@metaplex-foundation/umi'
import { mintV1, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum'
import 'dotenv/config';
import bs58 from "bs58";

//const treeAddress = new PublicKey("CX1RbcFuY2whwHmL988W1Lwfw3A65M2NahS36eT3uQWS");
const treeAddress = new PublicKey("AnrgANw3znNQ52TyAmBth7kqeTxbacyS8bWwezS6XP9J");
const treeAddressKey = new PublicKey(treeAddress);
const collectionName = "b16"

const umi = createUmi(process.env.RPC_URL).use(mplBubblegum())

const keypairPath = process.env.WALLET_KEYPAIR_PATH;
if (!keypairPath) {
    throw new Error("WALLET_KEYPAIR_PATH is not defined in .env");
}
const secret = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath)));
const myKeypair = umi.eddsa.createKeypairFromSecretKey(secret);
const signer = createSignerFromKeypair(umi, myKeypair);

umi.use(signerIdentity(signer)); 

async function mintNewUser(userAddress,collectionName){
    const userAddresKey = new PublicKey(userAddress);
    const mint = await mintV1(umi, {
        leafOwner:userAddresKey,
        leafDelegate:signer.publicKey,
        merkleTree:treeAddressKey,
        metadata: {
            name: collectionName,
            uri: 'https://smartbuild.nyc3.cdn.digitaloceanspaces.com/tests/triangleBrace.json',
            //uri: 'https://example.com/my-cnft.json',
            collection: none(),
            creators: [
                { address: umi.identity.publicKey, verified: false, share: 100 },
            ],
        },
    })
    
    const txResult = await mint.sendAndConfirm(umi)

    const addressResult = bs58.encode(txResult.signature);
    console.log(`✅ cNFT Mint Created! TX Address: ${addressResult}`);

    // Wait a bit to ensure the transaction is finalized
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Fetch the newly created cNFT
    const assets = await umi.rpc.searchAssets({
        owner: userAddresKey,
        delegate: signer.publicKey
    });
    console.log(assets.items.length)
    console.log(assets.items[0].compression.tree);

    const treeAssets = assets.items.filter(asset => asset.compression.tree == treeAddress)
    console.log(treeAssets.length)

    const result = treeAssets.filter(asset => asset.content.metadata.name === collectionName);
    console.log(result.length)
    console.log(`✅ cNFT Mint Created! Address:`, result[result.length-1].id);
}

mintNewUser("AQotg7Z7StRms9LTGY2BuoWnLMsJTV12WApwDkHMUSqz", collectionName)