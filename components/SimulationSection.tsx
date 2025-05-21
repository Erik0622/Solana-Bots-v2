import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis, XAxis } from 'recharts';
import { SimulationSummary } from '@/hooks/useSimulation';

interface SimulationSectionProps {
  simulation: SimulationSummary;
  error: string | null;
}

const SimulationSection: React.FC<SimulationSectionProps> = ({ simulation, error }) => {
  const { profitPercentage, tradeCount, successRate, dailyData, isLoading } = simulation;
  
  if (isLoading) {
    return (
      <div className="mb-4 sm:mb-6 bg-dark-lighter p-2 sm:p-4 rounded-lg">
        <h4 className="text-sm sm:text-lg font-semibold mb-2">7-Tage Simulation (100$ Startkapital)</h4>
        <div className="flex justify-center items-center h-40">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-6 w-24 bg-dark-light rounded mb-2"></div>
            <div className="h-4 w-32 bg-dark-light rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mb-4 sm:mb-6 bg-dark-lighter p-2 sm:p-4 rounded-lg">
        <h4 className="text-sm sm:text-lg font-semibold mb-2">7-Tage Simulation (100$ Startkapital)</h4>
        <div className="text-center text-red-400 p-4">
          <p>Fehler beim Laden der Simulation. Bitte versuchen Sie es später erneut.</p>
        </div>
      </div>
    );
  }
  
  // Daten für Chart aufbereiten
  const chartData = dailyData.map(item => ({
    date: item.date,
    value: item.value
  }));
  
  // Farbe für den Chart bestimmen
  const chartColor = profitPercentage >= 0 ? '#10b981' : '#ef4444';
  
  // Berechne min und max für Y-Achse
  const minValue = Math.min(...chartData.map(d => d.value));
  const maxValue = Math.max(...chartData.map(d => d.value));
  const yDomain = [Math.max(0, minValue * 0.95), maxValue * 1.05];
  
  return (
    <div className="mb-4 sm:mb-6 bg-dark-lighter p-2 sm:p-4 rounded-lg">
      <h4 className="text-sm sm:text-lg font-semibold mb-2">7-Tage Simulation (100$ Startkapital)</h4>
      
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="bg-dark p-2 rounded">
          <p className="text-xs text-white/60">Gewinn/Verlust</p>
          <p className={`text-sm sm:text-lg font-semibold ${profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
          </p>
        </div>
        <div className="bg-dark p-2 rounded">
          <p className="text-xs text-white/60">Trades</p>
          <p className="text-sm sm:text-lg font-semibold">{tradeCount}</p>
        </div>
        <div className="bg-dark p-2 rounded">
          <p className="text-xs text-white/60">Erfolgsrate</p>
          <p className="text-sm sm:text-lg font-semibold">{successRate.toFixed(0)}%</p>
        </div>
      </div>
      
      <div className="h-32 sm:h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#999', fontSize: 10 }}
              tickFormatter={(value) => value.slice(5)} // Nur MM-DD anzeigen
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={yDomain}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              width={35}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#999', fontSize: 10 }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', border: 'none' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Portfolio']}
              labelFormatter={(label) => `Datum: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="value"
              stroke={chartColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-2 text-xs text-center text-white/60">
        <p>Alle Trades mit 1% Transaktionsgebühr</p>
      </div>
    </div>
  );
};

export default SimulationSection; 