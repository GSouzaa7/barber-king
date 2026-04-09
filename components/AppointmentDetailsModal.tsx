import React from 'react';

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 animate-fade-in-up">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex flex-col items-center mb-10 mt-2">
          <div className="w-16 h-16 rounded-full bg-red-600/10 text-red-500 flex items-center justify-center mb-6 border border-red-600/20">
            <span className="material-symbols-outlined text-3xl">content_cut</span>
          </div>
          <h2 className="text-2xl font-light text-slate-900 dark:text-white tracking-wide text-center">Corte de Cabelo + Barba</h2>
          <span className="mt-4 px-4 py-1.5 bg-green-500/10 text-green-500 text-[9px] font-bold uppercase tracking-[0.2em] rounded-full border border-green-500/20">Confirmado</span>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-slate-400">person_pin</span>
              <div>
                <p className="text-[9px] font-medium tracking-[0.2em] uppercase text-slate-400">Profissional</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">Ricardo Santos</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-slate-400">schedule</span>
              <div>
                <p className="text-[9px] font-medium tracking-[0.2em] uppercase text-slate-400">Data e Hora</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">24 de Outubro, 14:30</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-slate-400">timer</span>
              <div>
                <p className="text-[9px] font-medium tracking-[0.2em] uppercase text-slate-400">Duração Estimada</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">1h 15 min</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-slate-400">payments</span>
              <div>
                <p className="text-[9px] font-medium tracking-[0.2em] uppercase text-slate-400">Valor Total</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">R$ 130,00</p>
              </div>
            </div>
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-[0.2em]">Pagamento no Local</span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-10 py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all"
        >
          Fechar Detalhes
        </button>
      </div>
    </div>
  );
};
