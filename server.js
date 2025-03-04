import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getBuyItemsSolanaInstructions, getSolanaSigner } from "./solanaMintUtils.js";
import 'dotenv/config';

import session from "express-session";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
    cors({
      origin: "http://localhost:5173", // Allow your frontend app
      credentials: true, // Allow cookies/session
    })
);
app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
    })
  );
app.use(passport.initialize());
app.use(passport.session());

// GitHub OAuth Strategy
passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "http://localhost:5000/auth/github/callback",
        scope: ["read:user", "public_repo"],
      },
      async (accessToken, refreshToken, profile, done) => {
        done(null, { profile, accessToken });
      }
    )
);


passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));


// GitHub Auth Routes
app.get("/auth/github", passport.authenticate("github"));

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "http://localhost:3000/login" }),
  (req, res) => {
    res.redirect(`http://localhost:3000/dashboard?token=${req.user.accessToken}`);
  }
);

app.get("/auth/logout", (req, res) => {
  req.logout(() => res.redirect("http://localhost:3000"));
});

const connection = new Connection(process.env.RPC_URL);


/**
 * Request Payment Transaction
 */
app.post("/request-payment", async (req, res) => {
    try {
        const { buyerPublicKey, merchantPublicKey, treeAddress, collectionName, purchaseNFTs, amount } = req.body;
        if (!buyerPublicKey || !merchantPublicKey || !treeAddress || !collectionName || !purchaseNFTs || !amount) {
            return res.status(400).json({ error: "Missing required parameters." });
        }

        const buyerKey = new PublicKey(buyerPublicKey);
        const merchantKey = new PublicKey(merchantPublicKey);

        const transaction = new Transaction();

        // Create the payment instruction
        const paymentInstruction = SystemProgram.transfer({
            fromPubkey: buyerKey,
            toPubkey: merchantKey,
            lamports: amount * 1e9,
        });

        const solanaInstructions = await getBuyItemsSolanaInstructions(
            buyerPublicKey, treeAddress, collectionName, purchaseNFTs
        );

        solanaInstructions.forEach(instruction => transaction.add(instruction));
        transaction.add(paymentInstruction);

        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.feePayer = buyerKey;

        transaction.partialSign(getSolanaSigner());

        const serializedTransaction = transaction.serialize({requireAllSignatures:false}).toString("base64");
        

        res.json({ transaction: serializedTransaction });

    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});




// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
