// Tipos compartilhados entre os módulos da Agenda

export interface Appointment {
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

export interface WaitingItem {
    id: string;
    name: string;
    service: string;
    arrivalTime: string; // ISO String
}

export interface ComandaItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    type: 'service' | 'product';
}

export interface Professional {
    id: string;
    name: string;
}

export interface Client {
    id: string;
    name: string;
}

export interface Service {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
}

export interface AvailableProduct {
    id: string;
    name: string;
    price: number;
}
