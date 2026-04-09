import React, { useEffect, useState } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicKey: string;
  title?: string;
  subtitle?: string;
  initialAmount?: number;
  isFixedAmount?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  publicKey,
  title = "Adicionar Créditos",
  subtitle = "Via Mercado Pago",
  initialAmount = 150,
  isFixedAmount = false
}) => {
  const [isReady, setIsReady] = useState(false);
  const [creditAmount, setCreditAmount] = useState(initialAmount);

  useEffect(() => {
    if (publicKey && isOpen) {
      initMercadoPago(publicKey, { locale: 'pt-BR' });
      setIsReady(true);
      setCreditAmount(initialAmount); // Resetar ao reabrir
    }
  }, [publicKey, isOpen, initialAmount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-800/20 dark:bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-card-dark border border-border-dark rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-6 border-b border-border-dark bg-black/40">
          <div>
            <h3 className="text-2xl text-white italic font-medium tracking-tight uppercase">{title}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium tracking-[0.2em] uppercase">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-all border border-white/5"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Corpo do Modal - Formulário do MP */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#1A1A1A]">
          {/* Campo de Valor */}
          {!isFixedAmount && (
            <div className="mb-6 flex flex-col gap-2">
              <label className="text-[10px] text-slate-400 font-medium tracking-[0.2em] uppercase">Valor a Recarregar (R$)</label>
              <input
                type="number"
                className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-medium text-2xl tracking-tight outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all w-full md:w-1/2"
                value={creditAmount}
                onChange={(e) => setCreditAmount(Number(e.target.value))}
              />
            </div>
          )}

          {isFixedAmount && (
            <div className="mb-6 flex flex-col items-center justify-center p-4 bg-primary/10 border border-primary/20 rounded-2xl">
              <span className="text-[10px] text-primary font-medium tracking-[0.2em] uppercase mb-1">Total a Pagar</span>
              <span className="text-3xl text-white font-medium tracking-tight uppercase">R$ {creditAmount.toFixed(2).replace('.', ',')}</span>
            </div>
          )}

          {isReady ? (
            <div className="w-full min-h-[300px] mb-8">
              <Payment
                {...({
                  initialization: { amount: creditAmount },
                  customization: {
                    visual: {
                      style: {
                        theme: 'dark',
                        customVariables: {
                          formBackgroundColor: '#1A1A1A',
                          baseColor: '#dc2626',
                          textPrimaryColor: '#ffffff',
                          textSecondaryColor: '#94a3b8',
                          buttonTextColor: '#ffffff',
                          fontFamily: 'Inter, system-ui, sans-serif',
                          fontWeightNormal: '400',
                          fontWeightSemiBold: '500',
                          inputBackgroundColor: '#0a0a0a',
                          outlinePrimaryColor: 'rgba(220, 38, 38, 0.5)',
                          /* Removendo as linhas engessadas com rgba de baixa opacidade */
                          paymentOptionBorderColor: 'rgba(255, 255, 255, 0.05)',
                          paymentOptionHoverBackgroundColor: 'rgba(255, 255, 255, 0.02)',
                          dividerColor: 'rgba(255, 255, 255, 0.05)'
                        }
                      }
                    },
                    paymentMethods: {
                      pix: 'all',
                      creditCard: 'all',
                      debitCard: 'all',
                      ticket: 'all',
                      bankTransfer: 'all',
                    }
                  },
                  onSubmit: async () => {
                    return new Promise<void>((resolve) => {
                      setTimeout(() => {
                        resolve();
                        alert('Pagamento processado com sucesso (Modo Teste)!');
                        onClose();
                      }, 2000);
                    });
                  },
                  onError: (error: any) => console.error(error),
                  onReady: () => console.log('Brick is ready')
                } as any)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 opacity-50 h-[300px]">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-4">progress_activity</span>
              <p className="text-[10px] text-slate-400 font-medium tracking-[0.2em] uppercase">Carregando ambiente seguro...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
