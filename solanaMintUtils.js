import { Connection, PublicKey, SystemProgram, TransactionInstruction, Keypair } from "@solana/web3.js";
import Bundlr from "@bundlr-network/client";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSignerFromKeypair, signerIdentity, none, signTransaction  } from '@metaplex-foundation/umi';
import { TransactionBuilder } from '@metaplex-foundation/js';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import fs from "fs";
import {
    mintV1,
    getAssetWithProof,
    updateMetadata,
    mplBubblegum
} from '@metaplex-foundation/mpl-bubblegum'
import bs58 from "bs58";
import 'dotenv/config';


const bundlr = new Bundlr("https://node1.bundlr.network", "solana", process.env.BundlrWallet);


//const createdTreeAddress = "CX1RbcFuY2whwHmL988W1Lwfw3A65M2NahS36eT3uQWS"; // AnrgANw3znNQ52TyAmBth7kqeTxbacyS8bWwezS6XP9J //Bd4kmsgN8GuLRWm5mcTPY5TDsuXx2vsAcxy96rZ1Knsr
const treeAddressDef = "AnrgANw3znNQ52TyAmBth7kqeTxbacyS8bWwezS6XP9J";
//const createdDelegateAddress = "A8EfHGYAhwejtk5t5gBZ983W39v7GM5byhZX5sm31aJY";
const testOwnerAddressDef = "AQotg7Z7StRms9LTGY2BuoWnLMsJTV12WApwDkHMUSqz";
const collectionNameDef = "NewCollection7";
//const collectionDescriptionDef = "List of owned NFTs";

const connection = new Connection(process.env.RPC_URL);
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

const solanaSigner = Keypair.fromSecretKey(secret); 

umi.use(signerIdentity(signer))

function getAsArray(target) {
    if (target == null) return []
    return Array.isArray(target) ? target : [target]
}

export function getSolanaSigner(){
    return solanaSigner;
}
  

async function uploadMetadata(metadata) {

    await bundlr.ready();

    // Fund your Bundlr balance with SOL (minimum: 0.01 SOL)
    const balance = await bundlr.getLoadedBalance();
    console.log("Current Bundlr balance:", balance.toString());

    if (balance.toNumber() < 1000) { // Less than 0.001 AR (adjust as needed)
        console.log("Funding Bundlr wallet...");
        await bundlr.fund(1000000); // Adds ~0.001 AR worth of SOL
    }

    // JSON metadata to upload


    // Convert metadata to a Buffer
    const data = Buffer.from(JSON.stringify(metadata));

    // Upload to Arweave
    const tx = await bundlr.upload(data, { tags: [{ name: "Content-Type", value: "application/json" }] });
    console.log("✅ Metadata uploaded! Arweave URL:", `https://arweave.net/${tx.id}`);

    return `https://arweave.net/${tx.id}`;
}


function getMintNewUserTransaction(ownerAddress,collectionName, treeAddress, metadataURI){
    const ownerKey = new PublicKey(ownerAddress);
    const mint = mintV1(umi, {
        leafOwner:ownerKey,
        leafDelegate:signer.publicKey,
        merkleTree:treeAddress,
        feePayer:ownerKey,
        metadata: {
            name: collectionName,
            uri: metadataURI,
            collection: none(),
            creators: [
                { address: umi.identity.publicKey, verified: false, share: 100 },
            ],
        },
    })

    return mint; 
}

async function getMintNewUserInstruction(ownerAddress,collectionName, treeAddress, metadataURI){
    const mint = getMintNewUserTransaction(ownerAddress,collectionName, treeAddress, metadataURI, null);
    return await mint.buildWithLatestBlockhash(umi);
}

async function mintNewUser(ownerAddress,collectionName, treeAddress, metadataURI){
    const mint = getMintNewUserTransaction(ownerAddress,collectionName, treeAddress, metadataURI, null);
    
    const txResult = await mint.sendAndConfirm(umi)

    const addressResult = bs58.encode(txResult.signature);
    console.log(`✅ cNFT TX Address: ${addressResult}`);

    await new Promise(resolve => setTimeout(resolve, 3000));

    const userMintId = await getCNFTCollectionID(ownerAddress,collectionName,treeAddress)
    console.log(`✅ cNFT Address: ${userMintId}`);
}



async function getCNFTMetadataFromOwnerCollection(ownerAddress, collectionName , treeAddress){
    const collectionArray = await getCNFTsOwnerCollections(ownerAddress, collectionName , treeAddress);
    if (collectionArray.length > 0){
        if (collectionArray.length > 1) console.warn("More than one collection with name " + collectionName);
        return collectionArray[collectionArray.length-1].content;  
    }
    else{
        return null;
    }
}



async function getUpdateCNFTFromOwnerCollectionTransaction(ownerAddress,collectionName, treeAddress, metadataURI){
    const collectionID = await getCNFTCollectionID(ownerAddress, collectionName , treeAddress);
    const assetWithProof = await getAssetWithProof(umi, collectionID, {
        truncateCanopy: false,
    })
    const updateArgs = {
        uri: metadataURI,
    }
    const ownerKey = new PublicKey(ownerAddress);
    console.log(assetWithProof);
    const updatedData = updateMetadata(umi, {
        ...assetWithProof,
        leafOwner: ownerKey,
        leafDelegate: signer.publicKey,
        currentMetadata: assetWithProof.metadata,
        feePayer:ownerKey,
        updateArgs
    })


    return updatedData; 
}

async function getUpdateCNFTFromOwnerCollectionInstruction(ownerAddress, collectionName , treeAddress, metadataURI){
    const updatedData = await getUpdateCNFTFromOwnerCollectionTransaction(ownerAddress, collectionName , treeAddress, metadataURI);
    return await updatedData.buildWithLatestBlockhash(umi);
}


async function updateCNFTFromOwnerCollection(ownerAddress, collectionName , treeAddress, metadataURI){
    
    const updatedData = await getUpdateCNFTFromOwnerCollectionTransaction(ownerAddress, collectionName , treeAddress, metadataURI);

    const txResult = await updatedData.sendAndConfirm(umi)

    const addressResult = bs58.encode(txResult.signature);
    
    console.log(`✅ cNFT Mint Updated! Address: ${addressResult}`);
}

async function getCNFTCollectionID(ownerAddress, collectionName , treeAddress){
    const collectionArray = await getCNFTsOwnerCollections(ownerAddress, collectionName, treeAddress);
    if (collectionArray.length > 0){
        if (collectionArray.length > 1) console.warn("More than one collection with name " + collectionName);
        return collectionArray[collectionArray.length-1].id;  
    }
    else{
        return null;
    }
}

async function getCNFTsOwnerCollections(ownerAddress, collectionName , treeAddress){
    const userCNFTs = await getCNFTsByOwner(ownerAddress, treeAddress);
    return userCNFTs.filter(asset => asset.content.metadata.name === collectionName);
}

async function getCNFTsByOwner(ownerAddress, treeAddress = null) {
    const ownerPublicKey = new PublicKey(ownerAddress);

    const rpcAssetList = await umi.rpc.searchAssets({
        owner: ownerPublicKey,
        delegate: signer.publicKey
    });

    const userCNFTs = rpcAssetList.items.filter(asset => asset.compression.tree == treeAddress);

    return userCNFTs;
}

export async function getBuyItemsSolanaInstructions(ownerAddress, treeAddress, collectionName, ownedNFTTraitIDs){
    const content = await getCNFTMetadataFromOwnerCollection(ownerAddress, collectionName, treeAddress);
    if (content == null){
        console.log("create");
        //create
        //1 metadata
        const newMetadata = {
            prevMetadata:"",
            name:collectionName,
            ownedTraits:ownedNFTTraitIDs.ownedTraits || {},
            ownedIDs:ownedNFTTraitIDs.ownedIDs || []
        }
        //2 uploadarweave
        try{
            const uri = await uploadMetadata(newMetadata);
            const transactionBuilder = getMintNewUserTransaction(ownerAddress,collectionName, treeAddress, uri);
            const solanaInstructions = await convertTransactionBuilderToSolanaInstructions(transactionBuilder, ownerAddress)
            //const transaction  = await getMintNewUserInstruction(ownerAddress,collectionName, treeAddress, uri);
            return solanaInstructions;
        }
        catch(error){
            console.error("There was an error:" + error)
        }
    }
    else{
        console.log("update");
        //update
        //1 metadata
        try{
            const response = await fetch(content.json_uri);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const newMetadata = await response.json();
            newMetadata.prevMetadata = content.json_uri;
            for (const trait in ownedNFTTraitIDs.ownedTraits) {
                if (!newMetadata.ownedTraits[trait]) {
                    newMetadata.ownedTraits[trait] = [];
                }
            
                // Merge and remove duplicates using Set
                newMetadata.ownedTraits[trait] = [...new Set([
                    ...newMetadata.ownedTraits[trait], 
                    ...ownedNFTTraitIDs.ownedTraits[trait]
                ])];
            }
            
            const ownedIDs = ownedNFTTraitIDs.ownedIDs || []
            // Merge `ownedIDs` and remove duplicates
            newMetadata.ownedIDs = [...new Set([
                ...newMetadata.ownedIDs, 
                ...ownedIDs
            ])];

            //2 uploadarweave
            const uri = await uploadMetadata(newMetadata);
            //return update transaction
            //const transaction = await getUpdateCNFTFromOwnerCollectionInstruction(ownerAddress, collectionName , treeAddress, uri);
            const transactionBuilder = await getUpdateCNFTFromOwnerCollectionTransaction(ownerAddress,collectionName, treeAddress, uri);
            const solanaInstructions = await convertTransactionBuilderToSolanaInstructions(transactionBuilder, ownerAddress)
            
            return solanaInstructions;
        }
        catch(error){
            console.error("There was an error:" + error)
        }
    }
}

export async function partialSignTransaction(transaction){
    transaction.partialSign(signer);
}

async function convertTransactionBuilderToSolanaInstructions(transactionBuilder, feePayerAddress){
    const feePayerKey = new PublicKey(feePayerAddress);
    const transaction = await transactionBuilder.buildWithLatestBlockhash(umi,{feePayer:feePayerKey});
    // const signedTransaction = await signTransaction(transaction, [signer]);
    const solanaInstructions = transaction.message.instructions.map(umiInstruction => {

        const programId = transaction.message.accounts[umiInstruction.programIndex]
        // Map account indexes to actual PublicKey objects
        const keys = umiInstruction.accountIndexes.map(index => {
            const pubkey = new PublicKey(transaction.message.accounts[index]);
            const pubkeyString =  pubkey.toString();
            return {
                pubkey,
                isSigner: (pubkeyString == signer.publicKey.toString() || pubkeyString == feePayerAddress) ? true : false, // Check if the key is in signers array
                isWritable: (pubkeyString == signer.publicKey.toString() || pubkeyString == feePayerAddress)? true : true, // Adjust as needed
            };
        });
        return new TransactionInstruction({
            programId,  // ✅ Fix: Set correct program ID
            keys,
            data: Buffer.from(umiInstruction.data), // ✅ Convert data properly
        });
    });

    return solanaInstructions;
}


const purchasedNFTTraitIDsTest = {
    ownedTraits: {
        Body:["Feminine"],
        Brace:["Giant_Skull_Brace", "Triangle_Brace"]
    },
    ownedIDs:[]
}
const purchasedNFTTraitIDsTest2 = {
    ownedTraits: {
        Clothing:["Dress"],
        Brace:["Triangle_Brace_of_dragon"]
    },
    ownedIDs:[]
}


const paymentInstruction = SystemProgram.transfer({
    fromPubkey: "buyerKey",
    toPubkey: "merchantKey",
    lamports: 1000000000 * 1e9, // Convert SOL to lamports
});
