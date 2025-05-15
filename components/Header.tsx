'use client';

import React, { FC } from 'react';
import Image from 'next/image';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const Header: FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark/80 backdrop-blur-md px-6 py-4 border-b border-dark-lighter">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 relative">
            <Image 
              src="/logo.svg" 
              alt="SolBotQuants Logo" 
              width={40}
              height={40}
              priority
            />
          </div>
          <span className="text-xl font-bold text-white">Sol<span className="text-primary">Bot</span><span className="text-[#FAD02C]">Quants</span></span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8 mr-8">
          <a href="#features" className="text-white/80 hover:text-primary transition-colors">Features</a>
          <a href="#bots" className="text-white/80 hover:text-primary transition-colors">Trading Bots</a>
          <a href="#performance" className="text-white/80 hover:text-primary transition-colors">Performance</a>
        </nav>
        
        <WalletMultiButton />
      </div>
    </header>
  );
};

export default Header; 