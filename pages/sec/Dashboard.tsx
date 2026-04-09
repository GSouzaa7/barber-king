import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RazorIcon } from '../../components/RazorIcon';

const SecDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen p-8">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <RazorIcon className="w-10 h-10 text-slate-200" />
          <h1 className="text-xl font-extrabold tracking-tight text-white uppercase italic">Portal da <span className="text-primary">Secretaria</span></h1>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-sm font-bold"
        >
          Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto text-center py-20 bg-card-dark border border-white/5 rounded-3xl">
        <span className="material-symbols-outlined text-6xl text-primary mb-6">construction</span>
        <h2 className="text-3xl font-extrabold text-white mb-4">Dashboard em Construção</h2>
        <p className="text-slate-400 max-w-lg mx-auto">
          Esta área será desenvolvida em breve para gerenciar agendamentos, recepção de clientes e controle de fluxo do salão.
        </p>
      </main>
    </div>
  );
};

export default SecDashboard;
