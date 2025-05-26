'use client';

import React, { FC, useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const FeatureCard: FC<{
  title: string;
  description: string;
  icon: string;
  gradient: string;
  buttonText: string;
  buttonLink: string;
  delay: number;
}> = ({ title, description, icon, gradient, buttonText, buttonLink, delay }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={cardRef}
      className={`group relative overflow-hidden transition-all duration-700 ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl transition-all duration-500 group-hover:border-white/30 group-hover:bg-white/10"></div>
      
      {/* Gradient Glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-2xl blur-xl`}></div>
      
      {/* Content */}
      <div className="relative p-8 h-full flex flex-col">
        {/* Icon */}
        <div className={`mb-6 relative transition-transform duration-500 ${isHovered ? 'scale-110 rotate-6' : ''}`}>
          <div className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-500`}>
            <span className="text-3xl filter drop-shadow-lg">{icon}</span>
          </div>
          {/* Floating particles */}
          {isHovered && (
            <>
              <div className="absolute -top-2 -right-2 w-2 h-2 bg-primary rounded-full animate-ping opacity-75"></div>
              <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-secondary rounded-full animate-bounce delay-200"></div>
            </>
          )}
        </div>
        
        {/* Title */}
        <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent group-hover:from-white group-hover:to-primary transition-all duration-300">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-white/70 mb-8 leading-relaxed flex-grow group-hover:text-white/90 transition-colors duration-300">
          {description}
        </p>
        
        {/* Button */}
        <Link href={buttonLink}>
          <div className="group/button relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/20 hover:border-primary/50 rounded-xl px-6 py-3 transition-all duration-300 hover:scale-105">
            <span className="relative z-10 text-white font-medium group-hover/button:text-primary transition-colors duration-300">
              {buttonText}
            </span>
            <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover/button:opacity-20 transition-opacity duration-300`}></div>
            {/* Shimmer effect */}
            <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover/button:opacity-100 group-hover/button:animate-shimmer transition-opacity duration-300"></div>
          </div>
        </Link>
      </div>
    </div>
  );
};

const ProcessStep: FC<{
  number: number;
  title: string;
  description: string;
  delay: number;
}> = ({ number, title, description, delay }) => {
  const [isVisible, setIsVisible] = useState(false);
  const stepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (stepRef.current) {
      observer.observe(stepRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={stepRef}
      className={`group relative text-center transition-all duration-700 ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Number Circle */}
      <div className="relative mx-auto mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/50 transition-all duration-500 group-hover:scale-110">
          <span className="text-2xl font-black text-black">{number}</span>
        </div>
        
        {/* Animated ring */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping-slow opacity-75"></div>
        
        {/* Connecting line (except for last step) */}
        {number < 3 && (
          <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent transform -translate-y-1/2"></div>
        )}
      </div>
      
      {/* Content */}
      <div className="space-y-3">
        <h4 className="text-xl font-bold text-white group-hover:text-primary transition-colors duration-300">
          {title}
        </h4>
        <p className="text-white/70 group-hover:text-white/90 transition-colors duration-300 max-w-xs mx-auto">
          {description}
        </p>
      </div>
    </div>
  );
};

const Features: FC = () => {
  const [sectionVisible, setSectionVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSectionVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      title: "Smart Trading Bots",
      description: "Utilize our proven trading algorithms that analyze market data in real-time to identify profitable opportunities with precision and speed.",
      icon: "🤖",
      gradient: "from-primary to-green-400",
      buttonText: "Explore Bots",
      buttonLink: "#bots"
    },
    {
      title: "Live Performance Dashboard",
      description: "Monitor your trading performance with real-time analytics, position tracking, and comprehensive profit visualization tools.",
      icon: "📊",
      gradient: "from-secondary to-purple-400", 
      buttonText: "Go to Dashboard",
      buttonLink: "/dashboard"
    },
    {
      title: "AI-Powered Bot Launchpad",
      description: "Create your own trading bots with our AI-assisted tools and earn from transaction fees when others use your strategies.",
      icon: "🚀",
      gradient: "from-orange-400 to-red-400",
      buttonText: "Launch Now",
      buttonLink: "/launchpad"
    }
  ];

  const steps = [
    {
      title: "Connect Your Wallet",
      description: "Link your Solana wallet securely to our platform with one-click integration."
    },
    {
      title: "Choose Your Bot",
      description: "Select from our proven trading bot strategies or create your own custom solution."
    },
    {
      title: "Earn Profits",
      description: "Monitor your performance and collect your earnings automatically."
    }
  ];

  return (
    <section ref={sectionRef} id="features" className="relative py-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark via-dark-light to-dark"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>
      
      {/* Content */}
      <div className="relative container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${
          sectionVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'
        }`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            <span className="font-medium">Powerful Features</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            <span className="block text-white mb-2">Everything You Need</span>
            <span className="block bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient-x">
              To Succeed
            </span>
          </h2>
          
          <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Our platform offers advanced trading tools designed to maximize your profits 
            while minimizing risk through cutting-edge technology.
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-24">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={index * 200}
            />
          ))}
        </div>
        
        {/* How It Works */}
        <div className="text-center">
          <div className={`mb-16 transition-all duration-1000 delay-500 ${
            sectionVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'
          }`}>
            <h3 className="text-3xl sm:text-4xl font-black mb-6 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              How It Works
            </h3>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              Get started in just three simple steps and begin earning with automated trading
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {steps.map((step, index) => (
              <ProcessStep
                key={step.title}
                number={index + 1}
                title={step.title}
                description={step.description}
                delay={600 + index * 200}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features; 