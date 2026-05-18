import React from 'react';
import { isSupabaseConfigured } from '../lib/supabase';

const ConfigGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (isSupabaseConfigured) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-white/5 p-8 space-y-4">
        <h1 className="text-xl font-semibold text-red-500">Configuração incompleta</h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          O app não encontrou as variáveis do Supabase no build. Na Vercel, abra{' '}
          <strong>Settings → Environment Variables</strong> e adicione:
        </p>
        <ul className="text-sm font-mono text-slate-400 space-y-1">
          <li>VITE_SUPABASE_URL</li>
          <li>VITE_SUPABASE_ANON_KEY</li>
        </ul>
        <p className="text-slate-500 text-xs">
          Depois faça um novo deploy (Redeploy). Sem isso o app não consegue conectar ao banco.
        </p>
      </div>
    </div>
  );
};

export default ConfigGuard;
