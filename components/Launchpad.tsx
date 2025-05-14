import React, { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

interface LaunchpadProject {
  id: string;
  name: string;
  description: string;
  tokenSymbol: string;
  totalSupply: number;
  price: number;
  raised: number;
  goal: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'live' | 'ended';
}

const Launchpad: FC = () => {
  const { connected, publicKey } = useWallet();
  const [projects, setProjects] = useState<LaunchpadProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<LaunchpadProject | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/launchpad/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvest = async (project: LaunchpadProject) => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      const amount = parseFloat(investmentAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid investment amount');
        return;
      }

      const response = await fetch('/api/launchpad/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          wallet: publicKey.toString(),
          amount,
        }),
      });

      if (!response.ok) throw new Error('Investment failed');
      
      // Refresh projects after successful investment
      await fetchProjects();
      setSelectedProject(null);
      setInvestmentAmount('');
      alert('Investment successful!');
    } catch (error) {
      console.error('Investment error:', error);
      setError('Failed to process investment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <section className="py-16 px-6 bg-dark-light min-h-screen">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold mb-8">Launchpad</h2>
        
        {!connected ? (
          <div className="text-center py-12">
            <p className="text-white/80 mb-8">Connect your wallet to participate in token launches.</p>
            <WalletMultiButton className="btn-primary px-8 py-3" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <div key={project.id} className="bg-dark-lighter p-6 rounded-lg backdrop-blur-sm border border-dark hover:border-primary transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{project.name}</h3>
                    <p className="text-white/60">{project.tokenSymbol}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    project.status === 'live' ? 'bg-green-500 text-black' :
                    project.status === 'upcoming' ? 'bg-blue-500 text-black' :
                    'bg-gray-500 text-white'
                  }`}>
                    {project.status.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-white/80 mb-4">{project.description}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-white/60">Price:</span>
                    <span>{project.price} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Raised:</span>
                    <span>{project.raised} / {project.goal} SOL</span>
                  </div>
                  <div className="w-full bg-dark rounded-full h-2 mb-4">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(project.raised / project.goal) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Start Date:</span>
                    <span>{new Date(project.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">End Date:</span>
                    <span>{new Date(project.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {project.status === 'live' && (
                  <button
                    className="w-full py-2 rounded bg-primary hover:bg-primary/90 transition-colors text-black font-semibold"
                    onClick={() => setSelectedProject(project)}
                  >
                    Invest Now
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Investment Modal */}
        {selectedProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-dark-lighter p-6 rounded-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Invest in {selectedProject.name}</h3>
              
              <div className="mb-4">
                <label className="block text-white/60 mb-2">Amount (SOL)</label>
                <input
                  type="number"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-dark border border-dark-lighter focus:border-primary outline-none"
                  placeholder="Enter amount..."
                />
              </div>
              
              {error && (
                <p className="text-red-500 mb-4">{error}</p>
              )}
              
              <div className="flex gap-4">
                <button
                  className="flex-1 py-2 rounded bg-primary hover:bg-primary/90 transition-colors text-black font-semibold"
                  onClick={() => handleInvest(selectedProject)}
                >
                  Confirm
                </button>
                <button
                  className="flex-1 py-2 rounded bg-dark hover:bg-dark/90 transition-colors"
                  onClick={() => {
                    setSelectedProject(null);
                    setInvestmentAmount('');
                    setError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Launchpad; 