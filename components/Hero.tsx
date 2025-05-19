'use client';

import React, { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

const Hero: FC = () => {
  const { connected } = useWallet();
  
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="container mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="text-primary">Automated</span> Trading Bots for Solana
        </h1>
        
        <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-10">
          Boost your trading profits with our high-performance, fully automated trading bots for the Solana blockchain.
        </p>
        
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
          {!connected ? (
            <>
              <div className="md:mr-4">
                <WalletMultiButton className="btn-primary text-lg px-8 py-3" />
              </div>
              <Link href="#bots" className="btn-secondary text-lg px-8 py-3">
                Discover Bots
              </Link>
            </>
          ) : (
            <Link href="/dashboard" className="btn-primary text-lg px-8 py-3">
              Dashboard
            </Link>
          )}
        </div>
        
        <div className="mt-16 grid grid-cols-2 md:flex md:flex-wrap justify-center gap-4 md:gap-8">
          <div className="stat-card col-span-1">
            <p className="text-3xl md:text-4xl font-bold text-primary">+460%</p>
            <p className="text-white/60 text-sm md:text-base">Average Monthly Return</p>
          </div>
          <div className="stat-card col-span-1">
            <p className="text-3xl md:text-4xl font-bold text-primary">+178%</p>
            <p className="text-white/60 text-sm md:text-base">Last 7 Days Performance</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero; 