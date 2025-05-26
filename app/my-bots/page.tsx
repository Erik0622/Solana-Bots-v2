'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import BotCard from '@/components/BotCard';
import Header from '@/components/Header';
import { useCustomBots } from '@/hooks/useCustomBots';
import { useFavoriteBots } from '@/hooks/useFavoriteBots';
import { predefinedBots } from '@/config/bots';

const MyBotsPage = () => {
  const { connected, publicKey } = useWallet();
  const { customBots } = useCustomBots();
  const { favoriteBots } = useFavoriteBots();
  const [activeTab, setActiveTab] = useState<'created' | 'favorites'>('created');

  // Filter favorisierte Bots aus den vordefinierten Bots
  const favoriteBotsFromPredefined = predefinedBots.filter(bot => 
    favoriteBots.includes(bot.id)
  );

  if (!connected) {
    return (
      <div className="min-h-screen bg-dark-light">
        <Header />
        <div className="py-20 px-6 min-h-[60vh] mt-16">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">My Bots</h2>
            <p className="text-white/80 mb-8">Connect your wallet to access your bots.</p>
            <WalletMultiButton className="btn-primary px-8 py-3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-light">
      <Header />
      <div className="py-16 px-6 min-h-screen mt-16">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-8">My Bots</h2>
          
          <div className="flex overflow-x-auto border-b border-dark-lighter mb-6">
            <button
              className={`px-3 sm:px-6 py-3 whitespace-nowrap ${activeTab === 'created' ? 'text-primary border-b-2 border-primary' : 'text-white/60'}`}
              onClick={() => setActiveTab('created')}
            >
              Created Bots
            </button>
            <button
              className={`px-3 sm:px-6 py-3 whitespace-nowrap ${activeTab === 'favorites' ? 'text-primary border-b-2 border-primary' : 'text-white/60'}`}
              onClick={() => setActiveTab('favorites')}
            >
              Favorite Bots
            </button>
          </div>
          
          {activeTab === 'created' && (
            <>
              {customBots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {customBots.map(bot => (
                    <BotCard key={bot.id} {...bot} showFavoriteButton={true} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-dark-lighter rounded-lg">
                  <p className="text-white/60 mb-4">You haven't created any bots yet.</p>
                  <p className="text-white/60">Visit the Launchpad to create your first custom bot.</p>
                </div>
              )}
            </>
          )}
          
          {activeTab === 'favorites' && (
            <>
              {favoriteBotsFromPredefined.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteBotsFromPredefined.map(bot => (
                    <BotCard key={bot.id} {...bot} showFavoriteButton={true} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-dark-lighter rounded-lg">
                  <p className="text-white/60 mb-4">You haven't favorited any bots yet.</p>
                  <p className="text-white/60">Add bots to your favorites from the home page.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBotsPage; 