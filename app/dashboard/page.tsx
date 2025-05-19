'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import BotCard from '@/components/BotCard';
import { useCustomBots } from '@/hooks/useCustomBots';
import { predefinedBots } from '@/config/bots';

const Dashboard = () => {
  const { connected } = useWallet();
  const { customBots } = useCustomBots();

  if (!connected) {
    return (
      <div className="py-20 px-6 bg-dark-light min-h-[60vh]">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Trading Dashboard</h2>
          <p className="text-white/80 mb-8">Connect your wallet to access your trading dashboard.</p>
          <WalletMultiButton className="btn-primary px-8 py-3" />
        </div>
      </div>
    );
  }

  // Kombiniere vordefinierte und benutzerdefinierte Bots
  const allBots = [...predefinedBots, ...customBots];

  return (
    <div className="py-16 px-6 bg-dark-light min-h-screen">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Connected Bots</h2>
          <div className="flex items-center gap-4">
            <WalletMultiButton className="btn-primary px-8 py-3" />
          </div>
        </div>

        {allBots.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/60">No bots connected yet. Visit the Launchpad to create your first bot.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allBots.map(bot => (
              <BotCard key={bot.id} {...bot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 