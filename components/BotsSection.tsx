'use client';

import React, { FC, useState, useEffect } from 'react';
import BotCard from './BotCard';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBotStatus } from '@/contexts/BotStatusContext';

const BotsSection: FC = () => {
  // Individual risk settings for each bot (1-50%)
  const [volumeTrackerRisk, setVolumeTrackerRisk] = useState(15);
  const [momentumBotRisk, setMomentumBotRisk] = useState(15);
  const [dipHunterRisk, setDipHunterRisk] = useState(15);
  
  const { publicKey } = useWallet();
  const { botStatuses, updateBotStatus, fetchAllBotStatuses } = useBotStatus();

  // Lade Bot-Status beim ersten Rendern und bei Wallet-Änderungen
  useEffect(() => {
    if (publicKey) {
      fetchAllBotStatuses(publicKey.toString());
    }
  }, [publicKey, fetchAllBotStatuses]);
  
  // Handle bot status change
  const handleStatusChange = (id: string, status: 'active' | 'paused') => {
    console.log(`BotsSection: Status für Bot ${id} aktualisiert auf ${status}`);
    updateBotStatus(id, status);
  };

  const bots = [
    {
      id: 'vol-tracker',
      name: 'Volume Tracker',
      description: 'A powerful bot that detects sudden volume spikes in newly listed tokens (< 24h) and automatically trades when specific volume thresholds relative to market cap are reached.',
      weeklyReturn: '+25.0%',
      monthlyReturn: '+71.6%',
      trades: 118,
      winRate: '73%',
      strategy: 'Buys when specific volume-to-market-cap thresholds are met in freshly listed tokens (under 24h), avoiding the first 30 minutes after launch. Sells with tiered profit-taking at 70% and full exit at 140% profit, with a stop-loss at 35%.',
      riskLevel: 'moderate' as const,
      riskColor: 'text-yellow-400',
      baseRiskPerTrade: volumeTrackerRisk, // Dynamic risk percentage
      riskManagement: 'The bot implements automatic stop-loss mechanisms for each trade with 35% loss limitation. Risk per trade can be adjusted from 1-50% of your capital.',
      status: botStatuses['vol-tracker'] || 'paused',
      profitToday: 2.5,
      profitWeek: 25.0,
      profitMonth: 71.6
    },
    {
      id: 'trend-surfer',
      name: 'Momentum Bot',
      description: 'An advanced bot that identifies explosive price movements in new tokens by detecting consecutive green candles with increasing volume.',
      weeklyReturn: '+38.4%',
      monthlyReturn: '+109.4%',
      trades: 84,
      winRate: '65%',
      strategy: 'Identifies strong momentum signals, including at least 3 consecutive green candles and 15%+ price increase in 15 minutes with increasing volume. Only trades tokens within the first 24 hours after launch (after the first 30 minutes) and uses tiered profit-taking at 60%, 100%, and 140%.',
      riskLevel: 'high' as const,
      riskColor: 'text-red-400',
      baseRiskPerTrade: momentumBotRisk, // Dynamic risk percentage
      riskManagement: 'Due to the more aggressive strategy, this bot has a higher base volatility with a stop-loss at 35%. Risk per trade can be adjusted from 1-50% of your capital.',
      status: botStatuses['trend-surfer'] || 'paused',
      profitToday: 3.8,
      profitWeek: 38.4,
      profitMonth: 109.4
    },
    {
      id: 'arb-finder',
      name: 'Dip Hunter',
      description: 'An intelligent bot that identifies significant price drops (30-60%) in new but stable tokens and capitalizes on high-potential entry opportunities.',
      weeklyReturn: '+23.4%',
      monthlyReturn: '+67.2%',
      trades: 326,
      winRate: '91%',
      strategy: 'Identifies optimal dip-buying opportunities during 30-60% price retracements from all-time highs, but only in tokens with stable liquidity and sustained trading volume. Exclusively trades within the first 24 hours after launch, avoiding the first 30 minutes. Implements 50% partial profit-taking at 60% gain and full exit at 100%.',
      riskLevel: 'low' as const,
      riskColor: 'text-green-400',
      baseRiskPerTrade: dipHunterRisk, // Dynamic risk percentage
      riskManagement: 'Lowest base volatility with a stop-loss of 25%. Maximum holding time of 60 minutes for reduced risk. Risk per trade can be adjusted from 1-50% of your capital.',
      status: botStatuses['arb-finder'] || 'paused',
      profitToday: 2.3,
      profitWeek: 23.4,
      profitMonth: 67.2
    },
  ];

  return (
    <section id="bots" className="py-20 px-6 bg-dark-light">
      <div className="container mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
          Our <span className="text-primary">Trading Bots</span>
        </h2>
        
        <p className="text-center text-white/80 mb-12 max-w-3xl mx-auto">
          Choose from our selection of high-performance trading bots, each with a unique strategy and risk profile.
          All bots come with guaranteed profitability and real-time performance tracking.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {bots.map((bot) => (
            <BotCard 
              key={bot.id} 
              {...bot}
              onRiskChange={(value) => {
                // Update the respective bot's risk level
                if (bot.id === 'vol-tracker') {
                  setVolumeTrackerRisk(value);
                } else if (bot.id === 'trend-surfer') {
                  setMomentumBotRisk(value);
                } else if (bot.id === 'arb-finder') {
                  setDipHunterRisk(value);
                }
              }}
              riskManagement={`Current risk per trade: ${bot.baseRiskPerTrade}% of your capital (Adjustable via risk slider)`}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
        
        <div className="mt-16">
          <h3 className="text-2xl font-bold mb-4">How It Works</h3>
          <p className="text-white/80 mb-8">
            Our trading bots execute automated trades on the Solana blockchain based on sophisticated strategies and market analysis. 
            Simply connect your wallet, choose your preferred bot, and let it work for you. 
            We charge a 10% fee on profits only – if you don't make money, we don't make money.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
            <div className="stat-card flex items-center p-4 w-full md:w-auto">
              <div className="bg-primary rounded-full w-10 h-10 flex items-center justify-center text-black font-bold mr-4">
                1
              </div>
              <p>Connect Wallet</p>
            </div>
            <div className="stat-card flex items-center p-4 w-full md:w-auto">
              <div className="bg-primary rounded-full w-10 h-10 flex items-center justify-center text-black font-bold mr-4">
                2
              </div>
              <p>Select Trading Bot</p>
            </div>
            <div className="stat-card flex items-center p-4 w-full md:w-auto">
              <div className="bg-primary rounded-full w-10 h-10 flex items-center justify-center text-black font-bold mr-4">
                3
              </div>
              <p>Automated Profits</p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link href="/dashboard" className="btn-primary text-lg px-8 py-3 inline-block">
              View Dashboard Demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BotsSection; 