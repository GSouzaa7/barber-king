import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RazorIcon } from '../../components/RazorIcon';
import { supabase } from '../../lib/supabase';

const SETUP_CODE = import.meta.env.VITE_ADMIN_SETUP_CODE;

const AdminSetup: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Se o código não está configurado, setup está desativado
  if (!SETUP_CODE) {
    navigate('/admin', { replace: true });
    return null;
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code !== SETUP_CODE) {
      setError('Código de configuração inválido.');
      return;
    }

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Preencha todos os campos.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);

    // 1. Cria o usuário (trigger irá definir role='client' e status='pending' — correto)
    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } } // Nunca enviar role no metadata
    });

    if (authError || !signUpData.user) {
      setLoading(false);
      setError(authError?.message ?? 'Erro ao criar usuário.');
      return;
    }

    // 2. Promove para admin via RPC server-side (valida setup_code no banco, não no frontend)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('promote_to_admin', {
      p_user_id: signUpData.user.id,
      p_setup_code: code,
    });

    setLoading(false);

    if (rpcError || rpcResult?.error) {
      // Desfaz o signup para não deixar usuário órfão
      await supabase.auth.signOut();
      setError(rpcResult?.error ?? rpcError?.message ?? 'Erro ao promover admin.');
      return;
    }

    setDone(true);
  };

  if (done) {
    return (
      <div className="dark">
        <div className="bg-background-dark text-slate-100 flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
              <span className="material-symbols-outlined text-4xl text-green-400">check_circle</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Admin criado com sucesso!</h1>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Para desativar esta página permanentemente, remova a variável{' '}
              <code className="text-red-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">VITE_ADMIN_SETUP_CODE</code>{' '}
              do seu <code className="text-red-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">.env</code> e reinicie o servidor.
            </p>
            <button
              onClick={() => navigate('/admin')}
              className="w-full py-4 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 rounded-xl text-red-500 hover:text-white transition-all font-medium tracking-[0.2em] text-xs uppercase flex items-center justify-center gap-2"
            >
              Ir para o Login
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark">
      <div className="bg-background-dark text-slate-100 font-display flex items-center justify-center min-h-screen p-4 relative overflow-hidden">
        <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[150px] pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-slate-200 mb-6 shadow-2xl">
              <RazorIcon className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-medium tracking-[0.2em] text-white uppercase italic">
              BARBER <span className="text-red-600">KING</span>
            </h1>
            <p className="text-slate-400 text-[10px] mt-3 font-medium tracking-[0.3em] uppercase">Configuração Inicial — Admin</p>
          </div>

          <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
              <span className="material-symbols-outlined text-amber-400 text-sm">warning</span>
              <p className="text-amber-400 text-xs font-medium">Esta página deve ser usada apenas uma vez.</p>
            </div>

            <form onSubmit={handleSetup} className="space-y-5">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-3">Código de Configuração</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">vpn_key</span>
                  <input
                    type="password"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-black/60 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all outline-none text-sm"
                    placeholder="••••••••••••••••"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-3">Nome Completo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">person</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/60 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all outline-none text-sm"
                    placeholder="Nome do administrador"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-3">E-mail</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/60 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all outline-none text-sm"
                    placeholder="admin@barberking.com.br"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-3">Senha</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">lock</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/60 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all outline-none text-sm"
                    placeholder="Mínimo 8 caracteres"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-4 bg-red-600/10 hover:bg-red-600/20 backdrop-blur-md border border-red-600/30 rounded-xl text-red-500 hover:text-white transition-all duration-500 font-medium tracking-[0.2em] text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando...' : 'Criar Conta Admin'}
                <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => navigate('/admin')} className="text-slate-500 text-[10px] tracking-[0.2em] font-medium uppercase hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
