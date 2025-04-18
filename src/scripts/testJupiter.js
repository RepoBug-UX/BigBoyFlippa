import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { createJupiterApiClient } from '@jup-ag/api';
import dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

async function main() {
    try {
        // Initialize connection and Jupiter API client
        const connection = new Connection(process.env.SOLANA_RPC_ENDPOINT, 'confirmed');
        const jupiterApi = createJupiterApiClient({
            // Use the public endpoint if no Metis endpoint is provided
            basePath: process.env.METIS_ENDPOINT || 'https://quote-api.jup.ag/v6'
        });

        // Setup wallet from private key
        if (!process.env.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY environment variable is required');
        }
        const wallet = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY));
        console.log('Using wallet:', wallet.publicKey.toString());

        // Define token mints for SOL and USDC
        const inputMint = new PublicKey('So11111111111111111111111111111111111111112'); // SOL
        const outputMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC

        console.log('Getting quote for SOL -> USDC...');
        
        // Get quote for swapping 0.1 SOL to USDC
        const quoteResponse = await jupiterApi.quoteGet({
            inputMint: inputMint.toString(),
            outputMint: outputMint.toString(),
            amount: 100000000, // 0.1 SOL in lamports
            slippageBps: 50, // 0.5% slippage
        });

        console.log('Quote received:', {
            inputAmount: quoteResponse.inAmount,
            outputAmount: quoteResponse.outAmount,
            price: quoteResponse.price,
            priceImpactPct: quoteResponse.priceImpactPct,
        });

        // Get swap instructions
        console.log('Getting swap transaction...');
        const { swapTransaction } = await jupiterApi.swapPost({
            swapRequest: {
                quoteResponse,
                userPublicKey: wallet.publicKey.toString(),
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 'auto',
            },
        });

        // Deserialize and sign transaction
        const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        transaction.sign([wallet]);

        // Send transaction
        console.log('Sending transaction...');
        const rawTransaction = transaction.serialize();
        const txid = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 2
        });
        console.log('Transaction sent:', txid);

        // Wait for confirmation
        console.log('Waiting for confirmation...');
        const confirmation = await connection.confirmTransaction({
            signature: txid,
            blockhash: transaction.message.recentBlockhash,
            lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
        });

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        console.log('Transaction confirmed! View on Solscan:', `https://solscan.io/tx/${txid}`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main(); 