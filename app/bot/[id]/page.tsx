import { FC } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BotDetail from '@/components/BotDetail';

interface BotPageProps {
  params: {
    id: string;
  };
}

const BotPage: FC<BotPageProps> = ({ params }) => {
  return (
    <main className="min-h-screen">
      <Header />
      <BotDetail id={params.id} />
      <Footer />
    </main>
  );
};

export default BotPage; 