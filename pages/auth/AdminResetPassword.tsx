import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RazorIcon } from '../../components/RazorIcon';
import { supabase } from '../../lib/supabase';

const AdminResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await supabase.auth.signOut();
    navigate('/admin', { replace: true, state: { message: 'Senha atualizada. Faça login com a nova senha.' } });
  };

  return (
    <div className="dark">
      <div className="bg-background-dark text-slate-100 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <RazorIcon className="w-8 h-8 text-slate-200 mb-4" />
            <h1 className="text-xl text-white uppercase tracking-[0.2em] italic">BARBER <span className="text-red-600">KING</span></h1>
            <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-[0.3em]">Nova senha</p>
          </div>
          <div className="bg-[#0a0a0a]/80 border border-white/5 rounded-3xl p-8">
            {!ready ? (
              <p className="text-slate-400 text-sm text-center">Validando link… Use o link do e-mail ou solicite outro na tela de login.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nova senha" className="w-full bg-black/60 border border-white/5 rounded-xl py-3 px-4 text-white text-sm" required />
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar senha" className="w-full bg-black/60 border border-white/5 rounded-xl py-3 px-4 text-white text-sm" required />
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button type="submit" disabled={loading} className="w-full py-3 bg-red-600/20 border border-red-600/30 rounded-xl text-red-400 text-xs uppercase disabled:opacity-50">{loading ? 'Salvando…' : 'Definir nova senha'}</button>
              </form>
            )}
          </div>
          <button type="button" onClick={() => navigate('/admin')} className="mt-4 w-full text-slate-500 text-xs uppercase hover:text-white">Voltar ao login</button>
        </div>
      </div>
    </div>
  );
};

export default AdminResetPassword;
