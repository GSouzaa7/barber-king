import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { PaymentModal } from '../../components/PaymentModal';
import { ActionModal } from '../../components/agenda/ActionModal';
import { ComandaModal } from '../../components/agenda/ComandaModal';
import { supabase } from '../../lib/supabase';
import { useMatriz } from '../../contexts/MatrizContext';
import { toast } from 'sonner';

// Definição da interface para Tipagem
interface Appointment {
    id: string;
    client: string;
    client_id: string;
    phone?: string;
    service: string;
    service_id: string;
    time: string;
    barber: string;
    professional_id: string;
    date: string; // Formato YYYY-MM-DD
    color: string;
    type: 'appointment' | 'block';
    status?: 'pending' | 'confirmed' | 'in_progress' | 'done' | 'cancelled';
    duration?: number; // em minutos
}

interface WaitingItem {
    id: string;
    name: string;
    service: string;
    arrivalTime: string; // ISO String
}

// Interfaces para a Comanda
interface ComandaItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    type: 'service' | 'product';
}

const AdminAgenda: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { selectedMatriz } = useMatriz();
    
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Estados do Modal de Criação/Edição
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'appointment' | 'block'>('appointment');
    const [selectedSlot, setSelectedSlot] = useState({
        date: '',
        time: '',
        barber: ''
    });

    // Supabase data
    const [professionals, setProfessionals] = useState<{ id: string; name: string }[]>([]);
    const [clientsList, setClientsList] = useState<{ id: string; name: string }[]>([]);
    const [servicesList, setServicesList] = useState<{ id: string; name: string; price: number; duration_minutes: number }[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Estados de Gerenciamento de Agendamento (Ações)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);

    // Comanda Modal State
    const [isComandaModalOpen, setIsComandaModalOpen] = useState(false);
    const [comandaItems, setComandaItems] = useState<any[]>([]);
    const [comandaDiscount, setComandaDiscount] = useState<number>(0);
    const [comandaPaymentMethod, setComandaPaymentMethod] = useState<'credit' | 'pix' | 'money'>('pix');
    const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState('');

    // Payment Modal State (Mercado Pago)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentModalConfig, setPaymentModalConfig] = useState({
        title: 'Pagamento da Comanda',
        subtitle: 'Via Mercado Pago',
        initialAmount: 0,
        isFixedAmount: true
    });
    const mpPublicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '';

    // Novo Modal State
    const [appointmentType, setAppointmentType] = useState<'Agendamento' | 'Bloqueio de horário' | 'Lembrete' | 'Evento'>('Agendamento');
    const [procedures, setProcedures] = useState([{ id: 1, name: '', qty: 1 }]);

    const [availableProducts, setAvailableProducts] = useState<{ id: string; name: string; price: number }[]>([]);

    const comandaSubtotal = comandaItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const comandaTotal = Math.max(0, comandaSubtotal - comandaDiscount);

    // Estado para Lista de Espera (Sincronizado via localStorage)
    const [waitingList, setWaitingList] = useState<WaitingItem[]>([]);
    // Trigger para forçar re-render do tempo relativo
    const [timeTrigger, setTimeTrigger] = useState(0);

    // Estado dos Agendamentos
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    // Carrega Lista de Espera do LocalStorage
    useEffect(() => {
        // --- Navigation check to open modal from AgendaReports ---
        if (location.state?.openEditModal && location.state?.appointmentId) {
            // Check if we have an appointment with this ID
            const appt = appointments.find(a => a.id.toString() === location.state.appointmentId.toString());
            if (appt) {
                setSelectedAppointment(appt);
                setIsActionModalOpen(true);
            } else {
                // If it's from reports, we might not have it in local mock yet. Let's create a fake one just to show the modal works based on the report data if needed, or simply log an error.
                // For now, we will assume it's one of the mocks:
                const fallbackAppt: Appointment = {
                    id: location.state.appointmentId.toString(),
                    client: 'Cliente (via Relatório)',
                    client_id: '',
                    service: 'Serviço Agendado',
                    service_id: '',
                    time: '14:00',
                    barber: 'Profissional',
                    professional_id: '',
                    date: new Date().toISOString().split('T')[0],
                    color: 'primary',
                    type: 'appointment',
                    status: 'pending',
                    duration: 30
                };
                setSelectedAppointment(fallbackAppt);
                setIsActionModalOpen(true);
            }
            
            // Clean up the state so it doesn't reopen if we navigate back to /agenda normally
            navigate('/admin/agenda', { replace: true, state: {} });
        }
        // -------------------------------------------------------------

        const loadWaitingList = () => {
            const storedList = JSON.parse(localStorage.getItem('bk_waiting_list') || '[]');
            // Se estiver vazia, adiciona o Otávio Lins como mock inicial se não existir
            if (storedList.length === 0) {
                const mockItem = {
                    id: 'OL',
                    name: 'Otávio Lins',
                    service: 'Corte Social',
                    arrivalTime: new Date(Date.now() - 2 * 60000).toISOString() // 2 mins ago
                };
                setWaitingList([mockItem]);
                // Não salva o mock no localStorage para não poluir, apenas no state visual se vazio
            } else {
                setWaitingList(storedList);
            }
        };

        loadWaitingList();

        // Intervalo para atualizar o "tempo atrás" a cada minuto
        const timer = setInterval(() => setTimeTrigger(prev => prev + 1), 60000);

        // Listener para armazenamento (se outra aba atualizar, mas aqui é SPA então só o mount basta por enquanto,
        // mas adicionando para robustez caso mude a arquitetura)
        const handleStorage = () => loadWaitingList();
        window.addEventListener('storage', handleStorage);

        return () => {
            clearInterval(timer);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    // Fetch professionals, clients, services for dropdowns
    useEffect(() => {
        if (!selectedMatriz) return;
        const fetchDropdownData = async () => {
            const [profsRes, clientsRes, servicesRes, productsRes] = await Promise.all([
                supabase
                    .from('professional_matrizes')
                    .select('professionals(id, name)')
                    .eq('matriz_id', selectedMatriz.id)
                    .eq('status', 'ativo'),
                supabase
                    .from('client_matrizes')
                    .select('clients(id, name, phone)')
                    .eq('matriz_id', selectedMatriz.id),
                supabase
                    .from('services')
                    .select('id, name, price, duration_minutes')
                    .eq('matriz_id', selectedMatriz.id)
                    .eq('active', true),
                supabase
                    .from('inventory_products')
                    .select('id, name, price')
                    .eq('matriz_id', selectedMatriz.id)
                    .order('name')
            ]);
            if (profsRes.data) {
                setProfessionals(
                    profsRes.data
                        .map((r: any) => r.professionals)
                        .filter(Boolean) as { id: string; name: string }[]
                );
            }
            if (clientsRes.data) {
                setClientsList(
                    clientsRes.data
                        .map((r: any) => r.clients)
                        .filter(Boolean) as { id: string; name: string }[]
                );
            }
            if (servicesRes.data) {
                setServicesList(servicesRes.data as any);
            }
            if (productsRes.data) {
                setAvailableProducts(productsRes.data as any);
            }
        };
        fetchDropdownData();
    }, [selectedMatriz]);

    // Fetch appointments for current week
    useEffect(() => {
        if (!selectedMatriz) return;
        const fetchAppointments = async () => {
            setLoadingData(true);
            const weekDays = getWeekDays(currentDate);
            const start = new Date(weekDays[0]);
            start.setHours(0, 0, 0, 0);
            const end = new Date(weekDays[6]);
            end.setHours(23, 59, 59, 999);

            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    id,
                    scheduled_at,
                    status,
                    notes,
                    color,
                    type,
                    duration_minutes,
                    clients(id, name, phone),
                    professionals(id, name),
                    services(id, name, duration_minutes)
                `)
                .eq('matriz_id', selectedMatriz.id)
                .gte('scheduled_at', start.toISOString())
                .lte('scheduled_at', end.toISOString());

            if (!error && data) {
                const mapped: Appointment[] = data.map((a: any) => ({
                    id: a.id,
                    client: a.clients?.name || '',
                    client_id: a.clients?.id || '',
                    phone: a.clients?.phone || '',
                    service: a.services?.name || (a.type === 'block' ? 'Bloqueio' : ''),
                    service_id: a.services?.id || '',
                    time: new Date(a.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }),
                    barber: a.professionals?.name || '',
                    professional_id: a.professionals?.id || '',
                    date: a.scheduled_at.split('T')[0],
                    color: a.color || 'primary',
                    type: (a.type as 'appointment' | 'block') || 'appointment',
                    status: a.status,
                    duration: a.duration_minutes || a.services?.duration_minutes || 40
                }));
                setAppointments(mapped);
            }
            setLoadingData(false);
        };
        fetchAppointments();
    }, [selectedMatriz, currentDate]);

    const calculateTimeAgo = (isoTime: string) => {
        const diff = Date.now() - new Date(isoTime).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Agora mesmo';
        return `Chegou há ${minutes} min`;
    };

    const sidebarItems = [
        { icon: 'grid_view', label: 'Início', path: '/admin/dashboard' },
        { icon: 'calendar_today', label: 'Agenda', path: '/admin/agenda' },
        { icon: 'group', label: 'Contatos', path: '/admin/clients' },
        { icon: 'receipt_long', label: 'Atendimento', path: '/admin/atendimento' },
        { icon: 'content_cut', label: 'Profissionais', path: '/admin/professionals' },
        { icon: 'inventory_2', label: 'Estoque', path: '/admin/inventory' },
        { icon: 'account_balance_wallet', label: 'Financeiro', path: '/admin/financial' },
    ];

    // Gera slots de horário das 07:00 até 00:00 (18 horas de operação)
    const timeSlots = Array.from({ length: 18 }, (_, i) => {
        const hour = (i + 7) % 24;
        return `${String(hour).padStart(2, '0')}:00`;
    });

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        const days = [];
        for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
        return days;
    };

    const getWeekDays = (date: Date) => {
        const start = new Date(date);
        start.setDate(start.getDate() - start.getDay());
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const handlePrevDate = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'daily') newDate.setDate(currentDate.getDate() - 1);
        if (viewMode === 'weekly') newDate.setDate(currentDate.getDate() - 7);
        if (viewMode === 'monthly') newDate.setMonth(currentDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNextDate = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'daily') newDate.setDate(currentDate.getDate() + 1);
        if (viewMode === 'weekly') newDate.setDate(currentDate.getDate() + 7);
        if (viewMode === 'monthly') newDate.setMonth(currentDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const getWeekRangeLabel = (date: Date) => {
        const start = new Date(date);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        const startDay = start.getDate();
        const endDay = end.getDate();
        const monthStr = start.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const yearStr = start.getFullYear();

        return `${startDay} - ${endDay} de ${monthStr}. de ${yearStr}`;
    };

    const calculateEndTime = (startTime: string, durationMinutes: number = 40) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startInMinutes = hours * 60 + minutes;
        const endInMinutes = startInMinutes + durationMinutes;
        const endHours = Math.floor(endInMinutes / 60);
        const endMins = endInMinutes % 60;
        return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    // Abre Modal de Criação (Novo)
    const handleSlotClick = (time: string, barberName: string = '', dateParam?: Date) => {
        setEditingAppointmentId(null); // Garante modo criação
        const targetDate = dateParam || currentDate;
        const dateStr = targetDate.toISOString().split('T')[0];

        setSelectedSlot({
            date: dateStr,
            time: time,
            barber: barberName
        });
        setModalType('appointment');
        setIsModalOpen(true);
    };

    // Abre Modal de Ações (Ao clicar em agendamento existente)
    const handleAppointmentClick = (e: React.MouseEvent, appointment: Appointment) => {
        e.stopPropagation();
        setSelectedAppointment(appointment);
        setIsActionModalOpen(true);
    };

    const handleOpenNew = () => {
        setEditingAppointmentId(null);
        const dateStr = currentDate.toISOString().split('T')[0];
        setSelectedSlot({ date: dateStr, time: '09:00', barber: '' });
        setModalType('appointment');
        setIsModalOpen(true);
    };

    // --- Actions Handlers ---

    /**
     * Conclui o atendimento selecionado via RPC atômica:
     * - Atualiza appointment.status = 'done'
     * - Insere registro em financial_records (income)
     * - Decrementa estoque dos produtos vendidos
     * Tudo dentro de uma única transação SQL (ou falham juntas, ou dão certo juntas).
     *
     * @param overrideAmount  Valor total cobrado (da comanda). Se omitido, usa o preço do serviço.
     * @param paymentMethod   Método de pagamento ('PIX' | 'Crédito' | 'Dinheiro'). Default: 'PIX'.
     */
    const handleActionComplete = async (overrideAmount?: number, paymentMethod?: string) => {
        if (!selectedAppointment || !selectedMatriz) return;

        // 1. Determinar valor a registrar
        let finalAmount = overrideAmount;
        let serviceName = selectedAppointment.service;

        if (finalAmount === undefined) {
            const svc = servicesList.find(s => s.id === selectedAppointment.service_id);
            if (svc) {
                finalAmount = Number(svc.price);
                serviceName = svc.name;
            } else if (selectedAppointment.service_id) {
                const { data: svcData } = await supabase
                    .from('services')
                    .select('price, name')
                    .eq('id', selectedAppointment.service_id)
                    .single();
                if (svcData) {
                    finalAmount = Number(svcData.price);
                    serviceName = svcData.name;
                }
            }
        }

        // 2. Montar lista de produtos para baixa de estoque
        const productsToConsume = comandaItems
            .filter(item => item.type === 'product')
            .map(prod => {
                const inventoryProd = availableProducts.find(p => p.name === prod.name);
                return inventoryProd ? {
                    product_id: inventoryProd.id,
                    quantity: prod.quantity,
                    product_name: prod.name
                } : null;
            })
            .filter(Boolean);

        // 3. Determinar método de pagamento
        const method = paymentMethod ?? (
            comandaPaymentMethod === 'money' ? 'Dinheiro' :
            comandaPaymentMethod === 'credit' ? 'Crédito' : 'PIX'
        );

        // 4. Executar TUDO atomicamente via RPC (transação SQL única)
        const { error: rpcError } = await supabase.rpc('complete_checkout', {
            p_appointment_id: selectedAppointment.id,
            p_matriz_id: selectedMatriz.id,
            p_amount: finalAmount ?? 0,
            p_description: `Atendimento: ${serviceName} � ${selectedAppointment.client}`,
            p_payment_method: method,
            p_client_name: selectedAppointment.client,
            p_products: productsToConsume
        });

        if (rpcError) {
            toast.error(`Erro ao concluir atendimento: ${rpcError.message}`, {
                style: { background: '#1A1A1A', color: '#EF4444', borderColor: '#EF4444' }
            });
            return;
        }

        // 5. Verificar alertas de estoque baixo (leitura pós-transação)
        for (const prod of productsToConsume) {
            if (prod) {
                const { data: stockCheck } = await supabase
                    .from('inventory_products')
                    .select('quantity, low_stock_threshold')
                    .eq('id', (prod as any).product_id)
                    .single();
                if (stockCheck && stockCheck.quantity < (stockCheck.low_stock_threshold || 10)) {
                    toast.warning(`Produto ${(prod as any).product_name} atingiu estoque baixo! (${stockCheck.quantity} restantes)`, {
                        style: { background: '#1A1A1A', color: '#F59E0B', borderColor: '#F59E0B' }
                    });
                }
            }
        }

        // 6. Atualizar estado local
        setAppointments(prev => prev.map(a =>
            a.id === selectedAppointment.id ? { ...a, status: 'done' } : a
        ));
        toast.success('Atendimento concluído e comanda fechada com sucesso!', {
            style: { background: '#1A1A1A', color: '#10B981', borderColor: '#10B981' }
        });
        setIsActionModalOpen(false);
        setSelectedAppointment(null);
    };

    const handleActionCancel = async () => {
        if (!selectedAppointment) return;
        // Se o agendamento já foi concluído, reverter o financial_record
        if (selectedAppointment.status === 'done') {
            await supabase
                .from('financial_records')
                .delete()
                .eq('appointment_id', selectedAppointment.id);
        }
        await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', selectedAppointment.id);
        setAppointments(prev => prev.map(a =>
            a.id === selectedAppointment.id ? { ...a, status: 'cancelled' } : a
        ));
        setIsActionModalOpen(false);
        setSelectedAppointment(null);
        toast.success('Agendamento cancelado.', { style: { background: '#1A1A1A', color: '#F59E0B', borderColor: '#F59E0B' } });
    };


    const handleActionReschedule = () => {
        if (!selectedAppointment) return;

        // Configura modo de edição
        setEditingAppointmentId(selectedAppointment.id);
        setModalType(selectedAppointment.type);

        // Preenche dados iniciais (embora o formulário vá usar o defaultValue baseado no ID)
        setSelectedSlot({
            date: selectedAppointment.date,
            time: selectedAppointment.time,
            barber: selectedAppointment.barber
        });

        setIsActionModalOpen(false); // Fecha modal de ações
        setIsModalOpen(true); // Abre modal de formulário
    };

    // Salvar Agendamento/Bloqueio (Criação ou Edição)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatriz) return;
        const formData = new FormData(e.target as HTMLFormElement);

        const formClientId = formData.get('client_id') as string;
        const formProfessionalId = formData.get('professional_id') as string;
        const formServiceId = formData.get('service_id') as string;
        const formDate = formData.get('date') as string;
        const formTime = formData.get('time') as string;
        const formNotes = formData.get('notes') as string;
        const formReason = formData.get('reason') as string;

        const selectedService = servicesList.find(s => s.id === formServiceId);
        const selectedClient = clientsList.find(c => c.id === formClientId);
        const selectedProfessional = professionals.find(p => p.id === formProfessionalId);

        const scheduled_at = formDate && formTime ? new Date(`${formDate}T${formTime}:00`).toISOString() : new Date().toISOString();
        const type = modalType === 'block' ? 'block' : 'appointment';
        const color = type === 'block' ? 'red' : 'primary';
        const duration_minutes = selectedService?.duration_minutes || 40;

        if (editingAppointmentId) {
            await supabase.from('appointments').update({
                client_id: formClientId || null,
                professional_id: formProfessionalId || null,
                service_id: formServiceId || null,
                scheduled_at,
                notes: formNotes || formReason || null,
                color,
                duration_minutes
            }).eq('id', editingAppointmentId);

            setAppointments(prev => prev.map(app => app.id === editingAppointmentId ? {
                ...app,
                client: selectedClient?.name || app.client,
                client_id: formClientId,
                service: selectedService?.name || app.service,
                service_id: formServiceId,
                barber: selectedProfessional?.name || app.barber,
                professional_id: formProfessionalId,
                date: formDate,
                time: formTime,
                color,
                duration: duration_minutes
            } : app));
            setEditingAppointmentId(null);
        } else {
            const { data: newAppt } = await supabase.from('appointments').insert({
                matriz_id: selectedMatriz.id,
                client_id: formClientId || null,
                professional_id: formProfessionalId || null,
                service_id: formServiceId || null,
                scheduled_at,
                status: 'pending',
                color,
                type,
                duration_minutes,
                notes: formNotes || formReason || null
            }).select().single();

            if (newAppt) {
                setAppointments(prev => [...prev, {
                    id: newAppt.id,
                    client: selectedClient?.name || '',
                    client_id: formClientId,
                    service: selectedService?.name || (type === 'block' ? 'Bloqueio' : ''),
                    service_id: formServiceId,
                    barber: selectedProfessional?.name || '',
                    professional_id: formProfessionalId,
                    date: formDate,
                    time: formTime,
                    color,
                    type,
                    status: 'pending',
                    duration: duration_minutes
                }]);
            }
        }

        // Sincronizar Calendário com data salva
        if (formDate) {
            const [year, month, day] = formDate.split('-').map(Number);
            const newDate = new Date(year, month - 1, day);
            if (newDate.toDateString() !== currentDate.toDateString()) {
                setCurrentDate(newDate);
            }
        }

        setIsModalOpen(false);
    };

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors duration-300">
            <Sidebar items={sidebarItems} portalName="BARBER KING" />

            {/* Modern Ambient Glows (Quiet Luxury smooth transition) */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-300">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/5 dark:bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-200/50 dark:bg-red-900/10 blur-[150px] rounded-full pointer-events-none"></div>
            </div>

            <main className="flex-1 lg:ml-20 p-8 flex flex-col min-h-screen relative z-10 w-full overflow-x-hidden">
                {/* Floating WhatsApp */}
                <button className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                </button>

                <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 -mx-8 px-8 py-4 mb-8 flex justify-between items-center transition-all shadow-sm">
                    <div>
                        <h2 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight">Agenda</h2>
                        <p className="text-[9px] text-slate-500 uppercase tracking-[0.4em] font-medium mt-1">Gerencie os horários da equipe.</p>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleOpenNew}
                            className="bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-500 px-5 py-2.5 rounded-2xl text-[10px] uppercase font-bold tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-red-500/10 transition-all glow-red"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Novo Agendamento
                        </button>

                        <ThemeToggle />

                        <div className="relative group cursor-pointer hidden md:block">
                            <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 to-slate-800/20 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
                            <img alt="Admin" className="relative w-10 h-10 rounded-full border-2 border-slate-200 dark:border-border-subtle object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBycvlEPDB1DIj3_quW3ABkbKAOMBI6d1zK1i9sjrLylmKrN2gzfkj9purxaF534W78WCeX8Q-a6gKvluB8eHd158UFAz_-UlMqN3Bfmh-H1Nxu8McThYAdzycToqFA2mLzhxmn0a2iqRi2RZOJS4TJuQ_PDUo0yHTxhY-TxPOxeaVXCepNfmX52Y1vZgxL5h6H_mJHAdAl0mh8Zoj1vrRraddwefvZ-kto7xswxPUnLhkYhRepxbjSXS77La_TLqDmsc-2YLULCjhz" />
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-slate-50 dark:border-[#050505] rounded-full"></span>
                        </div>
                    </div>
                </header>

                <div className="flex gap-6 h-[calc(100vh-140px)]">
                    {/* Conteúdo Principal (Agenda Calendário) sem sidebar esquerda pois agora existe flyout global */}
                    <div className="flex-1 flex flex-col min-w-0">

                        {/* O container interno do calendário agora ocupa todo o resto e tem o fundo escuro do card */}
                        <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.05)] dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl flex-1 overflow-hidden flex flex-col relative transition-all">

                            {/* Calendário da Agenda Semanal Renderizado */}
                            {(() => {
                                const weekDays = getWeekDays(currentDate);
                                const startHour = 7;
                                const endHour = 21; // Usuário solicitou até as 21h especificamente
                                const hourHeight = 80; // Altura de 1 hora em pixels

                                // Cálculo para a linha de tempo atual
                                const now = new Date();
                                const isCurrentWeek = weekDays.some(d => isSameDay(d, now));
                                let currentTopOffset = 0;
                                if (isCurrentWeek) {
                                    const nowHours = now.getHours();
                                    const nowMins = now.getMinutes();
                                    if (nowHours >= startHour && nowHours <= endHour) {
                                        currentTopOffset = ((nowHours - startHour) + (nowMins / 60)) * hourHeight;
                                    }
                                }

                                return (
                                    <div className="flex-1 overflow-auto flex flex-col bg-slate-50 dark:bg-[#000000]/30 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        {/* Cabeçalho da Semana: Data Principal */}
                                        <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-transparent sticky left-0">
                                            <h3 className="text-[13px] uppercase tracking-[0.2em] font-bold text-slate-800 dark:text-white">HOJE</h3>
                                            <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/10 mx-2"></div>
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                <button onClick={handlePrevDate} className="p-1 rounded-lg hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all">
                                                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                                </button>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 select-none min-w-[160px] text-center">{getWeekRangeLabel(currentDate)}</span>
                                                <button onClick={handleNextDate} className="p-1 rounded-lg hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all">
                                                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Cabeçalho dos Dias (Dom a Sáb) */}
                                        <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] bg-transparent backdrop-blur-md border-b border-slate-200 dark:border-white/5 sticky top-0 z-40">
                                            {/* Cartão superior esquerdo vazio acima das horas */}
                                            <div className="p-4 border-r border-slate-200/50 dark:border-white/5"></div>

                                            {weekDays.map((day, i) => {
                                                const isToday = isSameDay(day, new Date());
                                                return (
                                                    <div key={i} className={`py-4 px-2 text-center border-r border-slate-200/50 dark:border-white/5 flex flex-col items-center justify-center gap-2 transition-colors ${isToday ? 'bg-red-600/5' : ''}`}>
                                                        <span className={`text-[10px] font-bold uppercase tracking-[0.3em] ${isToday ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                                        </span>
                                                        <div className={`w-10 h-10 flex items-center justify-center rounded-2xl text-[16px] font-light tracking-widest transition-all ${isToday ? 'bg-red-600/10 text-red-500 border border-red-600/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'text-slate-800 dark:text-slate-200 dark:hover:bg-white/5 cursor-pointer'}`}>
                                                            {day.getDate()}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Corpo do Calendário Dinâmico em Altura */}
                                        {/* Wrapper com altura exata calculada baseada na qtd de horas */}
                                        <div className="relative" style={{ height: `${(endHour - startHour + 1) * hourHeight}px` }}>
                                            <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] absolute inset-0">

                                                {/* Linhas de Horário (Fundo) */}
                                                <div className="col-span-full row-span-full pointer-events-none z-10 flex flex-col">
                                                    {Array.from({ length: endHour - startHour + 1 }).map((_, i) => (
                                                        <div key={i} className="border-b border-slate-200 dark:border-white/5 relative w-full" style={{ height: `${hourHeight}px` }}>
                                                            {/* Meia Hora tracejado quase invisível para não poluir */}
                                                            <div className="absolute w-full border-b border-slate-200 dark:border-white/[0.02] border-dashed top-1/2"></div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Coluna das Labels de Tempo (Esquerda) */}
                                                <div className="col-start-1 row-start-1 flex flex-col z-20 border-r border-slate-200 dark:border-white/5 bg-transparent">
                                                    {Array.from({ length: endHour - startHour + 1 }).map((_, i) => {
                                                        const hour = startHour + i;
                                                        return (
                                                            <div key={i} className="relative flex justify-end pr-3" style={{ height: `${hourHeight}px` }}>
                                                                {/* Full Hour Label (Descolada para o centro da linha, exceto o primeiro para não ser cortado pelo Header) */}
                                                                <span className={`absolute ${i === 0 ? 'top-0.5' : '-top-[10px]'} right-3 text-[11px] font-medium tracking-[0.1em] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#080808] py-0.5 px-1.5 rounded-sm`}>
                                                                    {String(hour).padStart(2, '0')}:00
                                                                </span>
                                                                {/* Half Hour Label */}
                                                                <span className="absolute top-1/2 -mt-2 right-3 text-[9px] font-medium tracking-[0.1em] text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-[#080808] px-1 rounded-sm">
                                                                    {String(hour).padStart(2, '0')}:30
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Colunas dos Dias (Áreas Clicáveis e Verticais) */}
                                                {weekDays.map((day, dayIndex) => {
                                                    const dateStr = day.toISOString().split('T')[0];
                                                    const dayAppts = appointments.filter(a => a.date === dateStr);
                                                    const isToday = isSameDay(day, new Date());
                                                    const isPast = day < new Date() && !isToday;

                                                    return (
                                                        <div
                                                            key={dayIndex}
                                                            className={`relative group transition-colors hover:bg-slate-50/50 dark:bg-white/[0.02] ${isPast ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.01)_10px,rgba(255,255,255,0.01)_11px)]' : 'border-r border-slate-200 dark:border-white/5'}`}
                                                            style={{ height: '100%', gridColumnStart: dayIndex + 2, gridRowStart: 1 }}
                                                        >
                                                            {/* Clique no fundo vazio para adicionar evento */}
                                                            <div
                                                                className="absolute inset-0 z-20 cursor-crosshair opacity-0 group-hover:opacity-100 hover:bg-slate-50/50 dark:bg-white/[0.02] transition-colors"
                                                                onClick={(e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    const y = e.clientY - rect.top;
                                                                    const clickedHourDecimal = (y / hourHeight) + startHour;
                                                                    const clickedH = Math.floor(clickedHourDecimal);
                                                                    const clickedM = (clickedHourDecimal - clickedH) > 0.5 ? 30 : 0;
                                                                    const timeStr = `${String(clickedH).padStart(2, '0')}:${String(clickedM).padStart(2, '0')}`;
                                                                    handleSlotClick(timeStr, '', day);
                                                                }}
                                                            ></div>

                                                            {/* Eventos Renderizados aninhados DENTRO da coluna do dia (relative) */}
                                                            {(() => {
                                                                // Pre-processa os eventos do dia para calcular Overlaps (Sobreposições)
                                                                const processedAppts = dayAppts.map(appt => {
                                                                    const [h, m] = appt.time.split(':').map(Number);
                                                                    const top = ((h - startHour) + (m / 60)) * hourHeight;
                                                                    const duration = appt.duration || 40;
                                                                    const height = (duration / 60) * hourHeight;
                                                                    const bottom = top + height;
                                                                    return { ...appt, top, bottom, height };
                                                                }).sort((a, b) => a.top - b.top);

                                                                // Lógica de agrupamento de eventos lado a lado (Overlaps)
                                                                const columns: typeof processedAppts[] = [];
                                                                processedAppts.forEach(appt => {
                                                                    let placed = false;
                                                                    for (const col of columns) {
                                                                        const lastInCol = col[col.length - 1];
                                                                        if (lastInCol.bottom <= appt.top) {
                                                                            col.push(appt);
                                                                            placed = true;
                                                                            break;
                                                                        }
                                                                    }
                                                                    if (!placed) {
                                                                        columns.push([appt]);
                                                                    }
                                                                });

                                                                return processedAppts.map(appt => {
                                                                    // Encontra a coluna desse appt para definir o Left e o Width horizontal
                                                                    const colIndex = columns.findIndex(col => col.includes(appt));
                                                                    const numCols = columns.length;
                                                                    const width = numCols > 1 ? `calc(${100 / numCols}% - 4px)` : 'calc(100% - 10px)';
                                                                    const left = numCols > 1 ? `calc(${(100 / numCols) * colIndex}% + 2px)` : '5px';
                                                                    // Função dinâmica para transformar a cor escolhida pelo usuário no padrão Quiet Luxury translúcido
                                                                    const getLuxuryColor = (colorInput: string) => {
                                                                        const baseColor = (colorInput || '').replace('bg-', '').split('-')[0];
                                                                        
                                                                        const map: Record<string, string> = {
                                                                            'blue': 'bg-blue-50/80 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30 text-blue-800 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20',
                                                                            'emerald': 'bg-emerald-50/80 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20',
                                                                            'green': 'bg-green-50/80 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20',
                                                                            'success': 'bg-green-50/80 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20',
                                                                            'red': 'bg-red-50/80 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20',
                                                                            'danger': 'bg-red-50/80 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20',
                                                                            'amber': 'bg-amber-50/80 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20',
                                                                            'warning': 'bg-amber-50/80 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20',
                                                                            'purple': 'bg-purple-50/80 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/30 text-purple-800 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20',
                                                                            'pink': 'bg-pink-50/80 dark:bg-pink-900/10 border-pink-200 dark:border-pink-900/30 text-pink-800 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/20',
                                                                            'indigo': 'bg-indigo-50/80 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20',
                                                                            'cyan': 'bg-cyan-50/80 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-900/30 text-cyan-800 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/20',
                                                                            'primary': 'bg-slate-100/90 dark:bg-[#0a0a0a]/80 border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#151515]', // Clean monochrome theme for primary fallback
                                                                            'slate': 'bg-slate-100/80 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10',
                                                                        };

                                                                        return map[baseColor] || map['slate'];
                                                                    };

                                                                    const blockColors = 'bg-red-100/50 dark:bg-red-500/10 border-red-300 dark:border-red-500/20 text-red-600 dark:text-red-500 hover:bg-red-200/50 dark:hover:bg-red-500/20';
                                                                    const colorClass = appt.type === 'block' ? blockColors : getLuxuryColor(appt.color);

                                                                    const EndTimeStr = calculateEndTime(appt.time, appt.duration || 40);

                                                                    // Tag e estilo visual por status
                                                                    const statusConfig: Record<string, { label: string; tagClass: string; cardModifier: string }> = {
                                                                        'pending':    { label: 'AGENDADO',  tagClass: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',   cardModifier: '' },
                                                                        'confirmed':  { label: 'AGENDADO',  tagClass: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',   cardModifier: '' },
                                                                        'in_progress':{ label: 'EM ANDAMENTO', tagClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400', cardModifier: '' },
                                                                        'done':       { label: 'CONCLUÍDA', tagClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400', cardModifier: 'opacity-75' },
                                                                        'cancelled':  { label: 'CANCELADA', tagClass: 'bg-red-500/20 text-red-500 dark:text-red-400',       cardModifier: 'opacity-50 grayscale' },
                                                                    };
                                                                    const sConfig = statusConfig[appt.status ?? 'pending'] ?? statusConfig['pending'];

                                                                    const isSmall = appt.height < 44;
                                                                    return (
                                                                        <div
                                                                            key={appt.id}
                                                                            onClick={(e) => { e.stopPropagation(); handleAppointmentClick(e, appt as any); }}
                                                                            className={`absolute rounded-xl border-l-[3px] border z-30 overflow-hidden cursor-pointer backdrop-blur-md transition-all shadow-sm flex flex-col ${isSmall ? 'px-2 py-1 gap-0.5' : 'p-2.5 gap-0.5'} ${colorClass} ${sConfig.cardModifier} hover:-translate-y-0.5 hover:shadow-lg`}
                                                                            style={{ top: `${appt.top}px`, height: `${appt.height}px`, width, left }}
                                                                        >
                                                                            {/* Linha 1: serviço + tag de status */}
                                                                            <div className="flex items-center gap-1 min-w-0">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_4px_currentColor] shrink-0"></span>
                                                                                <span className={`font-bold tracking-tight leading-none truncate flex-1 ${isSmall ? 'text-[10px]' : 'text-[11px]'} ${appt.status === 'cancelled' ? 'line-through opacity-70' : ''}`}>
                                                                                    {appt.service || 'Serviço'}
                                                                                </span>
                                                                                <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full shrink-0 leading-none ${sConfig.tagClass}`}>
                                                                                    {sConfig.label}
                                                                                </span>
                                                                            </div>
                                                                            {/* Linha 2: cliente - sempre visível quando disponível */}
                                                                            {appt.client ? (
                                                                                <span className={`leading-none truncate font-medium opacity-75 ${isSmall ? 'text-[8px]' : 'text-[9px]'}`}>
                                                                                    {appt.client}
                                                                                </span>
                                                                            ) : null}
                                                                            {/* Linha 3: horário - só em cards altos */}
                                                                            {appt.height >= 58 && (
                                                                                <span className="text-[9px] opacity-60 mt-auto font-medium leading-none">{appt.time} - {EndTimeStr}</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    );
                                                })}

                                                {/* Linha Vermelha de Tempo Atual */}
                                                {isCurrentWeek && currentTopOffset > 0 && (
                                                    <div
                                                        className="absolute left-20 right-0 h-0 border-t border-danger-red z-40 pointer-events-none"
                                                        style={{ top: `${currentTopOffset}px` }}
                                                    >
                                                        <div className="absolute w-2 h-2 rounded-full bg-danger-red -left-1 -top-1 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Calendário da Agenda Semanal Renderizado */}
                        </div>
                    </div>
                </div>
                <ActionModal
                    isOpen={isActionModalOpen}
                    appointment={selectedAppointment}
                    servicesList={servicesList}
                    onClose={() => setIsActionModalOpen(false)}
                    onComplete={handleActionComplete}
                    onReschedule={handleActionReschedule}
                    onCancel={handleActionCancel}
                    onOpenComanda={() => {
                        const svcPrice = servicesList.find(s => s.id === selectedAppointment?.service_id)?.price ?? 0;
                        setComandaItems([{
                            id: Date.now(),
                            name: selectedAppointment?.service || '',
                            price: Number(svcPrice),
                            quantity: 1,
                            type: 'service'
                        }]);
                        setComandaDiscount(0);
                        setComandaPaymentMethod('pix');
                        setIsActionModalOpen(false);
                        setIsComandaModalOpen(true);
                    }}
                />



                {/* Modal Unificado (Novo Agendamento) */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] bg-slate-800/30 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                        <div className="bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl w-full max-w-3xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col my-auto border border-slate-200/50 dark:border-white/5 animate-fadeIn max-h-[90vh]">
                            {/* Header */}
                            <div className="flex justify-between items-center p-6 border-b border-slate-200/50 dark:border-white/5 shrink-0 bg-transparent">
                                <h2 className="text-[13px] uppercase tracking-[0.2em] font-bold text-slate-800 dark:text-white">
                                    {editingAppointmentId ? 'Editar Agendamento' : 'Novo Agendamento'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                                    
                                    {/* Tipo */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-3">Tipo<span className="text-red-500">*</span></label>
                                        <div className="flex flex-wrap md:flex-nowrap rounded-xl bg-slate-50 dark:bg-[#151515] p-1 border border-slate-200 dark:border-white/5">
                                            {['Agendamento', 'Bloqueio de horário', 'Lembrete', 'Evento'].map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => {
                                                        setAppointmentType(type as any);
                                                        setModalType(type === 'Bloqueio de horário' ? 'block' : 'appointment');
                                                    }}
                                                    className={`flex-1 min-w-[120px] py-2.5 text-sm font-bold rounded-lg transition-all ${appointmentType === type ? 'bg-red-600 text-[#ffffff] shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-50/50 dark:bg-white/[0.02]'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {appointmentType === 'Agendamento' && (
                                        <>
                                            {/* Dados Básicos */}
                                            <div className="border-b border-slate-200 dark:border-white/5 pb-8 space-y-5">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center justify-between">
                                                    Dados básicos
                                                </h3>
                                                
                                                <div className="relative">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <label className="text-sm font-bold text-slate-600 dark:text-slate-300">Paciente</label>
                                                        <button type="button" className="text-sm font-bold text-red-500 hover:text-slate-800 dark:text-white transition-colors flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[18px]">add</span> Adicionar
                                                        </button>
                                                    </div>
                                                    <div className="relative">
                                                        <select
                                                            name="client_id"
                                                            className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-12 text-slate-500 dark:text-slate-400 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none appearance-none cursor-pointer bg-none"
                                                        >
                                                            <option value="">Pesquise/Selecione</option>
                                                            {clientsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                        </select>
                                                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/5 rounded-lg w-8 h-8 flex items-center justify-center pointer-events-none text-slate-500 dark:text-slate-400">
                                                            <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                                    <div className="md:col-span-5 relative">
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Profissional</label>
                                                        <div className="relative">
                                                            <select
                                                                name="professional_id"
                                                                className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pl-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none appearance-none cursor-pointer bg-none"
                                                            >
                                                                <option value="">Selecione...</option>
                                                                {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                            </select>
                                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-[18px] pointer-events-none">person</span>
                                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">keyboard_arrow_down</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="md:col-span-4 relative">
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Status</label>
                                                        <div className="relative">
                                                            <select className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pl-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none appearance-none cursor-pointer bg-none">
                                                                <option value="Agendado">Agendado</option>
                                                                <option value="Confirmado">Confirmado</option>
                                                                <option value="Remarcado">Remarcado</option>
                                                                <option value="Cancelado">Cancelado</option>
                                                                <option value="Não compareceu">Não compareceu</option>
                                                                <option value="Aguardando">Aguardando</option>
                                                                <option value="Em atendimento">Em atendimento</option>
                                                                <option value="Concluído">Concluído</option>
                                                            </select>
                                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-red-500 text-[18px] pointer-events-none">schedule</span>
                                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">keyboard_arrow_down</span>
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-3 relative">
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Cor</label>
                                                        <div className="relative">
                                                            <select className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pl-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none appearance-none cursor-pointer bg-none">
                                                                <option value="Padrao">Padrão</option>
                                                            </select>
                                                            <div className="w-3 h-3 rounded-full bg-slate-300 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"></div>
                                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">keyboard_arrow_down</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Observações</label>
                                                    <textarea
                                                        name="notes"
                                                        className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none resize-none"
                                                        placeholder="Digite"
                                                        rows={2}
                                                    ></textarea>
                                                </div>
                                            </div>

                                            {/* Procedimentos/Produtos */}
                                            <div className="border-b border-slate-200 dark:border-white/5 pb-8">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5">
                                                    Procedimentos/Produtos
                                                </h3>
                                                
                                                <div className="space-y-4">
                                                    {procedures.map((proc, index) => (
                                                        <div key={proc.id} className="flex gap-4 items-end">
                                                            <div className="flex-1 relative">
                                                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Nome</label>
                                                                <div className="relative">
                                                                    <select
                                                                        name="service_id"
                                                                        className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none appearance-none cursor-pointer bg-none"
                                                                    >
                                                                        <option value="">Pesquise/Selecione</option>
                                                                        {servicesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                    </select>
                                                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">keyboard_arrow_down</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-24">
                                                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Qtd.</label>
                                                                <input 
                                                                    type="number" 
                                                                    defaultValue={proc.qty}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                                                                />
                                                            </div>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setProcedures(procedures.filter(p => p.id !== proc.id))}
                                                                className="h-[46px] w-[46px] shrink-0 flex items-center justify-center text-slate-500 hover:text-danger-red transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
                                                            >
                                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                                            </button>
                                                        </div>
                                                    ))}

                                                    <button 
                                                        type="button"
                                                        onClick={() => setProcedures([...procedures, { id: Date.now(), name: '', qty: 1 }])}
                                                        className="text-sm font-bold text-red-500 hover:text-slate-800 dark:text-white transition-colors flex items-center gap-2 mt-4"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">add</span> Adicionar Procedimentos/Produtos
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Data */}
                                            <div className="pb-2">
                                                <div className="flex items-center justify-between cursor-pointer mb-5">
                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Data</h3>
                                                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">expand_less</span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                                    <div className="relative">
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Dia<span className="text-red-500">*</span></label>
                                                        <div className="relative">
                                                            <input 
                                                                name="date"
                                                                type="date" 
                                                                defaultValue={selectedSlot?.date}
                                                                className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                required
                                                            />
                                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">calendar_today</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="relative">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Início<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    name="time"
                                                                    type="time" 
                                                                    defaultValue={selectedSlot?.time}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                    required
                                                                />
                                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">schedule</span>
                                                            </div>
                                                        </div>
                                                        <div className="relative">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Fim<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="time" 
                                                                    defaultValue={selectedSlot ? calculateEndTime(selectedSlot.time, 40) : "00:00"}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                    required
                                                                />
                                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">schedule</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-5">
                                                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Plano<span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <select
                                                            name="plan"
                                                            className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none appearance-none cursor-pointer bg-none"
                                                        >
                                                            <option value="avulso">Avulso</option>
                                                            <option value="plano_mensal">Plano Mensal</option>
                                                            <option value="plano_trimestral">Plano Trimestral</option>
                                                            <option value="plano_anual">Plano Anual</option>
                                                        </select>
                                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">keyboard_arrow_down</span>
                                                    </div>
                                                </div>

                                                <div className="bg-[#FFAB00]/10 border-l-4 border-[#FFAB00] p-4 rounded-r-xl">
                                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                                        As notificações de <span className="font-bold text-slate-800 dark:text-white">Lembrete de agendamento (E-mail/WhatsApp Business)</span> não serão enviadas pois o tempo de antecedência configurado é maior que o tempo disponível até o agendamento.
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {appointmentType === 'Bloqueio de horário' && (
                                        <div className="space-y-6">
                                            <div className="border-b border-slate-200 dark:border-white/5 pb-8">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5">
                                                    Dados básicos
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="relative">
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Título<span className="text-red-500">*</span></label>
                                                        <div className="relative">
                                                            <input
                                                                name="reason"
                                                                type="text"
                                                                defaultValue="Bloqueio de horário"
                                                                className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="relative">
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Profissionais</label>
                                                        <div className="flex gap-4 items-center">
                                                            <div className="relative flex-1">
                                                                <div className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 flex items-center gap-2 flex-wrap min-h-[46px] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                                                                    <div className="bg-red-600/20 text-red-500 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                                                                        <span>Mykaella Albuquerque</span>
                                                                        <button type="button" className="text-red-500 hover:text-slate-800 dark:text-white transition-colors">
                                                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                                                        </button>
                                                                    </div>
                                                                    
                                                                    <div className="ml-auto flex items-center pr-2 text-slate-500">
                                                                        <button type="button" className="hover:text-slate-800 dark:text-white transition-colors flex items-center justify-center bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-1 rounded-md text-slate-500 dark:text-slate-400">
                                                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                                                        </button>
                                                                        <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-2"></div>
                                                                        <button type="button" className="hover:text-slate-800 dark:text-white transition-colors flex items-center justify-center bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-1 rounded-md text-slate-500 dark:text-slate-400">
                                                                            <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <button type="button" className="w-10 h-6 bg-white/10 rounded-full relative transition-colors focus:outline-none">
                                                                    <div className="w-4 h-4 bg-slate-400 rounded-full absolute left-1 top-1 transition-transform"></div>
                                                                </button>
                                                                <span className="text-sm text-slate-600 dark:text-slate-300">Clínica toda</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Observações</label>
                                                        <textarea 
                                                            className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none resize-none"
                                                            placeholder="Digite"
                                                            rows={3}
                                                        ></textarea>
                                                    </div>
                                                </div>
                                            </div>
                                                
                                                <div className="space-y-4">
                                                    <div className="flex gap-4 items-end">
                                                        <div className="flex-[2] relative">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Dia<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="date" 
                                                                    defaultValue={selectedSlot?.date}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                    required
                                                                />
                                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">calendar_today</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex-[1] relative">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Início<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="time" 
                                                                    defaultValue={selectedSlot?.time}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                    required
                                                                />
                                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">schedule</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex-[1] relative">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Fim<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="time" 
                                                                    defaultValue={selectedSlot ? calculateEndTime(selectedSlot.time, 40) : "00:00"}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                    required
                                                                />
                                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">schedule</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 mb-3 shrink-0">
                                                            <button type="button" className="w-10 h-6 bg-white/10 rounded-full relative transition-colors focus:outline-none">
                                                                <div className="w-4 h-4 bg-slate-400 rounded-full absolute left-1 top-1 transition-transform"></div>
                                                            </button>
                                                            <span className="text-sm text-slate-600 dark:text-slate-300">Dia inteiro</span>
                                                        </div>
                                                    </div>

                                                    <div className="mb-5">
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Recorrência<span className="text-red-500">*</span></label>
                                                        <div className="relative">
                                                            <select
                                                                name="recurrence"
                                                                className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none appearance-none cursor-pointer bg-none"
                                                            >
                                                                <option value="none">Não se repete</option>
                                                                <option value="daily">Diariamente</option>
                                                                <option value="weekly">Semanalmente</option>
                                                                <option value="monthly">Mensalmente</option>
                                                            </select>
                                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">keyboard_arrow_down</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                    )}

                                    {appointmentType === 'Lembrete' && (
                                        <div className="space-y-6">
                                            <div className="border-b border-slate-200 dark:border-white/5 pb-8">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5">
                                                    Dados básicos
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="flex flex-col md:flex-row gap-4 items-start">
                                                        <div className="flex-1 relative w-full">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Título<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="text" 
                                                                    defaultValue="Lembrete"
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex-1 relative w-full">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Participantes</label>
                                                            <div className="relative w-full">
                                                                <div className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 flex items-center gap-2 overflow-x-auto focus-within:border-primary focus-within:ring-1 focus-within:ring-primary scrollbar-hide min-h-[46px]">
                                                                    <div className="bg-red-600/20 text-red-500 px-3 py-1 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap shrink-0">
                                                                        <span>Mykaella Albuquerque</span>
                                                                        <button type="button" className="text-red-500 hover:text-slate-800 dark:text-white transition-colors">
                                                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                                                        </button>
                                                                    </div>
                                                                    
                                                                    <div className="ml-auto flex items-center pr-2 text-slate-500 shrink-0 absolute right-0 bg-gradient-to-l from-slate-50 via-slate-50 dark:from-[#151515] dark:via-[#151515] to-transparent pl-4 h-[90%] top-1/2 -translate-y-1/2 rounded-r-xl">
                                                                        <button type="button" className="hover:text-slate-800 dark:text-white transition-colors flex items-center justify-center bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-1 rounded-md text-slate-500 dark:text-slate-400">
                                                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                                                        </button>
                                                                        <button type="button" className="hover:text-slate-800 dark:text-white transition-colors flex items-center justify-center bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-1 rounded-md text-slate-500 dark:text-slate-400 ml-1">
                                                                            <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Observações</label>
                                                        <textarea 
                                                            className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none resize-none"
                                                            placeholder="Digite"
                                                            rows={3}
                                                        ></textarea>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Data */}
                                            <div className="pt-2">
                                                <div className="flex items-center justify-between mb-5 cursor-pointer">
                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Data</h3>
                                                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 transition-transform">expand_less</span>
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                                                        <div className="flex-1 relative">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Dia<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="date" 
                                                                    defaultValue={selectedSlot?.date}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                    required
                                                                />
                                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">calendar_today</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex-[0.6] relative">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Hora<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="time" 
                                                                    defaultValue={selectedSlot?.time}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                    required
                                                                />
                                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">schedule</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex-[0.4] flex items-center gap-3 shrink-0 h-[46px]">
                                                            <button type="button" className="w-10 h-6 bg-white/10 rounded-full relative transition-colors focus:outline-none">
                                                                <div className="w-4 h-4 bg-slate-400 rounded-full absolute left-1 top-1 transition-transform"></div>
                                                            </button>
                                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Dia inteiro</span>
                                                        </div>
                                                    </div>

                                                    <div className="w-full sm:w-[48%] mb-5">
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Recorrência<span className="text-red-500">*</span></label>
                                                        <div className="relative">
                                                            <select
                                                                name="recurrence"
                                                                className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none appearance-none cursor-pointer bg-none"
                                                            >
                                                                <option value="none">Não se repete</option>
                                                                <option value="daily">Diariamente</option>
                                                                <option value="weekly">Semanalmente</option>
                                                                <option value="monthly">Mensalmente</option>
                                                            </select>
                                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">keyboard_arrow_down</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Other Types Placeholder */}
                                    {appointmentType === 'Evento' && (
                                        <div className="space-y-6">
                                            <div className="border-b border-slate-200 dark:border-white/5 pb-8">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5">
                                                    Dados básicos
                                                </h3>
                                                <div className="space-y-4">
                                                    {/* Título */}
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Título do evento<span className="text-red-500">*</span></label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Digite"
                                                            className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                                                            required
                                                        />
                                                    </div>

                                                    {/* Datas e Horas */}
                                                    <div className="flex flex-col sm:flex-row gap-4">
                                                        <div className="flex-1 relative">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Data de início<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="date" 
                                                                    defaultValue={selectedSlot?.date}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                    required
                                                                />
                                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">calendar_today</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex-1 relative">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Hora de início<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="time" 
                                                                    defaultValue={selectedSlot?.time}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                    required
                                                                />
                                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">schedule</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 relative">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Data de fim<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="date" 
                                                                    defaultValue={selectedSlot?.date}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                    required
                                                                />
                                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">calendar_today</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 relative">
                                                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Hora de fim<span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="time" 
                                                                    defaultValue={selectedSlot ? calculateEndTime(selectedSlot.time, 15) : "00:00"}
                                                                    className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-slate-700 dark:text-slate-200 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                                                    required
                                                                />
                                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">schedule</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Profissionais */}
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Profissionais</label>
                                                        <div className="relative w-full">
                                                            <div className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 flex items-center gap-2 overflow-x-auto focus-within:border-primary focus-within:ring-1 focus-within:ring-primary scrollbar-hide min-h-[46px]">
                                                                <div className="bg-red-600/20 text-red-500 px-3 py-1 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap shrink-0">
                                                                    <span>Mykaella Albuquerque</span>
                                                                    <button type="button" className="text-red-500 hover:text-slate-800 dark:text-white transition-colors">
                                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                                    </button>
                                                                </div>
                                                                
                                                                <div className="ml-auto flex items-center pr-2 text-slate-500 shrink-0 absolute right-0 bg-gradient-to-l from-slate-50 via-slate-50 dark:from-[#151515] dark:via-[#151515] to-transparent pl-4 h-[90%] top-1/2 -translate-y-1/2 rounded-r-xl">
                                                                    <button type="button" className="hover:text-slate-800 dark:text-white transition-colors flex items-center justify-center bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-1 rounded-md text-slate-500 dark:text-slate-400">
                                                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                                                    </button>
                                                                    <button type="button" className="hover:text-slate-800 dark:text-white transition-colors flex items-center justify-center bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-1 rounded-md text-slate-500 dark:text-slate-400 ml-1">
                                                                        <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Procedimentos */}
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Procedimentos</label>
                                                        <div className="relative">
                                                            <select className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-500 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none appearance-none cursor-pointer bg-none">
                                                                <option value="">Pesquise/Selecione</option>
                                                                <option value="1">Corte</option>
                                                                <option value="2">Barba</option>
                                                            </select>
                                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">keyboard_arrow_down</span>
                                                        </div>
                                                    </div>

                                                    {/* Toggle Permitir agendamentos... */}
                                                    <div className="flex items-center gap-3 pt-2 pb-2">
                                                        <button type="button" className="w-10 h-6 bg-white/10 rounded-full relative transition-colors focus:outline-none">
                                                            <div className="w-4 h-4 bg-slate-400 rounded-full absolute left-1 top-1 transition-transform"></div>
                                                        </button>
                                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Permitir agendamentos de outros procedimentos nesta data</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Opções avançadas */}
                                            <div className="pt-2">
                                                <div className="flex items-center justify-between cursor-pointer group">
                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-red-500 transition-colors">Opções avançadas</h3>
                                                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 group-hover:text-red-500 transition-colors">keyboard_arrow_down</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer/Financeiro */}
                                {appointmentType === 'Agendamento' && (
                                    <div className="bg-slate-50 dark:bg-[#151515] border-t border-slate-200 dark:border-white/5 p-5 shrink-0 flex justify-between items-center sm:rounded-bl-2xl">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-0">Financeiro</h3>
                                        <div className="flex items-center gap-2 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-white transition-colors">
                                            <span className="text-sm font-medium">Comanda desabilitada</span>
                                            <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                                        </div>
                                    </div>
                                )}

                                {/* Salvar Button */}
                                <div className="p-5 border-t border-slate-200 dark:border-border-subtle flex justify-end gap-3 bg-white dark:bg-card-dark rounded-b-2xl shrink-0">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)} 
                                        className="px-6 py-3.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold text-sm border border-slate-200 dark:border-border-subtle rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className={`px-12 py-3.5 text-[#ffffff] rounded-xl font-bold text-sm hover:brightness-110 shadow-lg transition-all ${appointmentType === 'Agendamento' ? 'bg-red-600 shadow-red-600/20' : 'bg-danger-red shadow-danger-red/20'}`}
                                    >
                                        {editingAppointmentId ? 'Salvar Alterações' : (appointmentType === 'Agendamento' ? 'Agendar' : 'Salvar Bloqueio')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal de Comanda / Checkout */}
                <ComandaModal
                    isOpen={isComandaModalOpen}
                    appointment={selectedAppointment}
                    comandaItems={comandaItems}
                    setComandaItems={setComandaItems}
                    comandaDiscount={comandaDiscount}
                    setComandaDiscount={setComandaDiscount}
                    comandaPaymentMethod={comandaPaymentMethod}
                    setComandaPaymentMethod={setComandaPaymentMethod}
                    comandaSubtotal={comandaSubtotal}
                    comandaTotal={comandaTotal}
                    selectedProductIdToAdd={selectedProductIdToAdd}
                    setSelectedProductIdToAdd={setSelectedProductIdToAdd}
                    availableProducts={availableProducts}
                    onClose={() => setIsComandaModalOpen(false)}
                    onAdvance={() => {
                        if (comandaPaymentMethod === 'pix' || comandaPaymentMethod === 'credit') {
                            setIsComandaModalOpen(false);
                            setPaymentModalConfig({
                                title: 'Pagamento da Comanda',
                                subtitle: `Via Mercado Pago (${comandaPaymentMethod === 'pix' ? 'Pix' : 'Cartão'})`,
                                initialAmount: comandaTotal,
                                isFixedAmount: true
                            });
                            setIsPaymentModalOpen(true);
                        } else {
                            handleActionComplete(comandaTotal, 'Dinheiro');
                            setIsComandaModalOpen(false);
                            alert('Pagamento em Espécie registrado com sucesso!');
                        }
                    }}
                />



                {/* Mercado Pago Modal */}
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => {
                        setIsPaymentModalOpen(false);
                        // Passa o total e método corretos para o registro financeiro
                        const method = comandaPaymentMethod === 'credit' ? 'Crédito' : 'PIX';
                        handleActionComplete(paymentModalConfig.initialAmount, method);
                    }}
                    publicKey={mpPublicKey}
                    {...paymentModalConfig}
                />
            </main>
        </div>
    );
};

export default AdminAgenda;


