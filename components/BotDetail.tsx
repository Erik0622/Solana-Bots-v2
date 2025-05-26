'use client';

import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';

interface BotDetailProps {
  id: string;
}

interface PerformanceData {
  date: string;
  value: number;
}

const BotDetail: FC<BotDetailProps> = ({ id }) => {
  const router = useRouter();
  const { connected } = useWallet();
  const [isActivated, setIsActivated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Hier würden wir normalerweise die Bot-Daten von einer API abrufen
  const bot = getBotData(id);
  
  // Beispieldaten für die Performance-Grafik
  const performanceData = [
    { date: '01.04', value: 100 },
    { date: '05.04', value: 105 },
    { date: '10.04', value: 102 },
    { date: '15.04', value: 108 },
    { date: '20.04', value: 112 },
    { date: '25.04', value: 115 },
    { date: '30.04', value: 118 },
    { date: '05.05', value: 124 },
    { date: '10.05', value: 127 },
  ];

  const handleActivateBot = useCallback(() => {
    if (!connected) return;
    
    setIsLoading(true);
    
    // Hier würde die tatsächliche Aktivierungslogik stehen,
    // Verbindung zum Solana-Programm usw.
    setTimeout(() => {
      setIsActivated(true);
      setIsLoading(false);
    }, 1500);
  }, [connected]);

  const handleDeactivateBot = useCallback(() => {
    setIsLoading(true);
    
    // Hier würde die tatsächliche Deaktivierungslogik stehen
    setTimeout(() => {
      setIsActivated(false);
      setIsLoading(false);
    }, 1500);
  }, []);

  if (!bot) {
    return (
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Bot nicht gefunden</h1>
          <button 
            onClick={() => router.push('/')}
            className="btn-primary mt-4"
          >
            Zurück zur Startseite
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="container mx-auto">
        <div className="bg-dark-light p-8 rounded-xl shadow-lg border border-dark-lighter hover:border-primary transition-all duration-300">
          <div className="flex flex-col md:flex-row justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">{bot.name}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${bot.riskColor} bg-dark-lighter backdrop-blur-sm`}>
                  {bot.riskLevel.charAt(0).toUpperCase() + bot.riskLevel.slice(1)} Risk
                </span>
              </div>
              <p className="text-white/80 max-w-2xl">{bot.description}</p>
            </div>
            
            <div className="mt-6 md:mt-0">
              {connected ? (
                isActivated ? (
                  <button 
                    className="btn-secondary hover:scale-105 transition-transform duration-300" 
                    onClick={handleDeactivateBot}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deactivating...' : 'Deactivate Bot'}
                  </button>
                ) : (
                  <button 
                    className="btn-primary hover:scale-105 transition-transform duration-300 bg-gradient-to-r from-primary to-primary/70" 
                    onClick={handleActivateBot}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Activating...' : 'Activate Bot'}
                  </button>
                )
              ) : (
                <WalletMultiButton className="hover:scale-105 transition-transform duration-300" />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="stat-card bg-dark-lighter p-6 rounded-lg backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              <p className="text-sm text-white/60">Monthly Return</p>
              <p className="text-2xl font-bold text-primary">{bot.monthlyReturn}</p>
            </div>
            <div className="stat-card bg-dark-lighter p-6 rounded-lg backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              <p className="text-sm text-white/60">Yearly Return</p>
              <p className="text-2xl font-bold text-primary">{bot.yearlyReturn}</p>
            </div>
            <div className="stat-card bg-dark-lighter p-6 rounded-lg backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              <p className="text-sm text-white/60">Trades (30d)</p>
              <p className="text-2xl font-bold text-white">{bot.trades}</p>
            </div>
            <div className="stat-card bg-dark-lighter p-6 rounded-lg backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              <p className="text-sm text-white/60">Win Rate</p>
              <p className="text-2xl font-bold text-white">{bot.winRate}</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">30-Day Performance</h2>
          <div className="w-full h-80 mb-10 bg-dark-lighter p-4 rounded-lg backdrop-blur-sm">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#333' }} 
                  labelStyle={{ color: '#FFF' }}
                />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#14F195" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-dark-lighter p-6 rounded-lg backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-3">Strategy</h3>
              <p className="text-white/80">{bot.strategy}</p>
            </div>
            <div className="bg-dark-lighter p-6 rounded-lg backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-3">Risk Management</h3>
              <p className="text-white/80">{bot.riskManagement}</p>
            </div>
          </div>
          
          <div className="bg-dark-lighter p-6 rounded-lg backdrop-blur-sm">
            <h3 className="text-xl font-bold mb-3">Fee Structure</h3>
            <p className="text-white/80">
              For each successful trade, 1.5% of the profits are forwarded as a fee to the development team.
              This fee helps us continuously improve and optimize the bots.
            </p>
            <p className="text-white/60 mt-3 text-sm">
              Developer Wallet: <span className="text-primary">Aa7LPoDswnoy511YgJYAxo652vHn4SRBz6zeaAzUDzaF</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// Hilfsfunktion zum Abrufen der Bot-Daten (in einer realen Anwendung würde dies von einer API kommen)
function getBotData(id: string) {
  const bots = [
    {
      id: 'vol-tracker',
      name: 'Volume Tracker',
      description: 'A powerful bot that tracks volume changes and automatically trades when specific volume thresholds are reached within a 5-minute window.',
      monthlyReturn: '+15.8%',
      yearlyReturn: '+287%',
      trades: 118,
      winRate: '73%',
      strategy: 'Buys when specific volume thresholds are reached in a 5-minute timeframe and sells when predetermined volume levels are hit in subsequent 5-minute windows. Implements sophisticated stop-loss mechanisms for risk management.',
      riskLevel: 'moderate',
      riskColor: 'text-yellow-400',
      riskManagement: 'The bot implements automatic stop-loss mechanisms for each trade, limited to 2% of invested capital. Additionally, only a maximum of 20% of your total capital is deployed per trade to minimize overall risk.',
    },
    {
      id: 'trend-surfer',
      name: 'Trend Surfer',
      description: 'An advanced bot that identifies and rides trends while securing profits and limiting losses through dynamic position management.',
      monthlyReturn: '+24.7%',
      yearlyReturn: '+437%',
      trades: 84,
      winRate: '65%',
      strategy: 'Identifies trends using multiple indicators and enters positions once a strong trend is confirmed. Uses trailing stops to secure profits as the market moves.',
      riskLevel: 'high',
      riskColor: 'text-red-400',
      riskManagement: 'Due to this bot\'s more aggressive strategy, trailing stops are employed to protect profits, and higher risk per trade (up to 4%) is possible. It is recommended to allocate a maximum of 40% of your trading capital to this bot.',
    },
    {
      id: 'arb-finder',
      name: 'Arbitrage Finder',
      description: 'An intelligent bot that identifies and exploits price differences between various DEXes on Solana to generate low-risk profits.',
      monthlyReturn: '+12.4%',
      yearlyReturn: '+195%',
      trades: 326,
      winRate: '91%',
      strategy: 'Continuously monitors prices of the same assets across different decentralized exchanges and executes lightning-fast trades to profit from price discrepancies. Low risk due to minimal market exposure.',
      riskLevel: 'low',
      riskColor: 'text-green-400',
      riskManagement: 'Due to the arbitrage nature of this bot, the risk is inherently lower. Each trade has a predetermined and guaranteed outcome, provided transactions are executed quickly enough. Maximum capital risk per trade is limited to 1%.',
    },
  ];
  
  return bots.find(bot => bot.id === id);
}

export default BotDetail;