import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RazorIcon } from '../../components/RazorIcon';
import { supabase } from '../../lib/supabase';

const BarberRegister: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'barber', status: 'pending', name }
      }
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    navigate('/pending-access');
  };

  return (
    <div className="dark">
      <div className="bg-background-dark text-slate-100 font-display min-h-screen flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3">
        <RazorIcon className="w-12 h-12 text-slate-200 drop-shadow-xl" />
        <h1 className="text-xl font-extrabold tracking-tight text-white uppercase italic">BARBER <span className="text-primary">KING</span></h1>
      </div>
      <div className="w-full max-w-md bg-card-dark border border-white/10 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Criar Conta Barbeiro</h2>
          <p className="text-slate-400 text-sm">Preencha os dados para solicitar acesso</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">person</span>
              <input 
                type="text" 
                id="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-600 focus:border-primary focus:ring-0 transition-all outline-none" 
                placeholder="Ex: João Silva" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">E-mail Profissional</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">mail</span>
              <input 
                type="email" 
                id="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-600 focus:border-primary focus:ring-0 transition-all outline-none" 
                placeholder="barbeiro@barberking.com.br" 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block">Senha</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">lock</span>
              <input 
                type="password" 
                id="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-11 pr-12 text-white placeholder:text-slate-600 focus:border-primary focus:ring-0 transition-all outline-none" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Enviando...' : 'SOLICITAR ACESSO'}
            <span className="material-symbols-outlined text-lg">how_to_reg</span>
          </button>
        </form>
        <div className="mt-8 pt-6 border-t border-white/5 text-center space-y-4">
          <button 
            onClick={() => navigate('/barbeiro')} 
            className="text-sm text-slate-400 hover:text-primary transition-colors block mx-auto"
          >
            Já tem uma conta? Faça login
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default BarberRegister;
