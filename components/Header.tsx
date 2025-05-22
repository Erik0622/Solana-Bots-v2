'use client';

import React, { FC, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const Header: FC = () => {
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Aktualisiere den Hash nur clientseitig
  useEffect(() => {
    // Setze den initialen Hash
    setCurrentHash(window.location.hash.substring(1));
    
    // Höre auf Hash-Änderungen
    const handleHashChange = () => {
      setCurrentHash(window.location.hash.substring(1));
    };
    
    // Scroll-Effekt für Header-Transparenz
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  const isActive = (path: string) => pathname === path;
  const isActiveHash = (hash: string) => currentHash === hash;
  
  const navItems = [
    { href: '/#bots', label: 'Trading Bots', type: 'hash', hash: 'bots' },
    { href: '/dashboard', label: 'Dashboard', type: 'page' },
    { href: '/launchpad', label: 'Launchpad', type: 'page' },
    { href: '/my-bots', label: 'My Bots', type: 'page' },
    { href: '/#features', label: 'Features', type: 'hash', hash: 'features' },
    { href: '/#faq', label: 'FAQ', type: 'hash', hash: 'faq' },
  ];
  
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-dark/95 backdrop-blur-lg border-b border-primary/20 shadow-lg shadow-primary/5' 
        : 'bg-dark/80 backdrop-blur-md border-b border-dark-lighter'
    }`}>
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 relative transition-transform group-hover:scale-110">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-lg opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <Image 
                src="/logo.svg" 
                alt="SolBotQuants Logo" 
                width={40}
                height={40}
                priority
                className="relative z-10"
              />
            </div>
            <span className="text-xl font-bold text-white hidden sm:block">
              Sol<span className="text-primary">Bot</span><span className="text-[#FAD02C]">Quants</span>
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const active = item.type === 'page' 
                ? isActive(item.href) 
                : isActiveHash(item.hash || '');
              
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    active 
                      ? 'text-primary bg-primary/10' 
                      : 'text-white/80 hover:text-primary hover:bg-white/5'
                  }`}
                >
                  {item.label}
                  <span className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary transition-all duration-200 ${
                    active ? 'w-full' : 'group-hover:w-full'
                  }`}></span>
                </Link>
              );
            })}
          </nav>
          
          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Wallet Button */}
            <div className="wallet-wrapper">
              <WalletMultiButton className="!bg-gradient-to-r !from-primary !to-secondary !text-black !font-semibold !rounded-lg !transition-all !duration-200 hover:!scale-105 hover:!shadow-lg hover:!shadow-primary/25" />
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Toggle mobile menu"
            >
              <div className="w-5 h-5 flex flex-col justify-center items-center">
                <span className={`block w-full h-0.5 bg-white transition-all duration-200 ${
                  isMobileMenuOpen ? 'rotate-45 translate-y-0.5' : '-translate-y-1'
                }`}></span>
                <span className={`block w-full h-0.5 bg-white transition-all duration-200 ${
                  isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}></span>
                <span className={`block w-full h-0.5 bg-white transition-all duration-200 ${
                  isMobileMenuOpen ? '-rotate-45 -translate-y-0.5' : 'translate-y-1'
                }`}></span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div className={`lg:hidden transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'
        }`}>
          <nav className="flex flex-col space-y-1 pt-4 border-t border-white/10">
            {navItems.map((item) => {
              const active = item.type === 'page' 
                ? isActive(item.href) 
                : isActiveHash(item.hash || '');
              
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active 
                      ? 'text-primary bg-primary/10' 
                      : 'text-white/80 hover:text-primary hover:bg-white/5'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header; 