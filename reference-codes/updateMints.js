import { PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSignerFromKeypair, signerIdentity, publicKey, none  } from '@metaplex-foundation/umi';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import fs from "fs";
import {
    getAssetWithProof,
    updateMetadata,
    mplBubblegum,
    findLeafAssetIdPda
} from '@metaplex-foundation/mpl-bubblegum'
import bs58 from "bs58";
import 'dotenv/config';

//const createdTreeAddress = "CX1RbcFuY2whwHmL988W1Lwfw3A65M2NahS36eT3uQWS"; // AnrgANw3znNQ52TyAmBth7kqeTxbacyS8bWwezS6XP9J //Bd4kmsgN8GuLRWm5mcTPY5TDsuXx2vsAcxy96rZ1Knsr
const createdTreeAddress = "AnrgANw3znNQ52TyAmBth7kqeTxbacyS8bWwezS6XP9J";
const createdDelegateAddress = "A8EfHGYAhwejtk5t5gBZ983W39v7GM5byhZX5sm31aJY";
const testOwnerAddress = "AQotg7Z7StRms9LTGY2BuoWnLMsJTV12WApwDkHMUSqz";


const colllectionName = "b20";

const umi = createUmi(process.env.RPC_URL)
    .use(mplBubblegum())
    .use(dasApi())
    
const keypairPath = process.env.WALLET_KEYPAIR_PATH;
if (!keypairPath) {
    throw new Error("WALLET_KEYPAIR_PATH is not defined in .env");
}
const secret = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath)));
const myKeypair = umi.eddsa.createKeypairFromSecretKey(secret);
const signer = createSignerFromKeypair(umi, myKeypair);

umi.use(signerIdentity(signer))

async function getCNFTMetadataFromOwnerCollection(ownerAddress, delegateAddress, collectionName , treeAddress = null){
    const collectionArray = await getCNFTsOwnerCollections(ownerAddress, delegateAddress, collectionName , treeAddress);
    if (collectionArray.length > 0){
        if (collectionArray.length > 1) console.warn("More than one collection with name " + collectionName);
        console.log(collectionArray[collectionArray.length-1].content);
        return collectionArray[collectionArray.length-1].content;  
    }
    else{
        return null;
    }
}

async function updateCNFTFromOwnerCollection(ownerAddress, delegateAddress, collectionName , treeAddress = null){
    const collectionID = await getCNFTCollectionID(ownerAddress, delegateAddress, collectionName , treeAddress);
    console.log(collectionID);
    const assetWithProof = await getAssetWithProof(umi, collectionID, {
        truncateCanopy: true,
    })
    const updateArgs = {
        name: colllectionName,
        uri: 'https://smartbuild.nyc3.cdn.digitaloceanspaces.com/tests/updatedTriangleBrace.json',
        //uri: 'https://updated-example.com/my-cnft.json',
        collection: none(),
        creators: [
            { address: umi.identity.publicKey, verified: false, share: 100 },
        ],
    }
    console.log(collectionID)
    console.log("asdasd");
    console.log(assetWithProof);
    const updatedData = await updateMetadata(umi, {
        ...assetWithProof,
        leafOwner: new PublicKey(ownerAddress),
        leafDelegate: new PublicKey(delegateAddress),
        // leafOwner: new PublicKey(ownerAddress),
        // merkleTree: new PublicKey(treeAddress),
        currentMetadata: assetWithProof.metadata,
        updateArgs,
        authority:signer
    })

    const txResult = await updatedData.sendAndConfirm(umi)

    const addressResult = bs58.encode(txResult.signature);
    
    console.log(`✅ cNFT Mint Updated! Address: ${addressResult}`);
}

async function getCNFTCollectionID(ownerAddress, delegateAddress, collectionName , treeAddress = null){
    const collectionArray = await getCNFTsOwnerCollections(ownerAddress, delegateAddress, collectionName , treeAddress);
    if (collectionArray.length > 0){
        if (collectionArray.length > 1) console.warn("More than one collection with name " + collectionName);
        return collectionArray[collectionArray.length-1].id;  
    }
    else{
        return null;
    }
}

async function getCNFTsOwnerCollections(ownerAddress, delegateAddress, collectionName , treeAddress = null){
    const userCNFTs = await getCNFTsByOwner(ownerAddress, delegateAddress, treeAddress);
    return userCNFTs.filter(asset => asset.content.metadata.name === collectionName);
}

async function getCNFTsByOwner(ownerAddress, delegateAddress, treeAddress = null) {
    const ownerPublicKey = new PublicKey(ownerAddress);

    const rpcAssetList = await umi.rpc.searchAssets({
        owner: ownerPublicKey,
        delegate: new PublicKey(delegateAddress)
    });

    const userCNFTs = treeAddress == null ? 
        rpcAssetList.items:
        rpcAssetList.items.filter(asset => asset.compression.tree == treeAddress);

    return userCNFTs;
}


//getCNFTMetadataFromOwnerCollection(testOwnerAddress, createdDelegateAddress, colllectionName, createdTreeAddress)
updateCNFTFromOwnerCollection(testOwnerAddress, createdDelegateAddress, colllectionName, createdTreeAddress)