'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCustomBots } from '@/hooks/useCustomBots';
import { predefinedBots } from '@/config/bots';
import { getBotStatus, getAllBotStatus } from '@/lib/botState';
import Header from '@/components/Header';

// Typdefinitionen
interface Position {
  id: string;
  botType: string;
  entryDate: string;
  entryPrice: number;
  currentPrice: number;
  size: number;
  profit: number;
  profitPercentage: number;
}

const Dashboard = () => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { customBots } = useCustomBots();
  const [activeTab, setActiveTab] = useState<'positions' | 'performance' | 'bots'>('bots');
  const [positions, setPositions] = useState<Position[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [totalProfit, setTotalProfit] = useState({ today: 0, week: 0, month: 0, all: 0 });
  const [botStatuses, setBotStatuses] = useState(getAllBotStatus());
  const [isLoading, setIsLoading] = useState(false);

  // Lade Wallet Balance
  useEffect(() => {
    if (connected && publicKey && connection) {
      const fetchBalance = async () => {
        try {
          const balanceLamports = await connection.getBalance(publicKey);
          const balanceSol = balanceLamports / LAMPORTS_PER_SOL;
          setWalletBalance(balanceSol);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setWalletBalance(0);
        }
      };

      fetchBalance();
      const balanceIntervalId = setInterval(fetchBalance, 10000);
      return () => clearInterval(balanceIntervalId);
    }
  }, [connected, publicKey, connection]);

  // Kombiniere vordefinierte und benutzerdefinierte Bots
  const allBots = [...predefinedBots, ...customBots].map(bot => ({
    ...bot,
    status: getBotStatus(bot.id) || 'paused',
    // Setze alle Profit-Werte auf 0
    profitToday: 0,
    profitWeek: 0,
    profitMonth: 0
  }));

  if (!connected) {
    return (
      <div className="min-h-screen bg-dark-light">
        <Header />
        <div className="py-20 px-6 min-h-[60vh] mt-16">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Trading Dashboard</h2>
            <p className="text-white/80 mb-8">Connect your wallet to access your trading dashboard.</p>
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
          <h2 className="text-3xl font-bold mb-8">Trading Dashboard</h2>
          
          {/* Statistik-Karten */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="stat-card bg-dark-lighter p-4 sm:p-6 rounded-lg backdrop-blur-sm hover:border-primary hover:border border-transparent transition-all">
              <p className="text-white/60 mb-1 text-sm sm:text-base">Wallet Balance</p>
              <p className="text-xl sm:text-3xl font-bold text-primary">{walletBalance.toFixed(4)} SOL</p>
            </div>
            <div className="stat-card bg-dark-lighter p-4 sm:p-6 rounded-lg backdrop-blur-sm hover:border-primary hover:border border-transparent transition-all">
              <p className="text-white/60 mb-1 text-sm sm:text-base">Today's Return</p>
              <p className="text-xl sm:text-3xl font-bold text-primary">+{totalProfit.today}%</p>
            </div>
            <div className="stat-card bg-dark-lighter p-4 sm:p-6 rounded-lg backdrop-blur-sm hover:border-primary hover:border border-transparent transition-all">
              <p className="text-white/60 mb-1 text-sm sm:text-base">7-Day Return</p>
              <p className="text-xl sm:text-3xl font-bold text-primary">+{totalProfit.week}%</p>
            </div>
            <div className="stat-card bg-dark-lighter p-4 sm:p-6 rounded-lg backdrop-blur-sm hover:border-primary hover:border border-transparent transition-all">
              <p className="text-white/60 mb-1 text-sm sm:text-base">30-Day Return</p>
              <p className="text-xl sm:text-3xl font-bold text-primary">+{totalProfit.month}%</p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-dark-lighter mb-6">
            <button 
              className={`px-3 sm:px-6 py-3 whitespace-nowrap ${activeTab === 'positions' ? 'text-primary border-b-2 border-primary' : 'text-white/60'}`}
              onClick={() => setActiveTab('positions')}
            >
              Open Positions
            </button>
            <button 
              className={`px-3 sm:px-6 py-3 whitespace-nowrap ${activeTab === 'performance' ? 'text-primary border-b-2 border-primary' : 'text-white/60'}`}
              onClick={() => setActiveTab('performance')}
            >
              Performance
            </button>
            <button 
              className={`px-3 sm:px-6 py-3 whitespace-nowrap ${activeTab === 'bots' ? 'text-primary border-b-2 border-primary' : 'text-white/60'}`}
              onClick={() => setActiveTab('bots')}
            >
              Connected Bots
            </button>
          </div>
          
          {/* Inhalt basierend auf aktivem Tab */}
          {activeTab === 'positions' && (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="bg-dark-lighter">
                    <th className="p-3 sm:p-4 rounded-tl-lg">Bot</th>
                    <th className="p-3 sm:p-4">Entry Date</th>
                    <th className="p-3 sm:p-4">Entry Price</th>
                    <th className="p-3 sm:p-4">Current Price</th>
                    <th className="p-3 sm:p-4">Size</th>
                    <th className="p-3 sm:p-4">Profit</th>
                    <th className="p-3 sm:p-4 rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-white/60">
                      No open positions currently. Activate a bot to start trading.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
          {activeTab === 'performance' && (
            <div className="text-center py-12 bg-dark-lighter rounded-lg">
              <p className="text-white/60 mb-4">Performance charts will be displayed here</p>
              <p className="text-white/60">This view will be implemented later.</p>
            </div>
          )}
          
          {activeTab === 'bots' && (
            <div>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-dark-lighter">
                      <th className="p-3 sm:p-4 rounded-tl-lg">Bot Name</th>
                      <th className="p-3 sm:p-4">Status</th>
                      <th className="p-3 sm:p-4">Risk Level</th>
                      <th className="p-3 sm:p-4">Today's Profit</th>
                      <th className="p-3 sm:p-4">Weekly Return</th>
                      <th className="p-3 sm:p-4">Monthly Return</th>
                      <th className="p-3 sm:p-4">Total Trades</th>
                      <th className="p-3 sm:p-4 rounded-tr-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBots.length > 0 ? (
                      allBots.map(bot => (
                        <tr key={bot.id} className="border-b border-dark-lighter hover:bg-dark transition-colors">
                          <td className="p-3 sm:p-4">{bot.name}</td>
                          <td className="p-3 sm:p-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${bot.status === 'active' ? 'bg-green-900/20 text-green-500' : 'bg-yellow-900/20 text-yellow-500'}`}>
                              {bot.status === 'active' ? 'Active' : 'Paused'}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4">
                            <span className={bot.riskColor || 'text-white'}>
                              {bot.riskLevel.charAt(0).toUpperCase() + bot.riskLevel.slice(1)}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4">
                            <span className="text-primary">+$0</span>
                          </td>
                          <td className="p-3 sm:p-4">
                            <span className="text-primary">0%</span>
                          </td>
                          <td className="p-3 sm:p-4">
                            <span className="text-primary">0%</span>
                          </td>
                          <td className="p-3 sm:p-4">0</td>
                          <td className="p-3 sm:p-4">
                            <button
                              className={`px-3 py-1 rounded-md text-sm ${
                                bot.status === 'active' 
                                  ? 'bg-yellow-600 hover:bg-yellow-700' 
                                  : 'bg-green-600 hover:bg-green-700'
                              } transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={isLoading}
                            >
                              {isLoading ? 'Processing...' : bot.status === 'active' ? 'Pause' : 'Start'}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-white/60">
                          No bots connected yet. Visit the Launchpad to create your first bot.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 