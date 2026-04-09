import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';
import { useSearchParams } from 'react-router-dom';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AppUser {
    id: string;
    name: string;
    email: string;
    role: string;
    dbStatus: 'pending' | 'approved' | 'rejected';
    date?: string;
}

interface SalonConfig {
    name: string;
    phone: string;
    address: string;
    instagram: string;
    whatsapp: string;
}

interface ScheduleDay {
    day: string;
    day_index: number; // 0=Dom … 6=Sáb
    active: boolean;
    open: string;
    close: string;
}

interface FinancialConfig {
    pix: string;
    debit: string;
    credit1: string;
    creditx: string;
    comService: string;
    comProduct: string;
    discountFeeBeforeCommission: boolean;
    globalTax: string;
}

interface CustomCommission {
    id: string | number;
    professional_id: string;
    name: string;
    service: string;
    product: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const DEFAULT_SCHEDULE: ScheduleDay[] = DAY_NAMES.map((day, i) => ({
    day,
    day_index: i,
    active: i >= 2 && i <= 6, // Terça-Sábado ativas por padrão
    open: i === 6 ? '08:00' : '09:00',
    close: i === 6 ? '19:00' : '18:00',
}));

const EMPTY_SALON: SalonConfig = { name: '', phone: '', address: '', instagram: '', whatsapp: '' };

const EMPTY_FINANCIAL: FinancialConfig = {
    pix: '0.00', debit: '0.00', credit1: '0.00', creditx: '0.00',
    comService: '0', comProduct: '0', discountFeeBeforeCommission: false, globalTax: '0.00',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role: string): string {
    const map: Record<string, string> = {
        admin: 'Admin', barber: 'Barbeiro', sec: 'Secretária', client: 'Cliente',
    };
    return map[role] ?? role;
}

// ─── Componente principal ─────────────────────────────────────────────────────

const AdminSettings: React.FC = () => {
    const { selectedMatriz } = useMatriz();
    const matrizId = selectedMatriz?.id ?? null;

    // Tabs
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'acessos' | 'salao' | 'taxas'>(() => {
        const tab = searchParams.get('tab');
        return (tab === 'salao' || tab === 'taxas') ? tab : 'acessos';
    });

    // Sincroniza com ?tab= da URL (mobile bottom nav)
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'acessos' || tab === 'salao' || tab === 'taxas') {
            setActiveTab(tab);
        } else if (!tab) {
            setActiveTab('acessos');
        }
    }, [searchParams]);

    // ── Estado: Salão ──────────────────────────────────────────────────────────
    const [salonConfig, setSalonConfig] = useState<SalonConfig>(EMPTY_SALON);
    const [schedule, setSchedule] = useState<ScheduleDay[]>(DEFAULT_SCHEDULE);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isSavingSalon, setIsSavingSalon] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [isLoadingSalon, setIsLoadingSalon] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Estado: Usuários ───────────────────────────────────────────────────────
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // ── Estado: Financeiro ─────────────────────────────────────────────────────
    const [financialConfig, setFinancialConfig] = useState<FinancialConfig>(EMPTY_FINANCIAL);
    const [customCommissions, setCustomCommissions] = useState<CustomCommission[]>([]);
    const [isSavingTaxas, setIsSavingTaxas] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [isLoadingTaxas, setIsLoadingTaxas] = useState(false);

    // ─── Fetches ───────────────────────────────────────────────────────────────

    const fetchUsers = useCallback(async () => {
        setIsLoadingUsers(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, role, status, full_name, email, created_at')
            .order('created_at', { ascending: false });

        if (!error && data) {
            const mapped: AppUser[] = data.map(p => ({
                id: p.id,
                name: p.full_name || p.email || '(sem nome)',
                email: p.email || '',
                role: roleLabel(p.role),
                dbStatus: p.status as 'pending' | 'approved' | 'rejected',
                date: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : undefined,
            }));
            setUsers(mapped);
        }
        setIsLoadingUsers(false);
    }, []);

    const fetchSalonData = useCallback(async () => {
        if (!matrizId) return;
        setIsLoadingSalon(true);

        const [settingsRes, schedulesRes] = await Promise.all([
            supabase.from('salon_settings').select('*').eq('matriz_id', matrizId).maybeSingle(),
            supabase.from('salon_schedules').select('*').eq('matriz_id', matrizId).order('day_of_week'),
        ]);

        if (settingsRes.data) {
            setSalonConfig({
                name: settingsRes.data.name ?? '',
                phone: settingsRes.data.phone ?? '',
                address: settingsRes.data.address ?? '',
                instagram: settingsRes.data.instagram ?? '',
                whatsapp: settingsRes.data.whatsapp ?? '',
            });
            if (settingsRes.data.logo_url) setLogoPreview(settingsRes.data.logo_url);
        } else {
            setSalonConfig(EMPTY_SALON);
            setLogoPreview(null);
        }

        if (schedulesRes.data && schedulesRes.data.length > 0) {
            const merged = DEFAULT_SCHEDULE.map(def => {
                const row = schedulesRes.data!.find(r => r.day_of_week === def.day_index);
                if (!row) return def;
                return {
                    ...def,
                    active: row.is_active,
                    open: row.open_time?.slice(0, 5) ?? def.open,
                    close: row.close_time?.slice(0, 5) ?? def.close,
                };
            });
            setSchedule(merged);
        } else {
            setSchedule(DEFAULT_SCHEDULE);
        }

        setIsLoadingSalon(false);
    }, [matrizId]);

    const fetchFinancialData = useCallback(async () => {
        if (!matrizId) return;
        setIsLoadingTaxas(true);

        const [feesRes, commRes, profCommRes] = await Promise.all([
            supabase.from('payment_fees').select('*').eq('matriz_id', matrizId),
            supabase.from('commission_settings').select('*').eq('matriz_id', matrizId).maybeSingle(),
            supabase
                .from('professional_commissions')
                .select('*, professionals(id, name)')
                .eq('matriz_id', matrizId),
        ]);

        // Taxas de pagamento
        if (feesRes.data) {
            const fees = feesRes.data;
            const get = (type: string) =>
                (fees.find(f => f.fee_type === type)?.percentage ?? 0).toFixed(2);
            setFinancialConfig(prev => ({
                ...prev,
                pix: get('pix'),
                debit: get('debit'),
                credit1: get('credit_immediate'),
                creditx: get('credit_installments'),
            }));
        }

        // Comissões globais
        if (commRes.data) {
            const c = commRes.data;
            setFinancialConfig(prev => ({
                ...prev,
                comService: String(c.service_commission ?? 0),
                comProduct: String(c.product_commission ?? 0),
                globalTax: (c.global_tax ?? 0).toFixed(2),
                discountFeeBeforeCommission: c.discount_fee_before_commission ?? false,
            }));
        }

        // Comissões customizadas por profissional
        if (profCommRes.data) {
            const mapped: CustomCommission[] = profCommRes.data.map((r: any) => ({
                id: r.id,
                professional_id: r.professional_id,
                name: r.professionals?.name ?? '(sem nome)',
                service: String(r.service_commission),
                product: String(r.product_commission),
            }));
            setCustomCommissions(mapped);
        } else {
            setCustomCommissions([]);
        }

        setIsLoadingTaxas(false);
    }, [matrizId]);

    // ─── Effects ───────────────────────────────────────────────────────────────

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        if (matrizId) {
            fetchSalonData();
            fetchFinancialData();
        }
    }, [matrizId, fetchSalonData, fetchFinancialData]);

    // ─── Handlers: Usuários ────────────────────────────────────────────────────

    // Usa RPC server-side que valida: caller é admin, alvo não é admin, nunca deleta.
    const updateUserStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
        const { data, error } = await supabase.rpc('update_staff_status', {
            p_target_user_id: id,
            p_new_status: newStatus,
        });

        if (error || data?.error) {
            console.error('[Settings] Erro ao atualizar status:', error?.message ?? data?.error);
            return;
        }

        setUsers(prev =>
            prev.map(u => u.id === id ? { ...u, dbStatus: newStatus } : u)
        );
    };

    const handleApprove = (id: string) => updateUserStatus(id, 'approved');
    const handleDeny    = (id: string) => updateUserStatus(id, 'rejected');
    const handleRevoke  = (id: string) => updateUserStatus(id, 'rejected');

    // ─── Handlers: Salão ───────────────────────────────────────────────────────

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSaveSalon = async () => {
        if (!matrizId) return;
        setIsSavingSalon('saving');

        try {
            // Upsert salon_settings
            const { error: settingsError } = await supabase
                .from('salon_settings')
                .upsert(
                    {
                        matriz_id: matrizId,
                        name: salonConfig.name,
                        phone: salonConfig.phone,
                        address: salonConfig.address,
                        instagram: salonConfig.instagram,
                        whatsapp: salonConfig.whatsapp,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'matriz_id' }
                );

            if (settingsError) throw settingsError;

            // Upsert cada dia da semana
            const scheduleRows = schedule.map(s => ({
                matriz_id: matrizId,
                day_of_week: s.day_index,
                is_active: s.active,
                open_time: s.open + ':00',
                close_time: s.close + ':00',
                updated_at: new Date().toISOString(),
            }));

            const { error: schedError } = await supabase
                .from('salon_schedules')
                .upsert(scheduleRows, { onConflict: 'matriz_id,day_of_week' });

            if (schedError) throw schedError;

            setIsSavingSalon('success');
            setTimeout(() => setIsSavingSalon('idle'), 2500);
        } catch (err) {
            console.error('[Settings] Erro ao salvar salão:', err);
            setIsSavingSalon('error');
            setTimeout(() => setIsSavingSalon('idle'), 3000);
        }
    };

    // ─── Handlers: Taxas ───────────────────────────────────────────────────────

    const handleSaveTaxas = async () => {
        if (!matrizId) return;
        setIsSavingTaxas('saving');

        try {
            // Upsert payment_fees (4 tipos)
            const feeRows = [
                { matriz_id: matrizId, fee_type: 'pix',                 percentage: parseFloat(financialConfig.pix) || 0 },
                { matriz_id: matrizId, fee_type: 'debit',               percentage: parseFloat(financialConfig.debit) || 0 },
                { matriz_id: matrizId, fee_type: 'credit_immediate',    percentage: parseFloat(financialConfig.credit1) || 0 },
                { matriz_id: matrizId, fee_type: 'credit_installments', percentage: parseFloat(financialConfig.creditx) || 0 },
            ];

            const { error: feesError } = await supabase
                .from('payment_fees')
                .upsert(feeRows, { onConflict: 'matriz_id,fee_type' });

            if (feesError) throw feesError;

            // Upsert commission_settings
            const { error: commError } = await supabase
                .from('commission_settings')
                .upsert(
                    {
                        matriz_id: matrizId,
                        service_commission:             parseFloat(financialConfig.comService) || 0,
                        product_commission:             parseFloat(financialConfig.comProduct) || 0,
                        global_tax:                     parseFloat(financialConfig.globalTax) || 0,
                        discount_fee_before_commission: financialConfig.discountFeeBeforeCommission,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'matriz_id' }
                );

            if (commError) throw commError;

            // Upsert comissões customizadas por profissional
            if (customCommissions.length > 0) {
                const profRows = customCommissions.map(c => ({
                    id: typeof c.id === 'string' && c.id.includes('-') ? c.id : undefined,
                    matriz_id: matrizId,
                    professional_id: c.professional_id,
                    service_commission: parseFloat(c.service) || 0,
                    product_commission: parseFloat(c.product) || 0,
                    updated_at: new Date().toISOString(),
                }));

                const { error: profError } = await supabase
                    .from('professional_commissions')
                    .upsert(profRows, { onConflict: 'matriz_id,professional_id' });

                if (profError) throw profError;
            }

            setIsSavingTaxas('success');
            setTimeout(() => setIsSavingTaxas('idle'), 2500);
        } catch (err) {
            console.error('[Settings] Erro ao salvar taxas:', err);
            setIsSavingTaxas('error');
            setTimeout(() => setIsSavingTaxas('idle'), 3000);
        }
    };

    const handleDeleteCommission = async (id: string | number) => {
        if (typeof id === 'string' && id.includes('-')) {
            await supabase.from('professional_commissions').delete().eq('id', id);
        }
        setCustomCommissions(prev => prev.filter(c => c.id !== id));
    };

    // ─── Derivados: Usuários ───────────────────────────────────────────────────

    const pendingRequests = users.filter(u => u.dbStatus === 'pending');
    const activeUsers     = users.filter(u => u.dbStatus === 'approved' && u.role !== 'Cliente');
    const inactiveUsers   = users.filter(u => u.dbStatus === 'rejected');

    // ─── Sidebar ───────────────────────────────────────────────────────────────

    const sidebarItems = [
        { icon: 'grid_view',             label: 'Início',        path: '/admin/dashboard' },
        { icon: 'calendar_today',        label: 'Agenda',        path: '/admin/agenda' },
        { icon: 'group',                 label: 'Contatos',      path: '/admin/clients' },
        { icon: 'receipt_long',          label: 'Atendimento',   path: '/admin/atendimento' },
        { icon: 'content_cut',           label: 'Profissionais', path: '/admin/professionals' },
        { icon: 'inventory_2',           label: 'Estoque',       path: '/admin/inventory' },
        { icon: 'account_balance_wallet', label: 'Financeiro',   path: '/admin/financial' },
    ];

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex bg-[#0A0A0A] min-h-screen font-sans text-slate-300">
            <Sidebar items={sidebarItems} portalName="BARBER KING" />
            <main className="flex-1 lg:ml-20 p-8 pb-32 overflow-y-auto">

                <div className="mb-8">
                    <h1 className="text-4xl text-white font-medium tracking-tight uppercase flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500 text-4xl">settings</span>
                        Configurações do Sistema
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm max-w-2xl leading-relaxed">
                        Gerencie acessos de equipe, dados públicos da barbearia e regras de comissionamento.
                    </p>
                    {!matrizId && (
                        <div className="mt-3 flex items-center gap-2 text-warning-amber text-xs font-medium">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            Nenhuma matriz selecionada — algumas configurações não estarão disponíveis.
                        </div>
                    )}
                </div>

                {/* Sub Navigation */}
                <div className="hidden lg:flex items-center gap-2 mb-8 bg-[#151515] p-1.5 rounded-xl border border-white/5 w-max">
                    <button
                        onClick={() => setActiveTab('acessos')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'acessos'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                        Acessos & Permissões
                    </button>
                    <button
                        onClick={() => setActiveTab('salao')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'salao'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">store</span>
                        Dados do Salão
                    </button>
                    <button
                        onClick={() => setActiveTab('taxas')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'taxas'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">percent</span>
                        Taxas & Comissões
                    </button>
                </div>

                {/* ──────────────────────────────────────────────────────────────
                    TAB: ACESSOS & PERMISSÕES
                ────────────────────────────────────────────────────────────── */}
                <div className="animate-fadeIn">
                    {activeTab === 'acessos' && (
                        <div className="space-y-6">

                            {isLoadingUsers && (
                                <div className="flex items-center justify-center py-12 text-slate-500 gap-3">
                                    <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                                    Carregando usuários...
                                </div>
                            )}

                            {!isLoadingUsers && (
                                <>
                                    {/* Pendentes */}
                                    <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-warning-amber"></div>
                                        <h2 className="text-xl text-white font-medium tracking-tight uppercase mb-6 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-warning-amber">hourglass_top</span>
                                            Solicitações Pendentes
                                        </h2>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/10 text-xs tracking-[0.2em] uppercase text-slate-500 font-medium">
                                                        <th className="pb-3 px-4">Profissional</th>
                                                        <th className="pb-3 px-4">Cargo Solicitado</th>
                                                        <th className="pb-3 px-4">Data</th>
                                                        <th className="pb-3 px-4 text-center">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pendingRequests.map(req => (
                                                        <tr key={req.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                            <td className="py-4 px-4">
                                                                <p className="text-white font-medium">{req.name}</p>
                                                                <p className="text-xs text-slate-500">{req.email}</p>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <span className={`px-2 py-1 rounded bg-white/5 text-xs font-medium border border-white/10 ${req.role === 'Barbeiro' ? 'text-red-500' : 'text-slate-400'}`}>
                                                                    {req.role}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-4 text-sm font-medium">{req.date || '-'}</td>
                                                            <td className="py-4 px-4">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => handleApprove(req.id)}
                                                                        className="w-8 h-8 rounded bg-success-green/10 text-success-green hover:bg-success-green hover:text-white transition-colors flex items-center justify-center border border-success-green/20"
                                                                        title="Aprovar Acesso"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">check</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeny(req.id)}
                                                                        className="w-8 h-8 rounded bg-danger-red/10 text-danger-red hover:bg-danger-red hover:text-white transition-colors flex items-center justify-center border border-danger-red/20"
                                                                        title="Recusar"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {pendingRequests.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="py-8 text-center text-slate-500 font-medium">
                                                                Nenhuma solicitação pendente no momento.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Ativos */}
                                    <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
                                        <h2 className="text-xl text-white font-medium tracking-tight uppercase mb-6 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-success-green">group</span>
                                            Usuários Ativos
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {activeUsers.map(user => (
                                                <div key={user.id} className="p-4 border border-border-subtle rounded-xl bg-[#151515] flex flex-col gap-3 group">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-white font-medium">{user.name}</p>
                                                            <p className="text-xs text-slate-500">{user.email}</p>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded text-[10px] font-medium border border-white/10 ${
                                                            user.role === 'Admin' ? 'bg-danger-red/10 text-danger-red' :
                                                            user.role === 'Barbeiro' ? 'bg-red-600/10 text-red-500' : 'bg-slate-500/10 text-slate-400'
                                                        }`}>
                                                            {user.role}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/5">
                                                        <div className="flex items-center gap-1.5 text-success-green text-xs font-medium">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse"></div>
                                                            Acesso Liberado
                                                        </div>
                                                        {user.role !== 'Admin' && (
                                                            <button
                                                                onClick={() => handleRevoke(user.id)}
                                                                className="text-xs text-danger-red font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">block</span>
                                                                Revogar Acesso
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {activeUsers.length === 0 && (
                                                <p className="text-slate-500 text-sm col-span-3">Nenhum usuário ativo.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inativos */}
                                    {inactiveUsers.length > 0 && (
                                        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 mt-6">
                                            <h2 className="text-xl text-white font-medium tracking-tight uppercase mb-6 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-danger-red">person_off</span>
                                                Usuários Inativos
                                            </h2>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {inactiveUsers.map(user => (
                                                    <div key={user.id} className="p-4 border border-border-subtle rounded-xl bg-[#151515] flex flex-col gap-3 group opacity-70 hover:opacity-100 transition-opacity">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="text-white font-medium">{user.name}</p>
                                                                <p className="text-xs text-slate-500">{user.email}</p>
                                                            </div>
                                                            <span className={`px-2 py-1 rounded text-[10px] font-medium border border-white/10 ${
                                                                user.role === 'Admin' ? 'bg-danger-red/10 text-danger-red' :
                                                                user.role === 'Barbeiro' ? 'bg-red-600/10 text-red-500' : 'bg-slate-500/10 text-slate-400'
                                                            }`}>
                                                                {user.role}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/5">
                                                            <div className="flex items-center gap-1.5 text-danger-red text-xs font-medium">
                                                                <span className="material-symbols-outlined text-[14px]">block</span>
                                                                Acesso Revogado
                                                            </div>
                                                            <button
                                                                onClick={() => handleApprove(user.id)}
                                                                className="text-xs text-success-green font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">undo</span>
                                                                Restaurar Acesso
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ──────────────────────────────────────────────────────────
                        TAB: DADOS DO SALÃO
                    ────────────────────────────────────────────────────────── */}
                    {activeTab === 'salao' && (
                        <div className="space-y-6 animate-fadeIn pb-8">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h2 className="text-3xl text-white font-medium tracking-tight uppercase flex items-center gap-2">
                                        <span className="material-symbols-outlined text-red-500">storefront</span>
                                        Dados do Salão
                                    </h2>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Gerencie as informações públicas e o funcionamento do seu estabelecimento.
                                    </p>
                                </div>
                                <button
                                    onClick={handleSaveSalon}
                                    disabled={isSavingSalon !== 'idle' || !matrizId}
                                    className={`text-white tracking-[0.2em] uppercase px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                        isSavingSalon === 'success'
                                            ? 'bg-[#00d084] shadow-[#00d084]/20 border border-[#00d084]/50'
                                            : isSavingSalon === 'error'
                                            ? 'bg-danger-red shadow-danger-red/20 border border-danger-red/50'
                                            : 'bg-red-600 hover:bg-red-600/90 shadow-red-600/20 border border-red-600/50 hover:-translate-y-0.5'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {isSavingSalon === 'saving' ? 'sync' : isSavingSalon === 'success' ? 'check_circle' : isSavingSalon === 'error' ? 'error' : 'save'}
                                    </span>
                                    {isSavingSalon === 'saving' ? 'Salvando...' : isSavingSalon === 'success' ? 'Salvo!' : isSavingSalon === 'error' ? 'Erro ao salvar' : 'Salvar Alterações'}
                                </button>
                            </div>

                            {isLoadingSalon ? (
                                <div className="flex items-center justify-center py-12 text-slate-500 gap-3">
                                    <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                                    Carregando dados do salão...
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Informações Básicas */}
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500">
                                                        <span className="material-symbols-outlined text-xl">info</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-white text-lg tracking-tight uppercase">Informações Básicas</h3>
                                                        <p className="text-[11px] text-slate-400 font-medium tracking-wide">DADOS GERAIS DO ESTABELECIMENTO</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="col-span-1 md:col-span-2">
                                                        <label className="block text-[10px] font-medium text-slate-500 tracking-[0.2em] uppercase mb-2">Nome do Salão/Barbearia</label>
                                                        <input
                                                            type="text"
                                                            value={salonConfig.name}
                                                            onChange={e => setSalonConfig({ ...salonConfig, name: e.target.value })}
                                                            placeholder="Ex: Barber King"
                                                            className="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none font-medium text-sm focus:border-red-600 transition-all placeholder:text-slate-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-medium text-slate-500 tracking-[0.2em] uppercase mb-2">Telefone de Contato</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-[18px]">call</span>
                                                            <input
                                                                type="text"
                                                                value={salonConfig.phone}
                                                                onChange={e => setSalonConfig({ ...salonConfig, phone: e.target.value })}
                                                                placeholder="(11) 99999-9999"
                                                                className="w-full bg-[#151515] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white outline-none font-medium text-sm focus:border-red-600 transition-all placeholder:text-slate-600"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-medium text-slate-500 tracking-[0.2em] uppercase mb-2">Instagram (Opcional)</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-[14px]">@</span>
                                                            <input
                                                                type="text"
                                                                value={salonConfig.instagram.replace('@', '')}
                                                                onChange={e => setSalonConfig({ ...salonConfig, instagram: '@' + e.target.value })}
                                                                placeholder="seuinstagram"
                                                                className="w-full bg-[#151515] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white outline-none font-medium text-sm focus:border-red-600 transition-all placeholder:text-slate-600"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1 md:col-span-2">
                                                        <label className="block text-[10px] font-medium text-slate-500 tracking-[0.2em] uppercase mb-2">Endereço Completo</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-3 text-slate-500 material-symbols-outlined text-[18px]">location_on</span>
                                                            <textarea
                                                                rows={2}
                                                                value={salonConfig.address}
                                                                onChange={e => setSalonConfig({ ...salonConfig, address: e.target.value })}
                                                                placeholder="Rua, número - Bairro, Cidade - UF"
                                                                className="w-full bg-[#151515] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white outline-none font-medium text-sm focus:border-red-600 transition-all resize-none placeholder:text-slate-600"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Identidade Visual */}
                                        <div className="lg:col-span-1">
                                            <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden h-full flex flex-col">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-slate-500"></div>
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                                                        <span className="material-symbols-outlined text-xl">palette</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-white text-lg tracking-tight uppercase">Visual</h3>
                                                        <p className="text-[11px] text-slate-400 font-medium tracking-wide">LOGOTIPO E IDENTIDADE</p>
                                                    </div>
                                                </div>

                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/10 rounded-xl p-6 hover:border-red-600/50 transition-colors cursor-pointer group bg-black/20"
                                                >
                                                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                                                    <div className="w-24 h-24 rounded-full bg-[#151515] border border-white/10 shadow-xl flex items-center justify-center relative overflow-hidden group-hover:bg-red-600/10 transition-colors text-slate-600 group-hover:text-red-500">
                                                        {logoPreview ? (
                                                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-medium text-white mb-1 group-hover:text-red-500 transition-colors">
                                                            {logoPreview ? 'Trocar Logotipo' : 'Alterar Logotipo'}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500">Recomendado: 500x500px, PNG</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Horários de Funcionamento */}
                                    <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500">
                                                <span className="material-symbols-outlined text-xl">schedule</span>
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-white text-lg tracking-tight uppercase">Horários de Funcionamento</h3>
                                                <p className="text-[11px] text-slate-400 font-medium tracking-wide">TABELA DE EXPEDIENTE</p>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/10 text-[10px] tracking-[0.2em] uppercase text-slate-500 font-medium">
                                                        <th className="pb-3 px-4">Dia da Semana</th>
                                                        <th className="pb-3 px-4 text-center">Status</th>
                                                        <th className="pb-3 px-4 text-center">Abertura</th>
                                                        <th className="pb-3 px-4 text-center">Fechamento</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {schedule.map((item, index) => (
                                                        <tr
                                                            key={item.day}
                                                            className={`border-b border-white/5 transition-colors group ${item.active ? 'hover:bg-white/[0.02]' : 'opacity-50 hover:opacity-75'}`}
                                                        >
                                                            <td className="py-4 px-4 w-40">
                                                                <p className={`font-medium text-sm ${item.active ? 'text-white' : 'text-slate-500'}`}>{item.day}</p>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <div className="flex justify-center">
                                                                    <div
                                                                        className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 cursor-pointer ${item.active ? 'bg-red-600' : 'bg-[#1A1A1A] border border-white/10'}`}
                                                                        onClick={() => {
                                                                            const newSchedule = [...schedule];
                                                                            newSchedule[index] = { ...newSchedule[index], active: !newSchedule[index].active };
                                                                            setSchedule(newSchedule);
                                                                        }}
                                                                    >
                                                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${item.active ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <div className="flex justify-center">
                                                                    <input
                                                                        type="time"
                                                                        disabled={!item.active}
                                                                        value={item.open}
                                                                        onChange={e => {
                                                                            const newSchedule = [...schedule];
                                                                            newSchedule[index] = { ...newSchedule[index], open: e.target.value };
                                                                            setSchedule(newSchedule);
                                                                        }}
                                                                        className="bg-[#151515] border border-white/10 rounded-lg px-2 py-1.5 text-center text-white outline-none font-medium text-sm focus:border-red-600 transition-all disabled:opacity-50"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <div className="flex justify-center">
                                                                    <input
                                                                        type="time"
                                                                        disabled={!item.active}
                                                                        value={item.close}
                                                                        onChange={e => {
                                                                            const newSchedule = [...schedule];
                                                                            newSchedule[index] = { ...newSchedule[index], close: e.target.value };
                                                                            setSchedule(newSchedule);
                                                                        }}
                                                                        className="bg-[#151515] border border-white/10 rounded-lg px-2 py-1.5 text-center text-white outline-none font-medium text-sm focus:border-red-600 transition-all disabled:opacity-50"
                                                                    />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ──────────────────────────────────────────────────────────
                        TAB: TAXAS & COMISSÕES
                    ────────────────────────────────────────────────────────── */}
                    {activeTab === 'taxas' && (
                        <div className="space-y-6 animate-fadeIn pb-8">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h2 className="text-3xl text-white font-medium tracking-tight uppercase flex items-center gap-2">
                                        <span className="material-symbols-outlined text-red-500">percent</span>
                                        Regras Financeiras
                                    </h2>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Configure as taxas de maquininha, comissões padrão e impostos do salão.
                                    </p>
                                </div>
                                <button
                                    onClick={handleSaveTaxas}
                                    disabled={isSavingTaxas !== 'idle' || !matrizId}
                                    className={`text-white font-medium tracking-[0.2em] uppercase px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                        isSavingTaxas === 'success'
                                            ? 'bg-[#00d084] shadow-[#00d084]/20 border border-[#00d084]/50'
                                            : isSavingTaxas === 'error'
                                            ? 'bg-danger-red shadow-danger-red/20 border border-danger-red/50'
                                            : 'bg-red-600 hover:bg-red-600/90 shadow-red-600/20 border border-red-600/50'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {isSavingTaxas === 'saving' ? 'sync' : isSavingTaxas === 'success' ? 'check_circle' : isSavingTaxas === 'error' ? 'error' : 'save'}
                                    </span>
                                    {isSavingTaxas === 'saving' ? 'Salvando...' : isSavingTaxas === 'success' ? 'Salvo!' : isSavingTaxas === 'error' ? 'Erro ao salvar' : 'Salvar Alterações'}
                                </button>
                            </div>

                            {isLoadingTaxas ? (
                                <div className="flex items-center justify-center py-12 text-slate-500 gap-3">
                                    <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                                    Carregando configurações financeiras...
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Taxas de Maquininha */}
                                        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500">
                                                    <span className="material-symbols-outlined text-xl">point_of_sale</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-white text-lg tracking-tight uppercase">Taxas de Maquininha</h3>
                                                    <p className="text-[11px] text-slate-400 font-medium tracking-wide">CUSTOS POR TRANSAÇÃO</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3 flex-1">
                                                {[
                                                    { key: 'pix' as const, label: 'Pix / Dinheiro', icon: 'pix' },
                                                    { key: 'debit' as const, label: 'Cartão de Débito', icon: 'credit_card' },
                                                    { key: 'credit1' as const, label: 'Crédito à Vista', icon: 'credit_score' },
                                                    { key: 'creditx' as const, label: 'Crédito Parcelado', icon: 'date_range' },
                                                ].map(({ key, label, icon }) => (
                                                    <div key={key} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-slate-500 text-lg">{icon}</span>
                                                            <span className="text-sm font-medium text-slate-300">{label}</span>
                                                        </div>
                                                        <div className="relative w-24">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.01"
                                                                value={financialConfig[key]}
                                                                onChange={e => setFinancialConfig({ ...financialConfig, [key]: e.target.value })}
                                                                className="w-full bg-[#151515] border border-white/10 rounded-lg py-2 pl-3 pr-7 text-white outline-none font-medium text-right focus:border-red-600"
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium pointer-events-none">%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Comissionamento Global */}
                                        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500">
                                                    <span className="material-symbols-outlined text-xl">payments</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-white text-lg tracking-tight uppercase">Taxas & Impostos</h3>
                                                    <p className="text-[11px] text-slate-400 font-medium tracking-wide">REGRAS GLOBAIS</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4 flex-1">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-black/40 border border-white/5 rounded-xl p-3 px-4">
                                                        <label className="block text-[10px] font-medium text-slate-500 tracking-[0.2em] uppercase mb-2">Comissão (Serviços)</label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min="0" max="100" step="0.1"
                                                                value={financialConfig.comService}
                                                                onChange={e => setFinancialConfig({ ...financialConfig, comService: e.target.value })}
                                                                className="w-full bg-[#151515] border border-white/10 rounded-lg py-2 pl-3 pr-7 text-white outline-none font-medium text-left focus:border-red-600"
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium pointer-events-none">%</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-black/40 border border-white/5 rounded-xl p-3 px-4">
                                                        <label className="block text-[10px] font-medium text-slate-500 tracking-[0.2em] uppercase mb-2">Comissão (Produtos)</label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min="0" max="100" step="0.1"
                                                                value={financialConfig.comProduct}
                                                                onChange={e => setFinancialConfig({ ...financialConfig, comProduct: e.target.value })}
                                                                className="w-full bg-[#151515] border border-white/10 rounded-lg py-2 pl-3 pr-7 text-white outline-none font-medium text-left focus:border-red-600"
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium pointer-events-none">%</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-black/40 border border-white/5 rounded-xl p-3 px-4">
                                                    <label className="block text-[10px] font-medium text-slate-500 tracking-[0.2em] uppercase mb-2">Imposto Global (NF-e/DAS)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0" max="100" step="0.01"
                                                            value={financialConfig.globalTax}
                                                            onChange={e => setFinancialConfig({ ...financialConfig, globalTax: e.target.value })}
                                                            className="w-full bg-[#151515] border border-white/10 rounded-lg py-2 pl-3 pr-7 text-white outline-none font-medium text-left focus:border-red-600"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium pointer-events-none">%</span>
                                                    </div>
                                                </div>

                                                {/* Toggle: Descontar taxa antes da partilha */}
                                                <div className="mt-4 pt-4 border-t border-white/5">
                                                    <div
                                                        className="flex items-center justify-between cursor-pointer group"
                                                        onClick={() => setFinancialConfig({ ...financialConfig, discountFeeBeforeCommission: !financialConfig.discountFeeBeforeCommission })}
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium text-white mb-0.5 group-hover:text-slate-200">Descontar taxa antes da partilha</p>
                                                            <p className="text-[10px] text-slate-500 font-medium">Subtrai o custo da maquininha ANTES de calcular a comissão</p>
                                                        </div>
                                                        <div className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${financialConfig.discountFeeBeforeCommission ? 'bg-red-600' : 'bg-[#1A1A1A] border border-white/10'}`}>
                                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${financialConfig.discountFeeBeforeCommission ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabela de Comissões Específicas */}
                                    <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-500"></div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                                                    <span className="material-symbols-outlined text-xl">account_circle</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-white text-lg tracking-tight uppercase">Comissões Customizadas</h3>
                                                    <p className="text-[11px] text-slate-400 font-medium tracking-wide">REGRAS ESPECÍFICAS POR PROFISSIONAL</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/10 text-[10px] tracking-[0.2em] uppercase text-slate-500 font-medium">
                                                        <th className="pb-3 px-4">Profissional</th>
                                                        <th className="pb-3 px-4 text-center">Serviços (%)</th>
                                                        <th className="pb-3 px-4 text-center">Produtos (%)</th>
                                                        <th className="pb-3 px-4 text-right">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {customCommissions.map(com => (
                                                        <tr key={com.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                                            <td className="py-4 px-4">
                                                                <p className="text-white font-medium text-sm">{com.name}</p>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <div className="flex items-center justify-center">
                                                                    <div className="relative w-20">
                                                                        <input
                                                                            type="number"
                                                                            min="0" max="100" step="0.1"
                                                                            value={com.service}
                                                                            onChange={(e) => {
                                                                                setCustomCommissions(prev =>
                                                                                    prev.map(c => c.id === com.id ? { ...c, service: e.target.value } : c)
                                                                                );
                                                                            }}
                                                                            className="w-full bg-[#151515] border border-white/10 rounded-lg py-1.5 pl-2 pr-6 text-center text-white outline-none font-medium text-sm focus:border-red-600"
                                                                        />
                                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-medium pointer-events-none">%</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <div className="flex items-center justify-center">
                                                                    <div className="relative w-20">
                                                                        <input
                                                                            type="number"
                                                                            min="0" max="100" step="0.1"
                                                                            value={com.product}
                                                                            onChange={(e) => {
                                                                                setCustomCommissions(prev =>
                                                                                    prev.map(c => c.id === com.id ? { ...c, product: e.target.value } : c)
                                                                                );
                                                                            }}
                                                                            className="w-full bg-[#151515] border border-white/10 rounded-lg py-1.5 pl-2 pr-6 text-center text-white outline-none font-medium text-sm focus:border-red-600"
                                                                        />
                                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-medium pointer-events-none">%</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4 flex items-center justify-end h-[72px]">
                                                                <button
                                                                    onClick={() => handleDeleteCommission(com.id)}
                                                                    className="w-8 h-8 rounded bg-danger-red/10 text-danger-red hover:bg-danger-red hover:text-white transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center border border-danger-red/20"
                                                                    title="Remover regra"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {customCommissions.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="py-8 text-center text-slate-500 font-medium">
                                                                Nenhuma comissão customizada configurada.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default AdminSettings;
