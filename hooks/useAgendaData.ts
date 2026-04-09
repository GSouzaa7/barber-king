import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Appointment, Professional, Client, Service, AvailableProduct } from './agenda.types';

/**
 * Hook que centraliza toda a busca de dados do Supabase para a Agenda:
 * - Profissionais, Clientes, Serviços, Produtos do estoque
 * - Agendamentos da semana atual
 */
export function useAgendaData(matrizId: string | undefined, currentDate: Date) {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [clientsList, setClientsList] = useState<Client[]>([]);
    const [servicesList, setServicesList] = useState<Service[]>([]);
    const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [dataError, setDataError] = useState<string | null>(null);

    // Fetch dropdown data (professionals, clients, services, products)
    useEffect(() => {
        if (!matrizId) return;
        const fetchDropdownData = async () => {
            const [profsRes, clientsRes, servicesRes, productsRes] = await Promise.all([
                supabase
                    .from('professional_matrizes')
                    .select('professionals(id, name)')
                    .eq('matriz_id', matrizId)
                    .eq('status', 'ativo'),
                supabase
                    .from('client_matrizes')
                    .select('clients(id, name, phone)')
                    .eq('matriz_id', matrizId),
                supabase
                    .from('services')
                    .select('id, name, price, duration_minutes')
                    .eq('matriz_id', matrizId)
                    .eq('active', true),
                supabase
                    .from('inventory_products')
                    .select('id, name, price')
                    .eq('matriz_id', matrizId)
                    .order('name')
            ]);
            if (profsRes.data) {
                setProfessionals(
                    profsRes.data
                        .map((r: any) => r.professionals)
                        .filter(Boolean) as Professional[]
                );
            }
            if (clientsRes.data) {
                setClientsList(
                    clientsRes.data
                        .map((r: any) => r.clients)
                        .filter(Boolean) as Client[]
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
    }, [matrizId]);

    // Fetch appointments for current week
    useEffect(() => {
        if (!matrizId) return;
        const fetchAppointments = async () => {
            setLoadingData(true);
            setDataError(null);
            try {
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
                    .eq('matriz_id', matrizId)
                    .gte('scheduled_at', start.toISOString())
                    .lte('scheduled_at', end.toISOString());

                if (error) {
                    setDataError('Erro ao carregar agendamentos. Tente novamente.');
                    return;
                }

                if (data) {
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
            } catch (err) {
                setDataError('Erro inesperado ao carregar agendamentos.');
            } finally {
                // Garante que o loading sempre termina, mesmo em caso de exceção
                setLoadingData(false);
            }
        };
        fetchAppointments();
    }, [matrizId, currentDate]);

    return {
        professionals,
        clientsList,
        servicesList,
        availableProducts,
        appointments,
        setAppointments,
        loadingData,
        dataError
    };
}

// Helper function used internally
function getWeekDays(date: Date) {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
    }
    return days;
}
