import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'
import '@solana/wallet-adapter-react-ui/styles.css'
import ClientLayout from '@/components/ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SolBotQuants | Intelligente Trading-Bots für Solana',
  description: 'Maximieren Sie Ihre Trading-Ergebnisse mit unseren hochentwickelten, vollautomatischen Trading-Bots für die Solana-Blockchain. Bis zu 837% jährliche Rendite mit fortschrittlichem Risikomanagement.',
  keywords: 'solana, trading bot, kryptowährung, automatisierter handel, defi, blockchain, arbitrage, quant, algorithmic trading',
  authors: [{ name: 'SolBotQuants Team' }],
  openGraph: {
    title: 'SolBotQuants | Intelligente Trading-Bots für Solana',
    description: 'Hochleistungs-Trading-Bots für Solana mit nachgewiesener Erfolgsbilanz.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SolBotQuants',
    description: 'Intelligente Trading-Bots für Solana',
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