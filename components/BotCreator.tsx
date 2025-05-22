'use client';

import React, { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import BotCard from './BotCard';
import { useCustomBots } from '@/hooks/useCustomBots';
import { toast } from 'react-hot-toast';

interface BotCreatorProps {}

const BotCreator: FC<BotCreatorProps> = () => {
  const { connected } = useWallet();
  const { saveBot, getBots } = useCustomBots();
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [strategy, setStrategy] = useState('');
  const [riskReward, setRiskReward] = useState('1:3');
  const [tokenAge, setTokenAge] = useState('');
  const [minMarketCap, setMinMarketCap] = useState('100000');
  const [maxMarketCap, setMaxMarketCap] = useState('1000000');
  const [tradingStyle, setTradingStyle] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedBot, setGeneratedBot] = useState<any>(null);
  const [customBots, setCustomBots] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    setCustomBots(getBots());
  }, [getBots]);

  const predefinedStrategies = [
    {
      id: 'volume-spike',
      name: 'Volume Spike Hunter',
      description: 'Detects sudden volume increases and trades on momentum',
      emoji: '📈',
      defaultStrategy: 'Buy when volume spikes above 3x average in 5-minute windows, with positive price action and proper risk management.',
      category: 'Momentum'
    },
    {
      id: 'dip-buyer',
      name: 'Smart Dip Buyer',
      description: 'Identifies oversold conditions and accumulates on dips',
      emoji: '🎯',
      defaultStrategy: 'Buy tokens that have retraced 15-30% from recent highs but maintain strong fundamentals and volume.',
      category: 'Value'
    },
    {
      id: 'trend-follower',
      name: 'Trend Follower',
      description: 'Follows established trends with precise entry and exit points',
      emoji: '🌊',
      defaultStrategy: 'Enter trending tokens with confirmed momentum, using moving averages and volume confirmation.',
      category: 'Trend'
    },
    {
      id: 'scalper',
      name: 'Lightning Scalper',
      description: 'High-frequency small profit scalping strategy',
      emoji: '⚡',
      defaultStrategy: 'Execute rapid trades on small price movements with tight spreads and high liquidity.',
      category: 'Scalping'
    },
    {
      id: 'custom',
      name: 'Custom Strategy',
      description: 'Build your own unique trading strategy',
      emoji: '🛠️',
      defaultStrategy: '',
      category: 'Custom'
    }
  ];

  const handleStrategySelect = (selectedStrategy: any) => {
    setTitle(selectedStrategy.name);
    setStrategy(selectedStrategy.defaultStrategy);
    setTradingStyle(selectedStrategy.category);
    if (selectedStrategy.id !== 'custom') {
      setCurrentStep(2);
    }
  };

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
              text: `Create a sophisticated Solana trading bot with the following specifications:
              
              Title: ${title}
              Trading Style: ${tradingStyle}
              Strategy: ${strategy}
              Risk/Reward Ratio: ${riskReward}
              Token Age Filter: ${tokenAge}
              Market Cap Range: $${minMarketCap} - $${maxMarketCap}
              Trading Timeframe: ${timeframe}
              
              Generate complete TypeScript code for a professional trading bot that implements this strategy with proper risk management, error handling, and performance tracking. Include entry/exit logic, position sizing, and safety mechanisms.`
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(`Failed to generate bot strategy. Please try again.`);
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
        description: strategy.substring(0, 120) + (strategy.length > 120 ? '...' : ''),
        weeklyReturn: '0%',
        monthlyReturn: '0%',
        trades: 0,
        winRate: '0%',
        strategy: strategy,
        riskLevel: 'custom' as const,
        riskColor: 'text-blue-400',
        baseRiskPerTrade: parseFloat(riskReward.split(':')[0]) || 15,
        riskManagement: `${tradingStyle} strategy with ${riskReward} risk/reward ratio. Target: ${tokenAge} tokens, $${minMarketCap}-$${maxMarketCap} market cap.`,
        status: 'paused' as const,
        profitToday: 0,
        profitWeek: 0,
        profitMonth: 0,
        code: generatedCode,
        tradingStyle,
        timeframe,
        createdAt: new Date().toISOString()
      };

      // Save the bot using our custom hook
      const savedBot = saveBot(newBot);
      setGeneratedBot(savedBot);
      setCustomBots(getBots());
      
      // Show success message
      toast.success(`🎉 ${title} created successfully!`);
      
      setCurrentStep(4); // Go to success step

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      toast.error('Failed to create bot. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setTitle('');
    setStrategy('');
    setRiskReward('1:3');
    setTokenAge('');
    setMinMarketCap('100000');
    setMaxMarketCap('1000000');
    setTradingStyle('');
    setTimeframe('');
    setGeneratedBot(null);
    setError(null);
  };

  return (
    <section className="relative py-16 px-4 sm:px-6 min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark via-dark-light to-dark">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto max-w-7xl">
        {/* Header */}
        <div className={`text-center mb-12 transition-all duration-1000 ${
          isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'
        }`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            <span className="font-medium">AI-Powered Bot Creator</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            <span className="block text-white mb-2">Build Your</span>
            <span className="block bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient-x">
              Trading Bot
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Create sophisticated trading strategies with our AI assistant. No coding required – 
            just describe your strategy and watch it come to life.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  step === currentStep 
                    ? 'bg-gradient-to-r from-primary to-secondary text-black shadow-lg shadow-primary/50' 
                    : step < currentStep 
                      ? 'bg-green-500 text-white' 
                      : 'bg-white/10 text-white/60'
                }`}>
                  {step < currentStep ? '✓' : step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 transition-all duration-300 ${
                    step < currentStep ? 'bg-green-500' : 'bg-white/10'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Strategy Selection */}
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-center mb-8">Choose Your Trading Strategy</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {predefinedStrategies.map((strat) => (
                  <div
                    key={strat.id}
                    onClick={() => handleStrategySelect(strat)}
                    className="group cursor-pointer"
                  >
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 hover:border-primary/30 rounded-2xl p-6 h-full transition-all duration-300 hover:scale-105 hover:bg-white/10">
                      <div className="text-4xl mb-4">{strat.emoji}</div>
                      <h3 className="text-xl font-bold text-white mb-2">{strat.name}</h3>
                      <p className="text-white/70 text-sm mb-4">{strat.description}</p>
                      <div className="inline-block px-3 py-1 bg-primary/20 text-primary text-xs rounded-full">
                        {strat.category}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Strategy Details */}
          {currentStep === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-center mb-8">Configure Your Strategy</h2>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
                <form onSubmit={(e) => { e.preventDefault(); setCurrentStep(3); }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/80 mb-2 font-medium">Bot Name</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                        placeholder="e.g., Volume Spike Hunter Pro"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white/80 mb-2 font-medium">Trading Timeframe</label>
                      <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="w-full bg-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                        required
                      >
                        <option value="">Select timeframe...</option>
                        <option value="1m">1 Minute (Scalping)</option>
                        <option value="5m">5 Minutes (Short-term)</option>
                        <option value="15m">15 Minutes (Medium-term)</option>
                        <option value="1h">1 Hour (Long-term)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/80 mb-2 font-medium">Trading Strategy Description</label>
                    <textarea
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value)}
                      className="w-full bg-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none h-32 transition-colors"
                      placeholder="Describe your trading strategy in detail..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-white/80 mb-2 font-medium">Risk/Reward Ratio</label>
                      <select
                        value={riskReward}
                        onChange={(e) => setRiskReward(e.target.value)}
                        className="w-full bg-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                        required
                      >
                        <option value="1:2">1:2 (Conservative)</option>
                        <option value="1:3">1:3 (Balanced)</option>
                        <option value="1:4">1:4 (Aggressive)</option>
                        <option value="1:5">1:5 (High Risk)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/80 mb-2 font-medium">Token Age Filter</label>
                      <select
                        value={tokenAge}
                        onChange={(e) => setTokenAge(e.target.value)}
                        className="w-full bg-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                        required
                      >
                        <option value="">Select age...</option>
                        <option value="under-1h">Under 1 hour</option>
                        <option value="under-6h">Under 6 hours</option>
                        <option value="under-12h">Under 12 hours</option>
                        <option value="under-24h">Under 24 hours</option>
                        <option value="any">Any age</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/80 mb-2 font-medium">Market Cap Range</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={minMarketCap}
                          onChange={(e) => setMinMarketCap(e.target.value)}
                          className="w-1/2 bg-dark border border-white/20 rounded-lg px-3 py-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                          placeholder="Min"
                          required
                        />
                        <input
                          type="number"
                          value={maxMarketCap}
                          onChange={(e) => setMaxMarketCap(e.target.value)}
                          className="w-1/2 bg-dark border border-white/20 rounded-lg px-3 py-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                          placeholder="Max"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-primary/50 text-white font-semibold rounded-lg transition-all duration-300"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-primary to-secondary text-black font-bold py-3 px-6 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
                    >
                      Continue to Preview
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Step 3: Review & Generate */}
          {currentStep === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-center mb-8">Review & Generate Your Bot</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-6">Bot Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-white/70">Name:</span>
                      <span className="text-white font-medium">{title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Style:</span>
                      <span className="text-white font-medium">{tradingStyle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Timeframe:</span>
                      <span className="text-white font-medium">{timeframe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Risk/Reward:</span>
                      <span className="text-white font-medium">{riskReward}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Token Age:</span>
                      <span className="text-white font-medium">{tokenAge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Market Cap:</span>
                      <span className="text-white font-medium">${minMarketCap} - ${maxMarketCap}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-white font-medium mb-2">Strategy Description:</h4>
                    <p className="text-white/70 text-sm bg-dark/50 rounded-lg p-3">{strategy}</p>
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-primary/50 text-white font-semibold rounded-lg transition-all duration-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isGenerating}
                      className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-300 ${
                        isGenerating
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-primary to-secondary text-black hover:scale-105 hover:shadow-lg hover:shadow-primary/25'
                      }`}
                    >
                      {isGenerating ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="loading-spinner"></div>
                          Generating Bot...
                        </span>
                      ) : (
                        'Generate My Bot 🚀'
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-6">Bot Preview</h3>
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🤖</div>
                      <p className="text-white/60">
                        Your bot preview will appear here after generation
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                  <p className="font-semibold">Error:</p>
                  <p>{error}</p>
                  <button 
                    className="text-xs underline mt-2 text-red-300 hover:text-red-100"
                    onClick={() => setError(null)}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Success */}
          {currentStep === 4 && generatedBot && (
            <div className="animate-fade-in text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-white mb-4">Bot Created Successfully!</h2>
                <p className="text-white/70 max-w-2xl mx-auto">
                  Your trading bot <span className="text-primary font-semibold">{generatedBot.name}</span> has been created and saved. 
                  You can now start it from your dashboard or create another bot.
                </p>
              </div>

              <div className="max-w-md mx-auto mb-8">
                <BotCard {...generatedBot} showFavoriteButton={false} />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-400">💡</span>
                  <span className="text-yellow-400 font-semibold">Important:</span>
                </div>
                <p className="text-yellow-300 text-sm">
                  To start trading, you'll need to connect your Solana wallet. Your bot is saved and ready whenever you're ready to begin!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={resetForm}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-primary/50 text-white font-semibold rounded-lg transition-all duration-300"
                >
                  Create Another Bot
                </button>
                <button
                  onClick={() => window.location.href = '/my-bots'}
                  className="bg-gradient-to-r from-primary to-secondary text-black font-bold py-3 px-6 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
                >
                  View My Bots
                </button>
              </div>
            </div>
          )}
        </div>

        {/* My Created Bots Section */}
        {customBots.length > 0 && currentStep === 1 && (
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-center mb-8">My Created Bots</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customBots.slice(0, 6).map((bot) => (
                <div key={bot.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                  <h4 className="text-lg font-bold text-white mb-2">{bot.name}</h4>
                  <p className="text-white/70 text-sm mb-3 line-clamp-2">{bot.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">
                      {new Date(bot.createdAt).toLocaleDateString()}
                    </span>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      bot.status === 'active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {bot.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {customBots.length > 6 && (
              <div className="text-center mt-6">
                <button
                  onClick={() => window.location.href = '/my-bots'}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  View All Bots ({customBots.length}) →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default BotCreator; 