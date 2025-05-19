'use client';

import React from 'react';
import WalletContextProvider from './WalletContextProvider';
import VerifyOnX from './VerifyOnX';

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  return (
    <WalletContextProvider>
      <VerifyOnX />
      {children}
    </WalletContextProvider>
  );
};

export default ClientLayout; 