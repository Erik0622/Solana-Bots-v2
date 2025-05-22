'use client';

import React, { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ResponsiveContainer, Tooltip, YAxis, XAxis, Area, AreaChart } from 'recharts';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { getBotStatus, setBotStatus, isBotActive, saveBotRisk, getBotRisk } from '@/lib/botState';
import { useFavoriteBots } from '@/hooks/useFavoriteBots';
import { markBotForTrading } from '@/lib/trading/mockHandler';
import { useSimulation } from '@/hooks/useSimulation';

interface BotCardProps {
  id: string;
  name: string;
  description: string;
  weeklyReturn: string;
  monthlyReturn: string;
  trades: number;
  winRate: string;
  strategy: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'custom';
  riskColor?: string;
  riskManagement?: string;
  baseRiskPerTrade: number;
  onRiskChange?: (value: number) => void;
  status?: 'active' | 'paused';
  profitToday?: number;
  profitWeek?: number;
  profitMonth?: number;
  onStatusChange?: (id: string, status: 'active' | 'paused') => void;
  showFavoriteButton?: boolean;
}

const BotCard: FC<BotCardProps> = ({
  id,
  name,
  description,
  weeklyReturn,
  monthlyReturn,
  trades,
  winRate,
  strategy,
  riskLevel,
  riskColor,
  riskManagement,
  baseRiskPerTrade,
  onRiskChange,
  status = 'paused',
  profitToday = 0,
  profitWeek = 0,
  profitMonth = 0,
  onStatusChange = () => {},
  showFavoriteButton = false
}) => {
  const { connected, publicKey, signTransaction } = useWallet();
  const { isBotFavorite, toggleFavorite } = useFavoriteBots();
  const [performanceTimeframe, setPerformanceTimeframe] = useState<'7d' | '30d'>('7d');
  const [riskPercentage, setRiskPercentage] = useState(getBotRisk(id));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botStatus, setBotStatusState] = useState<'active' | 'paused'>(getBotStatus(id));
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Load simulation data for this bot with real data if available
  const { 
    simulation, 
    error: simulationError, 
    dataSource,
    toggleDataSource
  } = useSimulation(id, true); // true = prefer real data

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Stelle sicher, dass der Status beim ersten Laden gesetzt wird
  useEffect(() => {
    setBotStatusState(getBotStatus(id));
  }, [id]);

  // Prüfe, ob der Bot favorisiert ist
  useEffect(() => {
    if (publicKey) {
      setIsFavorite(isBotFavorite(id));
    }
  }, [id, publicKey, isBotFavorite]);
  
  // Bot-Status-Polling
  useEffect(() => {
    let statusInterval: NodeJS.Timeout | undefined;

    if (connected && publicKey) {
      fetchBotStatus(); // Initialer Check
      statusInterval = setInterval(fetchBotStatus, 10000); // Poll alle 10 Sekunden
    }
    
    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [connected, publicKey]);

  // Funktion zum Abrufen des aktuellen Bot-Status
  const fetchBotStatus = async () => {
    // WICHTIG: Priorität auf den lokalen Status setzen
    // Wenn die API-Verbindung nicht richtig funktioniert, 
    // vertrauen wir unserem lokalen Status mehr
    
    if (!connected || !publicKey) return;
    
    try {
      // Lese den aktuellen Status aus localStorage, bevor wir die API abfragen
      const localStatus = getBotStatus(id);
      
      // Verwende Cache-Busting-Parameter und erzwinge keine Cache-Antworten
      const timestamp = Date.now(); // Cache-Busting-Timestamp
      const response = await fetch(`/api/bots/status?botId=${id}&_=${timestamp}`, {
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      
      if (!response.ok) {
        console.warn(`Konnte Bot-Status für ${id} nicht abrufen: ${response.status}`);
        // Bei API-Fehler lokalen Status beibehalten
        return;
      }
      
      const data = await response.json();
      const apiStatus = data.status as 'active' | 'paused';
      
      // Nur wenn der API-Status 'active' ist und der lokale Status 'paused',
      // ODER wenn der lokale Status noch nicht gesetzt wurde,
      // aktualisiere auf den API-Status
      if ((apiStatus === 'active' && localStatus === 'paused') || !localStatus) {
        console.log(`BotCard: Bot ${id} Status wird von API aktualisiert: ${botStatus} -> ${apiStatus}`);
        
        // Aktualisiere sowohl den lokalen Zustand als auch den globalen Speicher
        setBotStatusState(apiStatus);
        setBotStatus(id, apiStatus);
        
        // Informiere die Elternkomponente
        onStatusChange(id, apiStatus);
      } else {
        console.log(`BotCard: API-Status (${apiStatus}) wird ignoriert, da der lokale Status (${localStatus}) Priorität hat`);
      }
    } catch (fetchError) {
      console.warn(`Fehler beim Abrufen des Bot-Status (${id}):`, fetchError);
    }
  };

  const handleRiskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRisk = Number(e.target.value);
    setRiskPercentage(newRisk);
    // Im localStorage speichern
    saveBotRisk(id, newRisk);
    // Parent-Komponente benachrichtigen
    if (onRiskChange) {
      onRiskChange(newRisk);
    }
  };

  // Generate performance data from simulation
  const getPerformanceData = () => {
    if (!simulation.dailyData || simulation.dailyData.length === 0) {
      return [];
    }

    if (performanceTimeframe === '7d') {
      return simulation.dailyData.map(item => ({
        date: item.date,
        profit: ((item.value - 100) / 100) * riskPercentage / 10,
        value: item.value
      }));
    } else {
      const sevenDayData = simulation.dailyData;
      const result = [];
      
      for (const item of sevenDayData) {
        result.push({
          date: item.date,
          profit: ((item.value - 100) / 100) * riskPercentage / 10,
          value: item.value
        });
      }
      
      if (sevenDayData.length > 0) {
        const now = new Date();
        const lastDate = new Date(sevenDayData[sevenDayData.length - 1].date);
        
        for (let i = 1; i <= 23; i++) {
          const nextDate = new Date(lastDate);
          nextDate.setDate(nextDate.getDate() + i);
          
          const sourceIndex = i % sevenDayData.length;
          const sourceData = sevenDayData[sourceIndex];
          const projectedValue = ((sourceData.value - 100) / 100) * riskPercentage / 10;
          
          result.push({
            date: nextDate.toISOString().split('T')[0],
            profit: projectedValue,
            value: sourceData.value
          });
        }
      }
      
      return result;
    }
  };
  
  const performanceData = getPerformanceData();
  const totalProfit = performanceData.reduce((sum, day) => sum + day.profit, 0).toFixed(2);
  const averageProfit = performanceData.length > 0 
    ? (performanceData.reduce((sum, day) => sum + day.profit, 0) / performanceData.length).toFixed(2)
    : '0.00';

  const getRiskGradient = (risk: string) => {
    switch (risk) {
      case 'low': return 'from-green-400 to-emerald-500';
      case 'moderate': return 'from-yellow-400 to-orange-500';
      case 'high': return 'from-red-400 to-rose-500';
      default: return 'from-primary to-secondary';
    }
  };

  // Calculate realistic win rate based on simulation data
  const calculateWinRate = () => {
    if (!simulation || simulation.isLoading || !simulation.tradeCount) {
      // Parse the original winRate prop if no simulation data
      const rate = parseFloat(winRate.replace('%', ''));
      return isNaN(rate) ? 65 : rate; // Default to 65% if parsing fails
    }
    
    // Calculate win rate based on successful trades vs total trades
    // Assuming 60-80% win rate range for realistic trading
    const baseWinRate = Math.max(55, Math.min(85, simulation.successRate));
    return baseWinRate;
  };

  const actualWinRate = calculateWinRate();

  const activateBot = async () => {
    if (!connected || !publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/bot/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: id,
          walletAddress: publicKey.toString(),
          riskPercentage: riskPercentage,
          action: botStatus === 'active' ? 'deactivate' : 'activate',
          botType: getBotTypeFromName(name)
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to prepare bot activation/deactivation' }));
        throw new Error(errorData.error || 'Failed to prepare bot activation/deactivation');
      }
      const { transaction: serializedTransaction } = await response.json();
      const transaction = Transaction.from(Buffer.from(serializedTransaction, 'base64'));
      const signedTransaction = await signTransaction(transaction);
      const confirmResponse = await fetch('/api/bot/confirm-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: id,
          signedTransaction: signedTransaction.serialize().toString('base64'),
          action: botStatus === 'active' ? 'deactivate' : 'activate'
        }),
      });
      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json().catch(() => ({ error: 'Failed to confirm bot activation/deactivation' }));
        throw new Error(errorData.error || 'Failed to confirm bot activation/deactivation');
      }
      const confirmationResult = await confirmResponse.json();
      if (confirmationResult.success && confirmationResult.status) {
        const newStatus = confirmationResult.status === 'inactive' ? 'paused' : confirmationResult.status as 'active' | 'paused';
        console.log(`BotCard: Bot ${id} Status geändert via activateBot: ${botStatus} -> ${newStatus}`);
        
        // Aktualisiere sowohl den lokalen Zustand als auch den globalen Speicher
        setBotStatusState(newStatus);
        setBotStatus(id, newStatus);
        
        // Markiere den Bot für echte Trades, wenn er aktiviert wurde
        markBotForTrading(id, newStatus === 'active');
        
        // Sende benutzerdefiniertes Event für andere Komponenten
        const event = new CustomEvent(newStatus === 'active' ? 'bot-activated' : 'bot-deactivated', {
          detail: { botId: id }
        });
        document.dispatchEvent(event);
        
        // Informiere die Elternkomponente
        onStatusChange(id, newStatus);
      } else {
        console.warn('Bot-Aktivierungs-Bestätigung lieferte keinen klaren Status. Starte fetchBotStatus manuell.');
        setTimeout(fetchBotStatus, 500); // Verzögertes Polling, um die Statusaktualisierung abzuwarten
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during bot activation/deactivation.';
      setError(errorMessage);
      console.error('Bot activation error in BotCard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getBotTypeFromName = (botName: string): string => {
    const nameLower = botName.toLowerCase();
    if (nameLower.includes('volume') || nameLower.includes('tracker')) return 'volume-tracker';
    if (nameLower.includes('trend') || nameLower.includes('surfer') || nameLower.includes('momentum')) return 'trend-surfer';
    if (nameLower.includes('dip') || nameLower.includes('hunter') || nameLower.includes('arb')) return 'dip-hunter';
    return 'volume-tracker';
  };

  return (
    <div 
      className={`group relative bot-card p-4 sm:p-6 h-full transition-all duration-700 ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'
      } ${isHovered ? 'glow-effect' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Indicator - Moved higher to avoid overlap */}
      <div className="absolute top-2 right-4 flex items-center gap-2 z-20">
        <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
          botStatus === 'active' ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-gray-500'
        }`}></div>
        <span className={`text-xs font-medium ${
          botStatus === 'active' ? 'text-green-400' : 'text-gray-400'
        }`}>
          {botStatus === 'active' ? 'ACTIVE' : 'PAUSED'}
        </span>
      </div>

      {/* Favorite Button */}
      {showFavoriteButton && connected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(id);
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-4 left-4 z-10 text-lg sm:text-xl hover:scale-125 transition-all duration-300"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? (
            <span className="text-yellow-400 drop-shadow-lg">★</span>
          ) : (
            <span className="text-white/40 hover:text-yellow-400">☆</span>
          )}
        </button>
      )}
      
      {/* Header */}
      <div className="flex flex-col mb-4 sm:mb-6">
        <div className="flex items-start justify-between mb-2 gap-2">
          <h3 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent pr-2">
            {name}
          </h3>
          <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRiskGradient(riskLevel)} text-black flex-shrink-0`}>
            {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
          </div>
        </div>
        <p className="text-white/70 text-xs sm:text-sm leading-relaxed line-clamp-2 hover:line-clamp-none transition-all duration-300">
          {description}
        </p>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="stat-card group-hover:scale-105 transition-all duration-300 p-2 sm:p-4">
          <p className="text-xs text-white/50 font-medium">Weekly Return</p>
          <p className="text-sm sm:text-xl font-bold text-white">
            {simulation && !simulation.isLoading 
              ? ((simulation.profitPercentage / 100) * riskPercentage).toFixed(2) + '%'
              : weeklyReturn}
          </p>
        </div>
        <div className="stat-card group-hover:scale-105 transition-all duration-300 p-2 sm:p-4">
          <p className="text-xs text-white/50 font-medium">Monthly Return</p>
          <p className="text-sm sm:text-xl font-bold text-white">
            {simulation && !simulation.isLoading 
              ? ((simulation.profitPercentage / 100) * riskPercentage * 4.3).toFixed(2) + '%'
              : monthlyReturn}
          </p>
        </div>
        <div className="stat-card group-hover:scale-105 transition-all duration-300 p-2 sm:p-4">
          <p className="text-xs text-white/50 font-medium">Trades (30d)</p>
          <p className="text-sm sm:text-xl font-bold text-white">
            {simulation && !simulation.isLoading 
              ? Math.round(simulation.tradeCount * 4.3)
              : trades}
          </p>
        </div>
        <div className="stat-card group-hover:scale-105 transition-all duration-300 p-2 sm:p-4">
          <p className="text-xs text-white/50 font-medium">Win Rate</p>
          <p className="text-sm sm:text-xl font-bold text-white">
            {actualWinRate.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Performance Chart with Simulation Data */}
      <div className="chart-container mb-4 sm:mb-6 group-hover:border-primary/50 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm sm:text-lg font-bold text-white">7-Day Performance</h4>
          <div className="flex bg-white/5 rounded-lg p-1">
            <button 
              className={`px-2 sm:px-3 py-1 rounded text-xs font-medium transition-all ${
                performanceTimeframe === '7d' 
                  ? 'bg-primary text-black shadow-lg' 
                  : 'text-white/60 hover:text-white'
              }`}
              onClick={() => setPerformanceTimeframe('7d')}
            >
              7D
            </button>
            <button 
              className={`px-2 sm:px-3 py-1 rounded text-xs font-medium transition-all ${
                performanceTimeframe === '30d' 
                  ? 'bg-primary text-black shadow-lg' 
                  : 'text-white/60 hover:text-white'
              }`}
              onClick={() => setPerformanceTimeframe('30d')}
            >
              30D
            </button>
          </div>
        </div>
        
        <div className="h-24 sm:h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14F195" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#14F195" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={false}
              />
              <YAxis 
                domain={['dataMin', 'dataMax']} 
                axisLine={false}
                tickLine={false}
                tick={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(20, 241, 149, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Return']}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString(); 
                }}
              />
              <Area 
                type="monotone" 
                dataKey="profit"
                stroke="#14F195"
                strokeWidth={2}
                fill={`url(#gradient-${id})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex justify-between mt-2 sm:mt-3 text-xs">
          <div>
            <span className="text-white/50">Total: </span>
            <span className="text-primary font-bold">+{totalProfit}%</span>
          </div>
          <div>
            <span className="text-white/50">Avg: </span>
            <span className="text-primary font-bold">+{averageProfit}%</span>
          </div>
        </div>
        
        {/* Data source indicator */}
        <div className="flex justify-center mt-2">
          <div className={`px-2 py-1 rounded text-xs ${
            dataSource === 'real' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
            {dataSource === 'real' ? '📊 Real Data' : '🔬 Simulated Data'}
          </div>
        </div>
      </div>

      {/* Strategy Section */}
      <div className="mb-4 sm:mb-6">
        <h4 className="text-sm sm:text-lg font-bold mb-2 text-white">Strategy</h4>
        <p className="text-white/70 text-xs sm:text-sm line-clamp-2 hover:line-clamp-none transition-all duration-300">
          {strategy}
        </p>
      </div>

      {/* Risk Management */}
      <div className="mb-4 sm:mb-6">
        <h4 className="text-sm sm:text-lg font-bold mb-3 text-white">Risk Management</h4>
        <p className="text-white/70 text-xs sm:text-sm mb-3 sm:mb-4">{riskManagement}</p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>Conservative (1%)</span>
            <span>Aggressive (50%)</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="1"
              max="50"
              value={riskPercentage}
              onChange={handleRiskChange}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #14F195 0%, #14F195 ${(riskPercentage / 50) * 100}%, rgba(255,255,255,0.1) ${(riskPercentage / 50) * 100}%, rgba(255,255,255,0.1) 100%)`
              }}
            />
          </div>
          <div className="flex justify-center mt-2 sm:mt-3">
            <span className="text-xs sm:text-sm bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-bold">
              Current: {riskPercentage}% per trade
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto">
        {connected ? (
          <div className="flex gap-2 sm:gap-3">
            <button 
              className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                isLoading 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : botStatus === 'active' 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:scale-105 hover:shadow-lg hover:shadow-yellow-400/25' 
                    : 'bg-gradient-to-r from-primary to-secondary text-black hover:scale-105 hover:shadow-lg hover:shadow-primary/25'
              }`}
              onClick={activateBot}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="loading-spinner"></div>
                  Processing...
                </span>
              ) : (
                botStatus === 'active' ? 'Pause Bot' : 'Start Bot'
              )}
            </button>
            <button className="px-3 sm:px-4 py-2 sm:py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-primary/50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all duration-300 hover:scale-105">
              ⚙️
            </button>
          </div>
        ) : (
          <WalletMultiButton className="!w-full !py-2 sm:!py-3 !justify-center !bg-gradient-to-r !from-primary !to-secondary !text-black !font-bold !rounded-xl !transition-all !duration-300 hover:!scale-105 !text-xs sm:!text-sm" />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs sm:text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default BotCard;