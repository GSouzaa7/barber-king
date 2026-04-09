import React from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import type { Appointment, Service } from '../../hooks/agenda.types';

interface ActionModalProps {
    isOpen: boolean;
    appointment: Appointment | null;
    servicesList: Service[];
    onClose: () => void;
    onComplete: (overrideAmount?: number, paymentMethod?: string) => void;
    onReschedule: () => void;
    onCancel: () => void;
    onOpenComanda: () => void;
}

/**
 * Modal de detalhes e ações de um agendamento existente.
 * Exibe informações do evento e permite: Concluir, Remarcar, Cancelar, Lançar Comanda.
 */
export const ActionModal: React.FC<ActionModalProps> = ({
    isOpen,
    appointment,
    servicesList,
    onClose,
    onComplete,
    onReschedule,
    onCancel,
    onOpenComanda
}) => {
    if (!isOpen || !appointment) return null;

    const calculateEndTime = (startTime: string, durationMinutes: number = 40) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startInMinutes = hours * 60 + minutes;
        const endInMinutes = startInMinutes + durationMinutes;
        const endHours = Math.floor(endInMinutes / 60);
        const endMins = endInMinutes % 60;
        return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    };

    const svc = servicesList.find(s => s.id === appointment.service_id);
    const price = svc?.price ?? null;
    const priceStr = price != null ? `R$ ${Number(price).toFixed(2).replace('.', ',')}` : '—';

    return (
        <div className="fixed inset-0 z-[60] bg-slate-800/20 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl border border-slate-200/50 dark:border-white/5 rounded-3xl w-full max-w-sm shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-fadeIn flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200/50 dark:border-white/5 flex justify-between items-center bg-transparent">
                    <h3 className="font-bold text-slate-800 dark:text-white text-[13px] uppercase tracking-[0.2em]">Detalhes do Evento</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors p-1">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Body - Details List */}
                <div className="p-6 flex flex-col gap-5">
                    {/* Type & Date */}
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-lg">event</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-white text-[15px]">{appointment.type === 'block' ? 'Bloqueio de Horário' : 'Agendamento'}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                                {new Date(appointment.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')} • {appointment.time} - {calculateEndTime(appointment.time, appointment.duration || 40)}
                            </span>
                        </div>
                    </div>

                    {/* Professional */}
                    <div className="flex items-center gap-4">
                        <img src="https://i.pravatar.cc/150?img=11" alt="Barber" className="w-8 h-8 rounded-full border border-slate-200 dark:border-border-subtle object-cover shrink-0" />
                        <span className="text-slate-700 dark:text-slate-200 font-medium text-[15px]">{appointment.barber}</span>
                    </div>

                    {/* Client */}
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-sm shrink-0 border border-teal-500/10">
                            {appointment.client.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-700 dark:text-slate-200 font-medium text-[15px] uppercase">{appointment.client}</span>
                            <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-[#25D366] transition-colors"><span className="material-symbols-outlined text-[18px]">chat</span></a>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-success-green text-[20px]">check_circle</span>
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 font-medium text-[15px]">{appointment.status === 'done' ? 'Concluído' : 'Agendado'}</span>
                    </div>

                    {/* Service & Price */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[20px]">spa</span>
                            </div>
                            <span className="text-slate-700 dark:text-slate-200 font-medium text-[15px]">1x {appointment.service || '—'}</span>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-white">{priceStr}</span>
                    </div>

                    {/* Total Price */}
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[20px]">payments</span>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-white text-[15px]">
                            {price != null ? `Total: ${priceStr}` : 'Valor não definido'}
                        </span>
                    </div>

                    {/* Notes */}
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[20px]">chat_bubble</span>
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 font-medium text-[15px]">Primeira visita, cabelo liso</span>
                    </div>
                </div>

                <hr className="border-slate-200/50 dark:border-white/5" />

                {/* Action Buttons Panel */}
                <div className="p-6 flex flex-col gap-3">
                    <button
                        onClick={onOpenComanda}
                        className="w-full py-4 bg-slate-900 dark:bg-white text-[#ffffff] dark:text-slate-900 font-bold tracking-wide rounded-2xl flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">receipt_long</span>
                        LANÇAR COMANDA
                    </button>

                    {appointment.status === 'done' ? (
                        <button
                            onClick={() => {
                                if (!appointment.phone) {
                                    toast.error('Cliente sem telefone cadastrado.');
                                    return;
                                }
                                const cleanPhone = appointment.phone.replace(/\D/g, '');
                                const msg = `Olá ${appointment.client}! Obrigado pela preferência hoje na KINGK Barbearia. Ficou satisfeito com o resultado do seu ${appointment.service}? Se puder, nos avalie no Google! [Link da Sua Avaliação]`;
                                window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 mb-2"
                        >
                            <span className="material-symbols-outlined">sentiment_satisfied</span>
                            Agradecer via WhatsApp
                        </button>
                    ) : (
                        <button
                            onClick={() => onComplete()}
                            className="w-full py-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-all"
                        >
                            <span className="material-symbols-outlined">check_circle</span>
                            Concluir Atendimento
                        </button>
                    )}

                    <button
                        onClick={onReschedule}
                        className="w-full py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                    >
                        <span className="material-symbols-outlined">edit_calendar</span>
                        {appointment.status === 'done' ? 'Agendar Próximo' : 'Remarcar / Editar'}
                    </button>

                    {appointment.status !== 'done' && (
                        <button
                            onClick={onCancel}
                            className="w-full py-3 bg-transparent border border-red-500/30 text-red-600 dark:text-red-500 hover:bg-red-500/10 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all mt-2"
                        >
                            <span className="material-symbols-outlined">cancel</span>
                            Cancelar Agendamento
                        </button>
                    )}

                    <hr className="border-slate-200/50 dark:border-white/5 my-1" />

                    {appointment.status !== 'done' && (
                        <button
                            onClick={() => {
                                if (!appointment.phone) {
                                    toast.error('Cliente sem telefone cadastrado.');
                                    return;
                                }
                                const cleanPhone = appointment.phone.replace(/\D/g, '');
                                const msg = `Olá ${appointment.client}! Confirmamos seu horário para ${appointment.service} às ${appointment.time} no dia ${new Date(appointment.date).toLocaleDateString('pt-BR')} na KINGK Barbearia. Podemos confirmar?`;
                                window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="w-full py-3 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#25D366]/20 transition-all font-sans"
                        >
                            <span className="material-symbols-outlined">chat</span>
                            Lembrar via WhatsApp
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
