'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCustomBots } from '@/hooks/useCustomBots';
import { predefinedBots } from '@/config/bots';
import { getBotStatus, getAllBotStatus } from '@/lib/botState';

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

  // Lade Positionen
  useEffect(() => {
    if (connected && publicKey) {
      const fetchPositions = async () => {
        try {
          // In einer echten App würde hier ein API-Call stehen
          // Momentan simulieren wir die Daten
          const mockPositions: Position[] = [
            {
              id: '1',
              botType: 'Volume Tracker',
              entryDate: '2024-05-15',
              entryPrice: 0.00045,
              currentPrice: 0.00052,
              size: 10000,
              profit: 0.7,
              profitPercentage: 15.5
            },
            {
              id: '2',
              botType: 'Dip Hunter',
              entryDate: '2024-05-18',
              entryPrice: 0.00120,
              currentPrice: 0.00145,
              size: 5000,
              profit: 1.25,
              profitPercentage: 20.8
            }
          ];
          
          setPositions(mockPositions);
          
          // Berechne Gesamtgewinn
          const calculatedTotalProfit = mockPositions.reduce((sum, pos) => sum + pos.profit, 0);
          setTotalProfit(prev => ({ ...prev, all: calculatedTotalProfit, today: 1.2, week: 4.5, month: 15.3 }));
        } catch (error) {
          console.error('Error fetching positions:', error);
        }
      };

      fetchPositions();
    }
  }, [connected, publicKey]);

  // Kombiniere vordefinierte und benutzerdefinierte Bots
  const allBots = [...predefinedBots, ...customBots].map(bot => ({
    ...bot,
    status: getBotStatus(bot.id) || 'paused'
  }));

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

  return (
    <div className="py-16 px-6 bg-dark-light min-h-screen">
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
                {positions.length > 0 ? (
                  positions.map(position => (
                    <tr key={position.id} className="border-b border-dark-lighter hover:bg-dark transition-colors">
                      <td className="p-3 sm:p-4">{position.botType}</td>
                      <td className="p-3 sm:p-4">{position.entryDate}</td>
                      <td className="p-3 sm:p-4">${position.entryPrice.toFixed(5)}</td>
                      <td className="p-3 sm:p-4">${position.currentPrice.toFixed(5)}</td>
                      <td className="p-3 sm:p-4">{position.size}</td>
                      <td className="p-3 sm:p-4">
                        <span className="text-primary">+{position.profit.toFixed(2)} SOL</span>
                        <span className="text-primary ml-2">({position.profitPercentage.toFixed(1)}%)</span>
                      </td>
                      <td className="p-3 sm:p-4">
                        <button className="btn-secondary-sm text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">Close Position</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-white/60">
                      No open positions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'performance' && (
          <div className="text-center py-12 bg-dark-lighter rounded-lg">
            <p className="text-white/60 mb-4">Performance-Diagramme werden hier angezeigt</p>
            <p className="text-white/60">Diese Ansicht wird später implementiert.</p>
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
                          <span className="text-primary">+${bot.profitToday || 0}</span>
                        </td>
                        <td className="p-3 sm:p-4">
                          <span className="text-primary">{bot.weeklyReturn || '0%'}</span>
                        </td>
                        <td className="p-3 sm:p-4">
                          <span className="text-primary">{bot.monthlyReturn || '0%'}</span>
                        </td>
                        <td className="p-3 sm:p-4">{bot.trades}</td>
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
  );
};

export default Dashboard; 