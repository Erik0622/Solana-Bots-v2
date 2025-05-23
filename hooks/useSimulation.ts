'use client';

import { useState, useEffect } from 'react';
import { simulateNewTokenTrading } from '@/lib/simulation/newTokenSimulator';
import { simulateRealTokenTrading, RealTokenData } from '@/lib/simulation/realTokenSimulator';

export interface SimulationSummary {
  profitPercentage: number;
  tradeCount: number;
  successRate: number;
  dailyData: { date: string; value: number }[];
  isLoading: boolean;
  realTokens?: RealTokenData[]; // Für echte Token-Daten
}

export const useSimulation = (
  botId: string, 
  useRealData: boolean = false, // Deprecated parameter
  enableRealAPI: boolean = true // STANDARD: Echte Marktdaten!
) => {
  const [simulation, setSimulation] = useState<SimulationSummary>({
    profitPercentage: 0,
    tradeCount: 0,
    successRate: 0,
    dailyData: [],
    isLoading: true
  });
  
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'new-token' | 'real-api'>('new-token');
  
  useEffect(() => {
    let isMounted = true;
    
    const loadSimulation = async () => {
      try {
        setError(null);
        setSimulation(prev => ({ ...prev, isLoading: true }));
        
        if (enableRealAPI) {
          // ECHTE API-DATEN - Birdeye, DexScreener, Pump.fun
          console.log(`Loading REAL API simulation data for bot ${botId}`);
          setDataSource('real-api');
          
          const result = await simulateRealTokenTrading(botId, 10); // 10 echte Token
          
          if (isMounted) {
            setSimulation({
              profitPercentage: result.profitPercentage,
              tradeCount: result.tradeCount,
              successRate: result.successRate,
              dailyData: result.dailyData,
              realTokens: result.tokens,
              isLoading: false
            });
          }
        } else {
          // KÜNSTLICHE SIMULATION - Wie bisher
          console.log(`Loading ARTIFICIAL simulation data for bot ${botId}`);
          setDataSource('new-token');
          
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
        }
      } catch (err) {
        console.error('Error loading simulation:', err);
        if (isMounted) {
          const errorMessage = enableRealAPI 
            ? 'Could not load real API simulation data. Falling back to artificial data.'
            : 'Could not load simulation data.';
          
          setError(errorMessage);
          
          // Fallback zu künstlichen Daten wenn echte APIs fehlschlagen
          if (enableRealAPI) {
            try {
              const fallbackResult = simulateNewTokenTrading(botId, 10);
              setSimulation({
                profitPercentage: fallbackResult.profitPercentage,
                tradeCount: fallbackResult.tradeCount,
                successRate: fallbackResult.successRate,
                dailyData: fallbackResult.dailyData,
                isLoading: false
              });
              setDataSource('new-token');
            } catch (fallbackErr) {
              setSimulation(prev => ({ ...prev, isLoading: false }));
            }
          } else {
            setSimulation(prev => ({ ...prev, isLoading: false }));
          }
        }
      }
    };
    
    loadSimulation();
    
    return () => {
      isMounted = false;
    };
  }, [botId, enableRealAPI]);
  
  return {
    simulation,
    error,
    dataSource,
    // Refresh simulation with new random seed
    refreshSimulation: async () => {
      setSimulation(prev => ({ ...prev, isLoading: true }));
      try {
        if (enableRealAPI) {
          const result = await simulateRealTokenTrading(botId, 10);
          setSimulation({
            profitPercentage: result.profitPercentage,
            tradeCount: result.tradeCount,
            successRate: result.successRate,
            dailyData: result.dailyData,
            realTokens: result.tokens,
            isLoading: false
          });
        } else {
          const result = simulateNewTokenTrading(botId, 10);
          setSimulation({
            profitPercentage: result.profitPercentage,
            tradeCount: result.tradeCount,
            successRate: result.successRate,
            dailyData: result.dailyData,
            isLoading: false
          });
        }
        setError(null);
      } catch (err) {
        console.error('Error updating simulation:', err);
        setError('Could not update simulation data.');
        setSimulation(prev => ({ ...prev, isLoading: false }));
      }
    },
    
    // Neue Funktion: Zwischen echter und künstlicher Simulation umschalten
    toggleDataSource: async () => {
      const newEnableRealAPI = !enableRealAPI;
      setSimulation(prev => ({ ...prev, isLoading: true }));
      
      try {
        if (newEnableRealAPI) {
          const result = await simulateRealTokenTrading(botId, 10);
          setSimulation({
            profitPercentage: result.profitPercentage,
            tradeCount: result.tradeCount,
            successRate: result.successRate,
            dailyData: result.dailyData,
            realTokens: result.tokens,
            isLoading: false
          });
          setDataSource('real-api');
        } else {
          const result = simulateNewTokenTrading(botId, 10);
          setSimulation({
            profitPercentage: result.profitPercentage,
            tradeCount: result.tradeCount,
            successRate: result.successRate,
            dailyData: result.dailyData,
            isLoading: false
          });
          setDataSource('new-token');
        }
        setError(null);
        return newEnableRealAPI;
      } catch (err) {
        console.error('Error toggling data source:', err);
        setError('Could not switch data source.');
        setSimulation(prev => ({ ...prev, isLoading: false }));
        return enableRealAPI; // Zurück zum vorherigen Zustand
      }
    }
  };
}; 