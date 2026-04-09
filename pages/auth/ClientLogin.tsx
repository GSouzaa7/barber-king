
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RazorIcon } from '../../components/RazorIcon';
import { supabase } from '../../lib/supabase';

const ClientLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redireciona automaticamente se o usuário já estiver autenticado
  // (ex: após clicar no link de confirmação de e-mail)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profile?.role === 'client') {
        navigate('/client/dashboard', { replace: true });
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      setError('E-mail ou senha incorretos.');
      return;
    }

    // Verifica role na tabela profiles (definido por trigger no banco)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    setLoading(false);

    if (!profile || profile.role !== 'client') {
      await supabase.auth.signOut();
      setError('Acesso não autorizado para este portal.');
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
              BARBER <span className="text-red-600">KING</span>
            </h1>
            <p className="text-slate-400 text-[10px] mt-3 font-medium tracking-[0.3em] uppercase">Sua conta premium</p>
          </div>
          
          <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="user_id" className="block text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-3">E-mail</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">mail</span>
                  <input
                    type="email"
                    id="user_id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/60 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 focus:bg-black/80 transition-all outline-none text-sm"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="password" className="block text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">Senha</label>
                </div>
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
                <div className="flex justify-end mt-3">
                  <a href="#" className="text-xs font-medium text-slate-500 hover:text-white transition-colors tracking-wide">
                    Esqueceu a senha?
                  </a>
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
                {loading ? 'Verificando...' : 'Acessar'}
              </button>

              <div className="relative flex items-center my-2">
                <div className="flex-1 border-t border-white/5"></div>
                <span className="px-3 text-slate-600 text-[10px] uppercase tracking-[0.2em]">ou</span>
                <div className="flex-1 border-t border-white/5"></div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full py-4 bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-md border border-white/10 hover:border-white/20 rounded-xl text-slate-400 hover:text-white transition-all duration-500 font-medium tracking-[0.2em] text-xs uppercase flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                Criar conta
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-slate-600 text-[10px] tracking-[0.15em] font-medium uppercase">
              Já tem conta? Faça login acima.
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

export default ClientLogin;
