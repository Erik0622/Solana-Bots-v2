'use client';

import { useState, useEffect } from 'react';
import { simulateNewTokenTrading } from '@/lib/simulation/newTokenSimulator';

export interface SimulationSummary {
  profitPercentage: number;
  tradeCount: number;
  successRate: number;
  dailyData: { date: string; value: number }[];
  isLoading: boolean;
}

export const useSimulation = (botId: string, useRealData: boolean = true) => {
  const [simulation, setSimulation] = useState<SimulationSummary>({
    profitPercentage: 0,
    tradeCount: 0,
    successRate: 0,
    dailyData: [],
    isLoading: true
  });
  
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'new-token'>('new-token');
  
  useEffect(() => {
    let isMounted = true;
    
    const loadSimulation = async () => {
      try {
        setError(null);
        setSimulation(prev => ({ ...prev, isLoading: true }));
        
        // NEUE TOKEN SIMULATION - Realistische neue Token nach Raydium Migration
        console.log(`Loading NEW TOKEN simulation data for bot ${botId}`);
        const result = simulateNewTokenTrading(botId, 10); // 10% default risk
        
        if (isMounted) {
          setSimulation({
            profitPercentage: result.profitPercentage,
            tradeCount: result.tradeCount,
            successRate: result.successRate,
            dailyData: result.dailyData,
            isLoading: false
          });
        }
      } catch (err) {
        console.error('Error loading new token simulation:', err);
        if (isMounted) {
          setError('Could not load new token simulation data.');
          setSimulation(prev => ({ ...prev, isLoading: false }));
        }
      }
    };
    
    loadSimulation();
    
    return () => {
      isMounted = false;
    };
  }, [botId]);
  
  return {
    simulation,
    error,
    dataSource,
    // Refresh simulation with new random seed
    refreshSimulation: async () => {
      setSimulation(prev => ({ ...prev, isLoading: true }));
      try {
        const result = simulateNewTokenTrading(botId, 10);
        setSimulation({
          profitPercentage: result.profitPercentage,
          tradeCount: result.tradeCount,
          successRate: result.successRate,
          dailyData: result.dailyData,
          isLoading: false
        });
        setError(null);
      } catch (err) {
        console.error('Error updating new token simulation:', err);
        setError('Could not update new token simulation data.');
        setSimulation(prev => ({ ...prev, isLoading: false }));
      }
    }
  };
}; 