# Shelby Protocol × Solana Starter

A quickstart demo showing how to upload blobs to Shelby Protocol using your Solana wallet.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Solana](https://img.shields.io/badge/Solana-Devnet-purple?logo=solana)
![Shelby](https://img.shields.io/badge/Shelby-Protocol-cyan)

![Demo](public/demo.gif)

## What is Shelby?

Shelby is a **chain-agnostic decentralized file storage** protocol. Think of it as read-optimized blob storage that works across blockchains:

- **Store from any chain**: Sign transactions with your existing wallet (Solana, Aptos, EVM)
- **Retrieve via HTTP**: Simple `GET` requests to fetch your data—no SDK required
- **Performant**: Optimized for read-heavy workloads

Learn more at [shelby.xyz](https://shelby.xyz)

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm, npm, or yarn
- A Solana wallet browser extension (Solflare, Phantom, etc.)

### Setup

```bash
# Clone the repo
git clone git@github.com:shelby/solana-starter.git
cd solana-starter

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SHELBYNET_API_KEY` | Shelby API key |
| `NEXT_PUBLIC_SOLANA_RPC` | (Optional) Solana RPC endpoint, defaults to Devnet |

**NOTE:** Get your free API key from [Geomi](https://geomi.dev/). See [this video](https://www.youtube.com/watch?v=yo8SZ3TB3kY) for a walkthrough.

## Easy as 1, 2, 3

This demo walks through the complete flow for storing blobs on Shelby using a Solana wallet.

### Step 1: Connect Wallet

When you connect your Solana wallet, a **storage account** is automatically derived from your wallet address. This storage account is your identity on Shelby.

**Key code:**

[`src/utils/shelbyClient.ts:10-13`](https://github.com/shelby/solana-starter/blob/main/src/utils/shelbyClient.ts#L10-L13)

```typescript
export const shelbyClient = new ShelbyClient({
  network: Network.SHELBYNET,
  apiKey: process.env.NEXT_PUBLIC_SHELBYNET_API_KEY || "",
});
```

[`src/components/WalletProvider.tsx:14-18`](https://github.com/shelby/solana-starter/blob/main/src/components/WalletProvider.tsx#L14-L18)

```typescript
const client = createClient({
  endpoint:
    process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com",
  walletConnectors: autoDiscover({ filter: isSolanaWallet }),
});
```

[`src/components/Header.tsx:19-20`](https://github.com/shelby/solana-starter/blob/main/src/components/Header.tsx#L19-L20)

```typescript
const { connectors, connect, disconnect, wallet, status } =
  useWalletConnection();
```

### Step 2: Fund Account

The derived storage account needs **ShelbyUSD** (for storage costs) and **APT** (for transaction fees). In this demo, we get both from the faucet.

**Key code:**

[`src/components/StorageAccountManager.tsx:33-36`](https://github.com/shelby/solana-starter/blob/main/src/components/StorageAccountManager.tsx#L33-L36)

```typescript
const { storageAccountAddress } = useStorageAccount({
  client: shelbyClient,
  wallet,
});
```

[`src/components/StorageAccountManager.tsx:54-70`](https://github.com/shelby/solana-starter/blob/main/src/components/StorageAccountManager.tsx#L54-L70)

```typescript
const handleFundAccount = useCallback(async () => {
  if (!storageAddressStr) return;

  try {
    setStatusMessage("Funding account with ShelbyUSD and APT...");
    await fundAccount(storageAddressStr);
    setIsFunded(true);
    // ...
  } catch (error) {
    // ...
  }
}, [storageAddressStr, fundAccount, onAccountFunded]);
```

The `useFundAccount` hook handles parallel funding with retry logic:

[`src/hooks/useFundAccount.ts:67-84`](https://github.com/shelby/solana-starter/blob/main/src/hooks/useFundAccount.ts#L67-L84)

```typescript
await Promise.all([
  withRetry(() =>
    shelbyClient.fundAccountWithShelbyUSD({
      address: storageAccountAddress,
      amount: DEFAULT_FUNDING_AMOUNT,
    }),
  ).then(() => {
    results.shelbyUsd = true;
  }),
  withRetry(() =>
    shelbyClient.fundAccountWithAPT({
      address: storageAccountAddress,
      amount: DEFAULT_FUNDING_AMOUNT,
    }),
  ).then(() => {
    results.apt = true;
  }),
]);
```

### Step 3: Upload Blobs

Select a file, sign the transaction with your wallet, and the file is stored on Shelby. Blobs are retrievable via a simple HTTP GET request.

**Key code:**

[`src/components/BlobUploader.tsx:29-34`](https://github.com/shelby/solana-starter/blob/main/src/components/BlobUploader.tsx#L29-L34)

```typescript
const { storageAccountAddress, signAndSubmitTransaction } = useStorageAccount({
  client: shelbyClient,
  wallet,
});
```

[`src/components/BlobUploader.tsx:36-38`](https://github.com/shelby/solana-starter/blob/main/src/components/BlobUploader.tsx#L36-L38)

```typescript
const { mutateAsync: uploadBlobs, isPending: isUploading } = useUploadBlobs({
  client: shelbyClient,
});
```

[`src/components/BlobUploader.tsx:85-97`](https://github.com/shelby/solana-starter/blob/main/src/components/BlobUploader.tsx#L85-L97)

```typescript
await uploadBlobs({
  signer: {
    account: storageAccountAddress,
    signAndSubmitTransaction,
  },
  blobs: [
    {
      blobName: selectedFile.name,
      blobData,
    },
  ],
  expirationMicros, // 30 days from now
});
```

[`src/components/BlobUploader.tsx:100`](https://github.com/shelby/solana-starter/blob/main/src/components/BlobUploader.tsx#L100)

```typescript
const blobUrl = `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${storageAccountAddress.toString()}/${selectedFile.name}`;
```

## Project Structure

```
src/
├── app/
│   └── page.tsx             # Main page
├── components/
│   ├── WalletProvider.tsx   # Solana client setup
│   ├── Header.tsx           # Wallet connection UI
│   ├── StorageAccountManager.tsx  # Funding flow
│   └── BlobUploader.tsx     # File upload flow
├── hooks/
│   └── useFundAccount.ts    # Funding with retry logic
└── utils/
    └── shelbyClient.ts      # Shared Shelby client
```

## Troubleshooting

### Common Issues

**"No wallets discovered"**
- Install a Solana wallet extension (Solflare, Phantom, etc.)
- Enable the extension for the site and refresh

**"INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE" error**
- Your storage account needs APT tokens for gas fees
- Click "Fund Account" to receive tokens

**"E_INSUFFICIENT_FUNDS" error**
- Your storage account needs ShelbyUSD for storage costs
- Click "Fund Account" to receive tokens

**Funding fails repeatedly**
- Faucet has rate limits; wait 30 seconds between attempts
- Obtain API key from [geomi.dev](https://geomi.dev) for increased limit

**Upload stuck on "Uploading..."**
- Check your wallet for a pending signature request
- Approve the transaction in your wallet popup

## Next Steps

- **Explore the docs**: [https://docs.shelby.xyz](https://docs.shelby.xyz)
- **Learn more about Shelby**: [https://shelby.xyz](https://shelby.xyz)
- **Join our Discord community**: [https://discord.gg/shelbyserves](https://discord.gg/shelbyserves)
- **Try the Shelby quickstart**: [https://github.com/shelby/shelby-quickstart](https://github.com/shelby/shelby-quickstart)