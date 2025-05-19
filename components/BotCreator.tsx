'use client';

import React, { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import BotCard from './BotCard';
import { useCustomBots } from '@/hooks/useCustomBots';
import { toast } from 'react-hot-toast';

interface BotCreatorProps {}

const BotCreator: FC<BotCreatorProps> = () => {
  const { connected } = useWallet();
  const { saveBot } = useCustomBots();
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
      setError('Please fill in all fields.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedBot(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyA049UbRanBwu8pBXiF-dybU4J_GyeNBCM';
      if (!apiKey) {
        throw new Error('API Key for Gemini is not configured.')
      }
      
      const modelName = 'gemini-2.5-flash-preview-04-17';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create a Solana trading bot code based on the following strategy:
              Title: ${title}
              Strategy: ${strategy}
              Risk/Reward: ${riskReward}
              Token Age: ${tokenAge}
              Min. Market Cap: ${minMarketCap}
              Max. Market Cap: ${maxMarketCap}
              
              Please generate the complete TypeScript code for the bot.`
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error('Unexpected API response structure:', data);
        throw new Error('Failed to parse generated code from API response.');
      }
      const generatedCode = data.candidates[0].content.parts[0].text;

      // Create bot object
      const newBot = {
        id: `custom-${Date.now()}`,
        name: title,
        description: strategy,
        weeklyReturn: '0%',
        monthlyReturn: '0%',
        trades: 0,
        winRate: '0%',
        strategy: strategy,
        riskLevel: 'custom' as const,
        riskColor: 'text-blue-400',
        baseRiskPerTrade: parseFloat(riskReward.split(':')[0]) || 15,
        riskManagement: `Risk/Reward: ${riskReward}, Token Age: ${tokenAge}, Market Cap: ${minMarketCap}-${maxMarketCap}`,
        status: 'paused' as const,
        profitToday: 0,
        profitWeek: 0,
        profitMonth: 0,
        code: generatedCode // Store the generated code
      };

      // Save the bot using our custom hook
      const savedBot = saveBot(newBot);
      setGeneratedBot(savedBot);
      
      // Show success message
      toast.success('Bot created and saved successfully!');

      // Optional: Clear form
      setTitle('');
      setStrategy('');
      setRiskReward('');
      setTokenAge('');
      setMinMarketCap('');
      setMaxMarketCap('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      toast.error('Failed to create bot. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!connected) {
    return (
      <div className="py-20 px-6 bg-dark-light min-h-[60vh]">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Bot Launchpad</h2>
          <p className="text-white/80 mb-8">Connect your wallet to create your own trading bot.</p>
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
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
            <button 
              className="text-xs underline mt-2 text-red-300 hover:text-red-100"
              onClick={() => setError(null)}
            >
              Close
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-dark-lighter p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-6">Bot Configuration</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-white/80 mb-2">Bot Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                  placeholder="e.g., Volume Spike Hunter"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-2">Trading Strategy</label>
                <textarea
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none h-32"
                  placeholder="Describe your trading strategy in detail..."
                />
              </div>

              <div>
                <label className="block text-white/80 mb-2">Risk/Reward Ratio</label>
                <input
                  type="text"
                  value={riskReward}
                  onChange={(e) => setRiskReward(e.target.value)}
                  className="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                  placeholder="e.g., 1:3"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-2">Token Age</label>
                <select
                  value={tokenAge}
                  onChange={(e) => setTokenAge(e.target.value)}
                  className="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                >
                  <option value="">Please select...</option>
                  <option value="under-24h">Under 24 hours</option>
                  <option value="under-12h">Under 12 hours</option>
                  <option value="under-6h">Under 6 hours</option>
                  <option value="under-1h">Under 1 hour</option>
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
                    placeholder="e.g., 100000"
                  />
                </div>
                <div>
                  <label className="block text-white/80 mb-2">Max. Market Cap</label>
                  <input
                    type="number"
                    value={maxMarketCap}
                    onChange={(e) => setMaxMarketCap(e.target.value)}
                    className="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                    placeholder="e.g., 1000000"
                  />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    isGenerating
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90 text-black'
                  }`}
                >
                  {isGenerating ? 'Generating Bot...' : 'Generate Bot'}
                </button>
              </form>
            </form>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6">Bot Preview</h3>
            {generatedBot ? (
              <BotCard {...generatedBot} />
            ) : (
              <div className="bg-dark-lighter p-6 rounded-lg text-center">
                <p className="text-white/60">
                  Fill out the form and generate your bot to see a preview.
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