
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RazorIcon } from '../../components/RazorIcon';
import { supabase } from '../../lib/supabase';

const ClientRegister: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validação: senhas devem coincidir
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    // Validação: senha mínima
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    // SECURITY: role NÃO é enviado pelo frontend.
    // O trigger handle_new_user() no banco força role='client'.
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    navigate('/client/dashboard');
  };

  return (
    <div className="dark">
      <div className="bg-background-dark text-slate-100 font-display flex items-center justify-center min-h-screen p-4 relative overflow-hidden">
        {/* Cinematic Noise Overlay */}
        <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        
        {/* Dynamic Volumetric Lights */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[150px] pointer-events-none animate-breath"></div>
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none animate-breath" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none animate-breath" style={{ animationDelay: '4s' }}></div>

        <div className="w-full max-w-md relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-slate-200 mb-6 shadow-2xl relative group cursor-pointer transition-transform hover:scale-105 duration-500">
              <div className="absolute inset-0 bg-red-600/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse"></div>
              <RazorIcon className="w-8 h-8 relative z-10 group-hover:text-white transition-colors duration-500" />
            </div>
            <h1 className="text-2xl font-medium tracking-[0.2em] text-white uppercase italic">
              CRIE SUA <span className="text-red-600">CONTA</span>
            </h1>
            <p className="text-slate-400 text-[10px] mt-3 font-medium tracking-[0.3em] uppercase">Junte-se ao clube premium</p>
          </div>
          
          <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-3">Nome Completo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">person</span>
                  <input 
                    type="text" 
                    id="name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/60 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 focus:bg-black/80 transition-all outline-none text-sm" 
                    placeholder="Seu nome completo" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-3">E-mail</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">mail</span>
                  <input 
                    type="email" 
                    id="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/60 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 focus:bg-black/80 transition-all outline-none text-sm" 
                    placeholder="seu@email.com" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-3">Senha</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">lock</span>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/60 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 focus:bg-black/80 transition-all outline-none text-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="confirm_password" className="block text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-3">Confirmar</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">lock_reset</span>
                    <input 
                      type="password" 
                      id="confirm_password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-black/60 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 focus:bg-black/80 transition-all outline-none text-sm" 
                      placeholder="••••••••" 
                      required 
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2 tracking-wide">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-8 py-4 bg-red-600/10 hover:bg-red-600/20 backdrop-blur-md border border-red-600/30 rounded-xl text-red-500 hover:text-white transition-all duration-500 font-medium tracking-[0.2em] text-xs uppercase glow-red disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processando...' : 'CRIAR CONTA'}
              </button>
            </form>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-slate-500 text-[11px] tracking-[0.15em] font-medium uppercase">
              Já é membro? 
              <button onClick={() => navigate('/login')} className="text-white hover:text-red-500 transition-colors ml-2 bg-transparent border-none cursor-pointer underline underline-offset-4 decoration-white/30 hover:decoration-red-500">
                Acessar conta
              </button>
            </p>
          </div>
          <div className="mt-12 text-center text-slate-600 text-[9px] uppercase tracking-[0.3em] font-medium">
            <p>© 2023 BARBER KING — EXCLUSIVE CLUB</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientRegister;
