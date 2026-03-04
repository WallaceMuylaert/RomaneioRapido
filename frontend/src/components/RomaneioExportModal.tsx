import { Printer, Smartphone, FileText, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export interface CartItem {
    id: number
    name: string
    barcode: string | null
    quantity: number
    unit: string
    price: number
    image?: string | null
}

interface RomaneioExportModalProps {
    isOpen: boolean
    customerName: string
    customerPhone: string | null
    items: CartItem[]
    createdAt?: string | null
    title?: string
    onClose: () => void
}

export default function RomaneioExportModal({ isOpen, customerName, customerPhone, items, createdAt, title, onClose }: RomaneioExportModalProps) {
    if (!isOpen) return null
    const { user } = useAuth()
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
    const totalValue = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const dateStr = createdAt ? new Date(createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    const generateWhatsAppText = () => {
        let text = `\u{1F4E6} *ROMANEIO RÁPIDO*\n`
        text += `\u{1F464} *Cliente:* ${customerName || 'Não informado'}\n`
        text += `\u{1F4C5} *Data:* ${dateStr}\n\n`
        text += `\u{2705} *ITENS DO PEDIDO:*\n`

        items.forEach((item, index) => {
            text += `${index + 1}. ${item.name}\n`
            text += `   \u{1F539} Qtd: ${item.quantity} ${item.unit} | \u{1F4B8} Unit: ${formatCurrency(item.price)} | \u{1F4B0} Sub: ${formatCurrency(item.price * item.quantity)}\n`
            if (item.barcode) text += `   \u{1F3F7} Cód: ${item.barcode}\n`
            text += `\n`
        })

        text += `\u{1F4CA} *Total de Itens:* ${totalItems}\n`
        text += `\u{1F4B5} *Valor Total:* ${formatCurrency(totalValue)}\n`
        text += `\n_Gerado por RomaneioRapido.com.br_`

        // Limpeza de caracteres invisíveis e espaços especiais (comum em Intl.NumberFormat)
        const cleanText = text.replace(/\xA0/g, ' ')

        return encodeURIComponent(cleanText).replace(/%20/g, '+')
    }

    const handleWhatsAppClick = (target: 'store' | 'customer') => {
        const phone = target === 'store' ? (user?.phone || '') : (customerPhone || '')
        const cleanPhone = phone.replace(/\D/g, '')

        let finalPhone = cleanPhone
        if (cleanPhone && cleanPhone.length <= 11) {
            finalPhone = `55${cleanPhone}`
        }

        if (!finalPhone) {
            alert(target === 'store' ? 'Telefone da loja não configurado no perfil!' : 'Este cliente não possui telefone cadastrado!')
            return
        }

        const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${generateWhatsAppText()}`
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const printA4 = () => {
        const printWindow = window.open('', '', 'width=800,height=600')
        if (!printWindow) return

        let html = `
            <html>
            <head>
                <title>Romaneio - ${customerName}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111827; }
                    body::before { content: 'romaneiorapido.com.br'; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 60px; color: rgba(0,0,0,0.06); font-weight: 900; pointer-events: none; z-index: 9999; white-space: nowrap; }
                    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
                    .title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
                    .info { color: #4B5563; font-size: 14px; margin-bottom: 4px; }
                    table { w-full; border-collapse: collapse; margin-top: 20px; }
                    th {text-align: left; padding: 12px; background-color: #f9fafb; border-bottom: 2px solid #e5e7eb; color: #374151; font-size: 14px;}
                    td { padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
                    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">DOCUMENTO DE ROMANEIO</div>
                    <div class="info"><strong>Cliente/Destino:</strong> ${customerName || 'N/A'}</div>
                    <div class="info"><strong>Data:</strong> ${dateStr}</div>
                </div>
                
                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Qtd</th>
                            <th>Unid</th>
                            <th>Produto</th>
                            <th style="text-align: right;">Val. Unit.</th>
                            <th style="text-align: right;">Subtotal</th>
                            <th>Confirmação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td><strong>${item.quantity}</strong></td>
                                <td>${item.unit}</td>
                                <td>
                                    ${item.name}
                                    <div style="color: #6B7280; font-family: monospace; font-size: 11px;">${item.barcode || '-'}</div>
                                </td>
                                <td style="text-align: right;">${formatCurrency(item.price)}</td>
                                <td style="text-align: right; font-weight: bold;">${formatCurrency(item.price * item.quantity)}</td>
                                <td style="text-align: center;"><div style="width: 20px; height: 20px; border: 1px solid #D1D5DB; border-radius: 4px; display: inline-block;"></div></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; text-align: right;">
                    <div style="font-size: 14px; color: #4B5563;">Total de Itens: <strong>${totalItems}</strong></div>
                    <div style="font-size: 20px; font-weight: bold; margin-top: 4px; color: #111827;">Valor Total: ${formatCurrency(totalValue)}</div>
                </div>

                <div class="footer">
                    Documento gerado pelo sistema RomaneioRapido.com.br
                </div>
            </body>
            </html>
        `

        printWindow.document.write(html)
        printWindow.document.close()

        // Timeout para garantir que o Chrome renda os estilos antes de abrir a janela print
        setTimeout(() => {
            printWindow.print()
        }, 250)
    }

    const printThermal = () => {
        const printWindow = window.open('', '', 'width=400,height=600')
        if (!printWindow) return

        let html = `
            <html>
            <head>
                <title>Cupom - ${customerName}</title>
                <style>
                    /* Largura típica de bobina 80mm e fonte monoespaçada parecida com cupom fiscal */
                    @page { margin: 0; }
                    body { font-family: 'Courier New', Courier, monospace; width: 300px; padding: 10px; color: #000; margin: 0 auto; font-size: 12px; line-height: 1.2; }
                    body::before { content: 'romaneiorapido.com.br'; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 24px; color: rgba(0,0,0,0.06); font-weight: 900; pointer-events: none; z-index: 9999; white-space: nowrap; }
                    .center { text-align: center; }
                    .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
                    .bold { font-weight: bold; }
                    .item { margin-bottom: 8px; }
                    .item-name { font-weight: bold; font-size: 13px; }
                    .item-details { display: flex; justify-content: space-between; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="center bold" style="font-size: 16px; margin-bottom: 5px;">ROMANEIO RAPIDO</div>
                <div class="center" style="margin-bottom: 10px;">Comprovante de Separacao</div>
                
                <div>Data: ${dateStr}</div>
                <div class="bold" style="font-size: 14px; margin-top: 5px;">Cliente: ${customerName || 'N/A'}</div>
                
                <div class="divider"></div>
                <div class="center bold">ITENS DO PEDIDO</div>
                <div class="divider"></div>
                
                ${items.map(item => `
                    <div class="item">
                        <div class="item-name">${item.name}</div>
                        <div class="item-details" style="margin-bottom: 2px;">
                            <span>${item.quantity} ${item.unit} x ${formatCurrency(item.price)}</span>
                            <span>${formatCurrency(item.quantity * item.price)}</span>
                        </div>
                        ${item.barcode ? `<div style="font-size: 10px; color: #555;">Cód: ${item.barcode}</div>` : ''}
                    </div>
                `).join('')}
                
                <div class="divider"></div>
                <div class="item-details">
                    <span>Qtd Final de Itens:</span>
                    <span class="bold">${totalItems}</span>
                </div>
                <div class="item-details" style="font-size: 15px; margin-top: 5px;">
                    <span class="bold">VALOR TOTAL:</span>
                    <span class="bold">${formatCurrency(totalValue)}</span>
                </div>
                
                <div class="divider"></div>
                <div class="center" style="margin-top: 20px; margin-bottom: 20px;">
                    <div>Assinatura Entregador</div>
                    <div style="border-bottom: 1px solid #000; margin-top: 30px; width: 80%; margin-left: auto; margin-right: auto;"></div>
                </div>
                <div class="center" style="font-size: 10px; margin-top: 20px;">
                    RomaneioRapido.com.br
                </div>
            </body>
            </html>
        `

        printWindow.document.write(html)
        printWindow.document.close()

        setTimeout(() => {
            printWindow.print()
        }, 250)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{title || "Romaneio Finalizado! 🎉"}</h2>
                        <p className="text-sm text-gray-500 mt-1">Escolha como deseja exportar a lista</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Botão A4 */}
                    <button
                        onClick={printA4}
                        className="w-full group relative overflow-hidden bg-white border-2 border-blue-500 hover:border-blue-600 rounded-2xl p-4 transition-all duration-300 flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                    >
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-[15px]">Imprimir Folha A4</p>
                            <p className="text-[12px] text-gray-500 font-medium">Layout profissional para pranchetas e pastas, com checkbox de conferência.</p>
                        </div>
                    </button>

                    {/* Botão Bobina Térmica */}
                    <button
                        onClick={printThermal}
                        className="w-full group relative overflow-hidden bg-white border-2 border-slate-800 hover:border-black rounded-2xl p-4 transition-all duration-300 flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                    >
                        <div className="w-12 h-12 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <Printer className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-[15px]">Imprimir Bobina (Térmica)</p>
                            <p className="text-[12px] text-gray-500 font-medium">Formato estreito de cupom (80mm) ideal para impressoras portáteis/caixa.</p>
                        </div>
                    </button>

                    {/* WhatsApp Opções */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Botão WhatsApp Loja (Sempre ativo) */}
                        <button
                            onClick={() => handleWhatsAppClick('store')}
                            className="group relative overflow-hidden bg-white border-2 border-emerald-500 hover:border-emerald-600 rounded-2xl p-4 transition-all duration-300 flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                        >
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-[13px]">Via da Loja</p>
                                <p className="text-[10px] text-gray-500 font-medium line-clamp-1">Enviar p/ meu Zap</p>
                            </div>
                        </button>

                        {/* Botão WhatsApp Cliente (Opcional) */}
                        <button
                            onClick={() => handleWhatsAppClick('customer')}
                            disabled={!customerPhone}
                            className={`group relative overflow-hidden border-2 rounded-2xl p-4 transition-all duration-300 flex items-center gap-4 text-left shadow-sm ${customerPhone ? 'bg-white border-blue-500 hover:border-blue-600 hover:shadow-md' : 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${customerPhone ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-300'}`}>
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-[13px]">Via Cliente</p>
                                <p className="text-[10px] text-gray-500 font-medium line-clamp-1">{customerPhone ? 'Enviar p/ o Cliente' : 'Sem telefone'}</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
