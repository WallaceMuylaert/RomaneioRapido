import { useState, useEffect, useMemo, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import api from '../services/api'
import { toast } from 'react-hot-toast'
import { translateError } from '../utils/errors'
import {
    ScanBarcode,
    Plus,
    AlertTriangle,
    Camera,
    ShoppingCart,
    Trash2,
    CheckCircle2,
    UserCircle2,
    Smartphone,
    Minus,
    Calendar as CalendarIcon,
    Search,
    Save,
    Clock
} from 'lucide-react'
import BarcodeScanner from '../components/BarcodeScanner'
import RomaneioExportModal from '../components/RomaneioExportModal'
import type { CartItem } from '../components/RomaneioExportModal'
import { isIntegerUnit } from '../utils/units'
import ClientModal from '../components/ClientModal'
import ConfirmModal from '../components/ConfirmModal'
import DiscountCalculatorModal from '../components/DiscountCalculatorModal'

interface Product {
    id: number
    name: string
    sku: string | null
    barcode: string | null
    stock_quantity: number
    min_stock: number
    unit: string
    price: number
    color?: string | null
    size?: string | null
}

interface ClientResult {
    id: number
    name: string
    document: string | null
    phone: string | null
}

interface StockLevel {
    product_id: number
    product_name: string
    barcode: string | null
    stock_quantity: number
    min_stock: number
    unit: string
    price: number
    image_base64: string | null
    is_low_stock: boolean
    color?: string | null
    size?: string | null
}

interface PendingItem {
    product_id: number
    name: string
    barcode: string | null
    quantity: number
    unit: string
    price: number
    image?: string | null
    color?: string | null
    size?: string | null
}

interface PendingRomaneio {
    id: number
    user_id: number
    client_id: number | null
    customer_name: string | null
    customer_phone: string | null
    items: PendingItem[]
    created_at: string
    updated_at: string
}

export default function RomaneioPage() {
    const [activeTab, setActiveTab] = useState<'romaneio' | 'estoque' | 'separacao'>('romaneio')
    const [barcodeInput, setBarcodeInput] = useState('')

    // Novo Formato "Carrinho"
    const [cartItems, setCartItems] = useState<CartItem[]>([])
    const [stockQuantities, setStockQuantities] = useState<Record<number, string>>({})
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState<string | null>(null)
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
    const [showExportModal, setShowExportModal] = useState(false)

    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [cameraOpen, setCameraOpen] = useState(false)

    // Busca de Produtos
    const [dropdownResults, setDropdownResults] = useState<Product[]>([])

    // Busca de Clientes
    const [dropdownClients, setDropdownClients] = useState<ClientResult[]>([])
    const [isSearchingClient, setIsSearchingClient] = useState(false)
    const clientSearchContainerRef = useRef<HTMLDivElement>(null)
    const productSearchContainerRef = useRef<HTMLDivElement>(null)
    const [showClientDropdown, setShowClientDropdown] = useState(false)
    const [activeClientIndex, setActiveClientIndex] = useState(-1)
    const [activeProductIndex, setActiveProductIndex] = useState(-1)
    const clientListRef = useRef<HTMLDivElement>(null)
    const productListRef = useRef<HTMLDivElement>(null)
    const [clientModalOpen, setClientModalOpen] = useState(false)

    const [stockLevels, setStockLevels] = useState<StockLevel[]>([])

    // Estado para Validação de Estoque
    const [stockValidationError, setStockValidationError] = useState<{
        productName: string,
        available: number,
        requested: number,
        unit: string
    }[] | null>(null)
    const [itemToRemove, setItemToRemove] = useState<string | null>(null)
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean,
        title: string,
        message: string,
        onConfirm: () => void,
        confirmText?: string,
        cancelText?: string,
        type?: 'danger' | 'warning' | 'info'
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    })

    // Desconto
    const [showDiscountModal, setShowDiscountModal] = useState(false)
    const [discountPercentage, setDiscountPercentage] = useState<number>(0)

    // Estado para feedback em tempo real do scanner
    const [scanStatus, setScanStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle')

    // Bloqueador de Navegação do React Router (Para rotas externas)
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            cartItems.length > 0 && currentLocation.pathname !== nextLocation.pathname
    );

    // Pedidos Pendentes (Separação)
    const [pendingRomaneios, setPendingRomaneios] = useState<PendingRomaneio[]>([])
    const [isSavingPending, setIsSavingPending] = useState(false)

    // Fechar dropdowns ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientSearchContainerRef.current && !clientSearchContainerRef.current.contains(event.target as Node)) {
                setShowClientDropdown(false)
                setActiveClientIndex(-1)
            }
            if (productSearchContainerRef.current && !productSearchContainerRef.current.contains(event.target as Node)) {
                setDropdownResults([])
                setActiveProductIndex(-1)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Filtros e Paginação do Estoque
    const [estoqueSearch, setEstoqueSearch] = useState('')
    const [estoquePage, setEstoquePage] = useState(1)
    const [estoqueSortField, setEstoqueSortField] = useState<keyof StockLevel>('product_name')
    const [estoqueSortDirection, setEstoqueSortDirection] = useState<'asc' | 'desc'>('asc')

    const handleSortEstoque = (field: keyof StockLevel) => {
        if (estoqueSortField === field) {
            setEstoqueSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setEstoqueSortField(field)
            setEstoqueSortDirection('asc')
        }
        setEstoquePage(1)
    }

    const handleSearchClient = async (query: string) => {
        setCustomerName(query)
        setDropdownResults([])
        setActiveProductIndex(-1)

        if (query.length < 2) {
            setDropdownClients([])
            setShowClientDropdown(false)
            setActiveClientIndex(-1)
            return
        }
        setIsSearchingClient(true)
        try {
            const res = await api.get('/clients/', { params: { search: query, per_page: 5 } })
            setDropdownClients(res.data.items)
            setShowClientDropdown(true)
            setActiveClientIndex(res.data.items.length > 0 ? 0 : -1)
        } catch (err) {
            console.error('Erro ao buscar clientes:', err)
        } finally {
            setIsSearchingClient(false)
        }
    }

    const handleBarcodeSearch = async (val: string) => {
        setBarcodeInput(val)
        setShowClientDropdown(false)
        setActiveClientIndex(-1)

        if (val.trim().length < 2) {
            setDropdownResults([])
            setActiveProductIndex(-1)
            return
        }
        try {
            const res = await api.get('/products/', { params: { search: val, per_page: 5 } })
            setDropdownResults(res.data.items)
            setActiveProductIndex(res.data.items.length > 0 ? 0 : -1)
        } catch (err) {
            console.error('Erro ao buscar produtos:', err)
        }
    }

    const selectClient = (client: ClientResult) => {
        setSelectedClientId(client.id)
        setCustomerName(client.name)
        setCustomerPhone(client.phone)
        setShowClientDropdown(false)
        setActiveClientIndex(-1)
    }

    const handleClientKeyDown = (e: React.KeyboardEvent) => {
        if (!showClientDropdown || dropdownClients.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveClientIndex(prev => (prev < dropdownClients.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveClientIndex(prev => (prev > 0 ? prev - 1 : prev))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (activeClientIndex >= 0) {
                selectClient(dropdownClients[activeClientIndex])
            }
        } else if (e.key === 'Escape') {
            setShowClientDropdown(false)
            setActiveClientIndex(-1)
        }
    }

    const handleProductKeyDown = (e: React.KeyboardEvent) => {
        if (dropdownResults.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveProductIndex(prev => (prev < dropdownResults.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveProductIndex(prev => (prev > 0 ? prev - 1 : prev))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (activeProductIndex >= 0) {
                addToCart(dropdownResults[activeProductIndex])
                setBarcodeInput('')
                setDropdownResults([])
                setActiveProductIndex(-1)
            }
        } else if (e.key === 'Escape') {
            setDropdownResults([])
            setActiveProductIndex(-1)
        }
    }

    useEffect(() => {
        if (activeClientIndex >= 0 && clientListRef.current) {
            const list = clientListRef.current
            const item = list.children[activeClientIndex] as HTMLElement
            if (item) {
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        }
    }, [activeClientIndex])

    useEffect(() => {
        if (activeProductIndex >= 0 && productListRef.current) {
            const list = productListRef.current
            const item = list.children[activeProductIndex] as HTMLElement
            if (item) {
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        }
    }, [activeProductIndex])

    const ESTOQUE_PER_PAGE = 20

    const fetchStockLevels = async () => {
        setLoading(true)
        try {
            const res = await api.get('/inventory/stock-levels')
            setStockLevels(res.data)
        } catch (err) {
            console.error('Erro ao buscar níveis de estoque:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchPendingRomaneios = async () => {
        try {
            const res = await api.get('/pending/')
            setPendingRomaneios(res.data)
        } catch (err) {
            console.error('Erro ao buscar rascunhos:', err)
        }
    }

    const handleSavePending = async () => {
        if (cartItems.length === 0) {
            toast.error('Adicione itens ao romaneio primeiro')
            return
        }

        if (!customerName || !customerName.trim()) {
            toast.error('Por favor, informe o nome do cliente para salvar a separação')
            return
        }

        setIsSavingPending(true)
        try {
            await api.post('/pending/', {
                client_id: selectedClientId,
                customer_name: customerName,
                customer_phone: customerPhone,
                items: cartItems.map(item => ({
                    product_id: item.id,
                    name: item.name,
                    barcode: item.barcode,
                    quantity: item.quantity,
                    unit: item.unit,
                    price: item.price,
                    image: item.image,
                    color: item.color,
                    size: item.size
                }))
            })
            toast.success('Pedido salvo em separação!')
            resetCart()
            fetchPendingRomaneios()
            setActiveTab('separacao')
        } catch (err: any) {
            toast.error(translateError(err))
        } finally {
            setIsSavingPending(false)
        }
    }

    const handleBlockerSave = async () => {
        if (!customerName || !customerName.trim()) {
            toast.error('Informe o nome do cliente antes de salvar')
            return
        }

        setIsSavingPending(true)
        try {
            await api.post('/pending/', {
                client_id: selectedClientId,
                customer_name: customerName,
                customer_phone: customerPhone,
                items: cartItems.map(item => ({
                    product_id: item.id,
                    name: item.name,
                    barcode: item.barcode,
                    quantity: item.quantity,
                    unit: item.unit,
                    price: item.price,
                    image: item.image,
                    color: item.color,
                    size: item.size
                }))
            })
            toast.success('Pedido salvo em separação!')
            blocker.proceed?.()
        } catch (err: any) {
            toast.error('Erro ao salvar rascunho. Saindo sem salvar...')
            blocker.proceed?.()
        } finally {
            setIsSavingPending(false)
        }
    }

    const handleResumePending = async (pending: PendingRomaneio) => {
        const executeResume = async () => {
            setCartItems(pending.items.map(item => ({
                selectedKey: `${item.product_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                id: item.product_id,
                name: item.name,
                barcode: item.barcode,
                quantity: item.quantity,
                unit: item.unit,
                price: item.price,
                image: item.image,
                color: item.color,
                size: item.size
            })))
            setCustomerName(pending.customer_name || '')
            setCustomerPhone(pending.customer_phone)
            setSelectedClientId(pending.client_id)

            try {
                await api.delete(`/pending/${pending.id}`)
                setPendingRomaneios(p => p.filter(x => x.id !== pending.id))
            } catch (err) {
                console.error('Erro ao remover rascunho ao retomar:', err)
            }

            setActiveTab('romaneio')
            toast.success('Rascunho carregado!')
            setConfirmConfig(prev => ({ ...prev, isOpen: false }))
        }

    if (cartItems.length > 0) {
        setConfirmConfig({
            isOpen: true,
            title: 'Substituir Itens?',
            message: 'Isso irá apagar os itens atuais do romaneio para carregar o rascunho. Continuar?',
            onConfirm: executeResume,
            type: 'warning',
            confirmText: 'Continuar',
            cancelText: 'Voltar'
        })
        return
    }

    executeResume()
}

const handleDeletePending = async (id: number) => {
    setConfirmConfig({
        isOpen: true,
        title: 'Excluir Rascunho?',
        message: 'Deseja remover permanentemente este rascunho de separação?',
        type: 'danger',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        onConfirm: async () => {
            try {
                await api.delete(`/pending/${id}`)
                setPendingRomaneios(p => p.filter(x => x.id !== id))
                toast.success('Rascunho excluído')
            } catch (err) {
                toast.error('Erro ao excluir rascunho')
            } finally {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }))
            }
        }
    })
}

useEffect(() => {
    fetchStockLevels()
    fetchPendingRomaneios()

    // Verificar se há dados copiados de outro lugar
    const copyDataRaw = sessionStorage.getItem('copy_romaneio_data')
    if (copyDataRaw) {
        try {
            const copyData = JSON.parse(copyDataRaw)
            if (copyData.items && copyData.items.length > 0) {
                setCartItems(copyData.items.map((item: any) => ({
                    ...item,
                    selectedKey: item.selectedKey || `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                })))
                setCustomerName(copyData.customerName || '')
                setCustomerPhone(copyData.customerPhone || null)
                setSelectedClientId(copyData.clientId || null)
                toast.success('Dados do romaneio retomados!')
            }
        } catch (err) {
            console.error('Erro ao parsear dados copiados:', err)
        } finally {
            sessionStorage.removeItem('copy_romaneio_data')
        }
    }
}, [])

useEffect(() => {
    if (activeTab === 'estoque') {
        setEstoquePage(1)
        setEstoqueSearch('')
        fetchStockLevels()
    }
}, [activeTab])

useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (cartItems.length > 0) {
            e.preventDefault()
            e.returnValue = ''
        }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [cartItems])


const addToCart = (product: any, quantityOverride?: number) => {
    const qtyToAdd = quantityOverride !== undefined ? quantityOverride : 1;
    if (qtyToAdd <= 0) return;

    const newKey = `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setCartItems((prev: CartItem[]) => [
        {
            selectedKey: newKey,
            id: product.id,
            name: product.name,
            barcode: product.barcode,
            quantity: qtyToAdd,
            unit: product.unit,
            price: product.price || 0,
            color: product.color,
            size: product.size
        },
        ...prev
    ])

    toast.success(`${product.name} adicionado!`, {
        icon: '🛒',
        duration: 1500,
        style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 'bold'
        }
    })
}

const updateCartQuantity = (selectedKey: string, quant: string, unit: string) => {
    let val = parseFloat(quant)
    if (isNaN(val) || val < 0) return
    if (isIntegerUnit(unit)) val = Math.floor(val)
    setCartItems(prev => prev.map(item => item.selectedKey === selectedKey ? { ...item, quantity: val } : item))
}

const handleQuantityBlur = (selectedKey: string) => {
    setCartItems(prev => prev.filter(item => {
        if (item.selectedKey === selectedKey && (item.quantity <= 0 || isNaN(item.quantity))) {
            return false
        }
        return true
    }))
}

const removeFromCart = (selectedKey: string) => {
    setCartItems(prev => prev.filter(item => item.selectedKey !== selectedKey))
}

const handleBarcodeScan = async (code: string) => {
    const trimmedCode = code.trim()
    if (!trimmedCode) return

    setScanStatus('searching')
    toast.loading(`Lendo: ${trimmedCode}...`, {
        id: 'barcode-scan',
        icon: <ScanBarcode className="w-5 h-5 text-blue-500 animate-pulse" />
    })

    try {
        const res = await api.get(`/products/barcode/${trimmedCode}`)
        if (res.data) {
            const productInfo = Array.isArray(res.data) ? res.data[0] : res.data
            await new Promise(resolve => setTimeout(resolve, 500))
            addToCart(productInfo)
            setCameraOpen(false)
            setScanStatus('success')
            toast.success(`${productInfo.name} adicionado!`, {
                id: 'barcode-scan',
                icon: '✅',
                duration: 2000
            })
            if (navigator.vibrate) navigator.vibrate(100)
            return
        }
    } catch (err) { }

    try {
        const res = await api.get('/products/', { params: { search: trimmedCode } })
        const items = res.data.items || res.data
        if (items.length === 1) {
            addToCart(items[0])
            setCameraOpen(false)
            setScanStatus('success')
            toast.success(`${items[0].name} adicionado!`, {
                id: 'barcode-scan',
                icon: '✅',
                duration: 2000
            })
            if (navigator.vibrate) navigator.vibrate(100)
            return
        } else if (items.length > 1) {
            setBarcodeInput(trimmedCode)
            setCameraOpen(false)
            setScanStatus('idle')
            toast.error('Múltiplos produtos encontrados. Refine a busca.', {
                id: 'barcode-scan',
                icon: '🔍',
                duration: 3000
            })
            return
        }
    } catch (err) {
        console.error('Erro ao processar scan:', err)
    }

    setScanStatus('error')
    toast.error(`Produto "${trimmedCode}" não localizado.`, {
        id: 'barcode-scan',
        icon: '❌',
        duration: 3000
    })
    setTimeout(() => setScanStatus('idle'), 2000)
}

const handleFinalizeRomaneio = async () => {
    if (cartItems.length === 0) return
    const errors: any[] = []
    cartItems.forEach(item => {
        const stockItem = stockLevels.find(s => s.product_id === item.id)
        if (stockItem && item.quantity > stockItem.stock_quantity) {
            errors.push({
                productName: item.name,
                available: stockItem.stock_quantity,
                requested: item.quantity,
                unit: item.unit
            })
        }
    })
    if (errors.length > 0) {
        setStockValidationError(errors)
        return
    }
    executeFinalize()
}

const executeFinalize = async () => {
    setSubmitting(true)
    try {
        const romaneioBatchId = `ROM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        const currentSubtotal = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const currentDiscountAmount = currentSubtotal * (discountPercentage / 100);
        
        for (const item of cartItems) {
            const itemTotal = item.price * item.quantity;
            const itemDiscount = currentSubtotal > 0 ? (itemTotal / currentSubtotal) * currentDiscountAmount : 0;
            
            await api.post('/inventory/movements', {
                product_id: item.id,
                quantity: item.quantity,
                movement_type: 'OUT',
                notes: customerName ? `Romaneio: ${customerName} ` : 'Não identificado pelo operador',
                romaneio_id: romaneioBatchId,
                client_id: selectedClientId,
                product_name_snapshot: item.name,
                product_barcode_snapshot: item.barcode,
                unit_price_snapshot: item.price,
                unit_snapshot: item.unit,
                discount_snapshot: Number(itemDiscount.toFixed(2))
            })
        }
        setShowExportModal(true)
        toast.success('Romaneio registrado com sucesso!')
        fetchStockLevels()
    } catch (err: any) {
        toast.error(translateError(err.response?.data?.detail) || 'Erro ao registrar movimentações do romaneio!')
    } finally {
        setSubmitting(false)
    }
}

const resetCart = () => {
    setCartItems([])
    setCustomerName('')
    setCustomerPhone(null)
    setSelectedClientId(null)
    setShowExportModal(false)
    setBarcodeInput('')
    setDiscountPercentage(0)
}

const romaneioSubtotal = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
const discountAmount = romaneioSubtotal * (discountPercentage / 100);
const romaneioTotal = romaneioSubtotal - discountAmount;

const filteredAndSortedStock = useMemo(() => {
    let result = [...stockLevels]
    if (estoqueSearch.trim()) {
        const query = estoqueSearch.toLowerCase()
        result = result.filter(s =>
            s.product_name.toLowerCase().includes(query) ||
            (s.barcode && s.barcode.toLowerCase().includes(query))
        )
    }
    return result.sort((a, b) => {
        const valA = a[estoqueSortField]
        const valB = b[estoqueSortField]
        if (valA === undefined || valB === undefined) return 0
        if (valA === null && valB !== null) return estoqueSortDirection === 'asc' ? -1 : 1
        if (valA !== null && valB === null) return estoqueSortDirection === 'asc' ? 1 : -1
        let comparison = 0
        if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB)
        } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB
        } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
            comparison = valA === valB ? 0 : valA ? -1 : 1
        }
        if (comparison !== 0) return estoqueSortDirection === 'asc' ? comparison : -comparison
        return a.product_name.localeCompare(b.product_name)
    })
}, [stockLevels, estoqueSearch, estoqueSortField, estoqueSortDirection])

const totalEstoquePages = Math.ceil(filteredAndSortedStock.length / ESTOQUE_PER_PAGE)
const currentEstoqueItems = useMemo(() => {
    const start = (estoquePage - 1) * ESTOQUE_PER_PAGE
    return filteredAndSortedStock.slice(start, start + ESTOQUE_PER_PAGE)
}, [filteredAndSortedStock, estoquePage])

return (
    <div className="pb-10">
        <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">Romaneio</h1>
            <p className="text-sm text-gray-400 mt-0.5">{loading ? 'Carregando dados...' : 'Gestão de estoque e vendas rápidas'}</p>
        </div>

        <div className="flex bg-white border border-gray-100 rounded-xl p-1 mb-6 shadow-sm max-w-fit flex-wrap gap-1">
            <button onClick={() => setActiveTab('romaneio')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${activeTab === 'romaneio' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Romaneio</button>
            <button onClick={() => setActiveTab('separacao')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all relative ${activeTab === 'separacao' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                Em Separação
                {pendingRomaneios.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                        {pendingRomaneios.length}
                    </span>
                )}
            </button>
            <button onClick={() => setActiveTab('estoque')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${activeTab === 'estoque' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Estoque</button>
        </div>

        {activeTab === 'romaneio' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px] gap-6">
                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> Montar Romaneio</h2>
                        <div className="space-y-4">
                            <div ref={clientSearchContainerRef} className="relative">
                                <label className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 block">Cliente</label>
                                <div className="flex justify-between items-end mb-1.5"><button onClick={() => setClientModalOpen(true)} className="text-[11px] font-black text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 uppercase tracking-wider"><Plus className="w-3 h-3" />Cadastrar / Novo Cliente</button></div>
                                <div className="relative">
                                    <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input type="text" placeholder="Buscar cliente..." value={customerName} onChange={(e) => handleSearchClient(e.target.value)} onFocus={() => setShowClientDropdown(true)} onKeyDown={handleClientKeyDown} className="w-full h-11 pl-10 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 font-semibold" />
                                    {showClientDropdown && (dropdownClients.length > 0 || isSearchingClient) && customerName.trim().length >= 2 && (
                                        <div ref={clientListRef} className="absolute z-40 top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                            {isSearchingClient ? <div className="p-4 text-center text-sm text-gray-400">Buscando...</div> : dropdownClients.map((client, index) => (
                                                <button key={client.id} onClick={() => selectClient(client)} className={`w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center justify-between ${activeClientIndex === index ? 'bg-slate-50 border-l-4 border-blue-500' : ''}`}><div className="min-w-0 pr-4"><p className="text-sm font-bold text-gray-900 truncate">{client.name}</p>{client.document && <p className="text-[10px] text-gray-400 font-mono truncate">{client.document}</p>}</div>{client.phone && <div className="flex items-center gap-1 text-xs text-gray-400"><Smartphone className="w-3 h-3" /><span>{client.phone}</span></div>}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div ref={productSearchContainerRef} className="relative">
                                <label className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 block">Adicionar Produto</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input type="text" placeholder="Busca por nome, código ou SKU..." value={barcodeInput} onChange={(e) => handleBarcodeSearch(e.target.value)} onKeyDown={handleProductKeyDown} className="w-full h-11 pl-10 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 font-medium" />
                                        {dropdownResults.length > 0 && barcodeInput.trim().length >= 2 && (
                                            <div ref={productListRef} className="absolute z-50 top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                {dropdownResults.map((product, index) => (
                                                    <button key={product.id} onClick={() => { addToCart(product); setBarcodeInput(''); setDropdownResults([]); }} className={`w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center gap-4 ${activeProductIndex === index ? 'bg-slate-50 border-l-4 border-blue-500' : ''}`}><div className="min-w-0 pr-4"><p className="text-sm font-semibold text-gray-900 truncate">{product.name} {(product.color || product.size) && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{[product.color, product.size].filter(Boolean).join(' • ')}</span>}</p><p className="text-[10px] text-gray-400 font-mono truncate">{product.barcode || product.sku || 'Sem Cód.'}</p></div><div className="text-right shrink-0"><p className="text-xs font-bold text-gray-700">{product.stock_quantity}</p><p className="text-[10px] text-gray-300 font-medium uppercase">{product.unit}</p></div></button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setCameraOpen(true)} className="h-11 px-4 bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all flex items-center justify-center shrink-0 gap-2 font-bold text-xs"><Camera className="w-5 h-5" /><span className="hidden sm:inline uppercase tracking-widest">Leitor</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-6 shadow-sm min-h-[300px] flex flex-col">
                        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-emerald-600" /> 
                                Itens no Carrinho
                            </span>
                            {cartItems.length > 0 && (
                                <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}
                                </span>
                            )}
                        </h2>

                        {cartItems.length === 0 ? (
                            <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl h-full flex flex-col items-center justify-center text-gray-400">
                                <ScanBarcode className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm font-semibold">Carrinho Vazio</p>
                                <p className="text-xs mt-1 px-4">Bipe os produtos ou busque manualmente.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                {cartItems.map((item, idx) => (
                                    <div key={item.selectedKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50/50 hover:bg-white border hover:border-gray-200 rounded-2xl transition-all">
                                        <div className="flex-1 min-w-0 pr-0 sm:pr-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0">{idx + 1}.</span>
                                                <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                            </div>
                                            {(item.color || item.size) && (
                                                <div className="flex flex-wrap items-center gap-1.5 ml-7 mt-0.5">
                                                    {item.color && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-700 uppercase">{item.color}</span>}
                                                    {item.size && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-700 uppercase">{item.size}</span>}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 ml-7 mt-1">
                                                <p className="text-[10px] text-gray-400 font-mono">{item.barcode || 'Sem código'}</p>
                                                <span className="text-[10px] text-gray-300">|</span>
                                                <p className="text-xs font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                            <div className="text-left sm:text-right w-24 sm:w-32 shrink-0">
                                                <p className="text-[9px] text-gray-400 uppercase font-black">Total</p>
                                                <p className="text-[14px] sm:text-[15px] font-black text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}</p>
                                            </div>
                                            <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 shadow-sm">
                                                <button 
                                                    onClick={() => { const n = Math.max(0, item.quantity - 1); if (n === 0) setItemToRemove(item.selectedKey); else updateCartQuantity(item.selectedKey, String(n), item.unit); }} 
                                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                                >
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <input 
                                                    type="number" 
                                                    step={isIntegerUnit(item.unit) ? "1" : "0.01"} 
                                                    value={item.quantity} 
                                                    onChange={(e) => updateCartQuantity(item.selectedKey, e.target.value, item.unit)} 
                                                    onBlur={() => handleQuantityBlur(item.selectedKey)} 
                                                    className="w-10 h-8 text-center text-sm font-bold text-gray-900 border-none focus:ring-0 px-0" 
                                                />
                                                <button 
                                                    onClick={() => updateCartQuantity(item.selectedKey, String(item.quantity + 1), item.unit)} 
                                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => setItemToRemove(item.selectedKey)} 
                                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                                            >
                                                <Trash2 className="w-4.5 h-4.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-col">
                    <div className="bg-slate-900 rounded-2xl p-6 shadow-xl lg:sticky lg:top-24">
                        <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Resumo
                        </h2>
                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                                <span className="text-sm text-slate-400">Cliente</span>
                                <span className="text-sm font-semibold text-white truncate max-w-[150px]">{customerName || 'Consumidor'}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                                <span className="text-sm text-slate-400">Total de Linhas</span>
                                <span className="text-sm font-bold text-white">{cartItems.length}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                                <span className="text-sm text-slate-400">Unidades Totais</span>
                                <span className="text-sm font-bold text-white">{cartItems.reduce((acc, i) => acc + i.quantity, 0)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                                <span className="text-sm font-bold text-slate-300">Subtotal</span>
                                <span className="text-sm font-black text-slate-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(romaneioSubtotal)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                                <span className="text-sm text-slate-400">Desconto {discountPercentage > 0 ? `(${discountPercentage.toFixed(2)}%)` : ''}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-red-400">
                                        {discountAmount > 0 ? `- ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountAmount)}` : 'R$ 0,00'}
                                    </span>
                                    <button
                                        onClick={() => setShowDiscountModal(true)}
                                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg transition-colors border border-slate-600"
                                    >
                                        Alterar
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pb-4">
                                <span className="text-sm font-bold text-slate-300">Valor Total</span>
                                <span className="text-xl font-black text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(romaneioTotal)}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleFinalizeRomaneio}
                                disabled={submitting || cartItems.length === 0}
                                className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                            >
                                {submitting ? 'Registrando...' : 'Finalizar Romaneio'}
                            </button>
                            <button
                                onClick={handleSavePending}
                                disabled={isSavingPending || cartItems.length === 0}
                                className="w-full h-12 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
                            >
                                {isSavingPending ? 'Salvando...' : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Salvar Separação
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {activeTab === 'separacao' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-amber-50/30">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-600" />
                            Pedidos em Separação
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Rascunhos salvos para finalizar depois</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-6 gap-6">
                    {pendingRomaneios.length === 0 ? (
                        <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-slate-300">
                            <Clock className="w-12 h-12 mb-4 opacity-10" />
                            <p className="text-sm font-bold italic">Nenhum pedido em separação no momento.</p>
                        </div>
                    ) : (
                        pendingRomaneios.map(p => (
                            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                                        <h3 className="text-sm font-black text-slate-900 truncate max-w-[180px]">
                                            {p.customer_name || 'Consumidor'}
                                        </h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</p>
                                        <p className="text-sm font-black text-blue-600">{p.items.length}</p>
                                    </div>
                                </div>

                                <div className="mb-6 space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                        <CalendarIcon className="w-3 h-3" />
                                        {new Date(p.created_at).toLocaleDateString()} às {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-gray-50">
                                    <button
                                        onClick={() => handleResumePending(p)}
                                        className="flex-1 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        Continuar
                                    </button>
                                    <button
                                        onClick={() => handleDeletePending(p.id)}
                                        className="w-10 h-10 bg-gray-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all flex items-center justify-center"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {activeTab === 'estoque' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Pesquisar no estoque (Nome, Código)..."
                            value={estoqueSearch}
                            onChange={(e) => { setEstoqueSearch(e.target.value); setEstoquePage(1); }}
                            className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 border-none cursor-pointer" onClick={() => handleSortEstoque('product_name')}>
                                    Produto {estoqueSortField === 'product_name' && (estoqueSortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 border-none">Código</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 border-none text-center cursor-pointer" onClick={() => handleSortEstoque('stock_quantity')}>
                                    Estoque {estoqueSortField === 'stock_quantity' && (estoqueSortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 border-none text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {currentEstoqueItems.map(s => (
                                <tr key={s.product_id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-slate-900">{s.product_name}</p>
                                            {(s.color || s.size) && (
                                                <div className="flex gap-1 mt-1">
                                                    {s.color && <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{s.color}</span>}
                                                    {s.size && <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{s.size}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                                        {s.barcode || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 font-bold ${s.is_low_stock ? 'text-amber-600' : 'text-slate-700'}`}>
                                            {s.stock_quantity}
                                            <span className="text-[10px] uppercase text-slate-300">{s.unit}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                                                <button
                                                    onClick={() => {
                                                        const q = parseFloat(stockQuantities[s.product_id] || '1')
                                                        const step = isIntegerUnit(s.unit) ? 1 : 0.1
                                                        setStockQuantities(p => ({ ...p, [s.product_id]: String(Math.max(step, q - step).toFixed(isIntegerUnit(s.unit) ? 0 : 2)) }))
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 rounded-md"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={stockQuantities[s.product_id] || ''}
                                                    onChange={(e) => setStockQuantities(p => ({ ...p, [s.product_id]: e.target.value }))}
                                                    placeholder="1"
                                                    className="w-10 h-7 text-center text-xs font-bold border-none focus:ring-0 px-0"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const q = parseFloat(stockQuantities[s.product_id] || '0')
                                                        const step = isIntegerUnit(s.unit) ? 1 : 0.1
                                                        setStockQuantities(p => ({ ...p, [s.product_id]: String((q + step).toFixed(isIntegerUnit(s.unit) ? 0 : 2)) }))
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 rounded-md"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const qStr = stockQuantities[s.product_id] || '1'
                                                    let q = parseFloat(qStr)
                                                    if (isNaN(q) || q <= 0) q = 1
                                                    addToCart({ id: s.product_id, name: s.product_name, barcode: s.barcode, unit: s.unit, price: s.price, color: s.color, size: s.size }, q)
                                                    toast.success('Adicionado!')
                                                    setStockQuantities(p => ({ ...p, [s.product_id]: '' }))
                                                }}
                                                className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalEstoquePages > 1 && <div className="p-6 border-t border-gray-100 flex items-center justify-between"><span className="text-xs font-bold text-gray-400">Página {estoquePage} de {totalEstoquePages}</span><div className="flex gap-2"><button onClick={() => setEstoquePage(p => Math.max(1, p - 1))} disabled={estoquePage === 1} className="h-9 px-4 rounded-xl border text-xs font-bold disabled:opacity-30">Anterior</button><button onClick={() => setEstoquePage(p => Math.min(totalEstoquePages, p + 1))} disabled={estoquePage === totalEstoquePages} className="h-9 px-4 rounded-xl border text-xs font-bold disabled:opacity-30">Próxima</button></div></div>}
            </div>
        )}

        {showExportModal && <RomaneioExportModal isOpen={showExportModal} onClose={resetCart} customerName={customerName || 'Consumidor'} customerPhone={customerPhone} clientId={selectedClientId} items={cartItems} discount={discountAmount} />}
        <DiscountCalculatorModal isOpen={showDiscountModal} subtotal={romaneioSubtotal} currentPercentage={discountPercentage} onClose={() => setShowDiscountModal(false)} onApply={(_, pct) => { setDiscountPercentage(pct); if (pct > 0) { toast.success(`Desconto de ${pct.toFixed(2)}% aplicado!`) } else { toast.success('Desconto removido!') } }} />
        <ClientModal isOpen={clientModalOpen} onClose={() => setClientModalOpen(false)} onSuccess={(newClient) => { setCustomerName(newClient.name); setSelectedClientId(newClient.id); setCustomerPhone(newClient.phone); }} />
        {cameraOpen && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setCameraOpen(false)} status={scanStatus} />}
        {stockValidationError && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setStockValidationError(null)} />
                <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-8 border-b bg-red-50/50 flex items-center gap-4"><div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0"><AlertTriangle className="w-6 h-6" /></div><div><h2 className="text-xl font-black text-red-900 tracking-tight">Estoque Baixo</h2><p className="text-xs font-bold text-red-600/60 uppercase tracking-widest mt-1">Saldo Insuficiente</p></div></div>
                    <div className="p-8 space-y-4 max-h-[300px] overflow-y-auto">{stockValidationError.map((err, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><p className="font-bold text-sm text-slate-900">{err.productName}</p><div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-wider"><span className="text-slate-400">Pedido: {err.requested}</span><span className="text-red-600">Livre: {err.available}</span></div></div>
                    ))}</div>
                    <div className="p-8 pt-0 flex flex-col gap-3"><button onClick={() => { setStockValidationError(null); executeFinalize(); }} className="w-full h-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-sm active:scale-95 transition-all">Sair Mesmo Assim</button><button onClick={() => setStockValidationError(null)} className="w-full h-14 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-sm active:scale-95 transition-all">Ajustar</button></div>
                </div>
            </div>
        )}
        {blocker.state === 'blocked' && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => blocker.reset()} />
                <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-8 pb-4 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mb-6">
                            <Clock className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Salvar Separação?</h2>
                        <p className="text-sm font-bold text-slate-500 leading-relaxed mt-2">
                            Você tem itens no carrinho. Deseja salvar como rascunho antes de sair?
                        </p>
                    </div>

                    <div className="px-8 py-2">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                {(!customerName || !customerName.trim()) ? 'Para quem é este pedido?' : 'Confirmar Nome do Cliente'}
                            </label>
                            <input
                                type="text"
                                placeholder="Nome do Cliente"
                                value={customerName || ''}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="p-8 flex flex-col gap-3">
                        <button
                            onClick={handleBlockerSave}
                            disabled={isSavingPending}
                            className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isSavingPending ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar e Sair
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => blocker.proceed()} className="h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-xs active:scale-95 transition-all">Sair sem salvar</button>
                            <button onClick={() => blocker.reset()} className="h-12 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl font-black text-xs active:scale-95 transition-all">Voltar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        <ConfirmModal isOpen={itemToRemove !== null} onClose={() => setItemToRemove(null)} onConfirm={() => { if (itemToRemove !== null) { removeFromCart(itemToRemove); setItemToRemove(null); } }} title="Remover?" message="Deseja retirar este produto?" confirmText="Sim" cancelText="Não" type="danger" />
        <ConfirmModal
            isOpen={confirmConfig.isOpen}
            onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmConfig.onConfirm}
            title={confirmConfig.title}
            message={confirmConfig.message}
            confirmText={confirmConfig.confirmText}
            cancelText={confirmConfig.cancelText}
            type={confirmConfig.type}
        />
    </div>
)
}
