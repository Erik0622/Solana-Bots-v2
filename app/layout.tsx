import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'
import '@solana/wallet-adapter-react-ui/styles.css'
import ClientLayout from '@/components/ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SolBotQuants | Intelligent Trading Bots for Solana',
  description: 'Maximize your trading results with our sophisticated, fully automated trading bots for the Solana blockchain. Up to 460% monthly return with advanced risk management.',
  keywords: 'solana, trading bot, cryptocurrency, automated trading, defi, blockchain, arbitrage, quant, algorithmic trading',
  authors: [{ name: 'SolBotQuants Team' }],
  openGraph: {
    title: 'SolBotQuants | Intelligent Trading Bots for Solana',
    description: 'High-performance trading bots for Solana with proven track record.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SolBotQuants',
    description: 'Intelligent Trading Bots for Solana',
    images: ['/twitter-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>
          <Providers>
            {children}
          </Providers>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1a1b1e',
                color: '#fff',
                border: '1px solid #2d2e32',
              },
            }}
          />
        </ClientLayout>
      </body>
    </html>
  )
} 