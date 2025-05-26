'use client';

import React, { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

const Hero: FC = () => {
  const { connected } = useWallet();
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    setIsVisible(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  const stats = [
    { value: '+460%', label: 'Avg Monthly Return', color: 'from-primary to-green-400' },
    { value: '+178%', label: 'Last 7 Days', color: 'from-secondary to-purple-400' },
    { value: '24/7', label: 'Automated Trading', color: 'from-yellow-400 to-orange-400' },
    { value: '99.9%', label: 'Uptime', color: 'from-blue-400 to-cyan-400' },
  ];
  
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark via-dark-light to-dark">
        {/* Floating Orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-conic from-primary/10 via-secondary/10 to-primary/10 rounded-full blur-3xl animate-spin-slow"></div>
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(20, 241, 149, 0.15) 0%, transparent 50%)`,
            transition: 'background-image 0.3s ease',
          }}></div>
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}></div>
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center">
        <div className={`transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary mb-6 backdrop-blur-sm">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="font-medium">Live Trading • High Performance Bots</span>
          </div>
          
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="block text-white mb-2">Next-Gen</span>
            <span className="block bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient-x">
              Trading Bots
            </span>
            <span className="block text-white/90 text-3xl sm:text-4xl lg:text-5xl font-bold mt-2">
              for Solana
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg sm:text-xl lg:text-2xl text-white/80 max-w-4xl mx-auto mb-8 leading-relaxed">
            Maximize your profits with <span className="text-primary font-semibold">AI-powered</span> trading algorithms
            that work <span className="text-secondary font-semibold">24/7</span> on the fastest blockchain.
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {!connected ? (
              <>
                <div className="group">
                  <WalletMultiButton className="!bg-gradient-to-r !from-primary !to-secondary !text-black !font-bold !text-lg !px-8 !py-4 !rounded-xl !transition-all !duration-300 hover:!scale-105 hover:!shadow-2xl hover:!shadow-primary/50" />
                </div>
                <Link 
                  href="#bots" 
                  className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-primary/50 text-white font-semibold text-lg rounded-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                >
                  <span className="relative z-10">Explore Bots</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/dashboard" 
                  className="bg-gradient-to-r from-primary to-secondary text-black font-bold text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/50"
                >
                  Open Dashboard
                </Link>
                <Link 
                  href="/my-bots" 
                  className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-primary/50 text-white font-semibold text-lg rounded-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                >
                  <span className="relative z-10">My Bots</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
              </>
            )}
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`group relative bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all duration-500 hover:scale-105 hover:bg-white/10 ${
                  isVisible ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className={`text-2xl lg:text-3xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>
                    {stat.value}
                  </div>
                  <div className="text-white/70 text-sm font-medium">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero; 