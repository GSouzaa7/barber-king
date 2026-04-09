import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { RazorIcon } from './RazorIcon';
import { supabase } from '../lib/supabase';
import { useMatriz } from '../contexts/MatrizContext';
import { useAuth } from '../contexts/AuthContext';

interface SidebarItem {
  icon: string;
  label: string;
  path: string;
  desktopOnly?: boolean;
}

interface SidebarProps {
  items: SidebarItem[];
  portalName: string;
  user?: {
    name: string;
    role: string;
    avatar: string;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ items, portalName, user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { matrizes, selectedMatriz, setSelectedMatriz } = useMatriz();
  const [matrizOpen, setMatrizOpen] = useState(false);
  const mobileNavRef = React.useRef<HTMLDivElement>(null);

  const displayPortalName = portalName.replace(/KINGK/g, 'KING');
  const showMatrizSelector = role === 'admin' && matrizes.length > 0;

  return (
    <>
    <aside className="w-20 bg-white dark:bg-card-dark border-r border-slate-200 dark:border-border-subtle flex flex-col fixed h-full z-50 hidden lg:flex items-center py-6">
      <div className="mb-4 group relative">
        <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center border border-red-600/20 shadow-sm transition-all hover:bg-red-600/20">
          <RazorIcon className="w-8 h-8 text-red-500 drop-shadow-lg" />
        </div>

        {/* Flyout da Logo */}
        <div className="absolute left-[76px] top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block bg-white dark:bg-card-dark border border-slate-200 dark:border-border-subtle rounded-lg shadow-xl px-4 py-2 z-50 pointer-events-none whitespace-nowrap">
          <h1 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white uppercase italic">{displayPortalName}</h1>
        </div>
      </div>

      {/* Seletor de Matriz — visível apenas para admin com matrizes cadastradas */}
      {showMatrizSelector && (
        <div className="relative mb-4 w-full px-3">
          <button
            onClick={() => setMatrizOpen((v) => !v)}
            className="w-14 h-14 mx-auto flex flex-col items-center justify-center rounded-2xl transition-all duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white relative group"
            title={selectedMatriz?.name ?? 'Selecionar unidade'}
          >
            <span className="material-symbols-outlined text-[22px]">store</span>
            {matrizes.length > 1 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                {matrizes.length}
              </span>
            )}
            {/* Flyout label */}
            <div className="absolute left-[68px] top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block bg-white dark:bg-card-dark border border-slate-200 dark:border-border-subtle rounded-lg shadow-xl px-3 py-1.5 z-50 pointer-events-none whitespace-nowrap">
              <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedMatriz?.name ?? '—'}</p>
              <p className="text-[10px] text-slate-500">Unidade ativa</p>
            </div>
          </button>

          {/* Dropdown de matrizes */}
          {matrizOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMatrizOpen(false)} />
              <div className="absolute left-[76px] top-0 ml-2 z-50 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-subtle rounded-2xl shadow-2xl w-64 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-border-subtle">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Selecionar Unidade</p>
                </div>
                <div className="flex flex-col p-2 space-y-1 max-h-64 overflow-y-auto">
                  {matrizes.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedMatriz(m); setMatrizOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
                        selectedMatriz?.id === m.id
                          ? 'bg-red-600/10 text-red-500'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">store</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{m.name}</p>
                        {m.address && <p className="text-[11px] text-slate-500 truncate">{m.address}</p>}
                      </div>
                      {selectedMatriz?.id === m.id && (
                        <span className="material-symbols-outlined text-sm text-red-500">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <nav className="flex-1 w-full px-3 space-y-2 mt-2 flex flex-col relative">
        {items.map((item) => {
          const isActive = location.pathname.includes(item.path);
          return (
            <div key={item.path} className="relative group">
                <NavLink
                  to={item.path}
                  className={`w-14 h-14 mx-auto flex items-center justify-center rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 glow-red'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[26px] ${isActive ? 'filled' : ''}`}>{item.icon}</span>
                </NavLink>
                
                {/* Flyout Menu (Subabas Modal) com Ponte Invisível (pl-3) */}
                {['Agenda', 'Contatos', 'Atendimento', 'Profissionais'].includes(item.label) && (
                  <div className="absolute left-full top-0 hidden group-hover:flex pl-3 z-50">
                      <div className="flex flex-col bg-white dark:bg-card-dark border border-slate-200 dark:border-border-subtle rounded-2xl shadow-2xl w-64 overflow-hidden transform transition-all pointer-events-auto">
                          <div className="p-4 border-b border-slate-200 dark:border-border-subtle flex items-center gap-3 bg-white/[0.02]">
                              <span className={`material-symbols-outlined ${isActive ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'} text-xl`}>{item.icon}</span>
                              <h3 className="font-bold text-slate-900 dark:text-white text-base">{item.label}</h3>
                          </div>
                          
                          <div className="flex flex-col p-2 space-y-1 bg-white dark:bg-card-dark">
                              {item.label === 'Agenda' ? (
                                  <>
                                      <NavLink end to="/admin/agenda" className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${isActive ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Calendário</NavLink>
                                      <NavLink to="/admin/agenda/visao-geral" className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Visão geral</NavLink>
                                      <NavLink to="/admin/agenda/relatorio" className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Relatório de agendamentos</NavLink>
                                  </>
                              ) : item.label === 'Contatos' ? (
                                  <>
                                      <NavLink end to={item.path} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${isActive ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Clientes</NavLink>
                                      <NavLink to={`${item.path}/birthdays`} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Aniversariantes</NavLink>
                                      <NavLink to={`${item.path}/frequency`} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Frequência</NavLink>
                                  </>
                              ) : item.label === 'Atendimento' ? (
                                  <>
                                      <NavLink end to={item.path} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                          Serviços
                                      </NavLink>
                                      <NavLink to={`${item.path}/history`} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                          Histórico
                                      </NavLink>
                                      <NavLink to={`${item.path}/reports`} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                          Relatórios
                                      </NavLink>
                                  </>
                              ) : item.label === 'Profissionais' ? (
                                  <>
                                      <NavLink end to={item.path} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                          Barbeiros
                                      </NavLink>
                                      <NavLink to={`${item.path}/suppliers`} className={({ isActive }) => `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-red-600/10 text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                          Fornecedores
                                      </NavLink>
                                  </>
                              ) : null}
                          </div>
                      </div>
                  </div>
                )}
            </div>
          );
        })}
        
        <div className="pt-4 mt-auto border-t border-slate-200 dark:border-border-subtle w-full flex flex-col justify-center items-center gap-2">
            <div className="relative group w-full">
               <NavLink 
                  to="/admin/settings"
                  className={({ isActive }) => 
                    `w-14 h-14 mx-auto flex items-center justify-center rounded-2xl transition-all duration-200 ${
                      isActive ? 'bg-red-600 text-white shadow-lg glow-red' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`
                  }
                  title="Configurações"
                >
                  <span className="material-symbols-outlined text-[26px]">settings</span>
               </NavLink>
            </div>
        </div>
      </nav>

      <div className="mt-4 pb-2 w-full flex flex-col items-center justify-center gap-3 relative group">
        {user && (
            <>
               <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-border-subtle object-cover cursor-pointer hover:border-red-500 transition-colors" />
               <div className="absolute left-full bottom-14 hidden group-hover:flex pl-3 z-50">
                   <div className="flex flex-col bg-white dark:bg-card-dark border border-slate-200 dark:border-border-subtle rounded-2xl shadow-2xl p-4 w-48 pointer-events-auto">
                       <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                       <p className="text-xs text-slate-500 truncate">{user.role}</p>
                   </div>
               </div>
            </>
        )}

        <button
            onClick={() => {
              supabase.auth.signOut().then(() => navigate('/'));
            }}
            className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-500 hover:bg-danger-red/10 hover:text-danger-red transition-colors"
            title="Sair"
        >
            <span className="material-symbols-outlined text-[18px] ml-1">logout</span>
        </button>
      </div>
    </aside>

    {/* ── Mobile Bottom Navigation (visível apenas em telas < lg) ── */}
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">

      {/* Sub-abas: aparece acima da nav principal quando a seção ativa tem sub-páginas */}
      {(() => {
        type SubTab = {
          label: string;
          // Para rotas reais usa path; para tabs via ?tab= usa tabParam
          path?: string;
          tabParam?: string; // valor de ?tab=
          isDefault?: boolean; // ativa quando não há ?tab= na URL
        };

        const subTabsMap: Record<string, SubTab[]> = {
          '/admin/agenda': [
            { label: 'Calendário', path: '/admin/agenda', isDefault: true },
            { label: 'Visão geral', path: '/admin/agenda/visao-geral' },
            { label: 'Relatório', path: '/admin/agenda/relatorio' },
          ],
          '/admin/clients': [
            { label: 'Clientes', path: '/admin/clients', isDefault: true },
            { label: 'Aniversariantes', path: '/admin/clients/birthdays' },
            { label: 'Frequência', path: '/admin/clients/frequency' },
          ],
          '/admin/atendimento': [
            { label: 'Serviços', path: '/admin/atendimento', isDefault: true },
            { label: 'Histórico', path: '/admin/atendimento/history' },
            { label: 'Relatórios', path: '/admin/atendimento/reports' },
          ],
          '/admin/professionals': [
            { label: 'Barbeiros', path: '/admin/professionals', isDefault: true },
            { label: 'Fornecedores', path: '/admin/professionals/suppliers' },
          ],
          '/admin/inventory': [
            { label: 'Inventário', tabParam: 'inventario', isDefault: true },
            { label: 'Giro de Estoque', tabParam: 'giro' },
          ],
          '/admin/settings': [
            { label: 'Acessos', tabParam: 'acessos', isDefault: true },
            { label: 'Dados do Salão', tabParam: 'salao' },
            { label: 'Taxas & Comissões', tabParam: 'taxas' },
          ],
          '/admin/financial': [
            { label: 'Visão Geral', tabParam: 'visao-geral', isDefault: true },
            { label: 'Fluxo de Caixa', tabParam: 'fluxo-caixa' },
            { label: 'Despesas', tabParam: 'gestao-despesas' },
            { label: 'Relatórios', tabParam: 'relatorios' },
            { label: 'Comissões', tabParam: 'comissoes' },
            { label: 'Categorias', tabParam: 'categorias-contas' },
          ],
        };

        const activeSection = Object.keys(subTabsMap).find((key) =>
          location.pathname.startsWith(key)
        );
        const subTabs = activeSection ? subTabsMap[activeSection] : null;
        if (!subTabs) return null;

        const currentTabParam = new URLSearchParams(location.search).get('tab');

        const getIsActive = (sub: SubTab): boolean => {
          if (sub.tabParam !== undefined) {
            // Tab via search param
            if (!currentTabParam) return !!sub.isDefault;
            return currentTabParam === sub.tabParam;
          }
          // Tab via rota
          if (sub.isDefault) return location.pathname === activeSection && !location.pathname.includes('/');
          return sub.path
            ? (sub.isDefault
                ? location.pathname === sub.path && !new URLSearchParams(location.search).get('tab')
                : location.pathname.startsWith(sub.path))
            : false;
        };

        // Reconstrói active para rotas (mantém lógica original)
        const getIsActiveRoute = (sub: SubTab): boolean => {
          if (sub.tabParam !== undefined) {
            if (!currentTabParam) return !!sub.isDefault;
            return currentTabParam === sub.tabParam;
          }
          if (!sub.path) return false;
          if (sub.isDefault) {
            return location.pathname === sub.path && location.pathname === activeSection;
          }
          return location.pathname.startsWith(sub.path);
        };

        const getTo = (sub: SubTab): string => {
          if (sub.tabParam !== undefined) return `${activeSection}?tab=${sub.tabParam}`;
          return sub.path ?? activeSection ?? '/';
        };

        return (
          <div className="bg-white dark:bg-card-dark border-t border-slate-200 dark:border-border-subtle px-3 py-2 flex overflow-x-auto scrollbar-hide gap-2">
            {subTabs.map((sub, i) => {
              const isSubActive = getIsActiveRoute(sub);
              return (
                <NavLink
                  key={i}
                  to={getTo(sub)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                    isSubActive
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {sub.label}
                </NavLink>
              );
            })}
          </div>
        );
      })()}

      {/* Barra principal de tabs */}
      <div className="bg-white dark:bg-card-dark border-t border-slate-200 dark:border-border-subtle shadow-[0_-4px_24px_rgba(0,0,0,0.10)]">
        <div
          ref={mobileNavRef}
          className="flex overflow-x-auto scrollbar-hide px-2 py-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {items.filter((item) => !item.desktopOnly).map((item) => {
            const isActive = location.pathname.includes(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{ scrollSnapAlign: 'start' }}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[68px] px-2 py-2 rounded-2xl transition-all duration-200 flex-shrink-0 ${
                  isActive ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <span className={`material-symbols-outlined text-[24px] transition-all duration-200 ${isActive ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-semibold leading-tight truncate max-w-[60px] text-center`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-red-500 rounded-full" />
                )}
              </NavLink>
            );
          })}

          {/* Configurações */}
          <NavLink
            to="/admin/settings"
            style={{ scrollSnapAlign: 'start' }}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 min-w-[68px] px-2 py-2 rounded-2xl transition-all duration-200 flex-shrink-0 ${
                isActive ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-[24px] ${isActive ? 'filled' : ''}`}>settings</span>
                <span className="text-[10px] font-semibold leading-tight text-center">Config.</span>
                {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-red-500 rounded-full" />}
              </>
            )}
          </NavLink>

          {/* Sair */}
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[68px] px-2 py-2 rounded-2xl text-slate-400 dark:text-slate-500 transition-all duration-200 flex-shrink-0 hover:text-red-500"
            style={{ scrollSnapAlign: 'start' }}
          >
            <span className="material-symbols-outlined text-[24px]">logout</span>
            <span className="text-[10px] font-semibold leading-tight">Sair</span>
          </button>
        </div>
      </div>
    </nav>
    </>
  );
};

export default Sidebar;
