import React from 'react';
import Link from 'next/link';

const VerifyOnX = () => {
  return (
    <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-40">
      <Link 
        href="https://x.com/solbotquants?s=21" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center bg-dark-lighter hover:bg-primary hover:text-black transition-all duration-300 py-3 px-4 rounded-l-lg shadow-lg group"
      >
        <span className="writing-mode-vertical whitespace-nowrap font-medium text-sm">
          Verify us on X
        </span>
        <svg 
          viewBox="0 0 24 24" 
          className="w-5 h-5 mt-2 ml-1 group-hover:text-black"
        >
          <path 
            fill="currentColor" 
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          />
        </svg>
      </Link>
    </div>
  );
};

export default VerifyOnX; 