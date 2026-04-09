import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { Appointment, Service, AvailableProduct } from './agenda.types';

interface UseCheckoutParams {
    selectedAppointment: Appointment | null;
    matrizId: string | undefined;
    servicesList: Service[];
    availableProducts: AvailableProduct[];
    comandaItems: any[];
    comandaPaymentMethod: 'credit' | 'pix' | 'money';
    setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    setIsActionModalOpen: (v: boolean) => void;
    setSelectedAppointment: (v: Appointment | null) => void;
}

/**
 * Hook que encapsula a lógica de conclusão de atendimento (checkout).
 * Usa a RPC `complete_checkout` para executar tudo atomicamente.
 */
export function useCheckout({
    selectedAppointment,
    matrizId,
    servicesList,
    availableProducts,
    comandaItems,
    comandaPaymentMethod,
    setAppointments,
    setIsActionModalOpen,
    setSelectedAppointment
}: UseCheckoutParams) {

    /**
     * Conclui o atendimento selecionado via RPC atômica:
     * - Atualiza appointment.status = 'done'
     * - Insere registro em financial_records (income)
     * - Decrementa estoque dos produtos vendidos
     * Tudo dentro de uma única transação SQL.
     */
    const handleActionComplete = async (overrideAmount?: number, paymentMethod?: string) => {
        if (!selectedAppointment || !matrizId) return;

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

        // 4. Garantir que o valor está definido antes de prosseguir
        // Se o serviço foi deletado do banco após o agendamento, finalAmount
        // permanece undefined — exibir erro em vez de registrar R$0,00
        if (finalAmount === undefined) {
            toast.error('Não foi possível determinar o valor do atendimento. Informe o valor manualmente.', {
                style: { background: '#1A1A1A', color: '#EF4444', borderColor: '#EF4444' }
            });
            return;
        }

        // 5. Executar TUDO atomicamente via RPC
        const { error: rpcError } = await supabase.rpc('complete_checkout', {
            p_appointment_id: selectedAppointment.id,
            p_matriz_id: matrizId,
            p_amount: finalAmount,
            p_description: `Atendimento: ${serviceName} — ${selectedAppointment.client}`,
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

        // 6. Verificar alertas de estoque baixo
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

        // 7. Atualizar estado local
        setAppointments(prev => prev.map(a =>
            a.id === selectedAppointment.id ? { ...a, status: 'done' } : a
        ));
        toast.success('Atendimento concluído e comanda fechada com sucesso!', {
            style: { background: '#1A1A1A', color: '#10B981', borderColor: '#10B981' }
        });
        setIsActionModalOpen(false);
        setSelectedAppointment(null);
    };

    return { handleActionComplete };
}
