import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CreditCard, 
  Sparkles, 
  Lock, 
  CheckCircle, 
  Mail, 
  User, 
  ShieldCheck, 
  Loader2, 
  Globe, 
  Building 
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: {
    name: string;
    price: string;
    features: string[];
  } | null;
}

export function PaymentModal({ isOpen, onClose, selectedPlan }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    churchName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    billingZip: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setIsSuccess(false);
    }
  }, [isOpen]);

  const handleCardNumberChange = (value: string) => {
    // Keep only numbers and automatic spacing after every 4 digits
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    const matched = cleaned.match(/.{1,4}/g);
    const formatted = matched ? matched.join(' ') : cleaned;
    setFormData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryChange = (value: string) => {
    // Keep only numbers and format as MM/YY
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    setFormData(prev => ({ ...prev, cardExpiry: formatted }));
  };

  const handleCvcChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setFormData(prev => ({ ...prev, cardCvc: cleaned }));
  };

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!formData.name.trim()) tempErrors.name = 'Cardholder name is required';
    if (!formData.email.trim()) {
      tempErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      tempErrors.email = 'Email address is invalid';
    }
    if (!formData.churchName.trim()) tempErrors.churchName = 'Church/Organization name is required';
    
    const cardCleanObj = formData.cardNumber.replace(/\s/g, '');
    if (cardCleanObj.length < 16) tempErrors.cardNumber = 'Provide a valid 16-digit card number';
    if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(formData.cardExpiry)) {
      tempErrors.cardExpiry = 'Format MM/YY required';
    }
    if (formData.cardCvc.length < 3) tempErrors.cardCvc = 'Provide valid CVC';
    if (!formData.billingZip.trim()) tempErrors.billingZip = 'Required';

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate transaction submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      churchName: '',
      cardNumber: '',
      cardExpiry: '',
      cardCvc: '',
      billingZip: ''
    });
    setErrors({});
    setIsSuccess(false);
    onClose();
  };

  if (!isOpen || !selectedPlan) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleReset}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 25 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 25 }}
          className="relative bg-[#0D1236] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl z-10 grid grid-cols-1 md:grid-cols-12 min-h-[500px]"
        >
          {/* Close trigger */}
          <button
            onClick={handleReset}
            className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all cursor-pointer z-20"
            aria-label="Close Checkout"
          >
            <X className="w-5 h-5" />
          </button>

          {!isSuccess ? (
            <>
              {/* LEFT SIDE: SUMMARY CARD (MD:4 COLUMNS) */}
              <div className="md:col-span-5 bg-[#080B22] p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/5 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider mb-6">
                    <Sparkles className="w-3.5 h-3.5" /> Secure Checkout
                  </div>

                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest block mb-1">Subscription Plan</span>
                  <h3 className="text-2xl font-black text-white leading-tight mb-2">{selectedPlan.name}</h3>
                  
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-[#D4AF37]">{selectedPlan.price}</span>
                    <span className="text-white/30 text-xs">
                      {selectedPlan.price.toLowerCase().includes('custom') ? ' pricing' : '/mo'}
                    </span>
                    {selectedPlan.name.includes('Pilot') && (
                      <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 ml-2">
                        First 90 Days
                      </span>
                    )}
                  </div>

                  <hr className="border-white/5 my-4" />

                  <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest block mb-3">Included Benefits</span>
                  <ul className="space-y-2.5">
                    {selectedPlan.features.map((f, idx) => (
                      <li key={idx} className="text-xs text-white/70 flex items-start gap-2">
                        <span className="text-[#D4AF37] mt-0.5 font-bold">✓</span>
                        <span className="leading-tight">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="hidden md:block pt-6 border-t border-white/5">
                  <div className="flex items-center gap-2.5 text-white/40 text-[10px] font-mono leading-relaxed">
                    <Lock className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                    <span>256-bit AES Encryption. SSL certified connection.</span>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: PAYMENT METHOD INPUTS (MD:7 COLUMNS) */}
              <div className="md:col-span-7 p-6 sm:p-8 overflow-y-auto max-h-[85vh] md:max-h-[550px] custom-scrollbar">
                <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#D4AF37]" /> Payment Information
                </h4>

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Church Name */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1.5" htmlFor="checkout-church">
                      Church / Organization Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-3 w-4 h-4 text-white/30" />
                      <input
                        id="checkout-church"
                        type="text"
                        value={formData.churchName}
                        onChange={(e) => setFormData({ ...formData, churchName: e.target.value })}
                        placeholder="Grace Sanctuary Fellowship"
                        className={`w-full bg-[#0A0E2A] border ${errors.churchName ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]/50'} rounded-xl py-2.5 pl-10 pr-4 text-base text-white focus:outline-none transition-all placeholder:text-white/20`}
                      />
                    </div>
                    {errors.churchName && <p className="text-[10px] text-red-400 mt-1 pl-1 font-semibold">{errors.churchName}</p>}
                  </div>

                  {/* Cardholder Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1.5" htmlFor="checkout-name">
                        Cardholder Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 w-4 h-4 text-white/30" />
                        <input
                          id="checkout-name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="John Doe"
                          className={`w-full bg-[#0A0E2A] border ${errors.name ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]/50'} rounded-xl py-2.5 pl-10 pr-4 text-base text-white focus:outline-none transition-all placeholder:text-white/20`}
                        />
                      </div>
                      {errors.name && <p className="text-[10px] text-red-400 mt-1 pl-1 font-semibold">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1.5" htmlFor="checkout-email">
                        Billing Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-white/30" />
                        <input
                          id="checkout-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john@church.org"
                          className={`w-full bg-[#0A0E2A] border ${errors.email ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]/50'} rounded-xl py-2.5 pl-10 pr-4 text-base text-white focus:outline-none transition-all placeholder:text-white/20`}
                        />
                      </div>
                      {errors.email && <p className="text-[10px] text-red-400 mt-1 pl-1 font-semibold">{errors.email}</p>}
                    </div>
                  </div>

                  {/* Card Number */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1.5" htmlFor="checkout-cardno">
                      Card Number
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                      <input
                        id="checkout-cardno"
                        type="text"
                        value={formData.cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        placeholder="4111 2222 3333 4444"
                        className={`w-full bg-[#0A0E2A] border ${errors.cardNumber ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]/50'} rounded-xl py-3 pl-10 pr-4 text-base font-mono text-white focus:outline-none transition-all placeholder:text-white/20`}
                      />
                    </div>
                    {errors.cardNumber && <p className="text-[10px] text-red-400 mt-1 pl-1 font-semibold">{errors.cardNumber}</p>}
                  </div>

                  {/* Expiry, CVC & Zip Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1.5" htmlFor="checkout-expiry">
                        Expiry Date
                      </label>
                      <input
                        id="checkout-expiry"
                        type="text"
                        value={formData.cardExpiry}
                        onChange={(e) => handleExpiryChange(e.target.value)}
                        placeholder="MM/YY"
                        className={`w-full bg-[#0A0E2A] border text-center ${errors.cardExpiry ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]/50'} rounded-xl py-3 text-base font-mono text-white focus:outline-none transition-all placeholder:text-white/20`}
                      />
                      {errors.cardExpiry && <p className="text-[10px] text-red-400 mt-1 text-center font-semibold">{errors.cardExpiry}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1.5" htmlFor="checkout-cvc">
                        CVC Code
                      </label>
                      <input
                        id="checkout-cvc"
                        type="password"
                        value={formData.cardCvc}
                        onChange={(e) => handleCvcChange(e.target.value)}
                        placeholder="•••"
                        className={`w-full bg-[#0A0E2A] border text-center ${errors.cardCvc ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]/50'} rounded-xl py-3 text-base font-mono text-white focus:outline-none transition-all placeholder:text-white/20`}
                      />
                      {errors.cardCvc && <p className="text-[10px] text-red-400 mt-1 text-center font-semibold">{errors.cardCvc}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1.5" htmlFor="checkout-zip">
                        Billing ZIP
                      </label>
                      <input
                        id="checkout-zip"
                        type="text"
                        value={formData.billingZip}
                        onChange={(e) => setFormData({ ...formData, billingZip: e.target.value })}
                        placeholder="90210"
                        className={`w-full bg-[#0A0E2A] border text-center ${errors.billingZip ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]/50'} rounded-xl py-3 text-base font-mono text-white focus:outline-none transition-all placeholder:text-white/20`}
                      />
                      {errors.billingZip && <p className="text-[10px] text-red-400 mt-1 text-center font-semibold">{errors.billingZip}</p>}
                    </div>
                  </div>

                  {/* Payment Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-6 py-3.5 px-6 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0A0E2A] rounded-xl font-extrabold uppercase tracking-widest text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authorizing payment...
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 fill-current" />
                        Authorize payment of {selectedPlan.price}
                      </>
                    )}
                  </button>

                  <div className="flex md:hidden items-center justify-center gap-2 text-white/40 text-[9px] font-mono mt-4">
                    <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Secure 256-bit Encrypted Transaction</span>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-12 flex flex-col items-center justify-center text-center p-8 sm:p-12 min-h-[460px]"
            >
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border-2 border-green-500/30 mb-6">
                <ShieldCheck className="w-9 h-9 text-green-500 animate-bounce" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-[#D4AF37] tracking-tight">Payment Approved!</h3>
              <p className="text-white/80 text-sm max-w-md leading-relaxed mb-6">
                Thank you for subscribing to <strong className="text-white">{selectedPlan.name}</strong>. A receipt of purchase and activation parameters have been dispatched to your billing contact: <span className="text-[#D4AF37] font-semibold font-mono">{formData.email}</span>.
              </p>
              
              <div className="bg-[#0A0E2A] border border-white/5 rounded-xl p-4 w-full max-w-sm mb-8 text-left space-y-2 font-mono text-xs text-white/60">
                <div className="flex justify-between"><span>Merchant:</span><span className="text-white">SermonIQ Systems</span></div>
                <div className="flex justify-between"><span>Subscription Tier:</span><span className="text-[#D4AF37] font-bold">{selectedPlan.name}</span></div>
                <div className="flex justify-between"><span>Charge Amount:</span><span className="text-white font-bold">{selectedPlan.price}</span></div>
                <div className="flex justify-between"><span>Reference ID:</span><span className="text-white uppercase">{Math.random().toString(36).substring(3, 11).toUpperCase()}</span></div>
                <div className="flex justify-between"><span>Status:</span><span className="text-green-500 font-bold">PAID</span></div>
              </div>

              <button
                onClick={handleReset}
                className="px-8 py-3 bg-[#D4AF37] text-[#0A0E2A] hover:bg-[#D4AF37]/90 rounded-full text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Access Dashboard
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
