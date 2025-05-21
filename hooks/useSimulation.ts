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

export const useSimulation = (botId: string) => {
  const [simulation, setSimulation] = useState<SimulationSummary>({
    profitPercentage: 0,
    tradeCount: 0,
    successRate: 0,
    dailyData: [],
    isLoading: true
  });
  
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const loadSimulation = async () => {
      try {
        setError(null);
        
        // Simulationsergebnisse laden
        const result = await getSimulationSummary(botId);
        
        if (isMounted) {
          setSimulation({
            ...result,
            isLoading: false
          });
        }
      } catch (err) {
        console.error('Fehler beim Laden der Simulation:', err);
        if (isMounted) {
          setError('Simulationsdaten konnten nicht geladen werden.');
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
    refreshSimulation: async () => {
      setSimulation(prev => ({ ...prev, isLoading: true }));
      try {
        const result = await getSimulationSummary(botId);
        setSimulation({
          ...result,
          isLoading: false
        });
        setError(null);
      } catch (err) {
        console.error('Fehler beim Aktualisieren der Simulation:', err);
        setError('Simulationsdaten konnten nicht aktualisiert werden.');
        setSimulation(prev => ({ ...prev, isLoading: false }));
      }
    }
  };
}; 