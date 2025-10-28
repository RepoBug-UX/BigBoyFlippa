const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

// Generate a new keypair
const keypair = Keypair.generate();

// Get the private key as a base58 string
const privateKey = bs58.encode(Buffer.from(keypair.secretKey));

// Get the public key as a base58 string
const publicKey = keypair.publicKey.toBase58();

console.log('Private Key:', privateKey);
console.log('Public Key:', publicKey);
console.log('\nAdd this private key to your .env file as WALLET_PRIVATE_KEY'); 