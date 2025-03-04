import { Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import 'dotenv/config';

// Replace with your RPC provider
const RPC_URL = process.env.RPC_URL; // or use devnet if testing
const connection = new Connection(RPC_URL, "confirmed");


/**
 * Function to create a transaction for payment
 * @param {PublicKey} buyerPublicKey - The buyer's Solana public key
 * @param {number} amount - Amount in SOL to request
 */
async function requestPayment(merchantPublicKey, buyerPublicKey, amount) {
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: buyerPublicKey,
            toPubkey: merchantPublicKey,
            lamports: amount * web3.LAMPORTS_PER_SOL, // Convert SOL to lamports
        })
    );

    // Get recent blockhash for transaction fee calculation
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = buyerPublicKey;

    console.log("Transaction created, now send it to the user's wallet for signing...");
    return transaction;
}




function getPrices(){
    let prices = 0;
    return prices
}
