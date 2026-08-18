import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, CheckCircle2, Building2, User, Mail, Phone, MapPin, Loader2 } from 'lucide-react';

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoRequestModal({ isOpen, onClose }: DemoRequestModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    churchAddress: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!formData.name.trim()) tempErrors.name = 'Full name is required';
    if (!formData.email.trim()) {
      tempErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      tempErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) {
      tempErrors.phone = 'Phone number is required';
    }
    if (!formData.churchAddress.trim()) {
      tempErrors.churchAddress = 'Church physical address is required';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate API request delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      churchAddress: ''
    });
    setErrors({});
    setIsSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleReset}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-[#0D1236] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl z-10 p-6 sm:p-8"
        >
          {/* Close button */}
          <button
            onClick={handleReset}
            className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {!isSuccess ? (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Request SermonIQ Demo</h3>
                  <p className="text-xs text-white/50 mt-0.5">Experience next-gen sanctuary intelligence</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 font-sans">
                {/* Full Name */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1.5" htmlFor="full-name">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                    <input
                      id="full-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Pastor John Doe"
                      className={`w-full bg-[#0A0E2A] border ${errors.name ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]/50'} rounded-xl py-3 pl-11 pr-4 text-base text-white focus:outline-none transition-all placeholder:text-white/20`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-400 mt-1 pl-1 font-medium">{errors.name}</p>}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1.5" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="pastor@churchname.org"
                      className={`w-full bg-[#0A0E2A] border ${errors.email ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]/50'} rounded-xl py-3 pl-11 pr-4 text-base text-white focus:outline-none transition-all placeholder:text-white/20`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-400 mt-1 pl-1 font-medium">{errors.email}</p>}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1.5" htmlFor="phone">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className={`w-full bg-[#0A0E2A] border ${errors.phone ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]/50'} rounded-xl py-3 pl-11 pr-4 text-base text-white focus:outline-none transition-all placeholder:text-white/20`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-400 mt-1 pl-1 font-medium">{errors.phone}</p>}
                </div>

                {/* Church Address */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1.5" htmlFor="church-address">
                    Church Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                    <input
                      id="church-address"
                      type="text"
                      value={formData.churchAddress}
                      onChange={(e) => setFormData({ ...formData, churchAddress: e.target.value })}
                      placeholder="123 Grace Way, Springfield"
                      className={`w-full bg-[#0A0E2A] border ${errors.churchAddress ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]/50'} rounded-xl py-3 pl-11 pr-4 text-base text-white focus:outline-none transition-all placeholder:text-white/20`}
                    />
                  </div>
                  {errors.churchAddress && <p className="text-xs text-red-400 mt-1 pl-1 font-medium">{errors.churchAddress}</p>}
                </div>

                {/* Form Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 py-3 px-6 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0A0E2A] rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Securing Submission...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Request Live Demo
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center py-6"
            >
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border-2 border-green-500/30 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-[#D4AF37] tracking-tight">Demo Request Confirmed!</h3>
              <p className="text-white/70 text-sm max-w-sm leading-relaxed mb-6">
                Welcome to the future of sanctuary analytics. Our church integration team will reach out to you within 24 hours at <span className="text-[#D4AF37] font-medium font-mono">{formData.email}</span> to coordinate your live session.
              </p>
              <button
                onClick={handleReset}
                className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Close Window
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
