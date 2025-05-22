'use client';

import { useState, useEffect } from 'react';
import { getSimulationSummary } from '@/lib/simulation/botSimulator';

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
  const [dataSource, setDataSource] = useState<'real' | 'simulated'>(useRealData ? 'real' : 'simulated');
  
  useEffect(() => {
    let isMounted = true;
    
    const loadSimulation = async () => {
      try {
        setError(null);
        setSimulation(prev => ({ ...prev, isLoading: true }));
        
        // Load simulation results
        console.log(`Loading ${dataSource === 'real' ? 'real' : 'simulated'} data for bot ${botId}`);
        const result = await getSimulationSummary(botId, dataSource === 'real');
        
        if (isMounted) {
          setSimulation({
            ...result,
            isLoading: false
          });
        }
      } catch (err) {
        console.error('Error loading simulation:', err);
        if (isMounted) {
          setError('Could not load simulation data.');
          setSimulation(prev => ({ ...prev, isLoading: false }));
          
          // Fallback to simulated data on error with real data
          if (dataSource === 'real') {
            console.warn('Fallback to simulated data after error with real data');
            setDataSource('simulated');
          }
        }
      }
    };
    
    loadSimulation();
    
    return () => {
      isMounted = false;
    };
  }, [botId, dataSource]);
  
  return {
    simulation,
    error,
    dataSource,
    // Allow switching between real and simulated data
    toggleDataSource: () => {
      setDataSource(prev => prev === 'real' ? 'simulated' : 'real');
    },
    setDataSource: (source: 'real' | 'simulated') => {
      setDataSource(source);
    },
    refreshSimulation: async () => {
      setSimulation(prev => ({ ...prev, isLoading: true }));
      try {
        const result = await getSimulationSummary(botId, dataSource === 'real');
        setSimulation({
          ...result,
          isLoading: false
        });
        setError(null);
      } catch (err) {
        console.error('Error updating simulation:', err);
        setError('Could not update simulation data.');
        setSimulation(prev => ({ ...prev, isLoading: false }));
        
        // Fallback to simulated data on error with real data
        if (dataSource === 'real') {
          console.warn('Fallback to simulated data after refresh error');
          setDataSource('simulated');
        }
      }
    }
  };
}; 