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
  autoRefresh: boolean = false,
  useRealAPI: boolean = true, // STANDARD: Echte Marktdaten!
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
  
  const generateMockData = (botId: string): SimulationSummary => {
    // Generate realistic mock data based on bot type
    const days = 7;
    const dailyData = [];
    let currentValue = 100;
    
    for (let i = 0; i < days; i++) {
      // Simulate daily price changes
      const change = (Math.random() - 0.4) * 5; // Slight positive bias
      currentValue += change;
      currentValue = Math.max(90, Math.min(130, currentValue)); // Keep within reasonable bounds
      
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      
      dailyData.push({
        date: date.toISOString().split('T')[0],
        value: currentValue
      });
    }

    // Calculate metrics
    const profitPercentage = currentValue - 100;
    const tradeCount = Math.floor(Math.random() * 50) + 10;
    const successRate = Math.random() * 30 + 60; // 60-90%

    return {
      profitPercentage,
      tradeCount,
      successRate,
      dailyData,
      isLoading: false
    };
  };

  const loadSimulation = async () => {
    try {
      setError(null);
      setSimulation(prev => ({ ...prev, isLoading: true }));
      
      if (useRealAPI) {
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
        
        setSimulation({
          profitPercentage: result.profitPercentage,
          tradeCount: result.tradeCount,
          successRate: result.successRate,
          dailyData: result.dailyData,
          realTokens: result.tokens,
          isLoading: false
        });
      } else {
        // FALLBACK: Simulierte neue Token-Daten
        console.log(`Loading simulated new token data for bot ${botId}`);
        setDataSource('new-token');
        
        const result = simulateNewTokenTrading(botId, 10);
        setSimulation({
          profitPercentage: result.profitPercentage,
          tradeCount: result.tradeCount,
          successRate: result.successRate,
          dailyData: result.dailyData,
          isLoading: false
        });
      }
    } catch (err) {
      console.error('Error loading simulation:', err);
      if (useRealAPI) {
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

  const refreshSimulation = async () => {
    setError(null);
    
    try {
      if (dataSource === 'real-api') {
        // Try to fetch real data
        const response = await fetch(`/api/simulation/${botId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch real data');
        }
        
        const data = await response.json();
        setSimulation({
          profitPercentage: data.profitPercentage,
          tradeCount: data.tradeCount,
          successRate: data.successRate,
          dailyData: data.dailyData,
          realTokens: data.tokens,
          isLoading: false
        });
      } else {
        // Use mock data
        const mockData = generateMockData(botId);
        setSimulation(mockData);
      }
    } catch (err) {
      console.warn('Failed to fetch real simulation data, falling back to mock:', err);
      setDataSource('new-token');
      const mockData = generateMockData(botId);
      setSimulation(mockData);
      setError('Using simulated data - real API unavailable');
    }
  };

  const toggleDataSource = async (newUseBitquery: boolean) => {
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
  };

  useEffect(() => {
    refreshSimulation();
    
    if (autoRefresh) {
      const interval = setInterval(refreshSimulation, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [botId, dataSource, autoRefresh]);

  return {
    simulation,
    error,
    dataSource,
    toggleDataSource,
    refreshSimulation
  };
}; 