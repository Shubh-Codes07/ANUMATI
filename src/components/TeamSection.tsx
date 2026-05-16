import React from 'react';
import { motion } from 'motion/react';
import { X, Github, Linkedin, Mail } from 'lucide-react';

interface TeamSectionProps {
  onClose: () => void;
}

const teamMembers = [
  {
    name: 'Shubham R Patil',
    role: 'Lead Developer / Architect',
    branch: 'Info Science & Eng (2nd Year)',
    bio: 'The Architect. Turning sleepless nights into seamless code. Engineered the core RBAC security and routing protocols.',
    image: '/srp.jpg'
  },
  {
    name: 'Swayam V Rajai',
    role: 'System Optimization',
    branch: 'Mechanical Eng (2nd Year)',
    bio: 'The Optimizer. Bringing mechanical precision to software execution. Ensuring the backend scales flawlessly under peak gate traffic.',
    image: '/svr.jpg'
  },
  {
    name: 'Tanisha G Shinde',
    role: 'Product & UX Design',
    branch: 'Mechanical Eng (2nd Year)',
    bio: 'The Visionary. Designing user flows so smooth they feel frictionless. Mapped the visual identity and interaction states.',
    image: '/tgs.jpg'
  },
  {
    name: 'Supriya A Kusabikal',
    role: 'Hardware/Software Integration',
    branch: 'Electronics & Comm (2nd Year)',
    bio: 'The Integrator. Bridging the gap between physical gates and digital packets. Managed the scanner logic and data payloads.',
    image: '/sak.jpg'
  }
];

export default function TeamSection({ onClose }: TeamSectionProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto"
    >
      <div className="absolute inset-0 bg-dark pointer-events-none opacity-80" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-7xl mx-auto my-auto py-12">
        <button 
          onClick={onClose}
          className="absolute -top-4 right-0 md:-top-12 md:right-0 w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:border-brand transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-16">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-brand font-black uppercase tracking-[0.3em] text-xs italic mb-4"
          >
            ANUMATI Initiative
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-black tracking-tighter uppercase italic text-white"
          >
            The <span className="neon-text not-italic">Team</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (i * 0.1) }}
              className="glass p-8 rounded-[2.5rem] hover:-translate-y-2 group flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Card top border accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="w-32 h-32 rounded-full border-[3px] border-dark-border group-hover:border-brand transition-colors mb-6 p-1 overflow-hidden relative">
                <div className="absolute inset-0 bg-brand/10 animate-pulse rounded-full" />
                <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-full h-full object-cover rounded-full bg-dark-surface"
                  onError={(e) => {
                    // Fallback avatar if image doesn't exist
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name.replace(/\s/g, '')}&backgroundColor=0f1424`;
                  }}
                />
              </div>

              <h3 className="font-display text-2xl font-black text-white mb-1 group-hover:text-brand transition-colors">{member.name}</h3>
              <p className="font-sans text-brand font-bold text-sm uppercase tracking-wider mb-1">{member.role}</p>
              <p className="font-sans text-white/40 text-xs font-medium mb-6">{member.branch}</p>
              
              <p className="font-sans text-white/60 text-sm leading-relaxed italic border-t border-white/5 pt-6 mt-auto">
                {member.bio}
              </p>

              <div className="flex gap-4 mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-brand transition-all"><Github className="w-4 h-4" /></a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-brand transition-all"><Linkedin className="w-4 h-4" /></a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-brand transition-all"><Mail className="w-4 h-4" /></a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
