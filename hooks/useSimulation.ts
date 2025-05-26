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
  enableRealAPI: boolean = true, // STANDARD: Echte Marktdaten!
  useBitquery: boolean = true // NEU: Bitquery für beste Memecoin-Daten
) => {
  const [simulation, setSimulation] = useState<SimulationSummary>({
    profitPercentage: 0,
    tradeCount: 0,
    successRate: 0,
    dailyData: [],
    isLoading: true
  });
  
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'new-token' | 'real-api' | 'bitquery-api'>('new-token');
  
  useEffect(() => {
    let isMounted = true;
    
    const loadSimulation = async () => {
      try {
        setError(null);
        setSimulation(prev => ({ ...prev, isLoading: true }));
        
        if (enableRealAPI) {
          // ECHTE API-DATEN - Über Backend API-Route
          console.log(`Loading ${useBitquery ? 'BITQUERY' : 'LEGACY'} API simulation data for bot ${botId}`);
          setDataSource(useBitquery ? 'bitquery-api' : 'real-api');
          
          const response = await fetch('/api/simulation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              botType: botId,
              tokenCount: 10,
              useBitquery
            })
          });
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }
          
          const result = await response.json();
          
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
          // FALLBACK: Simulierte neue Token-Daten
          console.log(`Loading simulated new token data for bot ${botId}`);
          setDataSource('new-token');
          
          const result = simulateNewTokenTrading(botId, 10);
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
          setError(err instanceof Error ? err.message : 'Could not load simulation data.');
          // Bei Fehler: Fallback zu lokaler Simulation
          const fallbackResult = simulateNewTokenTrading(botId, 10);
          setSimulation({
            profitPercentage: fallbackResult.profitPercentage,
            tradeCount: fallbackResult.tradeCount,
            successRate: fallbackResult.successRate,
            dailyData: fallbackResult.dailyData,
            isLoading: false
          });
          setDataSource('new-token');
        }
      }
    };
    
    loadSimulation();
    
    return () => {
      isMounted = false;
    };
  }, [botId, enableRealAPI, useBitquery]); // useBitquery als Dependency hinzugefügt
  
  return {
    simulation,
    error,
    dataSource,
    // Refresh simulation with new random seed
    refreshSimulation: async () => {
      setSimulation(prev => ({ ...prev, isLoading: true }));
      try {
        if (enableRealAPI) {
          console.log(`Refreshing ${useBitquery ? 'BITQUERY' : 'LEGACY'} simulation for bot ${botId}`);
          
          const response = await fetch('/api/simulation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              botType: botId,
              tokenCount: 10,
              useBitquery
            })
          });
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }
          
          const result = await response.json();
          
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
    
    // Neue Funktion: Umschalten zwischen APIs
    toggleDataSource: async (newUseBitquery: boolean) => {
      setSimulation(prev => ({ ...prev, isLoading: true }));
      setError(null);
      
      try {
        console.log(`Switching to ${newUseBitquery ? 'BITQUERY' : 'LEGACY'} API for bot ${botId}`);
        
        const response = await fetch('/api/simulation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            botType: botId,
            tokenCount: 10,
            useBitquery: newUseBitquery
          })
        });
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        setSimulation({
          profitPercentage: result.profitPercentage,
          tradeCount: result.tradeCount,
          successRate: result.successRate,
          dailyData: result.dailyData,
          realTokens: result.tokens,
          isLoading: false
        });
        
        setDataSource(newUseBitquery ? 'bitquery-api' : 'real-api');
        
      } catch (err) {
        console.error('Error switching data source:', err);
        setError('Could not switch data source.');
        setSimulation(prev => ({ ...prev, isLoading: false }));
      }
    }
  };
}; 