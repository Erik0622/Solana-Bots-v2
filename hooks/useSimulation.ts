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
        
        // Simulationsergebnisse laden
        console.log(`Loading ${dataSource === 'real' ? 'real' : 'simulated'} data for bot ${botId}`);
        const result = await getSimulationSummary(botId, dataSource === 'real');
        
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
          
          // Bei Fehler mit echten Daten auf simulierte Daten zurückfallen
          if (dataSource === 'real') {
            console.warn('Fallback auf simulierte Daten nach Fehler mit echten Daten');
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
    // Wechsel zwischen echten und simulierten Daten ermöglichen
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
        console.error('Fehler beim Aktualisieren der Simulation:', err);
        setError('Simulationsdaten konnten nicht aktualisiert werden.');
        setSimulation(prev => ({ ...prev, isLoading: false }));
        
        // Bei Fehler mit echten Daten auf simulierte Daten zurückfallen
        if (dataSource === 'real') {
          console.warn('Fallback auf simulierte Daten nach Fehler mit Refresh');
          setDataSource('simulated');
        }
      }
    }
  };
}; 