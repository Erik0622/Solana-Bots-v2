'use client';

import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { Connection, Commitment } from '@solana/web3.js';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';

// Importiere den Standard-Style für die Wallet-Adapter-UI-Komponenten
import '@solana/wallet-adapter-react-ui/styles.css';

interface ClientWalletProviderProps {
  children: ReactNode;
}

const ClientWalletProvider: FC<ClientWalletProviderProps> = ({ children }) => {
  // Direkter Zugriff auf Alchemy RPC URL
  const ALCHEMY_RPC_URL = 'https://solana-mainnet.g.alchemy.com/v2/ajXi9mI9_OF6a0Nfy6PZ-05JT29nTxFm';
  
  // Backup RPC URLs, falls Alchemy nicht erreichbar ist
  const BACKUP_RPC_URLS = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com'
  ];
  
  // Connection-Optionen für bessere Zuverlässigkeit
  const commitment: Commitment = 'confirmed';
  const connectionConfig = {
    commitment,
    disableRetryOnRateLimit: false,
    confirmTransactionInitialTimeout: 60000,
  };

  const endpoint = ALCHEMY_RPC_URL;
  
  // Connection mit den optimierten Optionen erstellen
  const connection = new Connection(endpoint, connectionConfig);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default ClientWalletProvider; 