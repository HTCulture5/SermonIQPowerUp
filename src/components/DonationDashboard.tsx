import React, { useState } from 'react';
import { 
  Heart, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Building, 
  Users, 
  Globe, 
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { recordDonation } from '../services/firestoreService';

interface DonationDashboardProps {
  onOpenChat?: () => void;
}

export function DonationDashboard({ onOpenChat }: DonationDashboardProps) {
  const [amount, setAmount] = useState<string>('100');
  const [fund, setFund] = useState('General');
  const [frequency, setFrequency] = useState('One-time');
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');

  const funds = [
    { name: 'General', icon: <Building className="w-4 h-4" /> },
    { name: 'Building', icon: <Globe className="w-4 h-4" /> },
    { name: 'Missions', icon: <Globe className="w-4 h-4" /> },
    { name: 'Youth', icon: <Users className="w-4 h-4" /> },
    { name: 'Benevolence', icon: <Heart className="w-4 h-4" /> }
  ];

  const recentDonations = [
    { name: 'Anonymous', amount: '$250', fund: 'Building', time: '2m ago' },
    { name: 'Anonymous', amount: '$50', fund: 'General', time: '15m ago' },
    { name: 'Anonymous', amount: '$1,000', fund: 'Missions', time: '1h ago' }
  ];

  const handleDonate = async () => {
    if (step === 'details') {
      setStep('payment');
    } else if (step === 'payment') {
      try {
        await recordDonation({
          amount: parseFloat(amount) || 100,
          fund: fund,
          frequency: frequency.toLowerCase(),
          isAnonymous: true
        });
      } catch (err) {
        console.error('Failed to log donation to Firestore', err);
      }
      setStep('success');
    }
  };

  return (
    <div className="bg-[#0D1236] rounded-2xl border border-white/5 p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-[#D4AF37]" />
          <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold">Generosity Dashboard</h2>
        </div>
        <div className="flex items-center gap-2.5">
          {onOpenChat && (
            <button
              onClick={onOpenChat}
              className="px-3 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 text-[#D4AF37] rounded-full text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Heart className="w-3 h-3 fill-current" /> Care Chat
            </button>
          )}
          <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Live Giving Active
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
        <AnimatePresence mode="wait">
          {step === 'details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <span className="block text-[10px] text-white/30 uppercase font-black mb-1">Today's Total</span>
                  <span className="text-2xl font-mono text-[#D4AF37]">$4,850</span>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <span className="block text-[10px] text-white/30 uppercase font-black mb-1">Donor Count</span>
                  <span className="text-2xl font-mono text-[#D4AF37]">42</span>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Select Amount</label>
                <div className="grid grid-cols-4 gap-2">
                  {['25', '50', '100', '250'].map(val => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      className={cn(
                        "py-2 rounded-lg border text-sm font-mono transition-all",
                        amount === val ? "bg-[#D4AF37] text-[#0A0E2A] border-[#D4AF37]" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      )}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Other amount"
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white text-base font-mono focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
              </div>

              {/* Fund Selection */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Designated Fund</label>
                <div className="flex flex-wrap gap-2">
                  {funds.map(f => (
                    <button
                      key={f.name}
                      onClick={() => setFund(f.name)}
                      className={cn(
                        "px-4 py-2 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center gap-2",
                        fund === f.name ? "bg-white/10 border-[#D4AF37] text-[#D4AF37]" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                      )}
                    >
                      {f.icon} {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Giving Frequency</label>
                <div className="grid grid-cols-3 gap-2">
                  {['One-time', 'Weekly', 'Monthly'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFrequency(f)}
                      className={cn(
                        "py-2 rounded-lg border text-[10px] font-bold uppercase transition-all",
                        frequency === f ? "border-[#D4AF37] text-[#D4AF37]" : "bg-white/5 border-white/10 text-white/50"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleDonate}
                className="w-full py-4 bg-[#D4AF37] text-[#0A0E2A] rounded-xl font-bold uppercase tracking-widest text-sm hover:scale-[0.98] transition-all"
              >
                Continue to Payment
              </button>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div 
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
               <div className="text-center py-4">
                  <h3 className="text-lg font-bold mb-1">Confirm Contribution</h3>
                  <p className="text-sm text-white/50">${amount} to {fund} Fund ({frequency})</p>
               </div>

               <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                     <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                        <span className="text-sm font-medium">Credit / Debit Card</span>
                     </div>
                     <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </button>

                  <button className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                     <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-[#D4AF37]" />
                        <span className="text-sm font-medium">Google Pay / Apple Pay</span>
                     </div>
                  </button>

                  <button className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                     <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-[#D4AF37]" />
                        <span className="text-sm font-medium">Direct Bank Transfer</span>
                     </div>
                  </button>
               </div>

               <button 
                onClick={handleDonate}
                className="w-full py-4 bg-[#D4AF37] text-[#0A0E2A] rounded-xl font-bold uppercase tracking-widest text-sm"
              >
                Complete Payment
              </button>

              <button 
                onClick={() => setStep('details')}
                className="w-full text-xs text-white/30 uppercase font-bold"
              >
                Go Back
              </button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center text-center space-y-6 py-12"
            >
               <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/20">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
               </div>
               <div>
                  <h3 className="text-2xl font-bold mb-2 text-[#D4AF37]">Generosity Logged</h3>
                  <p className="text-white/50 text-sm italic leading-relaxed">
                    "God loves a cheerful giver." <br />
                    Thank you for supporting the {fund} fund.
                  </p>
               </div>
               <button 
                onClick={() => setStep('details')}
                className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest"
              >
                New Donation
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Feed */}
        <div className="space-y-4 pt-8 border-t border-white/5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-[#D4AF37]" />
            <h4 className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Recent Activity</h4>
          </div>
          <div className="space-y-2">
             {recentDonations.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/2 rounded-lg border border-white/5">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold text-[10px]">
                        AN
                      </div>
                      <div>
                        <p className="text-xs font-bold">{d.name}</p>
                        <p className="text-[10px] text-white/30">{d.fund} Fund</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-mono font-bold text-[#D4AF37]">{d.amount}</p>
                      <p className="text-[10px] text-white/30">{d.time}</p>
                   </div>
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
