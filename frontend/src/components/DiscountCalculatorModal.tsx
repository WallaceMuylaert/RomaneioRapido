import { useState, useEffect } from 'react'
import { Calculator, X } from 'lucide-react'

interface DiscountCalculatorModalProps {
    isOpen: boolean
    subtotal: number
    currentPercentage?: number
    onClose: () => void
    onApply: (discountAmount: number, discountPercentage: number) => void
}

export default function DiscountCalculatorModal({ isOpen, subtotal, currentPercentage = 0, onClose, onApply }: DiscountCalculatorModalProps) {
    const [percentage, setPercentage] = useState<string>('')
    const [calculatedAmount, setCalculatedAmount] = useState<number>(0)

    useEffect(() => {
        if (isOpen) {
            setPercentage(currentPercentage > 0 ? String(currentPercentage) : '')
        }
    }, [isOpen, currentPercentage])

    useEffect(() => {
        let p = parseFloat(percentage.replace(',', '.'))
        if (isNaN(p) || p < 0) p = 0
        if (p > 100) p = 100
        setCalculatedAmount(subtotal * (p / 100))
    }, [percentage, subtotal])

    if (!isOpen) return null

    const handleApply = () => {
        let p = parseFloat(percentage.replace(',', '.'))
        if (isNaN(p) || p < 0) p = 0
        if (p > 100) p = 100
        onApply(calculatedAmount, p)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto outline-none focus:outline-none">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
                
                <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                            <Calculator className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Aplicar Desconto</h2>
                            <p className="text-xs font-semibold text-gray-400 mt-0.5 uppercase tracking-wider">Porcentagem (%)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-50 hover:text-red-500 rounded-xl transition-all active:scale-95">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Desconto em %</label>
                            <span className="text-xs font-bold text-slate-500">
                                de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}
                            </span>
                        </div>
                        <div className="relative">
                            <input
                                autoFocus
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value.replace(/[^0-9.,]/g, ''))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleApply()
                                }}
                                className="w-full h-14 pl-4 pr-12 text-2xl font-black text-gray-900 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300 placeholder:font-medium"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">%</span>
                        </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                        <span className="text-xs font-black text-emerald-700/70 uppercase tracking-widest">Desconto em R$</span>
                        <span className="text-xl font-black text-emerald-600">
                            - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedAmount)}
                        </span>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleApply}
                            className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95"
                        >
                            Aplicar
                        </button>
                    </div>
                </div>
                </div>
            </div>
        </div>
    )
}
