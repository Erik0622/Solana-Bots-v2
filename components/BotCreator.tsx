'use client';

import React, { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import BotCard from './BotCard';

interface BotCreatorProps {}

const BotCreator: FC<BotCreatorProps> = () => {
  const { connected } = useWallet();
  const [title, setTitle] = useState('');
  const [strategy, setStrategy] = useState('');
  const [riskReward, setRiskReward] = useState('');
  const [tokenAge, setTokenAge] = useState('');
  const [minMarketCap, setMinMarketCap] = useState('');
  const [maxMarketCap, setMaxMarketCap] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedBot, setGeneratedBot] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !strategy || !riskReward || !tokenAge || !minMarketCap || !maxMarketCap) {
      setError('Bitte füllen Sie alle Felder aus.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer AIzaSyA049UbRanBwu8pBXiF-dybU4J_GyeNBCM`
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Erstelle einen Trading-Bot-Code für Solana basierend auf folgender Strategie:
              Titel: ${title}
              Strategie: ${strategy}
              Risk/Reward: ${riskReward}
              Token-Alter: ${tokenAge}
              Min. Market Cap: ${minMarketCap}
              Max. Market Cap: ${maxMarketCap}
              
              Bitte generiere den vollständigen TypeScript-Code für den Bot.`
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error('Fehler bei der API-Anfrage');
      }

      const data = await response.json();
      const generatedCode = data.candidates[0].content.parts[0].text;

      // Erstelle ein Bot-Objekt für die Vorschau
      setGeneratedBot({
        id: `custom-${Date.now()}`,
        name: title,
        description: strategy,
        weeklyReturn: '0%',
        monthlyReturn: '0%',
        trades: 0,
        winRate: '0%',
        strategy: strategy,
        riskLevel: 'moderate',
        riskColor: 'text-yellow-400',
        baseRiskPerTrade: 15,
        riskManagement: `Risk/Reward: ${riskReward}, Token-Alter: ${tokenAge}, Market Cap: ${minMarketCap}-${maxMarketCap}`,
        status: 'paused',
        profitToday: 0,
        profitWeek: 0,
        profitMonth: 0
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!connected) {
    return (
      <div className="py-20 px-6 bg-dark-light min-h-[60vh]">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Bot Launchpad</h2>
          <p className="text-white/80 mb-8">Verbinden Sie Ihre Wallet, um Ihren eigenen Trading-Bot zu erstellen.</p>
          <WalletMultiButton className="btn-primary px-8 py-3" />
        </div>
      </div>
    );
  }

  return (
    <section className="py-16 px-6 bg-dark-light min-h-screen">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold mb-8">Bot Launchpad</h2>
        
        {error && (
          <div className="bg-red-900/50 text-red-300 p-4 rounded-lg mb-6 border border-red-700">
            <p className="font-semibold">Fehler:</p>
            <p>{error}</p>
            <button 
              className="text-xs underline mt-2 text-red-300 hover:text-red-100"
              onClick={() => setError(null)}
            >
              Schließen
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-dark-lighter p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-6">Bot-Konfiguration</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-white/80 mb-2">Bot-Titel</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                  placeholder="z.B. Volume Spike Hunter"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-2">Trading-Strategie</label>
                <textarea
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none h-32"
                  placeholder="Beschreiben Sie Ihre Trading-Strategie im Detail..."
                />
              </div>

              <div>
                <label className="block text-white/80 mb-2">Risk/Reward Ratio</label>
                <input
                  type="text"
                  value={riskReward}
                  onChange={(e) => setRiskReward(e.target.value)}
                  className="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                  placeholder="z.B. 1:3"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-2">Token-Alter</label>
                <select
                  value={tokenAge}
                  onChange={(e) => setTokenAge(e.target.value)}
                  className="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                >
                  <option value="">Bitte wählen...</option>
                  <option value="under-24h">Unter 24 Stunden</option>
                  <option value="under-12h">Unter 12 Stunden</option>
                  <option value="under-6h">Unter 6 Stunden</option>
                  <option value="under-1h">Unter 1 Stunde</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 mb-2">Min. Market Cap</label>
                  <input
                    type="number"
                    value={minMarketCap}
                    onChange={(e) => setMinMarketCap(e.target.value)}
                    className="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                    placeholder="z.B. 100000"
                  />
                </div>
                <div>
                  <label className="block text-white/80 mb-2">Max. Market Cap</label>
                  <input
                    type="number"
                    value={maxMarketCap}
                    onChange={(e) => setMaxMarketCap(e.target.value)}
                    className="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                    placeholder="z.B. 1000000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className={`w-full py-3 rounded-lg font-semibold ${
                  isGenerating
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-dark text-black'
                }`}
              >
                {isGenerating ? 'Bot wird generiert...' : 'Bot generieren'}
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6">Bot-Vorschau</h3>
            {generatedBot ? (
              <BotCard {...generatedBot} />
            ) : (
              <div className="bg-dark-lighter p-6 rounded-lg text-center">
                <p className="text-white/60">
                  Füllen Sie das Formular aus und generieren Sie Ihren Bot, um eine Vorschau zu sehen.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BotCreator; 