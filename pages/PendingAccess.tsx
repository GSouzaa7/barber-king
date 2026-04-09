import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PendingAccess: React.FC = () => {
    const navigate = useNavigate();
    const { status, signOut } = useAuth();

    // 'rejected' = acesso negado na triagem inicial OU revogado posteriormente
    const isDenied = status === 'rejected';

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#259af4]/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#22c55e]/5 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <div className="bg-[#111111] border border-white/5 p-10 md:p-14 rounded-3xl max-w-md w-full relative z-10 text-center shadow-2xl">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isDenied ? 'bg-danger-red/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-warning-amber/20 shadow-[0_0_30px_rgba(245,158,11,0.2)]'}`}>
                    <span className={`material-symbols-outlined text-4xl ${isDenied ? 'text-danger-red line-through' : 'text-warning-amber animate-pulse'}`}>
                        {isDenied ? 'block' : 'hourglass_empty'}
                    </span>
                </div>

                <h1 className={`text-3xl font-extrabold mb-4 tracking-tight ${isDenied ? 'text-danger-red' : 'text-white'}`}>
                    {isDenied ? 'Acesso Revogado' : 'Acesso Pendente'}
                </h1>

                <p className="text-slate-400 text-base leading-relaxed mb-8">
                    {isDenied
                        ? 'Seu acesso foi desativado pelo Administrador. Entre em contato com a barbearia para mais informações.'
                        : 'Seu cadastro foi recebido com sucesso! No momento, sua conta está aguardando a liberação do Administrador da barbearia.'
                    }
                </p>

                {!isDenied && (
                    <div className="bg-[#1A1A1A] border border-border-subtle rounded-xl p-4 mb-8">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-xl">info</span>
                            <p className="text-sm font-bold text-slate-300 text-left">
                                Assim que seu acesso for aprovado, você poderá fazer o login normalmente.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => signOut().then(() => navigate('/'))}
                        className="w-full bg-transparent border-2 border-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/5 transition-colors focus:ring-4 focus:ring-white/10 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Sair
                    </button>
                </div>
            </div>

            <div className="mt-12 text-center relative z-10">
                <p className="text-xl font-extrabold text-white tracking-widest flex items-center gap-2 justify-center">
                    <span className="material-symbols-outlined text-primary">content_cut</span>
                    BARBER KING
                </p>
            </div>
        </div>
    );
};

export default PendingAccess;
