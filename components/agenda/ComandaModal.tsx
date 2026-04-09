import React from 'react';
import type { Appointment, AvailableProduct } from '../../hooks/agenda.types';

interface ComandaModalProps {
    isOpen: boolean;
    appointment: Appointment | null;
    comandaItems: any[];
    setComandaItems: React.Dispatch<React.SetStateAction<any[]>>;
    comandaDiscount: number;
    setComandaDiscount: (v: number) => void;
    comandaPaymentMethod: 'credit' | 'pix' | 'money';
    setComandaPaymentMethod: (v: 'credit' | 'pix' | 'money') => void;
    comandaSubtotal: number;
    comandaTotal: number;
    selectedProductIdToAdd: string;
    setSelectedProductIdToAdd: (v: string) => void;
    availableProducts: AvailableProduct[];
    onClose: () => void;
    onAdvance: () => void;
}

/**
 * Modal de Comanda / Checkout.
 * Permite adicionar serviços e produtos, definir desconto e método de pagamento.
 */
export const ComandaModal: React.FC<ComandaModalProps> = ({
    isOpen,
    appointment,
    comandaItems,
    setComandaItems,
    comandaDiscount,
    setComandaDiscount,
    comandaPaymentMethod,
    setComandaPaymentMethod,
    comandaSubtotal,
    comandaTotal,
    selectedProductIdToAdd,
    setSelectedProductIdToAdd,
    availableProducts,
    onClose,
    onAdvance
}) => {
    if (!isOpen || !appointment) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-slate-800/30 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl border border-slate-200/50 dark:border-white/5 rounded-3xl w-full max-w-4xl shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh] animate-fadeIn overflow-hidden">

                {/* Header Comanda */}
                <div className="p-6 border-b border-slate-200/50 dark:border-white/5 flex justify-between items-center bg-transparent">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-[13px] uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">receipt_long</span>
                            Checkout &bull; Comanda
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 uppercase tracking-wider">Cliente: <span className="text-slate-800 dark:text-white font-bold">{appointment.client}</span></p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-white/5 p-2 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                {/* Body Comanda (2 Colunas) */}
                <div className="flex-1 overflow-auto flex flex-col md:flex-row">

                    {/* Coluna Esquerda: Itens */}
                    <div className="flex-1 p-6 border-r border-slate-200 dark:border-border-subtle flex flex-col gap-6">

                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-4">
                                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Itens na Comanda</h4>
                                <span className="text-xs bg-red-600/20 text-red-500 px-2 py-1 rounded-md font-bold">{comandaItems.length} itens</span>
                            </div>

                            <div className="space-y-3">
                                {comandaItems.map((item, index) => (
                                    <div key={index} className="bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle p-4 rounded-xl flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.type === 'service' ? 'bg-[#259af4]/10 text-[#259af4]' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                <span className="material-symbols-outlined">{item.type === 'service' ? 'content_cut' : 'inventory_2'}</span>
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</h5>
                                                <p className="text-xs text-slate-500">{item.type === 'service' ? 'Serviço' : 'Produto'} • Qtd: {item.quantity}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-slate-800 dark:text-white">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                                            <button
                                                onClick={() => setComandaItems(prev => prev.filter((_, i) => i !== index))}
                                                className="text-slate-600 hover:text-danger-red transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Adicionar Produto */}
                        <div className="flex gap-2 bg-slate-50 dark:bg-[#151515] p-3 rounded-xl border border-slate-200 dark:border-border-subtle">
                            <select
                                value={selectedProductIdToAdd}
                                onChange={(e) => setSelectedProductIdToAdd(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-slate-600 dark:text-slate-300 font-bold outline-none border-none focus:ring-0"
                            >
                                <option value="" className="bg-slate-50 dark:bg-[#151515]">Selecione um produto do estoque...</option>
                                {availableProducts.map(prod => (
                                    <option key={prod.id} value={prod.id} className="bg-slate-50 dark:bg-[#151515]">
                                        {prod.name} (R$ {prod.price.toFixed(2).replace('.', ',')})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => {
                                    if (!selectedProductIdToAdd) return;
                                    const product = availableProducts.find(p => p.id === selectedProductIdToAdd);
                                    if (product) {
                                        setComandaItems([...comandaItems, {
                                            id: Date.now(),
                                            name: product.name,
                                            price: product.price,
                                            quantity: 1,
                                            type: 'product'
                                        }]);
                                        setSelectedProductIdToAdd('');
                                    }
                                }}
                                disabled={!selectedProductIdToAdd}
                                className="px-4 py-2 bg-red-600 hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 text-slate-900 dark:text-white font-bold rounded-lg transition-all shadow-lg shadow-red-600/20 flex items-center justify-center"
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>

                    {/* Coluna Direita: Financeiro e Pagamento */}
                    <div className="w-full md:w-80 bg-slate-50 dark:bg-[#0A0A0A] p-6 flex flex-col">
                        <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-6">Resumo Financeiro</h4>

                        <div className="space-y-4 mb-6 flex-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                                <span className="text-slate-800 dark:text-white font-bold">R$ {comandaSubtotal.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Desconto (R$)</span>
                                <input
                                    type="number"
                                    value={comandaDiscount || ''}
                                    onChange={(e) => setComandaDiscount(Number(e.target.value))}
                                    className="w-24 bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-border-subtle rounded-md px-2 py-1 text-right text-slate-800 dark:text-white focus:border-danger-red outline-none"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Método de Pagamento</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setComandaPaymentMethod('pix')}
                                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${comandaPaymentMethod === 'pix' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300 dark:hover:border-white/20'}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                                        PIX
                                    </button>
                                    <button
                                        onClick={() => setComandaPaymentMethod('credit')}
                                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${comandaPaymentMethod === 'credit' ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300 dark:hover:border-white/20'}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">credit_card</span>
                                        Cartão
                                    </button>
                                    <button
                                        onClick={() => setComandaPaymentMethod('money')}
                                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${comandaPaymentMethod === 'money' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300 dark:hover:border-white/20'}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">payments</span>
                                        Espécie
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Total Footer */}
                        <div className="pt-4 border-t border-slate-200 dark:border-white/10 mt-auto">
                            <div className="flex justify-between items-end mb-6">
                                <span className="text-slate-500 dark:text-slate-400 text-sm">Total a Pagar</span>
                                <span className="text-3xl font-extrabold text-slate-800 dark:text-white">R$ {comandaTotal.toFixed(2).replace('.', ',')}</span>
                            </div>

                            <button
                                onClick={onAdvance}
                                className="w-full py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-[0.2em] text-[12px] rounded-2xl flex items-center justify-center gap-2 transition-all mt-4"
                            >
                                <span className="material-symbols-outlined text-[18px]">paid</span>
                                Avançar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
