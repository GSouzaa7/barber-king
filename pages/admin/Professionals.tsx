import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';

const sidebarItems = [
  { icon: 'grid_view',              label: 'Início',        path: '/admin/dashboard' },
  { icon: 'calendar_today',         label: 'Agenda',        path: '/admin/agenda' },
  { icon: 'group',                  label: 'Contatos',      path: '/admin/clients' },
  { icon: 'receipt_long',           label: 'Atendimento',   path: '/admin/atendimento' },
  { icon: 'content_cut',            label: 'Profissionais', path: '/admin/professionals' },
  { icon: 'inventory_2',            label: 'Estoque',       path: '/admin/inventory' },
  { icon: 'account_balance_wallet', label: 'Financeiro',    path: '/admin/financial' },
  { icon: 'store',                  label: 'Unidades',      path: '/admin/matrizes', desktopOnly: true },
];

const SPECIALTIES_OPTIONS = ['Corte', 'Barba', 'Químicos', 'Coloração', 'Acabamentos', 'Mãos/Pés', 'Infantil'];

const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  ativo:    { label: 'Ativo',    classes: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' },
  inativo:  { label: 'Inativo', classes: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20' },
  ferias:   { label: 'Férias',  classes: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20' },
  em_pausa: { label: 'Em Pausa',classes: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' },
};

interface Professional {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
  specialties: string[];
  matriz_status: string;
}

interface ProfForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  specialties: string[];
  matriz_status: string;
}

interface PendingBarber {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string;
}

const emptyForm: ProfForm = {
  name: '', email: '', phone: '', role: 'Barber', specialties: [], matriz_status: 'ativo',
};

const AdminProfessionals: React.FC = () => {
  const navigate = useNavigate();
  const { selectedMatriz } = useMatriz();

  const [activeTab, setActiveTab]          = useState<'ativos' | 'pendentes'>('ativos');

  // Ativos
  const [professionals, setProfessionals]  = useState<Professional[]>([]);
  const [loading, setLoading]              = useState(true);
  const [search, setSearch]                = useState('');
  const [currentPage, setCurrentPage]      = useState(1);
  const itemsPerPage = 8;

  const [isModalOpen, setIsModalOpen]      = useState(false);
  const [isDeleteOpen, setIsDeleteOpen]    = useState(false);
  const [editing, setEditing]              = useState<Professional | null>(null);
  const [toDelete, setToDelete]            = useState<Professional | null>(null);
  const [form, setForm]                    = useState<ProfForm>(emptyForm);
  const [saving, setSaving]                = useState(false);
  const [deleting, setDeleting]            = useState(false);
  const [error, setError]                  = useState('');

  // Pendentes
  const [pendingBarbers, setPendingBarbers]  = useState<PendingBarber[]>([]);
  const [loadingPending, setLoadingPending]  = useState(false);
  const [actionId, setActionId]             = useState<string | null>(null);

  const fetchProfessionals = async () => {
    if (!selectedMatriz) { setProfessionals([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('professional_matrizes')
      .select('status, professionals(id, name, email, phone, avatar_url, role, specialties)')
      .eq('matriz_id', selectedMatriz.id);

    if (!err && data) {
      const list: Professional[] = data.map((row: any) => ({
        ...row.professionals,
        specialties: row.professionals.specialties ?? [],
        matriz_status: row.status,
      }));
      setProfessionals(list);
    }
    setLoading(false);
  };

  const fetchPendingBarbers = async () => {
    setLoadingPending(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, created_at')
      .eq('role', 'barber')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPendingBarbers(data ?? []);
    setLoadingPending(false);
  };

  useEffect(() => { fetchProfessionals(); }, [selectedMatriz]);
  useEffect(() => { fetchPendingBarbers(); }, []);

  const handleApprove = async (id: string) => {
    setActionId(id);
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', id);
    await fetchPendingBarbers();
    setActionId(null);
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id);
    await fetchPendingBarbers();
    setActionId(null);
  };

  const filtered = professionals.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.role ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const totalPages   = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setError(''); setIsModalOpen(true);
  };

  const openEdit = (p: Professional) => {
    setEditing(p);
    setForm({ name: p.name, email: p.email ?? '', phone: p.phone ?? '', role: p.role ?? '', specialties: p.specialties, matriz_status: p.matriz_status });
    setError(''); setIsModalOpen(true);
  };

  const toggleSpecialty = (s: string) => {
    setForm(f => ({
      ...f,
      specialties: f.specialties.includes(s) ? f.specialties.filter(x => x !== s) : [...f.specialties, s],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatriz) return;
    setError('');
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return; }

    setSaving(true);

    if (editing) {
      const { error: e1 } = await supabase.from('professionals').update({
        name: form.name.trim(), email: form.email.trim() || null,
        phone: form.phone.trim() || null, role: form.role.trim() || null,
        specialties: form.specialties,
      }).eq('id', editing.id);

      const { error: e2 } = await supabase.from('professional_matrizes')
        .update({ status: form.matriz_status })
        .eq('professional_id', editing.id)
        .eq('matriz_id', selectedMatriz.id);

      if (e1 || e2) { setError((e1 || e2)!.message); setSaving(false); return; }
    } else {
      const { data: newPro, error: e1 } = await supabase.from('professionals').insert({
        name: form.name.trim(), email: form.email.trim() || null,
        phone: form.phone.trim() || null, role: form.role.trim() || null,
        specialties: form.specialties,
      }).select().single();

      if (e1 || !newPro) { setError(e1?.message ?? 'Erro ao criar.'); setSaving(false); return; }

      const { error: e2 } = await supabase.from('professional_matrizes').insert({
        professional_id: newPro.id, matriz_id: selectedMatriz.id, status: form.matriz_status,
      });
      if (e2) { setError(e2.message); setSaving(false); return; }
    }

    await fetchProfessionals();
    setSaving(false);
    setIsModalOpen(false);
  };

  const handleRemoveFromMatriz = async () => {
    if (!toDelete || !selectedMatriz) return;
    setDeleting(true);
    await supabase.from('professional_matrizes')
      .delete()
      .eq('professional_id', toDelete.id)
      .eq('matriz_id', selectedMatriz.id);
    await fetchProfessionals();
    setDeleting(false);
    setIsDeleteOpen(false);
    setToDelete(null);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors duration-300">
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/5 dark:bg-red-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-200/50 dark:bg-red-900/10 blur-[150px] rounded-full" />
      </div>

      <Sidebar items={sidebarItems} portalName="BARBER KING" />

      <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 flex justify-between items-center mb-8 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 pb-4 pt-2 -mx-8 px-8 shadow-sm">
          <div>
            <h2 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight">Profissionais</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold mt-1">
              {selectedMatriz ? selectedMatriz.name : 'Selecione uma unidade'}
            </p>
          </div>
          <div className="flex items-center gap-6">
            {activeTab === 'ativos' && (
              <button
                onClick={openCreate}
                disabled={!selectedMatriz}
                className="bg-red-600 hover:bg-red-600/90 text-white px-6 py-2.5 rounded-lg text-[11px] uppercase font-medium tracking-[0.2em] flex items-center gap-2 shadow-xl shadow-red-600/20 transition-all hover:-translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                Novo Profissional
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-col flex-1 pb-8">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('ativos')}
              className={`px-5 py-2 rounded-lg text-[10px] uppercase font-bold tracking-[0.2em] transition-all ${activeTab === 'ativos' ? 'bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              Ativos
            </button>
            <button
              onClick={() => setActiveTab('pendentes')}
              className={`px-5 py-2 rounded-lg text-[10px] uppercase font-bold tracking-[0.2em] transition-all flex items-center gap-2 ${activeTab === 'pendentes' ? 'bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              Pendentes
              {pendingBarbers.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingBarbers.length}
                </span>
              )}
            </button>
          </div>

          {/* ── ABA ATIVOS ── */}
          {activeTab === 'ativos' && (
            <>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div className="relative flex-1 w-full max-w-xl">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:border-red-600 outline-none transition-all placeholder:text-slate-500 shadow-sm"
                    placeholder="Buscar por nome, e-mail ou função..."
                  />
                </div>
              </div>

              <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col flex-1 shadow-sm">
                {loading ? (
                  <div className="flex items-center justify-center flex-1 py-20 text-slate-500">
                    <span className="material-symbols-outlined animate-spin text-3xl mr-3">progress_activity</span>
                    Carregando...
                  </div>
                ) : !selectedMatriz ? (
                  <div className="flex flex-col items-center justify-center flex-1 py-20 text-slate-500">
                    <span className="material-symbols-outlined text-5xl mb-4 opacity-30">store</span>
                    <p className="text-sm font-medium">Selecione uma unidade no menu lateral.</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 py-20 text-slate-500">
                    <span className="material-symbols-outlined text-5xl mb-4 opacity-30">person_search</span>
                    <p className="text-sm font-medium">Nenhum profissional encontrado.</p>
                    <button onClick={openCreate} className="mt-4 text-red-500 text-xs font-medium hover:underline">
                      Adicionar profissional →
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                          <th className="px-6 py-5 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Profissional</th>
                          <th className="px-6 py-5 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Especialidades</th>
                          <th className="px-6 py-5 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Status</th>
                          <th className="px-6 py-5 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                        {currentItems.map((pro) => {
                          const st = STATUS_MAP[pro.matriz_status] ?? STATUS_MAP.ativo;
                          return (
                            <tr key={pro.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    {pro.avatar_url ? (
                                      <img src={pro.avatar_url} alt={pro.name} className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-white/5 shadow-sm" />
                                    ) : (
                                      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold text-lg">
                                        {pro.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#0a0a0a] ${pro.matriz_status === 'ativo' ? 'bg-emerald-500' : pro.matriz_status === 'em_pausa' ? 'bg-amber-500' : pro.matriz_status === 'ferias' ? 'bg-slate-400' : 'bg-red-500'}`} />
                                  </div>
                                  <div>
                                    <p className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">{pro.name}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-0.5">
                                      {pro.role ?? 'Barber'}{pro.email ? ` • ${pro.email}` : ''}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex flex-wrap gap-1.5">
                                  {pro.specialties.length > 0 ? pro.specialties.map((s) => (
                                    <span key={s} className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                      {s}
                                    </span>
                                  )) : <span className="text-slate-400 text-xs">—</span>}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span className={`px-3 py-1.5 rounded-full text-[9px] font-medium uppercase tracking-[0.2em] border ${st.classes}`}>
                                  {st.label}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => openEdit(pro)}
                                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] uppercase font-medium tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 hover:border-red-600/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all bg-white dark:bg-transparent shadow-sm dark:shadow-none"
                                  >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                    EDITAR
                                  </button>
                                  <button
                                    onClick={() => navigate(`/admin/professionals/${pro.id}`)}
                                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] uppercase font-medium tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 hover:border-red-600/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all bg-white dark:bg-transparent shadow-sm dark:shadow-none"
                                  >
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                  </button>
                                  <button
                                    onClick={() => { setToDelete(pro); setIsDeleteOpen(true); }}
                                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] uppercase font-medium tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-danger-red hover:border-danger-red/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all bg-white dark:bg-transparent shadow-sm dark:shadow-none"
                                    title="Remover desta unidade"
                                  >
                                    <span className="material-symbols-outlined text-sm">person_off</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {!loading && filtered.length > itemsPerPage && (
                  <div className="px-6 py-5 bg-slate-50/50 dark:bg-white/[0.01] border-t border-slate-200 dark:border-white/5 flex items-center justify-between mt-auto">
                    <p className="text-xs text-slate-500 font-medium">
                      Mostrando <span className="text-slate-900 dark:text-white font-bold">{currentItems.length}</span> de <span className="text-slate-900 dark:text-white font-bold">{filtered.length}</span> profissionais
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 shadow-sm transition-colors">
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors shadow-sm ${currentPage === page ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white dark:bg-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                          {page}
                        </button>
                      ))}
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 shadow-sm transition-colors">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── ABA PENDENTES ── */}
          {activeTab === 'pendentes' && (
            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-sm">
              {loadingPending ? (
                <div className="flex items-center justify-center py-20 text-slate-500">
                  <span className="material-symbols-outlined animate-spin text-3xl mr-3">progress_activity</span>
                  Carregando...
                </div>
              ) : pendingBarbers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <span className="material-symbols-outlined text-5xl mb-4 opacity-30">how_to_reg</span>
                  <p className="text-sm font-medium">Nenhum barbeiro aguardando aprovação.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-white/5">
                  {pendingBarbers.map((barber) => (
                    <div key={barber.id} className="flex items-center justify-between px-6 py-5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-lg">
                          {(barber.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">
                            {barber.name ?? 'Sem nome'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-0.5">
                            {barber.email ?? '—'} &nbsp;·&nbsp; Solicitado em {new Date(barber.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1.5 rounded-full text-[9px] font-medium uppercase tracking-[0.2em] border bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20">
                          Pendente
                        </span>
                        <button
                          onClick={() => handleReject(barber.id)}
                          disabled={actionId === barber.id}
                          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] uppercase font-medium tracking-[0.2em] text-slate-500 hover:text-red-600 hover:border-red-600/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all bg-white dark:bg-transparent disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                          Rejeitar
                        </button>
                        <button
                          onClick={() => handleApprove(barber.id)}
                          disabled={actionId === barber.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-600/90 text-white rounded-xl text-[10px] uppercase font-medium tracking-[0.2em] shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-40"
                        >
                          {actionId === barber.id ? (
                            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined text-sm">check</span>
                          )}
                          Aprovar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-white dark:bg-[#0a0a0a] z-10">
              <h3 className="font-medium text-slate-900 dark:text-white text-xl">
                {editing ? 'Editar Profissional' : 'Novo Profissional'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm" placeholder="Nome completo" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Função</label>
                  <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm" placeholder="Ex: Master Barber" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status nesta unidade</label>
                  <select value={form.matriz_status} onChange={e => setForm(f => ({ ...f, matriz_status: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm">
                    <option value="ativo">Ativo</option>
                    <option value="em_pausa">Em Pausa</option>
                    <option value="ferias">Férias</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm" placeholder="email@exemplo.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Telefone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm" placeholder="(00) 00000-0000" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Especialidades</label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES_OPTIONS.map(s => (
                      <button key={s} type="button" onClick={() => toggleSpecialty(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${form.specialties.includes(s) ? 'bg-red-600/10 text-red-500 border-red-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10 hover:border-slate-400'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>{error}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-medium text-sm border border-border-subtle rounded-xl hover:bg-white/5 transition-all">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium tracking-[0.2em] uppercase text-[10px] hover:bg-red-600/90 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Remover da Unidade */}
      {isDeleteOpen && toDelete && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4">
                <span className="material-symbols-outlined text-2xl">person_off</span>
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white text-lg mb-2">Remover desta unidade?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                <strong className="text-slate-900 dark:text-white">{toDelete.name}</strong> será removido de <strong className="text-white">{selectedMatriz?.name}</strong>. O profissional continua no sistema e pode ser vinculado a outras unidades.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteOpen(false)} className="flex-1 py-3 text-slate-400 font-medium text-sm border border-border-subtle rounded-xl hover:bg-white/5 transition-all">Cancelar</button>
              <button onClick={handleRemoveFromMatriz} disabled={deleting} className="flex-1 py-3 bg-danger-red text-white font-medium text-sm rounded-xl hover:bg-red-600 shadow-lg transition-all disabled:opacity-50">
                {deleting ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfessionals;
