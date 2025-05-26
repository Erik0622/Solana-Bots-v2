'use client';

import React, { FC, useState } from 'react';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-dark-lighter">
      <button
        className="w-full py-4 px-1 flex justify-between items-center text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-semibold">{question}</h3>
        <span className="text-primary text-2xl transition-transform duration-200" style={{ 
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' 
        }}>
          +
        </span>
      </button>
      <div 
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ 
          maxHeight: isOpen ? '500px' : '0',
          opacity: isOpen ? 1 : 0,
          marginBottom: isOpen ? '1.5rem' : '0'
        }}
      >
        <p className="px-1 pb-4 text-white/70">{answer}</p>
      </div>
    </div>
  );
};

const FAQ: FC = () => {
  const faqItems = [
    {
      question: "How do the trading bots work?",
      answer: "Our trading bots use advanced algorithms to analyze market data in real-time. They identify potential trading opportunities based on volume trends, price movements, and market patterns. When a profitable opportunity is detected, the bot executes trades automatically according to your risk parameters."
    },
    {
      question: "What are the fees for using SolBotQuants?",
      answer: "SolBotQuants charges a 1% fee per transaction. There are no subscription fees or upfront costs - we only charge when trades are executed. This keeps our fee structure transparent and fair."
    },
    {
      question: "Is my cryptocurrency safe with SolBotQuants?",
      answer: "Yes. SolBotQuants never takes custody of your funds. All operations are conducted through secure Solana smart contracts, with transactions requiring your explicit approval through your connected wallet. Your assets remain in your control at all times."
    },
    {
      question: "What returns can I expect?",
      answer: "While past performance is not indicative of future results, our bots have historically generated annual returns between 300-800% depending on market conditions and the specific bot strategy. The Dashboard provides transparent performance metrics for all bot strategies."
    },
    {
      question: "Can I create my own trading bot?",
      answer: "Yes! Our Launchpad feature allows you to create custom trading bots using our AI-assisted tools. You can define your own strategies and even publish them for other users. When others use your bot strategy, you earn a portion of the transaction fees."
    },
    {
      question: "What cryptocurrencies do your bots trade?",
      answer: "Tokens on the Solana blockchain. Our bots are designed to trade various SPL tokens in the Solana ecosystem, focusing on tokens with sufficient liquidity and trading volume to ensure optimal performance."
    }
  ];

  return (
    <section id="faq" className="py-20 px-6 bg-dark">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-white/70 max-w-3xl mx-auto">
            Everything you need to know about SolBotQuants and our automated trading solutions.
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          {faqItems.map((item, index) => (
            <FAQItem 
              key={index} 
              question={item.question} 
              answer={item.answer} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ; 