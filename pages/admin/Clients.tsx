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

const STATUS_MAP: Record<string, { label: string; classes: string; dot: string }> = {
  fiel:    { label: 'Fiel',    classes: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', dot: 'bg-emerald-500' },
  recente: { label: 'Recente', classes: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',                 dot: 'bg-blue-500' },
  inativo: { label: 'Inativo', classes: 'bg-slate-100 dark:bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-500/20',           dot: 'bg-slate-400' },
};

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  created_at: string;
  loyalty_points: number;
  status: string;
}

interface ClientForm {
  name: string;
  email: string;
  phone: string;
  birth_date: string;
  status: string;
}

const emptyForm: ClientForm = { name: '', email: '', phone: '', birth_date: '', status: 'recente' };

const AdminClients: React.FC = () => {
  const navigate   = useNavigate();
  const { selectedMatriz } = useMatriz();

  const [clients, setClients]         = useState<Client[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing]           = useState<Client | null>(null);
  const [toDelete, setToDelete]         = useState<Client | null>(null);
  const [form, setForm]                 = useState<ClientForm>(emptyForm);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [error, setError]               = useState('');

  const fetchClients = async () => {
    if (!selectedMatriz) { setClients([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('client_matrizes')
      .select('loyalty_points, status, clients(id, name, email, phone, birth_date, created_at)')
      .eq('matriz_id', selectedMatriz.id);

    if (!err && data) {
      const list: Client[] = data.map((row: any) => ({
        ...row.clients,
        loyalty_points: row.loyalty_points,
        status: row.status,
      }));
      setClients(list.sort((a, b) => a.name.localeCompare(b.name)));
    }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [selectedMatriz]);

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search);
    const matchStatus = filterStatus === 'todos' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages   = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fieis   = clients.filter(c => c.status === 'fiel').length;
  const inativos = clients.filter(c => c.status === 'inativo').length;

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setIsModalOpen(true); };
  const openEdit   = (c: Client) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', birth_date: c.birth_date ?? '', status: c.status });
    setError(''); setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatriz) return;
    setError('');
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return; }

    setSaving(true);

    if (editing) {
      const { error: e1 } = await supabase.from('clients').update({
        name: form.name.trim(), email: form.email.trim() || null,
        phone: form.phone.trim() || null, birth_date: form.birth_date || null,
      }).eq('id', editing.id);

      const { error: e2 } = await supabase.from('client_matrizes')
        .update({ status: form.status })
        .eq('client_id', editing.id)
        .eq('matriz_id', selectedMatriz.id);

      if (e1 || e2) { setError((e1 ?? e2)!.message); setSaving(false); return; }

    } else {
      // Verifica se cliente já existe pelo e-mail
      let clientId: string | null = null;
      if (form.email.trim()) {
        const { data: existing } = await supabase
          .from('clients').select('id').eq('email', form.email.trim()).maybeSingle();
        if (existing) clientId = existing.id;
      }

      if (!clientId) {
        const { data: newClient, error: e1 } = await supabase.from('clients').insert({
          name: form.name.trim(), email: form.email.trim() || null,
          phone: form.phone.trim() || null, birth_date: form.birth_date || null,
        }).select().single();
        if (e1 || !newClient) { setError(e1?.message ?? 'Erro ao criar cliente.'); setSaving(false); return; }
        clientId = newClient.id;
      }

      // Verifica se já está vinculado à matriz
      const { data: existingLink } = await supabase
        .from('client_matrizes').select('client_id')
        .eq('client_id', clientId).eq('matriz_id', selectedMatriz.id).maybeSingle();

      if (!existingLink) {
        const { error: e2 } = await supabase.from('client_matrizes').insert({
          client_id: clientId, matriz_id: selectedMatriz.id, status: form.status,
        });
        if (e2) { setError(e2.message); setSaving(false); return; }
      }
    }

    await fetchClients();
    setSaving(false);
    setIsModalOpen(false);
  };

  const handleInactivate = async () => {
    if (!toDelete || !selectedMatriz) return;
    setDeleting(true);
    await supabase.from('client_matrizes')
      .update({ status: 'inativo' })
      .eq('client_id', toDelete.id)
      .eq('matriz_id', selectedMatriz.id);
    await fetchClients();
    setDeleting(false);
    setIsDeleteOpen(false);
    setToDelete(null);
  };

  const initials = (name: string) => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 relative overflow-x-hidden transition-colors duration-300">
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/5 dark:bg-red-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-200/50 dark:bg-red-900/10 blur-[150px] rounded-full" />
      </div>

      <Sidebar items={sidebarItems} portalName="BARBER KING" />

      <main className="flex-1 min-w-0 lg:ml-20 p-4 lg:p-8 pb-32 lg:pb-8 flex flex-col min-h-screen relative z-10">

        {/* Header */}
        <header className="sticky top-0 z-50 flex justify-between items-center gap-3 mb-6 lg:mb-8 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 pb-4 pt-2 -mx-4 px-4 lg:-mx-8 lg:px-8 shadow-sm overflow-hidden">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg lg:text-[2rem] font-medium text-slate-900 dark:text-white tracking-tight uppercase pt-2 truncate">
              MEUS <span className="text-red-500">CLIENTES</span>
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold mt-1 truncate">
              {selectedMatriz ? selectedMatriz.name : 'Selecione uma unidade'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={openCreate}
              disabled={!selectedMatriz}
              className="bg-red-600 hover:bg-red-600/90 text-white px-3 lg:px-6 py-2.5 rounded-lg text-[11px] uppercase font-medium tracking-[0.2em] flex items-center gap-2 shadow-xl shadow-red-600/20 transition-all hover:-translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              <span className="hidden sm:inline">Novo Cliente</span>
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total',    value: clients.length,  icon: 'group',         color: 'text-red-500',     bg: 'bg-red-500/10' },
            { label: 'Fiéis',    value: fieis,            icon: 'favorite',      color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Inativos', value: inativos,         icon: 'person_off',    color: 'text-slate-400',   bg: 'bg-slate-500/10' },
            { label: 'Pontos',   value: clients.reduce((a, c) => a + c.loyalty_points, 0), icon: 'stars', color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                <span className="material-symbols-outlined">{kpi.icon}</span>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">{kpi.label}</p>
                <p className="text-2xl font-medium text-slate-900 dark:text-white">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:border-red-600 outline-none transition-all placeholder:text-slate-500 shadow-sm"
              placeholder="Buscar por nome, telefone ou e-mail..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['todos', 'fiel', 'recente', 'inativo'].map(s => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${filterStatus === s ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20' : 'bg-white/80 dark:bg-[#0a0a0a]/80 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-400'}`}
              >
                {s === 'todos' ? 'Todos' : STATUS_MAP[s]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
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
              <p className="text-sm font-medium">Nenhum cliente encontrado.</p>
              {filterStatus === 'todos' && (
                <button onClick={openCreate} className="mt-4 text-red-500 text-xs font-medium hover:underline">Adicionar cliente →</button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="lg:hidden divide-y divide-slate-200 dark:divide-white/5">
                {currentItems.map(client => {
                  const st = STATUS_MAP[client.status] ?? STATUS_MAP.recente;
                  return (
                    <div
                      key={client.id}
                      className="p-4 flex flex-col gap-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/clients/${client.id}`)}
                    >
                      {/* Linha 1: avatar + nome + status */}
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold text-sm">
                            {initials(client.name)}
                          </div>
                          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0a0a0a] ${st.dot}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{client.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {client.birth_date ? `Nasc. ${new Date(client.birth_date).toLocaleDateString('pt-BR')}` : 'Sem data de nascimento'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-medium uppercase tracking-[0.15em] border ${st.classes}`}>
                            {st.label}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-amber-400 text-sm">stars</span>
                            <span className="text-xs font-medium text-slate-900 dark:text-white">{client.loyalty_points}</span>
                          </div>
                        </div>
                      </div>

                      {/* Linha 2: contato + ações */}
                      <div className="flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          {client.phone && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <span className="material-symbols-outlined text-[13px] flex-shrink-0">phone</span>
                              <span className="truncate">{client.phone}</span>
                            </p>
                          )}
                          {client.email && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <span className="material-symbols-outlined text-[13px] flex-shrink-0">mail</span>
                              <span className="truncate">{client.email}</span>
                            </p>
                          )}
                          {!client.email && !client.phone && <span className="text-xs text-slate-500">Sem contato</span>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {client.phone && (
                            <button
                              onClick={e => { e.stopPropagation(); window.open(`https://wa.me/55${client.phone?.replace(/\D/g, '')}`, '_blank'); }}
                              className="p-2 border border-[#25D366]/20 rounded-xl text-[#25D366] hover:bg-[#25D366]/10 transition-all bg-white dark:bg-transparent"
                              title="WhatsApp"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.711.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.446-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(client); }}
                            className="p-2 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all bg-white dark:bg-transparent"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setToDelete(client); setIsDeleteOpen(true); }}
                            className="p-2 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-amber-500 hover:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all bg-white dark:bg-transparent"
                            title="Inativar"
                          >
                            <span className="material-symbols-outlined text-sm">block</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: tabela */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                      <th className="px-6 py-5 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Nome</th>
                      <th className="px-6 py-5 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Contato</th>
                      <th className="px-6 py-5 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] text-center">Status</th>
                      <th className="px-6 py-5 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] text-center">Pontos</th>
                      <th className="px-6 py-5 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {currentItems.map(client => {
                      const st = STATUS_MAP[client.status] ?? STATUS_MAP.recente;
                      return (
                        <tr key={client.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => navigate(`/admin/clients/${client.id}`)}>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-11 h-11 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold text-sm">
                                  {initials(client.name)}
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#0a0a0a] ${st.dot}`} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-red-500 transition-colors">{client.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {client.birth_date ? `Nasc. ${new Date(client.birth_date).toLocaleDateString('pt-BR')}` : 'Sem data de nascimento'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
                            <div className="space-y-1">
                              {client.email && <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">mail</span>{client.email}</p>}
                              {client.phone && <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">phone</span>{client.phone}</p>}
                              {!client.email && !client.phone && <span className="text-xs text-slate-500">—</span>}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center" onClick={e => e.stopPropagation()}>
                            <span className={`px-3 py-1.5 rounded-full text-[9px] font-medium uppercase tracking-[0.2em] border ${st.classes}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-amber-400 text-sm">stars</span>
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{client.loyalty_points}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              {client.phone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const cleanPhone = client.phone?.replace(/\D/g, '');
                                    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
                                  }}
                                  className="p-2 border border-[#25D366]/20 rounded-xl text-[#25D366] hover:bg-[#25D366]/10 transition-all bg-white dark:bg-transparent shadow-sm"
                                  title="Enviar WhatsApp"
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.711.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.446-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"></path>
                                  </svg>
                                </button>
                              )}
                              <button onClick={() => openEdit(client)} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] uppercase font-medium tracking-wider text-slate-500 dark:text-slate-400 hover:text-red-500 hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all bg-white dark:bg-transparent shadow-sm">
                                <span className="material-symbols-outlined text-sm">edit</span>
                                Editar
                              </button>
                              <button onClick={() => { setToDelete(client); setIsDeleteOpen(true); }} title="Inativar" className="p-2 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-amber-500 hover:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all bg-white dark:bg-transparent shadow-sm">
                                <span className="material-symbols-outlined text-sm">block</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filtered.length > itemsPerPage && (
                <div className="px-6 py-5 bg-slate-50/50 dark:bg-white/[0.01] border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">
                    Mostrando <span className="text-slate-900 dark:text-white font-bold">{currentItems.length}</span> de <span className="text-slate-900 dark:text-white font-bold">{filtered.length}</span> clientes
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 shadow-sm transition-colors">
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === page ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white dark:bg-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                        {page}
                      </button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 shadow-sm transition-colors">
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-medium text-slate-900 dark:text-white text-xl">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm" placeholder="email@exemplo.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Telefone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nascimento</label>
                  <input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 outline-none text-sm">
                    <option value="recente">Recente</option>
                    <option value="fiel">Fiel</option>
                    <option value="inativo">Inativo</option>
                  </select>
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

      {/* Modal Inativar */}
      {isDeleteOpen && toDelete && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4">
                <span className="material-symbols-outlined text-2xl">block</span>
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white text-lg mb-2">Inativar cliente?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                <strong className="text-slate-900 dark:text-white">{toDelete.name}</strong> será marcado como <strong className="text-amber-500">Inativo</strong>. O histórico e dados financeiros são preservados e o cliente pode ser reativado a qualquer momento.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteOpen(false)} className="flex-1 py-3 text-slate-400 font-medium text-sm border border-border-subtle rounded-xl hover:bg-white/5 transition-all">Cancelar</button>
              <button onClick={handleInactivate} disabled={deleting} className="flex-1 py-3 bg-amber-500 text-white font-medium text-sm rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50">
                {deleting ? 'Inativando...' : 'Inativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClients;
