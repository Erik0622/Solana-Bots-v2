import Header from '@/components/Header'
import Hero from '@/components/Hero'
import BotsSection from '@/components/BotsSection'
import Features from '@/components/Features'
import FAQ from '@/components/FAQ'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <BotsSection />
      <Features />
      <FAQ />
      <Footer />
    </main>
  )
} 