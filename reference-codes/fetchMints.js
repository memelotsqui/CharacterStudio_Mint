import { PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';

// Solana Umi Connection (Use Mainnet or Devnet)
const umi = createUmi("https://api.devnet.solana.com")
    //.use(mplBubblegum())
    .use(dasApi());

const treeAddress = "CX1RbcFuY2whwHmL988W1Lwfw3A65M2NahS36eT3uQWS";


async function getCNFTsByOwner(ownerAddress) {
    const ownerPublicKey = new PublicKey(ownerAddress);

    //const rpcAssetList = await umi.rpc.getAssetsByOwner({ owner:ownerPublicKey })

    const rpcAssetList = await umi.rpc.searchAssets({
        owner: ownerPublicKey,
        delegate: new PublicKey("A8EfHGYAhwejtk5t5gBZ983W39v7GM5byhZX5sm31aJY")
    });

    // Filter to find only cNFTs owned by `ownerAddress`
    const userCNFTs = rpcAssetList.items.filter(asset => asset.compression.tree === treeAddress);

    //console.log(rpcAssetList.items[1].content.metadata)
    return userCNFTs;
}

// Example usage
getCNFTsByOwner("AQotg7Z7StRms9LTGY2BuoWnLMsJTV12WApwDkHMUSqz")
    .then(cnfts => console.log("User's cNFTs:", cnfts))
    .catch(err => console.error("Error fetching cNFTs:", err));
