import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useMatriz } from '../contexts/MatrizContext';
import { useAuth } from '../contexts/AuthContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Professional {
  id: string;
  name: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose }) => {
  const { selectedMatriz } = useMatriz();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const next15Days = React.useMemo(() => {
    const days = [];
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    for (let i = 0; i < 15; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        id: d.toISOString().split('T')[0],
        dayName: i === 0 ? 'HOJE' : i === 1 ? 'AMANHÃ' : weekDays[d.getDay()],
        dayNumber: d.getDate().toString().padStart(2, '0'),
        monthName: months[d.getMonth()]
      });
    }
    return days;
  }, []);

  // Fetch services on open
  useEffect(() => {
    if (!isOpen || !selectedMatriz) return;
    setLoadingServices(true);
    supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('matriz_id', selectedMatriz.id)
      .eq('active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) setServices(data);
        setLoadingServices(false);
      });
  }, [isOpen, selectedMatriz]);

  // Fetch professionals when service selected
  useEffect(() => {
    if (!selectedService || !selectedMatriz) return;
    setLoadingProfessionals(true);
    setProfessionals([]);
    supabase
      .from('professional_matrizes')
      .select('professionals(id, name)')
      .eq('matriz_id', selectedMatriz.id)
      .eq('status', 'ativo')
      .then(({ data, error }) => {
        if (!error && data) {
          const profs = (data as any[])
            .map((r) => r.professionals)
            .filter(Boolean);
          setProfessionals(profs);
        }
        setLoadingProfessionals(false);
      });
  }, [selectedService, selectedMatriz]);

  // Compute available slots when professional + date selected
  const fetchSlots = useCallback(async () => {
    if (!selectedBarber || !selectedDate || !selectedService) return;

    const service = services.find((s) => s.id === selectedService);
    if (!service) return;

    setLoadingSlots(true);
    setAvailableSlots([]);

    // date string like "2025-06-10" — parse as local date using noon to avoid TZ shifts
    const localDate = new Date(`${selectedDate}T12:00:00`);
    const dayOfWeek = localDate.getDay(); // 0=Sun

    const [schedulesRes, apptsRes] = await Promise.all([
      supabase
        .from('professional_schedules')
        .select('start_time, end_time')
        .eq('professional_id', selectedBarber)
        .eq('day_of_week', dayOfWeek),
      supabase
        .from('appointments')
        .select('scheduled_at, duration_minutes, services(duration_minutes)')
        .eq('professional_id', selectedBarber)
        .gte('scheduled_at', `${selectedDate}T00:00:00`)
        .lte('scheduled_at', `${selectedDate}T23:59:59`)
        .neq('status', 'cancelled'),
    ]);

    const schedules = schedulesRes.data || [];
    const existingAppts = apptsRes.data || [];

    if (!schedules.length) {
      setLoadingSlots(false);
      return; // professional doesn't work this day
    }

    const duration = service.duration_minutes;
    const slots: string[] = [];

    for (const sched of schedules) {
      const [startH, startM] = sched.start_time.split(':').map(Number);
      const [endH, endM] = sched.end_time.split(':').map(Number);

      let cur = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      while (cur + duration <= endMin) {
        const h = Math.floor(cur / 60).toString().padStart(2, '0');
        const m = (cur % 60).toString().padStart(2, '0');
        const slotEnd = cur + duration;

        const hasConflict = (existingAppts as any[]).some((appt) => {
          const apptDate = new Date(appt.scheduled_at);
          const apptStart = apptDate.getHours() * 60 + apptDate.getMinutes();
          const apptDur =
            appt.duration_minutes ||
            (appt.services as any)?.duration_minutes ||
            40;
          const apptEnd = apptStart + apptDur;
          return cur < apptEnd && slotEnd > apptStart;
        });

        if (!hasConflict) slots.push(`${h}:${m}`);
        cur += duration;
      }
    }

    setAvailableSlots(slots);
    setLoadingSlots(false);
  }, [selectedBarber, selectedDate, selectedService, services]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleConfirm = async () => {
    if (!selectedMatriz || !selectedService || !selectedBarber || !selectedDate || !selectedTime) return;

    setConfirming(true);
    setErrorMsg('');

    let clientId: string | null = null;

    if (user?.email) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();
      clientId = clientData?.id ?? null;
    }

    const service = services.find((s) => s.id === selectedService);
    const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

    const { error } = await supabase.from('appointments').insert({
      matriz_id: selectedMatriz.id,
      client_id: clientId,
      professional_id: selectedBarber,
      service_id: selectedService,
      scheduled_at: scheduledAt,
      duration_minutes: service?.duration_minutes ?? 40,
      status: 'pending',
    });

    setConfirming(false);

    if (error) {
      setErrorMsg('Erro ao confirmar agendamento. Tente novamente.');
      return;
    }

    setStep(4);
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);
    setErrorMsg('');
    onClose();
  };

  const selectedServiceObj = services.find((s) => s.id === selectedService);
  const selectedBarberObj = professionals.find((b) => b.id === selectedBarber);

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDuration = (min: number) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m} min` : `${h}h`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      />

      {/* Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px] animate-fade-in-up">

        {/* Left Panel: Progress/Info */}
        <div className="w-full md:w-1/3 bg-slate-50 dark:bg-black/50 p-8 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-medium text-red-500 tracking-[0.3em] uppercase mb-2 block">Reserva</span>
            <h2 className="text-2xl font-light text-slate-900 dark:text-white tracking-wide mb-8">Agendar<br/>Horário</h2>

            <div className="space-y-6">
              <div className={`flex items-start gap-3 transition-opacity ${step >= 1 ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step >= 1 ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>1</div>
                <div>
                  <p className="text-[10px] font-medium tracking-widest uppercase text-slate-400">Serviço</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[120px]">
                    {selectedServiceObj ? selectedServiceObj.name : 'Não selecionado'}
                  </p>
                </div>
              </div>

              <div className={`flex items-start gap-3 transition-opacity ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step >= 2 ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>2</div>
                <div>
                  <p className="text-[10px] font-medium tracking-widest uppercase text-slate-400">Profissional</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[120px]">
                    {selectedBarberObj ? selectedBarberObj.name : 'Não selecionado'}
                  </p>
                </div>
              </div>

              <div className={`flex items-start gap-3 transition-opacity ${step >= 3 ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step >= 3 ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>3</div>
                <div>
                  <p className="text-[10px] font-medium tracking-widest uppercase text-slate-400">Data & Hora</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 pr-2">
                    {selectedDate && selectedTime
                      ? `${selectedDate.split('-').reverse().join('/')} às ${selectedTime}`
                      : 'Não selecionado'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {selectedServiceObj && selectedBarberObj && selectedTime && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 animate-fade-in-up">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Total Estimado</p>
              <p className="text-2xl font-light text-slate-900 dark:text-white">
                {formatPrice(selectedServiceObj.price)}
              </p>
            </div>
          )}
        </div>

        {/* Right Panel: Content */}
        <div className="w-full md:w-2/3 p-8 flex flex-col relative overflow-y-auto custom-scrollbar">
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <div className="flex-1 mt-6">
            {/* Passo 1: Serviços */}
            {step === 1 && (
              <div className="animate-fade-in-up">
                <h3 className="text-lg font-light text-slate-800 dark:text-white mb-6">Selecione o Serviço</h3>
                {loadingServices ? (
                  <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined animate-spin text-red-500">progress_activity</span>
                  </div>
                ) : services.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-12">Nenhum serviço disponível.</p>
                ) : (
                  <div className="grid gap-3">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => { setSelectedService(service.id); setStep(2); }}
                        className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                          selectedService === service.id
                            ? 'border-red-500/50 bg-red-500/5'
                            : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-[18px]">content_cut</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{service.name}</p>
                            <p className="text-[10px] text-slate-400 tracking-widest uppercase">{formatDuration(service.duration_minutes)}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-red-500">{formatPrice(service.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Passo 2: Profissional */}
            {step === 2 && (
              <div className="animate-fade-in-up">
                <button onClick={() => setStep(1)} className="text-[10px] text-slate-400 uppercase tracking-widest hover:text-red-500 flex items-center gap-1 mb-6 transition-colors">
                  <span className="material-symbols-outlined text-[12px]">arrow_back</span> Voltar
                </button>
                <h3 className="text-lg font-light text-slate-800 dark:text-white mb-6">Escolha o Profissional</h3>
                {loadingProfessionals ? (
                  <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined animate-spin text-red-500">progress_activity</span>
                  </div>
                ) : professionals.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-12">Nenhum profissional disponível.</p>
                ) : (
                  <div className="grid gap-4">
                    {professionals.map((barber) => (
                      <button
                        key={barber.id}
                        onClick={() => { setSelectedBarber(barber.id); setStep(3); }}
                        className={`flex items-center gap-4 p-5 rounded-2xl border text-left transition-all ${
                          selectedBarber === barber.id
                            ? 'border-red-500/50 bg-red-500/5'
                            : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined">person</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{barber.name}</p>
                          <p className="text-[10px] text-slate-400 tracking-widest uppercase">Profissional</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Passo 3: Data e Hora */}
            {step === 3 && (
              <div className="animate-fade-in-up">
                <button onClick={() => setStep(2)} className="text-[10px] text-slate-400 uppercase tracking-widest hover:text-red-500 flex items-center gap-1 mb-6 transition-colors">
                  <span className="material-symbols-outlined text-[12px]">arrow_back</span> Voltar
                </button>
                <h3 className="text-lg font-light text-slate-800 dark:text-white mb-6">Data e Horário</h3>

                {/* Calendar Row */}
                <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar mb-6 relative">
                  {next15Days.map((date) => (
                    <button
                      key={date.id}
                      onClick={() => { setSelectedDate(date.id); setSelectedTime(null); }}
                      className={`flex-shrink-0 w-[84px] py-4 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                        selectedDate === date.id
                          ? 'border-red-500 bg-red-500/10 text-red-500'
                          : 'border-slate-200 dark:border-white/5 text-slate-500 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className="text-[9px] uppercase font-bold tracking-[0.2em] mb-1">{date.dayName}</span>
                      <span className="text-3xl font-light leading-none">{date.dayNumber}</span>
                      <span className="text-[9px] uppercase tracking-[0.2em] mt-1 opacity-70">{date.monthName}</span>
                    </button>
                  ))}
                  <div className="sticky right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-white dark:from-[#0a0a0a] to-transparent pointer-events-none"></div>
                </div>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="material-symbols-outlined animate-spin text-red-500">progress_activity</span>
                  </div>
                ) : selectedDate && availableSlots.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Sem horários disponíveis nesta data.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {availableSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        disabled={!selectedDate}
                        className={`py-3 rounded-xl border text-xs font-medium transition-all ${
                          !selectedDate
                            ? 'opacity-30 cursor-not-allowed border-slate-200 dark:border-white/5'
                            : selectedTime === time
                              ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/20'
                              : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Passo Final: Confirmação */}
            {step === 4 && (
              <div className="animate-fade-in-up h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-500/20">
                  <span className="material-symbols-outlined text-4xl">check</span>
                </div>
                <h3 className="text-2xl font-light text-slate-900 dark:text-white mb-2">Agendamento Confirmado</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-8">
                  Te aguardamos dia {selectedDate?.split('-').reverse().join('/')} às {selectedTime} com {selectedBarberObj?.name}.
                </p>
                <button
                  onClick={handleClose}
                  className="px-8 py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                >
                  Concluir
                </button>
              </div>
            )}
          </div>

          {/* Error message */}
          {errorMsg && (
            <p className="mt-4 text-xs text-red-500 text-center">{errorMsg}</p>
          )}

          {/* Footer Nav */}
          {step === 3 && (
            <div className="mt-8">
              <button
                disabled={!selectedDate || !selectedTime || confirming}
                onClick={handleConfirm}
                className="w-full py-4 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 glow-red animate-shine flex items-center justify-center gap-2"
              >
                {confirming ? (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                ) : null}
                Confirmar Reserva
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
