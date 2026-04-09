import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { useMatriz, type Matriz } from '../../contexts/MatrizContext';

const sidebarItems = [
  { icon: 'grid_view',             label: 'Início',        path: '/admin/dashboard' },
  { icon: 'calendar_today',        label: 'Agenda',        path: '/admin/agenda' },
  { icon: 'group',                 label: 'Contatos',      path: '/admin/clients' },
  { icon: 'receipt_long',          label: 'Atendimento',   path: '/admin/atendimento' },
  { icon: 'content_cut',           label: 'Profissionais', path: '/admin/professionals' },
  { icon: 'inventory_2',           label: 'Estoque',       path: '/admin/inventory' },
  { icon: 'account_balance_wallet',label: 'Financeiro',    path: '/admin/financial' },
  { icon: 'store',                 label: 'Unidades',      path: '/admin/matrizes', desktopOnly: true },
];

interface MatrizForm {
  name: string;
  address: string;
  phone: string;
  maps_url: string;
}

const emptyForm: MatrizForm = { name: '', address: '', phone: '', maps_url: '' };

const AdminMatrizes: React.FC = () => {
  const { matrizes, selectedMatriz, setSelectedMatriz, refetch } = useMatriz();

  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing]           = useState<Matriz | null>(null);
  const [toDelete, setToDelete]         = useState<Matriz | null>(null);
  const [form, setForm]                 = useState<MatrizForm>(emptyForm);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [error, setError]               = useState('');

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (m: Matriz) => {
    setEditing(m);
    setForm({ name: m.name, address: m.address ?? '', phone: m.phone ?? '', maps_url: m.maps_url ?? '' });
    setError('');
    setIsModalOpen(true);
  };

  const openDelete = (m: Matriz) => {
    setToDelete(m);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('O nome da unidade é obrigatório.');
      return;
    }

    setSaving(true);
    if (editing) {
      const { error: err } = await supabase
        .from('matrizes')
        .update({ name: form.name.trim(), address: form.address.trim() || null, phone: form.phone.trim() || null, maps_url: form.maps_url.trim() || null })
        .eq('id', editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase
        .from('matrizes')
        .insert({ name: form.name.trim(), address: form.address.trim() || null, phone: form.phone.trim() || null, maps_url: form.maps_url.trim() || null });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    await refetch();
    setSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error: err } = await supabase.from('matrizes').delete().eq('id', toDelete.id);
    if (!err) {
      if (selectedMatriz?.id === toDelete.id) setSelectedMatriz(matrizes.find(m => m.id !== toDelete.id) ?? matrizes[0]);
      await refetch();
    }
    setDeleting(false);
    setIsDeleteOpen(false);
    setToDelete(null);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 dark:bg-red-600/5 rounded-full blur-[120px] pointer-events-none opacity-50 dark:opacity-100 animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-slate-400/20 dark:bg-white/5 rounded-full blur-[100px] pointer-events-none opacity-50 dark:opacity-100" />

      <Sidebar items={sidebarItems} portalName="BARBER KING" />

      <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative">
        {/* Header */}
        <header className="flex justify-between items-start mb-8 border-b border-border-subtle pb-6">
          <div>
            <h2 className="text-[2rem] font-medium text-slate-900 dark:text-white uppercase tracking-tight pt-1">Unidades</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Gerencie as matrizes e filiais da rede.</p>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={openCreate}
              className="bg-red-600 hover:bg-red-600/90 text-white px-5 py-2.5 rounded-xl font-medium tracking-[0.2em] uppercase text-[10px] flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Nova Unidade
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined">store</span>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Total de Unidades</p>
              <p className="text-2xl font-medium text-slate-900 dark:text-white">{matrizes.length}</p>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Unidade Ativa</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[160px]">{selectedMatriz?.name ?? '—'}</p>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <span className="material-symbols-outlined">location_on</span>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Com Endereço</p>
              <p className="text-2xl font-medium text-slate-900 dark:text-white">{matrizes.filter(m => m.address).length}</p>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col flex-1">
          {matrizes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-slate-500">
              <span className="material-symbols-outlined text-5xl mb-4 opacity-30">store</span>
              <p className="text-sm font-medium">Nenhuma unidade cadastrada ainda.</p>
              <button onClick={openCreate} className="mt-4 text-red-500 text-xs font-medium hover:underline">
                Criar primeira unidade →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-white/[0.02]">
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Unidade</th>
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Endereço</th>
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Telefone</th>
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Maps</th>
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 text-center">Status</th>
                    <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {matrizes.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                            <span className="material-symbols-outlined text-lg">store</span>
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-red-500 transition-colors">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm text-slate-500">{m.address ?? '—'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm text-slate-500">{m.phone ?? '—'}</span>
                      </td>
                      <td className="px-6 py-5">
                        {m.maps_url ? (
                          <a
                            href={m.maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined text-sm">map</span>
                            Ver mapa
                          </a>
                        ) : (
                          <span className="text-sm text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        {selectedMatriz?.id === m.id ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-medium tracking-[0.2em] uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Ativa
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedMatriz(m)}
                            className="px-3 py-1 rounded-full text-[10px] font-medium tracking-[0.2em] uppercase bg-slate-500/10 text-slate-500 border border-slate-500/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all"
                          >
                            Selecionar
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(m)}
                            className="p-2 border border-border-subtle rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-all"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => openDelete(m)}
                            disabled={matrizes.length === 1}
                            className="p-2 border border-border-subtle rounded-lg text-slate-400 hover:text-danger-red hover:border-danger-red transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title={matrizes.length === 1 ? 'Não é possível excluir a única unidade' : 'Excluir'}
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-medium text-slate-900 dark:text-white text-xl">
                {editing ? 'Editar Unidade' : 'Nova Unidade'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome da Unidade *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm"
                  placeholder="Ex: Barber King — Centro"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Endereço</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm"
                  placeholder="Rua, número — Bairro"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Telefone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Link do Google Maps</label>
                <input
                  value={form.maps_url}
                  onChange={(e) => setForm(f => ({ ...f, maps_url: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm"
                  placeholder="https://maps.google.com/..."
                  type="url"
                />
                <p className="text-[10px] text-slate-500 mt-1">Cole o link de compartilhamento do Google Maps da unidade.</p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-medium text-sm border border-border-subtle rounded-xl hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium tracking-[0.2em] uppercase text-[10px] hover:bg-red-600/90 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {isDeleteOpen && toDelete && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-danger-red/10 flex items-center justify-center text-danger-red mb-4">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white text-lg mb-2">Excluir unidade?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Tem certeza que deseja excluir <strong className="text-white">{toDelete.name}</strong>? Todos os dados vinculados a ela serão removidos permanentemente.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="flex-1 py-3 text-slate-400 font-medium text-sm border border-border-subtle rounded-xl hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-danger-red text-white font-medium text-sm rounded-xl hover:bg-red-600 shadow-lg shadow-danger-red/20 transition-all disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMatrizes;
