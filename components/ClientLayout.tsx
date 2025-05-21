'use client';

import React, { useEffect } from 'react';
import WalletContextProvider from './WalletContextProvider';
import VerifyOnX from './VerifyOnX';

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  // Lade den MockHandler
  useEffect(() => {
    // Dynamischer Import des MockHandlers
    import('@/lib/trading/mockHandler').then(module => {
      // Direkt den Mock-Modus deaktivieren, um echte Trades zu ermöglichen
      if (module.disableMockMode) {
        module.disableMockMode();
      }
    }).catch(err => {
      console.error("Fehler beim Laden des MockHandlers:", err);
    });
  }, []);

  return (
    <WalletContextProvider>
      <VerifyOnX />
      {children}
    </WalletContextProvider>
  );
};

export default ClientLayout; 