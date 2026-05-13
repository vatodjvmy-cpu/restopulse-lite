import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, AlertTriangle, CheckCircle, MessageSquare, Star, Users, Bell, Plus, Settings } from 'lucide-react';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-[#1a1a1a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f0f2f5]/95 backdrop-blur-sm border-b border-[#d1d9e6]/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden bg-[#f0f2f5] text-[#1a1a1a] px-4 py-2 rounded-xl shadow-[8px_8px_16px_#b8c1d1,-8px_-8px_16px_#ffffff] hover:shadow-[10px_10px_20px_#a3b1c6,-10px_-10px_20px_#ffffff] transition-all p-2" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold">RestoPulse</h1>
            <span className="hidden sm:inline text-[#4a5568] text-sm">Life Grand Cafe</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-[#f0f2f5] text-[#1a1a1a] px-4 py-2 rounded-xl shadow-[8px_8px_16px_#b8c1d1,-8px_-8px_16px_#ffffff] hover:shadow-[10px_10px_20px_#a3b1c6,-10px_-10px_20px_#ffffff] transition-all p-2 relative">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ef4444] text-white text-xs rounded-full flex items-center justify-center">2</span>
            </button>
            <button className="bg-[#3b82f6] text-white px-4 py-2 rounded-xl shadow-[6px_6px_12px_#2563eb,-6px_-6px_12px_#60a5fa] hover:shadow-[8px_8px_16px_#1d4ed8,-8px_-8px_16px_#93c5fd] transition-all flex items-center gap-2">
              <Plus size={16} />
              <span className="hidden sm:inline">Add Review</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="fixed left-0 top-0 bottom-0 w-64 bg-[#f0f2f5] border-r border-[#d1d9e6]/30 z-50 p-4 md:hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold">Menu</h2>
                <button className="bg-[#f0f2f5] text-[#1a1a1a] px-4 py-2 rounded-xl shadow-[8px_8px_16px_#b8c1d1,-8px_-8px_16px_#ffffff] p-2" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
              </div>
              <nav className="space-y-2">
                {['dashboard', 'reviews', 'staff', 'settings'].map(tab => (
                  <button key={tab} onClick={() => { setActiveTab(tab); setSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${activeTab === tab ? 'bg-[#3b82f6] text-white' : 'text-[#4a5568] hover:bg-[#d1d9e6]/20'}`}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {['4.2', '24', '83%', '2'].map((val, i) => (
            <div key={i} className="bg-[#f0f2f5] rounded-2xl shadow-[8px_8px_16px_#b8c1d1,-8px_-8px_16px_#ffffff] p-5 text-center">
              <div className="text-2xl font-bold text-[#3b82f6]">{val}</div>
              <div className="text-[#4a5568] text-sm mt-1">{['Avg Rating', 'Reviews (7d)', 'Response Rate', 'Critical'][i]}</div>
            </div>
          ))}
        </div>

        {/* Critical Box */}
        <div className="bg-[#f0f2f5] rounded-2xl shadow-[8px_8px_16px_#b8c1d1,-8px_-8px_16px_#ffffff] p-5 border-l-4 border-[#ef4444] mb-6">
          <h3 className="font-semibold flex items-center gap-2 text-[#ef4444] mb-4">
            <AlertTriangle size={18} /> Critical Reviews
          </h3>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20 cursor-pointer hover:bg-[#ef4444]/10 transition-colors" style={{ animation: 'criticalPulse 2s infinite' }}>
              <p className="font-medium">Allergic reaction - serious concern</p>
              <p className="text-sm text-[#4a5568] mt-1">I informed staff about my nut allergy but my dessert contained nuts...</p>
              <button className="bg-[#ef4444] text-white text-xs px-3 py-1.5 rounded-lg mt-3 w-full">Respond Now →</button>
            </div>
          </div>
        </div>

        {/* Demo Button */}
        <div className="text-center py-8">
          <button className="bg-[#3b82f6] text-white px-6 py-3 rounded-xl shadow-[6px_6px_12px_#2563eb,-6px_-6px_12px_#60a5fa] hover:shadow-[8px_8px_16px_#1d4ed8,-8px_-8px_16px_#93c5fd] transition-all font-medium" onClick={() => alert('Demo data seeded!')}>
            🌱 Seed Demo Data
          </button>
          <p className="text-[#4a5568] text-sm mt-3">Click to populate sample reviews for testing</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#d1d9e6]/30 mt-12 py-6 text-center text-[#4a5568] text-sm">
        <p>RestoPulse • Life Grand Cafe</p>
        <p className="mt-1">Contact: john@lifegrandcafe.com</p>
      </footer>

      {/* Critical animation style */}
      <style>{`
        @keyframes criticalPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4), 8px 8px 16px #b8c1d1, -8px -8px 16px #ffffff; }
          50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0), 8px 8px 16px #b8c1d1, -8px -8px 16px #ffffff; }
        }
      `}</style>
    </div>
  );
}