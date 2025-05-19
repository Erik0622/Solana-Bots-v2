'use client';

import React, { FC, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const Header: FC = () => {
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState('');
  
  // Aktualisiere den Hash nur clientseitig
  useEffect(() => {
    // Setze den initialen Hash
    setCurrentHash(window.location.hash.substring(1));
    
    // Höre auf Hash-Änderungen
    const handleHashChange = () => {
      setCurrentHash(window.location.hash.substring(1));
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  const isActive = (path: string) => pathname === path;
  const isActiveHash = (hash: string) => currentHash === hash;
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark/80 backdrop-blur-md px-6 py-4 border-b border-dark-lighter">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 relative">
            <Image 
              src="/logo.svg" 
              alt="SolBotQuants Logo" 
              width={40}
              height={40}
              priority
            />
          </div>
          <span className="text-xl font-bold text-white">Sol<span className="text-primary">Bot</span><span className="text-[#FAD02C]">Quants</span></span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-8 mr-8">
          <Link 
            href="/#bots" 
            className={`text-white/80 hover:text-primary transition-colors ${
              isActiveHash('bots') ? 'text-primary' : ''
            }`}
          >
            Trading Bots
          </Link>
          <Link
            href="/dashboard"
            className={`text-white/80 hover:text-primary transition-colors ${
              isActive('/dashboard') ? 'text-primary border-b-2 border-primary pb-1' : ''
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/launchpad"
            className={`text-white/80 hover:text-primary transition-colors ${
              isActive('/launchpad') ? 'text-primary border-b-2 border-primary pb-1' : ''
            }`}
          >
            Launchpad
          </Link>
          <Link
            href="/my-bots"
            className={`text-white/80 hover:text-primary transition-colors ${
              isActive('/my-bots') ? 'text-primary border-b-2 border-primary pb-1' : ''
            }`}
          >
            My Bots
          </Link>
          <Link 
            href="/#features" 
            className={`text-white/80 hover:text-primary transition-colors ${
              isActiveHash('features') ? 'text-primary' : ''
            }`}
          >
            Features
          </Link>
          <Link 
            href="/#faq" 
            className={`text-white/80 hover:text-primary transition-colors ${
              isActiveHash('faq') ? 'text-primary' : ''
            }`}
          >
            FAQ
          </Link>
        </nav>
        
        <div className="flex items-center">
          <WalletMultiButton />
          
          {/* Mobile Menu Button - würde in einer vollständigen Implementierung hier hinzugefügt */}
        </div>
      </div>
    </header>
  );
};

export default Header; 