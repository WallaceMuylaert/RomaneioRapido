import { useState, useEffect } from 'react'
import { Printer, FileText, X, Phone, Save, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { toast } from 'react-hot-toast'
import { translateError } from '../utils/errors'
import { maskPhone } from '../utils/masks'
import AlertModal from './AlertModal'
import { getBase64FromUrl } from '../utils/imageUtils'
import logoImg from '../assets/romaneiorapido_logo.png'
import { WhatsAppIcon } from '../assets/WhatsAppIcon'
import { generatePixPayload, generatePixQRCode } from '../utils/pix'

export interface CartItem {
    selectedKey: string
    id: number
    name: string
    barcode: string | null
    quantity: number
    unit: string
    price: number
    image?: string | null
    color?: string | null
    size?: string | null
}

interface RomaneioExportModalProps {
    isOpen: boolean
    clientId?: number | null
    customerName: string
    customerPhone: string | null
    items: CartItem[]
    createdAt?: string | null
    title?: string
    onClose: () => void
    onPhoneUpdated?: (newPhone: string) => void
    discount?: number
    isDraft?: boolean
}

export default function RomaneioExportModal({ 
    isOpen, 
    clientId, 
    customerName, 
    customerPhone, 
    items, 
    createdAt, 
    title, 
    onClose, 
    onPhoneUpdated, 
    discount = 0,
    isDraft = false
}: RomaneioExportModalProps) {
    const { user } = useAuth()

    // Estados para edição/cadastro de telefone
    const [currentPhone, setCurrentPhone] = useState(customerPhone || '')
    const [isEditingPhone, setIsEditingPhone] = useState(false)
    const [tempPhone, setTempPhone] = useState('')
    const [savingPhone, setSavingPhone] = useState(false)
    const [logoBase64, setLogoBase64] = useState<string>('')
    const [pixQRCode, setPixQRCode] = useState<string>('')

    // Carrega o logo dinamicamente para Base64 ao abrir o modal
    useEffect(() => {
        if (isOpen) {
            getBase64FromUrl(logoImg).then(setLogoBase64).catch(console.error)

            if (user?.pix_key) {
                const payload = generatePixPayload({
                    key: user.pix_key,
                    name: user.full_name || 'Loja',
                    city: 'Sao Paulo' // Default city as per BRCode requirements if not provided
                });
                generatePixQRCode(payload).then(setPixQRCode).catch(console.error);
            } else {
                setPixQRCode('');
            }
        }
    }, [isOpen, user?.pix_key, user?.full_name])
    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean,
        title: string,
        message: string,
        type: 'warning' | 'error' | 'success' | 'info'
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    })

    if (!isOpen) return null

    const totalsByUnit = items.reduce((acc, item) => {
        const unit = (item.unit || 'UN').toUpperCase();
        acc[unit] = (acc[unit] || 0) + item.quantity;
        return acc;
    }, {} as Record<string, number>);

    const formatQuantity = (qty: number) => {
        return Number.isInteger(qty) ? qty.toString() : qty.toFixed(3).replace(/\.?0+$/, '');
    };

    const totalItemsSummary = Object.entries(totalsByUnit)
        .map(([unit, qty]) => `${formatQuantity(qty)} ${unit}`)
        .join(' | ');

    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const totalValue = subtotal - discount
    const dateStr = createdAt ? new Date(createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    const handleExportWhatsAppText = (target: 'store' | 'customer') => {
        const phone = target === 'store' ? (user?.phone || '') : (currentPhone || '')

        if (!phone && target === 'customer') {
            setAlertConfig({
                isOpen: true,
                title: 'Atenção',
                message: 'Este cliente não possui um telefone cadastrado para envio via WhatsApp.',
                type: 'warning'
            })
            return
        }

        const phoneOnlyDigits = phone.replace(/\D/g, '')

        let text = isDraft ? `*--- RASCUNHO EXECUTIVO ---*\n*ESTA NÃO É UMA VENDA FINALIZADA*\n\n` : ''
        text += `*ROMANEIO RÁPIDO*\n`
        text += `*Cliente:* ${customerName || 'Não informado'}\n`
        text += `*Data:* ${dateStr}\n\n`
        text += `*ITENS DO PEDIDO:*\n`

        items.forEach((item, index) => {
            text += `${index + 1}. ${item.name}\n`
            if (item.color || item.size) {
                text += `   ↳ _Variante: ${[item.color, item.size].filter(Boolean).join(' • ')}_\n`
            }
            if (item.barcode) {
                text += `   Cód: ${item.barcode}\n`
            }
            text += `   Qtd: ${item.quantity} ${item.unit} | Unit: ${formatCurrency(item.price)} | Sub: ${formatCurrency(item.price * item.quantity)}\n\n`
        })

        text += `*Total Itens:* ${totalItemsSummary}\n`
        text += `*SUBTOTAL:* ${formatCurrency(subtotal)}\n`
        if (discount > 0) {
            text += `*DESCONTO:* -${formatCurrency(discount)}\n`
        }
        text += `*VALOR TOTAL:* ${formatCurrency(totalValue)}\n\n`
        if (user?.pix_key) {
            text += `*PAGAMENTO VIA PIX*\nChave: ${user.pix_key}\n\n`
        }

        text += `_Gerado por RomaneioRapido_`

        // Limpeza de caracteres invisíveis e espaços especiais (comum em Intl.NumberFormat)
        const cleanText = text.replace(/\xA0/g, ' ')
        const encodedText = encodeURIComponent(cleanText).replace(/%20/g, '+')

        let link = ''
        if (phoneOnlyDigits) {
            let finalPhone = phoneOnlyDigits.length <= 11 ? `55${phoneOnlyDigits}` : phoneOnlyDigits
            link = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodedText}`
        } else {
            // Se enviar pra loja sem celular, abre whatsapp web geral para escolher contato
            link = `https://api.whatsapp.com/send?text=${encodedText}`
        }

        window.open(link, '_blank', 'noopener,noreferrer')
    }

    const handleSavePhone = async () => {
        if (!tempPhone.trim()) return;
        setSavingPhone(true)

        try {
            if (clientId) {
                // Atualizar telefone de cliente existente
                await api.put(`/clients/${clientId}`, { phone: tempPhone })
                toast.success('Telefone atualizado com sucesso!')
            } else {
                // Criar novo cliente usando o nome que está no romaneio
                await api.post('/clients/', { name: customerName, phone: tempPhone })
                toast.success('Cliente cadastrado com sucesso!')
                // Em um fluxo real avançado, devolveríamos esse ID para a view pai.
            }

            setCurrentPhone(tempPhone)
            setIsEditingPhone(false)
            if (onPhoneUpdated) onPhoneUpdated(tempPhone)

        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao salvar o contato.')
        } finally {
            setSavingPhone(false)
        }
    }

    const printA4 = () => {
        const printWindow = window.open('', '', 'width=900,height=800')
        if (!printWindow) return

        const now = new Date();
        const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        const filename = `Romaneio_${customerName.replace(/\s+/g, '_')}_${timestamp}`;

        let html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>${filename}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Inter', -apple-system, sans-serif; 
                        padding: 20px;
                        color: #1f2937; 
                        line-height: 1.4;
                        background: #f3f4f6;
                    }
                    .page-canvas {
                        background: #fff;
                        width: 100%;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px;
                        min-height: 297mm;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                    }
                    @media print {
                        body { background: #fff; padding: 0; }
                        .page-canvas { box-shadow: none; padding: 20px; margin: 0 auto; max-width: 100%; }
                    }
                    
                    .watermark-container { 
                        position: fixed; 
                        top: 0; left: 0; width: 100%; height: 100%; 
                        display: flex; align-items: center; justify-content: center; 
                        pointer-events: none; z-index: 0; 
                    }
                    .watermark-logo { width: 500px; opacity: 0.04; transform: rotate(-35deg); }
                    .draft-watermark {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 150px;
                        font-weight: 900;
                        color: rgba(239, 68, 68, 0.08);
                        white-space: nowrap;
                        pointer-events: none;
                        z-index: 1000;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                    }
                    
                    .header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-start; 
                        margin-bottom: 40px; 
                        padding-bottom: 24px;
                        border-bottom: 2px solid #f3f4f6;
                        position: relative;
                        z-index: 1;
                    }
                    .logo-area { display: flex; align-items: center; gap: 12px; }
                    .logo-img { height: 40px; width: auto; object-fit: contain; }
                    .logo-text { font-size: 16px; font-weight: 700; color: #111827; }
                    
                    .doc-info { text-align: right; }
                    .doc-title { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #111827; margin-bottom: 4px; }
                    .doc-date { font-size: 12px; color: #6b7280; font-weight: 500; }

                    .customer-card { 
                        background: #f9fafb; 
                        padding: 20px; 
                        border-radius: 12px; 
                        margin-bottom: 30px; 
                        border: 1px solid #f3f4f6;
                        position: relative;
                        z-index: 1;
                    }
                    .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; margin-bottom: 4px; }
                    .card-value { font-size: 15px; font-weight: 700; color: #111827; }

                    table { width: 100%; border-collapse: separate; border-spacing: 0; position: relative; z-index: 1; }
                    th { 
                        text-align: left; padding: 12px 16px; background: #f9fafb; 
                        color: #6b7280; font-size: 11px; font-weight: 700; 
                        text-transform: uppercase; border-bottom: 1px solid #e5e7eb;
                    }
                    td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px; vertical-align: middle; }
                    .col-qty { width: 60px; text-align: center; font-weight: 700; font-size: 14px; }
                    .col-unit { width: 60px; color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 11px; }
                    .col-num { width: 40px; text-align: center; color: #9ca3af; font-weight: 600; font-size: 11px; }
                    .product-name { font-weight: 700; color: #111827; margin-bottom: 2px; }
                    .product-meta { font-size: 11px; color: #6b7280; display: flex; gap: 8px; }
                    .variant-badge { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; font-weight: 600; }
                    .col-price { text-align: right; color: #4b5563; }
                    .col-total { text-align: right; font-weight: 800; color: #111827; width: 110px; }
                    .col-check { width: 40px; text-align: center; }
                    .check-box { width: 18px; height: 18px; border: 2px solid #d1d5db; border-radius: 4px; display: inline-block; }

                    .summary-section { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
                    
                    .pix-area { 
                        display: flex; align-items: center; gap: 16px; 
                        background: #fdfdfd; padding: 16px; border-radius: 12px; 
                        border: 1px dashed #e5e7eb; max-width: 400px;
                    }
                    .pix-qr { width: 90px; height: 90px; }
                    .pix-details { display: flex; flex-direction: column; gap: 2px; }
                    .pix-title { font-size: 11px; font-weight: 700; color: #111827; }
                    .pix-key { font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700; color: #2563eb; }

                    .totals-area { text-align: right; }
                    .total-label { font-size: 13px; color: #6b7280; font-weight: 500; }
                    .total-value { font-size: 24px; font-weight: 800; color: #111827; margin-top: 4px; }
                    .discount-label { font-size: 14px; color: #ef4444; font-weight: 600; margin-top: 4px; }
                    .total-items { font-size: 11px; color: #9ca3af; font-weight: 600; margin-top: 4px; }

                    .footer { 
                        margin-top: 50px; padding-top: 20px; 
                        border-top: 1px solid #f3f4f6; text-align: center; 
                        font-size: 10px; color: #9ca3af; font-weight: 500;
                        position: relative; z-index: 1;
                    }


                    @media print {
                        body { background: #fff; padding: 0; }
                        .page-canvas { box-shadow: none; padding: 10px; margin: 0 auto; max-width: 100%; min-height: auto; }
                    }
                </style>
            </head>
            <body>
                <div class="watermark-container">
                    ${logoBase64 ? `<img src="${logoBase64}" class="watermark-logo" />` : ''}
                    ${isDraft ? `<div class="draft-watermark">RASCUNHO</div>` : ''}
                </div>

                <div class="page-canvas">
                    
                    <div class="header">
                        <div class="logo-area">
                            ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" />` : '<div style="width: 36px; height: 36px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px;">R</div>'}
                            <div class="logo-text">Romaneio Rápido</div>
                        </div>
                        <div class="doc-info">
                            <div class="doc-title">${isDraft ? 'Rascunho de Separação' : 'Documento de Romaneio'}</div>
                            <div class="doc-date">${dateStr}</div>
                        </div>
                    </div>

                    <div class="customer-card">
                        <div class="card-label">Cliente / Destino</div>
                        <div class="card-value">${customerName || 'Consumidor Final'}</div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th colspan="4" style="text-align: left; background: #f3f4f6; color: #374151; font-size: 10px; border-bottom: none;">Documento de Conferência</th>
                                <th colspan="3" style="text-align: right; background: #f3f4f6; color: #374151; font-size: 14px; border-bottom: none;">TOTAL: ${formatCurrency(totalValue)}</th>
                            </tr>
                            <tr>
                                <th class="col-num">#</th>
                                <th class="col-qty">Qtd</th>
                                <th class="col-unit">Un</th>
                                <th>Produto</th>
                                <th style="text-align: right;">v. Unit</th>
                                <th style="text-align: right;">Subtotal</th>
                                <th class="col-check">OK</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item, index) => `
                                <tr>
                                    <td class="col-num">${index + 1}</td>
                                    <td class="col-qty">${item.quantity}</td>
                                    <td class="col-unit">${item.unit}</td>
                                    <td>
                                        <div class="product-name">${item.name}</div>
                                        <div class="product-meta">
                                            ${(item.color || item.size) ? `<span class="variant-badge">${[item.color, item.size].filter(Boolean).join(' • ')}</span>` : ''}
                                            <span>${item.barcode || '-'}</span>
                                        </div>
                                    </td>
                                    <td class="col-price">${formatCurrency(item.price)}</td>
                                    <td class="col-total">${formatCurrency(item.price * item.quantity)}</td>
                                    <td class="col-check"><div class="check-box"></div></td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot style="display: table-footer-group;">
                            <tr>
                                <td colspan="7" style="height: 80px; border: none !important;"></td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <div class="summary-section">
                        <div class="pix-area">
                            ${pixQRCode ? `<img src="${pixQRCode}" class="pix-qr" />` : ''}
                            <div class="pix-details">
                                <div class="pix-title">PAGAMENTO VIA PIX</div>
                                <div class="pix-key">${user?.pix_key || 'Chave não cadastrada'}</div>
                                <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">Escaneie o QR Code ou use a chave.</div>
                            </div>
                        </div>

                        <div class="totals-area">
                            <div class="total-label">Subtotal</div>
                            <div style="font-size: 16px; font-weight: 700; color: #374151;">${formatCurrency(subtotal)}</div>
                            ${discount > 0 ? `<div class="discount-label">Desconto: -${formatCurrency(discount)}</div>` : ''}
                            
                            <div class="total-label" style="margin-top: 12px;">Total do Romaneio</div>
                            <div class="total-value">${formatCurrency(totalValue)}</div>
                            <div class="total-items">Volume Total: ${totalItemsSummary}</div>
                        </div>
                    </div>

                    <div class="footer">
                        Este documento não é um cupom fiscal. Gerado por romaneiorapido.com.br
                    </div>
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

    const printThermal = () => {
        const printWindow = window.open('', '', 'width=400,height=600')
        if (!printWindow) return

        const now = new Date();
        const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        const filename = `Cupom_${customerName.replace(/\s+/g, '_')}_${timestamp}`;

        let html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>${filename}</title>
                <style>
                    @page { margin: 0; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        width: 280px; 
                        padding: 5px; 
                        color: #000; 
                        margin: 0; 
                        font-size: 11px; 
                        line-height: 1.2;
                        background: #fff;
                    }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
                    
                    .header { margin-bottom: 8px; }
                    .brand-logo { height: 35px; width: auto; object-fit: contain; margin-bottom: 4px; filter: grayscale(100%) contrast(200%); }
                    .brand-name { font-size: 14px; font-weight: bold; }
                    .brand-sub { font-size: 10px; }
                    
                    .draft-notice { 
                        border: 2px solid #000; 
                        padding: 4px; 
                        margin: 5px 0; 
                        font-size: 14px; 
                        font-weight: 900; 
                    }

                    .info-block { margin-bottom: 10px; }
                    .info-row { display: flex; justify-content: space-between; }
                    .customer-name { font-size: 12px; margin-top: 4px; border: 1px solid #000; padding: 4px; text-align: center; }

                    .item { margin-bottom: 6px; }
                    .item-header { font-weight: bold; font-size: 11px; }
                    .item-variant { font-size: 9px; font-weight: bold; margin-bottom: 1px; }
                    .item-details { display: flex; justify-content: space-between; }
                    
                    .total-block { margin-top: 8px; font-size: 11px; }
                    .total-row { display: flex; justify-content: space-between; margin-bottom: 1px; }
                    .grand-total { font-size: 14px; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; }

                    .pix-section { margin-top: 12px; text-align: center; border: 1px solid #000; padding: 6px; }
                    .qr-code { width: 120px; height: 120px; margin: 4px auto; display: block; filter: contrast(300%); }
                    .pix-key { font-size: 9px; word-break: break-all; margin-top: 2px; }

                    .signature-area { margin-top: 25px; text-align: center; }
                    .signature-line { border-bottom: 1px solid #000; width: 85%; margin: 20px auto 4px; }

                    .footer { margin-top: 15px; font-size: 8px; color: #000; }
                </style>
            </head>
            <body>
                <div class="header center">
                    ${logoBase64 ? `<img src="${logoBase64}" class="brand-logo" />` : ''}
                    <div class="brand-name">ROMANEIO RÁPIDO</div>
                    <div class="brand-sub">Comprovante de Separação</div>
                    ${isDraft ? `<div class="draft-notice">*** RASCUNHO ***</div>` : ''}
                </div>

                <div class="divider"></div>

                <div class="info-block">
                    <div class="info-row">
                        <span>DATA:</span>
                        <span>${dateStr.split(',')[0]}</span>
                    </div>
                    <div class="info-row">
                        <span>HORA:</span>
                        <span>${dateStr.split(',')[1] || ''}</span>
                    </div>
                    <div class="bold" style="margin-top: 6px;">CLIENTE:</div>
                    <div class="customer-name bold">${customerName || 'CONSUMIDOR'}</div>
                </div>

                <div class="divider"></div>
                <div class="center bold">ITENS DO PEDIDO</div>
                <div class="divider"></div>

                ${items.map(item => `
                    <div class="item">
                        <div class="item-header">${item.name.toUpperCase()}</div>
                        ${(item.color || item.size) ? `<div class="item-variant">VAR: ${[item.color, item.size].filter(Boolean).join(' / ').toUpperCase()}</div>` : ''}
                        <div class="item-details">
                            <span>${item.quantity} ${item.unit} x ${formatCurrency(item.price)}</span>
                            <span class="bold">${formatCurrency(item.quantity * item.price)}</span>
                        </div>
                        ${item.barcode ? `<div style="font-size: 9px;">REF: ${item.barcode}</div>` : ''}
                    </div>
                `).join('')}

                <div class="divider"></div>

                <div class="total-block">
                    <div class="total-row">
                        <span>VOLUMES:</span>
                        <span class="bold">${totalItemsSummary}</span>
                    </div>
                    <div class="total-row">
                        <span>SUBTOTAL:</span>
                        <span>${formatCurrency(subtotal)}</span>
                    </div>
                    ${discount > 0 ? `
                        <div class="total-row">
                            <span>DESCONTO:</span>
                            <span>-${formatCurrency(discount)}</span>
                        </div>
                    ` : ''}
                    <div class="total-row grand-total bold">
                        <span>TOTAL:</span>
                        <span>${formatCurrency(totalValue)}</span>
                    </div>
                </div>

                ${pixQRCode ? `
                    <div class="pix-section">
                        <div class="bold">PAGAMENTO VIA PIX</div>
                        <img src="${pixQRCode}" class="qr-code" />
                        <div class="pix-key">${user?.pix_key}</div>
                    </div>
                ` : user?.pix_key ? `
                    <div class="pix-section">
                        <div class="bold">CHAVE PIX:</div>
                        <div class="pix-key">${user?.pix_key}</div>
                    </div>
                ` : ''}

                <div class="signature-area">
                    <span>ASSINATURA RESPONSÁVEL</span>
                    <div class="signature-line"></div>
                </div>

                <div class="footer center">
                    OBRIGADO PELA PREFERÊNCIA!<br>
                    www.romaneiorapido.com.br
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
        <div className="fixed inset-0 z-[100] overflow-y-auto outline-none focus:outline-none">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

                <div className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">
                            {title || (isDraft ? "Rascunho de Separação 📝" : "Romaneio Finalizado! 🎉")}
                        </h2>
                        <p className="text-sm text-text-secondary mt-1">
                            {isDraft ? "Conclua a separação antes de finalizar" : "Escolha como deseja exportar a lista"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-text-secondary hover:bg-background hover:text-text-secondary rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Botão A4 */}
                    <button
                        onClick={printA4}
                        className="w-full group relative overflow-hidden bg-card border-2 border-brand-500 hover:border-primary rounded-2xl p-4 transition-all duration-300 flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                    >
                        <div className="w-12 h-12 bg-brand-50 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-text-primary text-[15px]">Imprimir Folha A4</p>
                            <p className="text-[12px] text-text-secondary font-medium">Layout profissional para pranchetas e pastas, com checkbox de conferência.</p>
                        </div>
                    </button>

                    {/* Botão Bobina Térmica */}
                    <button
                        onClick={printThermal}
                        className="w-full group relative overflow-hidden bg-card border-2 border-card/10 hover:border-black rounded-2xl p-4 transition-all duration-300 flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                    >
                        <div className="w-12 h-12 bg-border/50 text-text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <Printer className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-text-primary text-[15px]">Imprimir Bobina (Térmica)</p>
                            <p className="text-[12px] text-text-secondary font-medium">Formato estreito de cupom (80mm) ideal para impressoras portáteis/caixa.</p>
                        </div>
                    </button>

                    {/* WhatsApp Opções */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Botão WhatsApp Loja (Sempre ativo) */}
                        <button
                            onClick={() => handleExportWhatsAppText('store')}
                            className="group relative overflow-hidden bg-card border-2 border-emerald-500 hover:border-emerald-600 rounded-2xl p-4 transition-all duration-300 flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                        >
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <WhatsAppIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-text-primary text-[13px]">Enviar p/ Loja</p>
                                <p className="text-[10px] text-text-secondary font-medium line-clamp-1">Via WhatsApp (Texto)</p>
                            </div>
                        </button>

                        {/* Botão WhatsApp Cliente (Opcional) */}
                        {!currentPhone && !isEditingPhone ? (
                            <button
                                onClick={() => { setIsEditingPhone(true); setTempPhone(''); }}
                                className="group relative overflow-hidden border-2 bg-card border-dashed border-border hover:border-brand-500 rounded-2xl p-4 transition-all duration-300 flex items-center gap-4 text-left shadow-sm hover:shadow-md"
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-background text-text-secondary group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                                    <WhatsAppIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-text-primary text-[13px]">Salvar Contato</p>
                                    <p className="text-[10px] text-text-secondary font-medium line-clamp-1">Cadastrar WhatsApp</p>
                                </div>
                            </button>
                        ) : isEditingPhone ? (
                            <div className="border-2 border-brand-200 bg-brand-50/30 rounded-2xl p-3 flex flex-col gap-2 transition-all">
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Número do WhatsApp *</label>
                                <div className="flex gap-2">
                                    <input
                                        autoFocus
                                        value={tempPhone}
                                        onChange={(e) => setTempPhone(maskPhone(e.target.value))}
                                        placeholder="(00) 00000-0000"
                                        className="w-full text-sm font-semibold h-10 px-3 border border-border rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:font-normal"
                                    />
                                    <button
                                        onClick={handleSavePhone}
                                        disabled={savingPhone || !tempPhone}
                                        className="w-10 h-10 shrink-0 bg-brand-600 text-card rounded-xl flex items-center justify-center hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm"
                                    >
                                        {savingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative group">
                                <button
                                    onClick={() => handleExportWhatsAppText('customer')}
                                    className="w-full relative overflow-hidden border-2 rounded-2xl p-4 transition-all duration-300 flex items-center gap-4 text-left shadow-sm bg-card border-brand-500 hover:border-primary hover:shadow-md h-[100%]"
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform bg-brand-50 text-primary">
                                        <WhatsAppIcon className="w-5 h-5" />
                                    </div>
                                    <div className="pr-6">
                                        <p className="font-bold text-text-primary text-[13px]">Enviar p/ Cliente</p>
                                        <p className="text-[10px] text-text-secondary font-medium truncate">{currentPhone}</p>
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditingPhone(true);
                                        setTempPhone(currentPhone);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-card/80 backdrop-blur-sm shadow-sm border border-border text-text-secondary hover:text-brand-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-10"
                                    title="Alterar número"
                                >
                                    <Phone className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

                <AlertModal
                    isOpen={alertConfig.isOpen}
                    onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                />
            </div>
        </div>
    )
}
