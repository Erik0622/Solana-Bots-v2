'use client';

import React, { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';

interface BotTransaction {
  timestamp: number;
  type: 'buy' | 'sell';
  price: number;
  size: number;
  profit?: number;
}

interface Position {
  id: string;
  botType: string;
  entryDate: string;
  entryPrice: number;
  currentPrice: number;
  size: number;
  profit: number;
  profitPercentage: number;
  transactions: BotTransaction[];
}

interface PerformanceData {
  date: string;
  profit: number;
  cumulative: number;
}

interface ConnectedBot {
  id: string;
  name: string;
  status: 'active' | 'paused';
  trades: number;
  profitToday: number;
  profitWeek: number;
  profitMonth: number;
}

const Dashboard: FC = () => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [activeTab, setActiveTab] = useState<'positions' | 'performance' | 'bots'>('positions');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('30d');
  const [positions, setPositions] = useState<Position[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [connectedBots, setConnectedBots] = useState<ConnectedBot[]>([]);
  const [totalProfit, setTotalProfit] = useState({ today: 0, week: 0, month: 0, all: 0 });
  const [devFees, setDevFees] = useState({ total: 0, month: 0 });
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Simulate fetching data when wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      // Echte API-Aufrufe statt Mock-Daten
      fetchPositions();
      fetchPerformanceData();
      fetchConnectedBots();
    }
  }, [connected, publicKey, timeframe]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && publicKey) {
        try {
          const balance = await connection.getBalance(publicKey);
          setWalletBalance(balance / LAMPORTS_PER_SOL);
        } catch (error) {
          console.error('Error fetching balance:', error);
          // Setze einen Standardwert, falls der Abruf fehlschlägt
          setWalletBalance(0);
        }
      } else {
        setWalletBalance(0);
      }
    };

    fetchBalance();
    const intervalId = setInterval(fetchBalance, 10000); // Update every 10 seconds

    return () => clearInterval(intervalId);
  }, [connected, publicKey, connection]);

  const fetchPositions = async () => {
    if (!connected || !publicKey) return;

    try {
      // Here you would typically fetch from your backend API
      const response = await fetch(`/api/positions?wallet=${publicKey.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch positions');
      
      const positions = await response.json();
      setPositions(positions);
      
      // Calculate real profits
      const totalProfit = positions.reduce((sum: number, pos: Position) => sum + pos.profit, 0);
      const devFee = totalProfit * 0.1; // 10% of profits
    
      setTotalProfit(prev => ({ ...prev, all: totalProfit }));
      setDevFees(prev => ({ ...prev, total: devFee }));
    } catch (error) {
      console.error('Error fetching positions:', error);
      // Keep the previous positions if there's an error
    }
  };

  const fetchPerformanceData = async () => {
    if (!connected || !publicKey) return;

    try {
      // Fetch real performance data from your backend
      const response = await fetch(
        `/api/performance?wallet=${publicKey.toString()}&timeframe=${timeframe}`
      );
      if (!response.ok) throw new Error('Failed to fetch performance data');
      
      const data = await response.json();
      
      // Wenn keine Daten vorhanden sind, zeige leere Daten statt simulierter Daten
      if (data.performanceData && data.performanceData.length > 0) {
        setPerformanceData(data.performanceData);
        setTotalProfit(data.totalProfit);
        setDevFees(data.devFees);
      } else {
        // Leere Daten anzeigen
        setPerformanceData([]);
        setTotalProfit({ today: 0, week: 0, month: 0, all: 0 });
        setDevFees({ total: 0, month: 0 });
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      // Leere Daten anzeigen statt vorherige Daten beizubehalten
      setPerformanceData([]);
      setTotalProfit({ today: 0, week: 0, month: 0, all: 0 });
      setDevFees({ total: 0, month: 0 });
    }
  };

  const fetchConnectedBots = async () => {
    if (!connected || !publicKey) return;

    try {
      // Fetch real bot data from your backend
      const response = await fetch(`/api/bots?wallet=${publicKey.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch bots');
      
      const bots = await response.json();
      setConnectedBots(bots);
    } catch (error) {
      console.error('Error fetching bots:', error);
      // Keep the previous bot data if there's an error
    }
  };

  const toggleBotStatus = async (botId: string) => {
    if (!connected || !publicKey) return;
    
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Bestimme die aktuelle Aktion basierend auf dem Bot-Status
      const currentBot = connectedBots.find(b => b.id === botId);
      const action = currentBot?.status === 'active' ? 'pause' : 'activate';

      // Erstelle den API-Endpunkt basierend auf der Aktion
      const endpoint = action === 'activate' ? '/api/bot/activate' : '/api/bot/deactivate';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId,
          walletAddress: publicKey.toString(),
          riskPercentage: 5, // Standardwert, könnte aus einer Einstellung kommen
          action,
          botType: currentBot?.name.toLowerCase() || 'volume-tracker' // Fallback auf einen Standardwert
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle bot status');
      }
      
      const data = await response.json();
      
      // Hier würden wir normalerweise die signierte Transaktion zum Benutzer senden
      // und nach Bestätigung den Status in der UI aktualisieren
      
      // Bestätige die Transaktion über eine zweite API
      const confirmResponse = await fetch('/api/bot/confirm-activation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId,
          signedTransaction: data.transaction,
          action
        }),
      });
      
      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.error || 'Failed to confirm bot activation');
      }
      
      // Update local state after successful API call
      setConnectedBots(bots => 
        bots.map(bot => 
          bot.id === botId ? 
            {...bot, status: action === 'activate' ? 'active' : 'paused'} : 
            bot
        )
      );
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error toggling bot status:', error);
      // Show specific error to user
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update bot status. Please try again.');
      setIsLoading(false);
    }
  };

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
    <section className="py-16 px-6 bg-dark-light min-h-screen">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold mb-8">Trading Dashboard</h2>
        
        {/* Show error message if exists */}
        {errorMessage && (
          <div className="bg-red-900/50 text-white p-4 rounded-lg mb-6">
            <p>{errorMessage}</p>
            <button 
              className="text-xs underline mt-2" 
              onClick={() => setErrorMessage(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
          <div className="stat-card bg-dark-lighter p-4 sm:p-6 rounded-lg backdrop-blur-sm hover:border-primary hover:border border-transparent transition-all">
            <p className="text-white/60 mb-1 text-sm sm:text-base">Dev Fees (10% of profits)</p>
            <p className="text-xl sm:text-3xl font-bold text-white">{devFees.month}%</p>
            <p className="text-xs text-white/40">Total paid: {devFees.total}% of returns</p>
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
        
        {/* Tab content */}
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
                {positions.map(position => (
                  <tr key={position.id} className="border-b border-dark-lighter hover:bg-dark transition-colors">
                    <td className="p-3 sm:p-4">{position.botType}</td>
                    <td className="p-3 sm:p-4">{position.entryDate}</td>
                    <td className="p-3 sm:p-4">${position.entryPrice.toFixed(2)}</td>
                    <td className="p-3 sm:p-4">${position.currentPrice.toFixed(2)}</td>
                    <td className="p-3 sm:p-4">{position.size}</td>
                    <td className="p-3 sm:p-4">
                      <span className="text-primary">+${position.profit.toFixed(2)}</span>
                      <span className="text-primary ml-2">({position.profitPercentage}%)</span>
                    </td>
                    <td className="p-3 sm:p-4">
                      <button className="btn-secondary-sm text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">Close Position</button>
                    </td>
                  </tr>
                ))}
                {positions.length === 0 && (
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
          <>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Performance History</h3>
              <div className="flex gap-2">
                <button 
                  className={`px-3 py-1 rounded-full text-xs ${timeframe === '7d' ? 'bg-primary text-black' : 'bg-dark-lighter text-white/60'}`}
                  onClick={() => setTimeframe('7d')}
                >
                  7 Days
                </button>
                <button 
                  className={`px-3 py-1 rounded-full text-xs ${timeframe === '30d' ? 'bg-primary text-black' : 'bg-dark-lighter text-white/60'}`}
                  onClick={() => setTimeframe('30d')}
                >
                  30 Days
                </button>
                <button 
                  className={`px-3 py-1 rounded-full text-xs ${timeframe === 'all' ? 'bg-primary text-black' : 'bg-dark-lighter text-white/60'}`}
                  onClick={() => setTimeframe('all')}
                >
                  All Time
                </button>
              </div>
            </div>
            
            {performanceData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div className="bg-dark-lighter p-6 rounded-lg backdrop-blur-sm" style={{height: '400px'}}>
                    <h4 className="text-lg font-bold mb-4">Daily Returns</h4>
                    <ResponsiveContainer width="100%" height="90%">
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis 
                          dataKey="date" 
                          tick={{fill: '#999'}} 
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                        />
                        <YAxis 
                          tick={{fill: '#999'}}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          contentStyle={{backgroundColor: '#1a1a1a', border: 'none'}}
                          formatter={(value: number) => [`${value}%`, 'Daily Return']}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="profit" 
                          name="Daily Return" 
                          stroke="#10b981" 
                          strokeWidth={2} 
                          dot={false}
                          activeDot={{r: 6}}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-dark-lighter p-6 rounded-lg backdrop-blur-sm" style={{height: '400px'}}>
                    <h4 className="text-lg font-bold mb-4">Cumulative Return</h4>
                    <ResponsiveContainer width="100%" height="90%">
                      <AreaChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis 
                          dataKey="date" 
                          tick={{fill: '#999'}} 
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                        />
                        <YAxis 
                          tick={{fill: '#999'}}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          contentStyle={{backgroundColor: '#1a1a1a', border: 'none'}}
                          formatter={(value: number) => [`${value}%`, 'Total Return']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="cumulative" 
                          name="Cumulative Return" 
                          stroke="#10b981"
                          fill="url(#colorGradient)"
                          strokeWidth={2}
                        />
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-dark-lighter p-6 rounded-lg backdrop-blur-sm hover:border-primary hover:border border-transparent transition-all">
                    <h4 className="text-lg font-bold mb-2">Total Trades</h4>
                    <p className="text-3xl font-bold text-white">{positions.length}</p>
                  </div>
                  <div className="bg-dark-lighter p-6 rounded-lg backdrop-blur-sm hover:border-primary hover:border border-transparent transition-all">
                    <h4 className="text-lg font-bold mb-2">Win Rate</h4>
                    <p className="text-3xl font-bold text-primary">
                      {positions.length > 0 
                        ? `${((positions.filter(p => p.profit > 0).length / positions.length) * 100).toFixed(1)}%` 
                        : '0%'}
                    </p>
                  </div>
                  <div className="bg-dark-lighter p-6 rounded-lg backdrop-blur-sm hover:border-primary hover:border border-transparent transition-all">
                    <h4 className="text-lg font-bold mb-2">Average Return per Trade</h4>
                    <p className="text-3xl font-bold text-primary">
                      {positions.length > 0 
                        ? `${(positions.reduce((sum: number, pos: Position) => sum + pos.profitPercentage, 0) / positions.length).toFixed(2)}%` 
                        : '0%'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-dark-lighter rounded-lg">
                <p className="text-white/60 mb-4">Keine Performance-Daten verfügbar</p>
                <p className="text-white/60">Aktivieren Sie einen Bot, um mit dem Trading zu beginnen und Performance-Daten zu sammeln.</p>
              </div>
            )}
          </>
        )}
        
        {activeTab === 'bots' && (
          <div>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="bg-dark-lighter">
                    <th className="p-3 sm:p-4 rounded-tl-lg">Bot Name</th>
                    <th className="p-3 sm:p-4">Status</th>
                    <th className="p-3 sm:p-4">Today's Profit</th>
                    <th className="p-3 sm:p-4">Weekly Profit</th>
                    <th className="p-3 sm:p-4">Monthly Profit</th>
                    <th className="p-3 sm:p-4">Total Trades</th>
                    <th className="p-3 sm:p-4 rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {connectedBots.map(bot => (
                    <tr key={bot.id} className="border-b border-dark-lighter hover:bg-dark transition-colors">
                      <td className="p-3 sm:p-4">{bot.name}</td>
                      <td className="p-3 sm:p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${bot.status === 'active' ? 'bg-green-900/20 text-green-500' : 'bg-yellow-900/20 text-yellow-500'}`}>
                          {bot.status === 'active' ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4"><span className="text-primary">+{bot.profitToday}%</span></td>
                      <td className="p-3 sm:p-4"><span className="text-primary">+{bot.profitWeek}%</span></td>
                      <td className="p-3 sm:p-4"><span className="text-primary">+{bot.profitMonth}%</span></td>
                      <td className="p-3 sm:p-4">{bot.trades}</td>
                      <td className="p-3 sm:p-4">
                        <button
                          className={`px-3 py-1 rounded-md text-sm ${
                            bot.status === 'active' 
                              ? 'bg-yellow-600 hover:bg-yellow-700' 
                              : 'bg-green-600 hover:bg-green-700'
                          } transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => toggleBotStatus(bot.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Processing...' : bot.status === 'active' ? 'Pause' : 'Resume'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {connectedBots.length === 0 && (
              <div className="text-center py-8">
                <p className="text-white/60">No bots connected yet. Go to the Launchpad to set up your first bot.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Dashboard; 