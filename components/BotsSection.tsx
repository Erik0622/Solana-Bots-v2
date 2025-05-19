'use client';

import React, { FC, useState, useEffect } from 'react';
import BotCard from './BotCard';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { getBotStatus, setBotStatus, getAllBotStatus, BotId, getBotRisk, getBotRiskLevels } from '@/lib/botState';

// Funktion zur Normalisierung der Bot-ID analog zu BotStatusContext
function getBotId(id: string): string {
  const idMapping: Record<string, string> = {
    'vol-tracker': 'volume-tracker',
    'volume-tracker': 'volume-tracker',
    'trend-surfer': 'trend-surfer',
    'momentum-bot': 'trend-surfer',
    'arb-finder': 'dip-hunter',
    'dip-hunter': 'dip-hunter'
  };
  return idMapping[id.toLowerCase()] || id;
}

const BotsSection: FC = () => {
  // Individual risk settings for each bot (1-50%)
  const [volumeTrackerRisk, setVolumeTrackerRisk] = useState(getBotRisk('volume-tracker'));
  const [momentumBotRisk, setMomentumBotRisk] = useState(getBotRisk('trend-surfer'));
  const [dipHunterRisk, setDipHunterRisk] = useState(getBotRisk('dip-hunter'));
  
  // Lokalen Zustand für Bot-Status verwenden
  const [botStatuses, setBotStatuses] = useState(getAllBotStatus());
  
  const { publicKey } = useWallet();
  const { connected } = useWallet();

  // Regelmäßig den Status aus localStorage abrufen
  useEffect(() => {
    // Initial laden
    setBotStatuses(getAllBotStatus());
    
    // Risiko aus localStorage laden
    setVolumeTrackerRisk(getBotRisk('volume-tracker'));
    setMomentumBotRisk(getBotRisk('trend-surfer'));
    setDipHunterRisk(getBotRisk('dip-hunter'));
    
    // Regelmäßig überprüfen (alle 2 Sekunden)
    const statusInterval = setInterval(() => {
      const freshStatuses = getAllBotStatus();
      console.log('BotsSection: Aktualisiere Status aus localStorage:', freshStatuses);
      setBotStatuses(freshStatuses);
      
      // Auch Risiko-Einstellungen aktualisieren
      setVolumeTrackerRisk(getBotRisk('volume-tracker'));
      setMomentumBotRisk(getBotRisk('trend-surfer'));
      setDipHunterRisk(getBotRisk('dip-hunter'));
    }, 2000);
    
    return () => clearInterval(statusInterval);
  }, []);
  
  // Handle bot status change
  const handleStatusChange = (id: string, status: 'active' | 'paused') => {
    console.log(`BotsSection: Status für Bot ${id} aktualisiert auf ${status}`);
    // Speichere im localStorage
    setBotStatus(id, status);
    
    // Aktualisiere den lokalen Zustand durch frisches Laden aus localStorage
    setBotStatuses(getAllBotStatus());
  };

  const bots = [
    {
      id: 'volume-tracker', // Konsistente ID-Benennung
      name: 'Volume Tracker',
      description: 'A powerful bot that detects sudden volume spikes in newly listed tokens (< 24h) and automatically trades when specific volume thresholds relative to market cap are reached.',
      weeklyReturn: '+50.0%',
      monthlyReturn: '+143.2%',
      trades: 118,
      winRate: '73%',
      strategy: 'Buys when specific volume-to-market-cap thresholds are met in freshly listed tokens (under 24h), avoiding the first 30 minutes after launch. Sells with tiered profit-taking at 70% and full exit at 140% profit, with a stop-loss at 35%.',
      riskLevel: 'moderate' as const,
      riskColor: 'text-yellow-400',
      baseRiskPerTrade: volumeTrackerRisk, // Dynamic risk percentage
      riskManagement: 'The bot implements automatic stop-loss mechanisms for each trade with 35% loss limitation. Risk per trade can be adjusted from 1-50% of your capital.',
      status: botStatuses['volume-tracker'],
      profitToday: 5.0,
      profitWeek: 50.0,
      profitMonth: 143.2
    },
    {
      id: 'trend-surfer', // Konsistente ID-Benennung
      name: 'Momentum Bot',
      description: 'An advanced bot that identifies explosive price movements in new tokens by detecting consecutive green candles with increasing volume.',
      weeklyReturn: '+76.8%',
      monthlyReturn: '+218.8%',
      trades: 84,
      winRate: '65%',
      strategy: 'Identifies strong momentum signals, including at least 3 consecutive green candles and 15%+ price increase in 15 minutes with increasing volume. Only trades tokens within the first 24 hours after launch (after the first 30 minutes) and uses tiered profit-taking at 60%, 100%, and 140%.',
      riskLevel: 'high' as const,
      riskColor: 'text-red-400',
      baseRiskPerTrade: momentumBotRisk, // Dynamic risk percentage
      riskManagement: 'Due to the more aggressive strategy, this bot has a higher base volatility with a stop-loss at 35%. Risk per trade can be adjusted from 1-50% of your capital.',
      status: botStatuses['trend-surfer'],
      profitToday: 7.6,
      profitWeek: 76.8,
      profitMonth: 218.8
    },
    {
      id: 'dip-hunter', // Konsistente ID-Benennung
      name: 'Dip Hunter',
      description: 'An intelligent bot that identifies significant price drops (30-60%) in new but stable tokens and capitalizes on high-potential entry opportunities.',
      weeklyReturn: '+46.8%',
      monthlyReturn: '+134.4%',
      trades: 326,
      winRate: '91%',
      strategy: 'Identifies optimal dip-buying opportunities during 30-60% price retracements from all-time highs, but only in tokens with stable liquidity and sustained trading volume. Exclusively trades within the first 24 hours after launch, avoiding the first 30 minutes. Implements 50% partial profit-taking at 60% gain and full exit at 100%.',
      riskLevel: 'low' as const,
      riskColor: 'text-green-400',
      baseRiskPerTrade: dipHunterRisk, // Dynamic risk percentage
      riskManagement: 'Lowest base volatility with a stop-loss of 25%. Maximum holding time of 60 minutes for reduced risk. Risk per trade can be adjusted from 1-50% of your capital.',
      status: botStatuses['dip-hunter'],
      profitToday: 4.6,
      profitWeek: 46.8,
      profitMonth: 134.4
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
                if (bot.id === 'volume-tracker') {
                  setVolumeTrackerRisk(value);
                } else if (bot.id === 'trend-surfer') {
                  setMomentumBotRisk(value);
                } else if (bot.id === 'dip-hunter') {
                  setDipHunterRisk(value);
                }
              }}
              riskManagement={`Current risk per trade: ${bot.baseRiskPerTrade}% of your capital (Adjustable via risk slider)`}
              onStatusChange={handleStatusChange}
              showFavoriteButton={connected}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BotsSection; 