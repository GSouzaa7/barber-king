import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabase';

const AdminBirthdays: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // Array of months for the mini calendar
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Helper to get abbreviated month names
  const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const [allClients, setAllClients] = useState<{
    id: string; name: string; phone: string; birthDate: string; avatar: string;
  }[]>([]);

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name, phone, birth_date')
      .not('birth_date', 'is', null)
      .order('birth_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) { console.error(error); return; }
        setAllClients((data ?? []).map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone ?? '',
          birthDate: c.birth_date,
          avatar: `https://i.pravatar.cc/150?u=${c.id}`,
        })));
      });
  }, []);

  // Filter clients by selected month
  const filteredClients = allClients.filter(client => {
    if (!client.birthDate) return false;
    // Extract month from "YYYY-MM-DD"
    const month = parseInt(client.birthDate.split('-')[1], 10) - 1; 
    return month === selectedMonth;
  });

  const todayDate = new Date();
  const currentMonth = todayDate.getMonth();
  const currentDay = todayDate.getDate();

  const getBirthdayStatus = (client: any) => {
      const month = parseInt(client.birthDate.split('-')[1], 10) - 1;
      const day = parseInt(client.birthDate.split('-')[2], 10);
      
      if (month < currentMonth) return 'passed';
      if (month > currentMonth) return 'upcoming';
      
      if (day < currentDay) return 'passed';
      if (day > currentDay) return 'upcoming';
      return 'today';
  };

  const todayClients = filteredClients.filter(c => getBirthdayStatus(c) === 'today');
  const upcomingClients = filteredClients.filter(c => getBirthdayStatus(c) === 'upcoming');
  const passedClients = filteredClients.filter(c => getBirthdayStatus(c) === 'passed');

  const sidebarItems = [
    { icon: 'grid_view', label: 'Início', path: '/admin/dashboard' },
    { icon: 'calendar_today', label: 'Agenda', path: '/admin/agenda' },
    { icon: 'group', label: 'Contatos', path: '/admin/clients' },
    { icon: 'receipt_long', label: 'Atendimento', path: '/admin/atendimento' },
    { icon: 'content_cut', label: 'Profissionais', path: '/admin/professionals' },
    { icon: 'inventory_2', label: 'Estoque', path: '/admin/inventory' },
    { icon: 'account_balance_wallet', label: 'Financeiro', path: '/admin/financial' },
  ];

  const handleSendGreeting = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const renderClientCard = (client: any, status: 'today' | 'upcoming' | 'passed') => {
      const day = parseInt(client.birthDate.split('-')[2], 10);
      const strDay = String(day).padStart(2, '0');

      let buttonBg = "";
      let buttonText = "";
      let message = "";
      let opacityClass = "";

      if (status === 'today') {
          buttonBg = "bg-[#25D366] hover:brightness-110 text-white shadow-lg shadow-[#25D366]/20";
          buttonText = "Mandar Parabéns";
          message = `Olá, ${client.name}! A KINGK Barbearia te deseja um feliz aniversário! 🎉 Tem um presente especial pra você, venha nos visitar!`;
          opacityClass = "border-[#25D366]/30 shadow-md shadow-[#25D366]/5";
      } else if (status === 'upcoming') {
          const diasFaltam = day - currentDay;
          const infoDias = selectedMonth === currentMonth ? (diasFaltam === 1 ? ' (Amanhã)' : ` (Faltam ${diasFaltam} dias)`) : '';
          buttonBg = "bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-600 dark:text-red-500";
          buttonText = `Lembrar Pelo Whats${infoDias}`;
          message = `Fala ${client.name}! Seu aniversário tá chegando dia ${strDay}/${String(selectedMonth+1).padStart(2, '0')}, já agendou seu corte pra ficar na estica? ✂️👑`;
          opacityClass = "hover:border-red-500/30";
      } else { // passed
          buttonBg = "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500";
          buttonText = "Parabéns Atrasado";
          message = `Fala ${client.name}! Passou seu aniversário dia ${strDay} e viemos aqui te desejar um Feliz Aniversário atrasado! 🎉 Desejamos tudo de bom!`;
          opacityClass = "opacity-60 hover:opacity-100 hover:border-amber-500/30";
      }

      return (
          <div key={client.id} className={`bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex flex-col gap-4 transition-all group ${opacityClass}`}>
              <div className="flex items-start justify-between">
                  <div className="flex gap-4 items-center">
                      <img src={client.avatar} alt={client.name} className={`w-16 h-16 rounded-full border-2 ${status === 'today' ? 'border-[#25D366]' : 'border-border-subtle group-hover:border-red-500/50'} transition-colors object-cover`} />
                      <div>
                          <h3 className="font-medium text-slate-900 dark:text-white text-lg">{client.name}</h3>
                          <p className="text-slate-600 dark:text-slate-400 text-sm flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[14px]">call</span>
                              {client.phone}
                          </p>
                      </div>
                  </div>
                  <div className={`${status === 'today' ? 'bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366]' : 'bg-red-600/10 border-red-500/20 text-red-600 dark:text-red-500'} border rounded-xl px-3 py-2 flex flex-col items-center justify-center`}>
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-[10px] leading-none mb-1">Dia</span>
                      <span className={`text-xl font-extrabold leading-none ${status === 'today' ? 'text-[#25D366]' : 'text-slate-900 dark:text-white'}`}>{strDay}</span>
                  </div>
              </div>
              
              <button 
                  onClick={() => handleSendGreeting(client.phone, message)}
                  className={`mt-2 w-full py-3 rounded-xl font-medium tracking-[0.2em] uppercase text-[10px] flex items-center justify-center gap-2 transition-all ${buttonBg}`}
              >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.711.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"></path>
                  </svg>
                  {buttonText}
              </button>
          </div>
      );
  };

  return (
    <div className="flex bg-slate-50 dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 min-h-screen relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 dark:bg-red-600/5 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen mix-blend-normal opacity-50 dark:opacity-100 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-slate-400/20 dark:bg-white/5 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-100"></div>
      <Sidebar items={sidebarItems} portalName="KINGK" />

      <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-red-600 dark:text-red-500 text-4xl">cake</span>
              Aniversariantes
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Acompanhe quem está de aniversário e mande um parabéns!</p>
          </div>

          <div className="relative">
            <button 
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="flex items-center gap-2 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl transition-colors border border-slate-200 dark:border-red-500/30 px-5 py-3 rounded-xl text-red-600 dark:text-red-500 font-medium tracking-[0.2em] uppercase text-[10px] hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm"
            >
                <span className="material-symbols-outlined text-xl">event</span>
                Mês: {months[selectedMonth]}
                <span className={`material-symbols-outlined transition-transform duration-300 ${isMonthPickerOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {/* Mini Calendário de Meses (Dropdown) */}
            {isMonthPickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMonthPickerOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-3 bg-white dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-2xl p-4 w-72 shadow-2xl z-50 animate-fadeIn origin-top-right">
                      <div className="text-slate-900 dark:text-white font-medium tracking-tight mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-500">calendar_month</span>
                        Selecione o Mês
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                          {shortMonths.map((m, idx) => (
                              <button
                                  key={idx}
                                  onClick={() => {
                                      setSelectedMonth(idx);
                                      setIsMonthPickerOpen(false);
                                  }}
                                  className={`py-3 rounded-xl font-medium uppercase tracking-[0.2em] text-[10px] transition-all ${
                                      selectedMonth === idx 
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105' 
                                        : 'bg-slate-50 dark:bg-[#101010] text-slate-600 dark:text-slate-400 hover:bg-white/10 hover:text-white'
                                  }`}
                              >
                                  {m}
                              </button>
                          ))}
                      </div>
                  </div>
                </>
            )}
          </div>
        </header>

        {/* Lista de Aniversariantes */}
        {filteredClients.length > 0 ? (
          <div className="flex flex-col gap-10 animate-fadeIn">
              
              {todayClients.length > 0 && (
                <div>
                   <h3 className="text-xl font-medium text-slate-900 dark:text-white tracking-tight mb-4 flex items-center gap-3"><span className="w-2.5 h-2.5 rounded-full bg-[#25D366] animate-pulse ring-4 ring-[#25D366]/20"></span> É HOJE!</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {todayClients.map(c => renderClientCard(c, 'today'))}
                   </div>
                </div>
              )}

              {upcomingClients.length > 0 && (
                <div>
                   <h3 className="text-xl font-medium text-slate-900 dark:text-white tracking-tight mb-4 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-600/80"></span> Próximos do Mês</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {upcomingClients.map(c => renderClientCard(c, 'upcoming'))}
                   </div>
                </div>
              )}

              {passedClients.length > 0 && (
                <div>
                   <h3 className="text-xl font-bold text-slate-500 mb-4 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span> Já Passaram</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {passedClients.map(c => renderClientCard(c, 'passed'))}
                   </div>
                </div>
              )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
              <div className="w-24 h-24 rounded-full bg-red-600/10 flex items-center justify-center text-red-600 dark:text-red-500 mb-6 ring-8 ring-red-500/5">
                <span className="material-symbols-outlined text-4xl">celebration</span>
              </div>
              <h3 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-white mb-2">Nenhum aniversariante</h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-md">Não encontramos clientes fazendo aniversário no mês de {months[selectedMonth]}.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminBirthdays;
