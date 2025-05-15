'use client';

import React, { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const FeatureCard: FC<{
  title: string;
  description: string;
  icon: string;
  buttonText: string;
  buttonLink: string;
}> = ({ title, description, icon, buttonText, buttonLink }) => {
  return (
    <div className="bg-dark-lighter p-6 rounded-xl backdrop-blur-md border border-dark hover:border-primary transition-all duration-300">
      <div className="mb-4 text-primary">
        <span className="text-4xl">{icon}</span>
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-white/70 mb-6">{description}</p>
      <Link 
        href={buttonLink} 
        className="inline-block bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded-lg transition-colors"
      >
        {buttonText}
      </Link>
    </div>
  );
};

const Features: FC = () => {
  return (
    <section id="features" className="py-20 px-6 bg-dark-light">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-white/70 max-w-3xl mx-auto">
            Our platform offers advanced trading tools designed to maximize your profits while minimizing risk.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            title="Smart Trading Bots"
            description="Utilize our proven trading algorithms that analyze market data in real-time to identify profitable opportunities."
            icon="🤖"
            buttonText="Explore Bots"
            buttonLink="#bots"
          />
          
          <FeatureCard
            title="Live Performance Dashboard"
            description="Monitor your trading performance with real-time analytics, position tracking, and profit visualization."
            icon="📊"
            buttonText="Go to Dashboard"
            buttonLink="/dashboard"
          />
          
          <FeatureCard
            title="AI-Powered Bot Launchpad"
            description="Create your own trading bots with our AI-assisted tools and earn from transaction fees when others use your strategies."
            icon="🚀"
            buttonText="Launch Now"
            buttonLink="/launchpad"
          />
        </div>
        
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-6">How It Works</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg">
              <div className="bg-primary/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary text-xl font-bold">1</span>
              </div>
              <h4 className="text-lg font-bold mb-2">Connect Your Wallet</h4>
              <p className="text-white/70">Link your Solana wallet securely to our platform.</p>
            </div>
            
            <div className="p-6 rounded-lg">
              <div className="bg-primary/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary text-xl font-bold">2</span>
              </div>
              <h4 className="text-lg font-bold mb-2">Choose Your Bot</h4>
              <p className="text-white/70">Select from our proven trading bot strategies or create your own.</p>
            </div>
            
            <div className="p-6 rounded-lg">
              <div className="bg-primary/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary text-xl font-bold">3</span>
              </div>
              <h4 className="text-lg font-bold mb-2">Earn Profits</h4>
              <p className="text-white/70">Monitor your performance and collect your earnings.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features; 