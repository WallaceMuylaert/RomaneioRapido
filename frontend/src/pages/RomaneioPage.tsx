import { useState, useEffect, useRef } from 'react'
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
    Clock,
    Printer,
    HelpCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import BarcodeScanner from '../components/BarcodeScanner'
import RomaneioExportModal from '../components/RomaneioExportModal'
import type { CartItem } from '../components/RomaneioExportModal'
import { isIntegerUnit } from '../utils/units'
import ClientModal from '../components/ClientModal'
import ConfirmModal from '../components/ConfirmModal'
import DiscountCalculatorModal from '../components/DiscountCalculatorModal'
import { maskCurrency, unmaskCurrency } from '../utils/masks'
import { soundEffects } from '../utils/sounds'

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
    empenhar_estoque: boolean
    discount_percentage: number
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
    const [showDraftModal, setShowDraftModal] = useState(false)

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
    const [mobileSummaryExpanded, setMobileSummaryExpanded] = useState(false)
    const [showEmpenhoHelp, setShowEmpenhoHelp] = useState(false)

    // Estado para feedback em tempo real do scanner
    const [scanStatus, setScanStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle')

    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isAutoSavingRef = useRef(false)
    const hasInitializedRef = useRef(false)
    const isFinalizingRef = useRef(false)

    const clearAutoSaveTimer = () => {
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
            autoSaveTimerRef.current = null
        }
    }

    const waitForAutoSaveToFinish = async () => {
        for (let attempt = 0; attempt < 30 && isAutoSavingRef.current; attempt += 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
        }
    }

    // Bloqueador de Navegação do React Router (Para rotas externas)
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            cartItems.length > 0 && !showExportModal && !isFinalizingRef.current && currentLocation.pathname !== nextLocation.pathname
    );

    // Pedidos Pendentes (Separação)
    const [pendingRomaneios, setPendingRomaneios] = useState<PendingRomaneio[]>([])
    const [isSavingPending, setIsSavingPending] = useState(false)
    const [empenharAoDigitar, setEmpenharAoDigitar] = useState(true)
    const [activePendingId, setActivePendingIdState] = useState<number | null>(null)
    const activePendingIdRef = useRef<number | null>(null)

    const setActivePendingId = (value: number | null) => {
        activePendingIdRef.current = value
        setActivePendingIdState(value)
    }

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
    const [totalEstoqueItems, setTotalEstoqueItems] = useState(0)

    const handleSortEstoque = (field: keyof StockLevel) => {
        let newDir: 'asc' | 'desc' = 'asc'

        if (estoqueSortField === field) {
            newDir = estoqueSortDirection === 'asc' ? 'desc' : 'asc'
            setEstoqueSortDirection(newDir)
        } else {
            setEstoqueSortField(field)
            setEstoqueSortDirection('asc')
        }
        setEstoquePage(1)
        fetchStockLevels(1, estoqueSearch, field, newDir)
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

    const fetchStockLevels = async (p = estoquePage, search = estoqueSearch, sort = estoqueSortField, dir = estoqueSortDirection) => {
        setLoading(true)
        try {
            const skip = (p - 1) * ESTOQUE_PER_PAGE
            const res = await api.get('/inventory/stock-levels', {
                params: {
                    skip,
                    limit: ESTOQUE_PER_PAGE,
                    search: search,
                    sort_by: sort,
                    order: dir
                }
            })
            setStockLevels(res.data.items)
            setTotalEstoqueItems(res.data.total)
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

    const handleCancelRomaneio = () => {
        setConfirmConfig({
            isOpen: true,
            title: 'Cancelar Romaneio?',
            message: 'Todo o progresso será perdido e o estoque empenhado será devolvido. Continuar?',
            type: 'danger',
            confirmText: 'Sim, Cancelar',
            cancelText: 'Voltar',
            onConfirm: async () => {
                if (activePendingId) {
                    try {
                        await api.delete(`/pending/${activePendingId}`)
                        setActivePendingId(null)
                    } catch (err) {
                        console.error('Erro ao deletar rascunho no cancelamento:', err);
                    }
                }
                resetCart();
                toast.success('Romaneio cancelado com sucesso!', { id: 'cancel-romaneio' });
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    }

    const handleSavePending = async () => {
        if (cartItems.length === 0) {
            toast.error('Adicione itens ao romaneio primeiro', { id: 'romaneio-error' })
            return
        }

        if (!customerName || !customerName.trim()) {
            toast.error('Por favor, informe o nome do cliente para salvar a separação', { id: 'romaneio-error' })
            return
        }

        setIsSavingPending(true)
        try {
            const payload = {
                client_id: selectedClientId,
                customer_name: customerName,
                customer_phone: customerPhone,
                empenhar_estoque: empenharAoDigitar,
                discount_percentage: discountPercentage,
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
            };

            if (activePendingId) {
                await api.put(`/pending/${activePendingId}`, payload);
                toast.success('Separação atualizada!', { id: 'save-pending' });
            } else {
                const res = await api.post('/pending/', payload);
                setActivePendingId(res.data.id);
                toast.success('Pedido salvo em separação!', { id: 'save-pending' });
            }

            resetCart()
            fetchPendingRomaneios()
            setActiveTab('separacao')
        } catch (err: any) {
            toast.error(translateError(err), { id: 'romaneio-error' })
        } finally {
            setIsSavingPending(false)
        }
    }

    const handleBlockerSave = async () => {
        // Interromper qualquer auto-save agendado para rodar o manual agora
        clearAutoSaveTimer()

        await handleSavePending();
        blocker.proceed?.();
    }

    const handleDiscardAndExit = async () => {
        // Interromper auto-save
        clearAutoSaveTimer()

        try {
            // Se houver rascunho salvo no banco, deletamos para descarte real
            if (activePendingId) {
                await api.delete(`/pending/${activePendingId}`);
            }
            resetCart();
            blocker.proceed?.();
        } catch (err) {
            console.error('Erro ao descartar rascunho na saída:', err);
            // Procede de qualquer forma para não travar o usuário
            blocker.proceed?.();
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
            setDiscountPercentage(pending.discount_percentage || 0)

            try {
                // Ao retomar, não deletamos imediatamente. Mantemos o ID ativo para que o auto-save sobrescreva o mesmo registro.
                setActivePendingId(pending.id)
                // Sincronizamos o estado do toggle de empenho com o que estava no rascunho
                setEmpenharAoDigitar(!!pending.empenhar_estoque)
            } catch (err) {
                console.error('Erro ao remover rascunho ao retomar:', err)
            }

            setActiveTab('romaneio')
            toast.success('Rascunho carregado!', { id: 'resume-pending' })
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
                // Cancelar auto-save imediatamente para evitar recriação fantasma
                clearAutoSaveTimer()

                try {
                    await api.delete(`/pending/${id}`)
                    setPendingRomaneios(p => p.filter(x => x.id !== id))
                    
                    // Se o rascunho deletado for o ativo, limpa o carrinho
                    if (id === activePendingId) {
                        resetCart();
                    }
                    
                    toast.success('Rascunho excluído', { id: 'delete-pending' })
                } catch (err) {
                    toast.error('Erro ao excluir rascunho', { id: 'romaneio-error' })
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                }
            }
        })
    }

    useEffect(() => {
        fetchStockLevels()

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
                    toast.success('Dados do romaneio retomados!', { id: 'romaneio-resume' })
                    sessionStorage.removeItem('copy_romaneio_data')
                    hasInitializedRef.current = true
                    fetchPendingRomaneios()
                    return // Prioridade para dados copiados
                }
            } catch (err) {
                console.error('Erro ao parsear dados copiados:', err)
            }
        }

        // Recuperar rascunho ativo do banco de dados
        const initFromDb = async () => {
            try {
                const res = await api.get('/pending/')
                const pendings: PendingRomaneio[] = res.data
                setPendingRomaneios(pendings)
            } catch (err) {
                console.error('Erro ao buscar rascunhos:', err)
            } finally {
                hasInitializedRef.current = true
            }
        }
        initFromDb()
    }, [])

    useEffect(() => {
        if (activeTab === 'estoque') {
            setEstoquePage(1)
            setEstoqueSearch('')
            fetchStockLevels(1, '')
        }
    }, [activeTab])

    // Debounce para busca no estoque
    useEffect(() => {
        if (activeTab !== 'estoque' || !hasInitializedRef.current) return

        const timeout = setTimeout(() => {
            fetchStockLevels(1, estoqueSearch)
            setEstoquePage(1)
        }, 400)

        return () => clearTimeout(timeout)
    }, [estoqueSearch])

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (cartItems.length > 0 && !showExportModal && !isFinalizingRef.current) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [cartItems, showExportModal])




    // Auto-save no banco de dados com debounce de 3s
    useEffect(() => {
        if (!hasInitializedRef.current) return;

        // Limpar timer anterior
        clearAutoSaveTimer()

        // Se carrinho estiver vazio, não faz auto-save
        if (cartItems.length === 0) return;
        if (submitting || showExportModal || isFinalizingRef.current) return;

        autoSaveTimerRef.current = setTimeout(async () => {
            if (submitting || showExportModal || isFinalizingRef.current) return;
            if (isAutoSavingRef.current) return;
            isAutoSavingRef.current = true;

            try {
                const payload = {
                    client_id: selectedClientId,
                    customer_name: customerName || 'Rascunho Auto-Save',
                    customer_phone: customerPhone,
                    empenhar_estoque: empenharAoDigitar,
                    discount_percentage: discountPercentage,
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
                };

                if (activePendingId) {
                    await api.put(`/pending/${activePendingId}`, payload);
                } else {
                    const res = await api.post('/pending/', payload);
                    setActivePendingId(res.data.id);
                }
            } catch (err) {
                console.error('Erro no auto-save:', err);
            } finally {
                isAutoSavingRef.current = false;
            }
        }, 3000);

        return () => {
            clearAutoSaveTimer()
        };
    }, [cartItems, customerName, customerPhone, selectedClientId, empenharAoDigitar, discountPercentage, activePendingId, submitting, showExportModal]);


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
            id: 'add-to-cart-toast',
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

    const updateCartPrice = (selectedKey: string, priceStr: string) => {
        const val = unmaskCurrency(priceStr)
        setCartItems(prev => prev.map(item => item.selectedKey === selectedKey ? { ...item, price: val } : item))
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
            icon: <ScanBarcode className="w-5 h-5 text-brand-500 animate-pulse" />
        })

        try {
            const res = await api.get(`/products/barcode/${trimmedCode}`)
            if (res.data) {
                const productInfo = Array.isArray(res.data) ? res.data[0] : res.data
                await new Promise(resolve => setTimeout(resolve, 500))
                addToCart(productInfo)
                setCameraOpen(false)
                setScanStatus('success')
                soundEffects.playScan()
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
                soundEffects.playScan()
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
        const requestedByProduct = cartItems.reduce((acc, item) => {
            acc[item.id] = (acc[item.id] || 0) + item.quantity
            return acc
        }, {} as Record<number, number>)

        Object.entries(requestedByProduct).forEach(([productId, requested]) => {
            const numericProductId = Number(productId)
            const item = cartItems.find(i => i.id === numericProductId)
            const stockItem = stockLevels.find(s => s.product_id === numericProductId)
            const reservedInActiveDraft = activePendingId && empenharAoDigitar ? requested : 0
            const available = (stockItem?.stock_quantity || 0) + reservedInActiveDraft

            if (item && stockItem && requested > available) {
                errors.push({
                    productName: item.name,
                    available,
                    requested,
                    unit: item.unit
                })
            }
        })
        if (errors.length > 0) {
            setStockValidationError(errors)
            return
        }
        executeFinalize(false)
    }

    const executeFinalize = async (allowNegativeStock = false) => {
        clearAutoSaveTimer()
        isFinalizingRef.current = true
        setSubmitting(true)
        let finalizedSuccessfully = false
        try {
            await waitForAutoSaveToFinish()
            const pendingIdToFinalize = activePendingIdRef.current

            await api.post('/inventory/romaneios/finalize', {
                customer_name: customerName || null,
                client_id: selectedClientId,
                pending_romaneio_id: pendingIdToFinalize,
                discount_percentage: discountPercentage,
                allow_negative_stock: allowNegativeStock,
                items: cartItems.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    product_name_snapshot: item.name,
                    product_barcode_snapshot: item.barcode,
                    unit_price_snapshot: item.price,
                    unit_snapshot: item.unit,
                    product_color_snapshot: item.color,
                    product_size_snapshot: item.size
                }))
            })

            setActivePendingId(null)
            setShowExportModal(true)
            soundEffects.playSuccess()
            toast.success('Romaneio registrado com sucesso!', { id: 'finalize-romaneio' })
            fetchStockLevels()
            fetchPendingRomaneios() // Atualiza a lista de separações para garantir que o rascunho sumiu
            finalizedSuccessfully = true
        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao registrar movimentações do romaneio!', { id: 'romaneio-error' })
        } finally {
            if (!finalizedSuccessfully) {
                isFinalizingRef.current = false
            }
            setSubmitting(false)
        }
    }

    const resetCart = () => {
        // Cancelar qualquer auto-save pendente antes de resetar
        clearAutoSaveTimer()
        setCartItems([])
        setCustomerName('')
        setCustomerPhone(null)
        setSelectedClientId(null)
        setShowExportModal(false)
        setBarcodeInput('')
        setDiscountPercentage(0)
        setActivePendingId(null)
        setEmpenharAoDigitar(true) // Reset para o padrão seguro
        isAutoSavingRef.current = false;
        isFinalizingRef.current = false;
    }

    const romaneioSubtotal = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const discountAmount = romaneioSubtotal * (discountPercentage / 100);
    const romaneioTotal = romaneioSubtotal - discountAmount;

    const totalEstoquePages = Math.ceil(totalEstoqueItems / ESTOQUE_PER_PAGE)
    const currentEstoqueItems = stockLevels

    return (
        <div className="pb-32 lg:pb-10">
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl font-bold text-text-primary">Romaneio</h1>
                <p className="text-sm text-text-secondary mt-0.5">{loading ? 'Carregando dados...' : 'Gestão de estoque e vendas rápidas'}</p>
            </div>

            <div className="grid grid-cols-3 bg-card border border-border rounded-xl p-1 mb-4 sm:mb-6 shadow-sm w-full sm:flex sm:max-w-fit gap-1">
                <button onClick={() => setActiveTab('romaneio')} className={`px-2 sm:px-4 py-2 sm:py-1.5 text-[11px] sm:text-[13px] font-semibold rounded-lg transition-all ${activeTab === 'romaneio' ? 'bg-primary text-card shadow-sm' : 'text-text-secondary hover:text-text-secondary'}`}>Romaneio</button>
                <button onClick={() => setActiveTab('separacao')} className={`px-2 sm:px-4 py-2 sm:py-1.5 text-[11px] sm:text-[13px] font-semibold rounded-lg transition-all relative ${activeTab === 'separacao' ? 'bg-warning text-card shadow-sm' : 'text-text-secondary hover:text-text-secondary'}`}>
                    Em Separação
                    {pendingRomaneios.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-card text-[10px] flex items-center justify-center rounded-full border-2 border-card animate-pulse">
                            {pendingRomaneios.length}
                        </span>
                    )}
                </button>
                <button onClick={() => setActiveTab('estoque')} className={`px-2 sm:px-4 py-2 sm:py-1.5 text-[11px] sm:text-[13px] font-semibold rounded-lg transition-all ${activeTab === 'estoque' ? 'bg-primary text-card shadow-sm' : 'text-text-secondary hover:text-text-secondary'}`}>Estoque</button>
            </div>

            {activeTab === 'romaneio' && (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px] gap-6">
                    <div className="flex flex-col gap-6">
                        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3 border-b border-border pb-3 mb-4">
                                <h2 className="text-sm font-black text-text-primary flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Montar Romaneio</h2>
                                <div className="flex items-center gap-2">
                                    <div className="group relative flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => setShowEmpenhoHelp((value) => !value)}
                                            onBlur={() => setShowEmpenhoHelp(false)}
                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary/60 transition-colors hover:bg-background hover:text-brand-500"
                                            aria-label="Explicar empenho de estoque"
                                            aria-expanded={showEmpenhoHelp}
                                        >
                                            <HelpCircle className="w-3.5 h-3.5" />
                                        </button>
                                        <div className={`absolute bottom-full right-0 mb-2 w-48 p-2 bg-text-primary/90 text-card text-[10px] leading-relaxed rounded-lg transition-opacity pointer-events-none z-[100] shadow-2xl text-center ${showEmpenhoHelp ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            <p className="font-bold mb-1 text-blue-300">Reserva em Tempo Real</p>
                                            Ao ativar, o estoque é reduzido imediatamente ao adicionar itens. Se cancelar, o estoque volta.
                                            <div className="absolute top-full right-3 border-8 border-transparent border-t-slate-800"></div>
                                        </div>
                                    </div>
                                    <span className={`hidden sm:inline text-[10px] font-black uppercase tracking-wider ${empenharAoDigitar ? 'text-primary' : 'text-text-secondary'}`}>
                                        {empenharAoDigitar ? 'Empenho Ativo' : 'Empenho Desativado'}
                                    </span>
                                    <button
                                        onClick={() => setEmpenharAoDigitar(!empenharAoDigitar)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${empenharAoDigitar ? 'bg-primary' : 'bg-border'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${empenharAoDigitar ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                <div ref={clientSearchContainerRef} className="relative">
                                    <div className="mb-2 flex h-7 items-center justify-between gap-3">
                                        <label className="text-text-secondary text-[10px] font-black uppercase tracking-[0.12em] block">Cliente</label>
                                        <button onClick={() => setClientModalOpen(true)} className="text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 uppercase tracking-wider border border-emerald-100"><Plus className="w-3 h-3" />Novo</button>
                                    </div>
                                    <div className="relative">
                                        <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/60" />
                                        <input type="text" placeholder="Buscar cliente..." value={customerName} onChange={(e) => handleSearchClient(e.target.value)} onFocus={() => setShowClientDropdown(true)} onKeyDown={handleClientKeyDown} className="w-full h-11 pl-10 pr-4 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-text-primary font-semibold" />
                                        {showClientDropdown && (dropdownClients.length > 0 || isSearchingClient) && customerName.trim().length >= 2 && (
                                            <div ref={clientListRef} className="absolute z-40 top-[calc(100%+8px)] left-0 right-0 bg-card border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                                {isSearchingClient ? <div className="p-4 text-center text-sm text-text-secondary">Buscando...</div> : dropdownClients.map((client, index) => (
                                                    <button key={client.id} onClick={() => selectClient(client)} className={`w-full px-5 py-3 text-left hover:bg-background flex items-center justify-between ${activeClientIndex === index ? 'bg-background border-l-4 border-brand-500' : ''}`}><div className="min-w-0 pr-4"><p className="text-sm font-bold text-text-primary truncate">{client.name}</p>{client.document && <p className="text-[10px] text-text-secondary font-mono truncate">{client.document}</p>}</div>{client.phone && <div className="flex items-center gap-1 text-xs text-text-secondary"><Smartphone className="w-3 h-3" /><span>{client.phone}</span></div>}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div ref={productSearchContainerRef} className="relative">
                                    <div className="mb-2 flex h-7 items-center justify-between gap-3">
                                        <label className="text-text-secondary text-[10px] font-black uppercase tracking-[0.12em] block">Adicionar Produto</label>
                                        <span className={`sm:hidden text-[10px] font-black uppercase ${empenharAoDigitar ? 'text-primary' : 'text-text-secondary'}`}>
                                            {empenharAoDigitar ? 'Empenho ativo' : 'Sem empenho'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div className="relative flex-1">
                                            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/60" />
                                            <input type="text" placeholder="Busca por nome, código ou SKU..." value={barcodeInput} onChange={(e) => handleBarcodeSearch(e.target.value)} onKeyDown={handleProductKeyDown} className="w-full h-11 pl-10 pr-4 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-text-primary font-medium" />
                                            {dropdownResults.length > 0 && barcodeInput.trim().length >= 2 && (
                                                <div ref={productListRef} className="absolute z-50 top-[calc(100%+8px)] left-0 right-0 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                    {dropdownResults.map((product, index) => (
                                                        <button key={product.id} onClick={() => { addToCart(product); setBarcodeInput(''); setDropdownResults([]); }} className={`w-full px-5 py-3 text-left hover:bg-background flex items-center gap-4 ${activeProductIndex === index ? 'bg-background border-l-4 border-brand-500' : ''}`}><div className="min-w-0 pr-4"><p className="text-sm font-semibold text-text-primary truncate">{product.name} {(product.color || product.size) && <span className="ml-2 text-[10px] bg-border/50 text-text-secondary px-1.5 py-0.5 rounded-md">{[product.color, product.size].filter(Boolean).join(' • ')}</span>}</p><p className="text-[10px] text-text-secondary font-mono truncate">{product.barcode || product.sku || 'Sem Cód.'}</p></div><div className="text-right shrink-0"><p className="text-xs font-bold text-text-secondary">{product.stock_quantity}</p><p className="text-[10px] text-text-secondary/60 font-medium uppercase">{product.unit}</p></div></button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setCameraOpen(true)} className="h-11 sm:w-12 px-4 sm:px-0 bg-brand-50 border border-brand-100 text-primary hover:bg-primary hover:text-card rounded-xl transition-all flex items-center justify-center shrink-0 gap-2 font-bold text-xs" title="Escanear código"><Camera className="w-5 h-5" /><span className="sm:hidden uppercase tracking-widest">Escanear</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-card rounded-3xl border border-border p-4 sm:p-6 shadow-sm min-h-[300px] flex flex-col">
                            <h2 className="text-sm font-bold text-text-primary mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-emerald-600" />
                                    Itens no Carrinho
                                </span>
                                {cartItems.length > 0 && (
                                    <span className="bg-brand-100 text-primary-dark font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                        {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}
                                    </span>
                                )}
                            </h2>

                            {cartItems.length === 0 ? (
                                <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl h-full flex flex-col items-center justify-center text-text-secondary">
                                    <ScanBarcode className="w-10 h-10 mb-3 opacity-20" />
                                    <p className="text-sm font-semibold">Carrinho Vazio</p>
                                    <p className="text-xs mt-1 px-4">Bipe os produtos ou busque manualmente.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 sm:space-y-3 overflow-y-auto max-h-[500px] sm:pr-2 custom-scrollbar">
                                    {cartItems.map((item, idx) => (
                                        <div key={item.selectedKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 bg-background/50 hover:bg-card border hover:border-border rounded-2xl transition-all">
                                            <div className="flex-1 min-w-0 pr-0 sm:pr-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-text-secondary w-5 shrink-0">{idx + 1}.</span>
                                                    <p className="text-sm font-bold text-text-primary line-clamp-2 sm:truncate">{item.name}</p>
                                                </div>
                                                {(item.color || item.size) && (
                                                    <div className="flex flex-wrap items-center gap-1.5 ml-7 mt-0.5">
                                                        {item.color && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-border text-text-secondary uppercase">{item.color}</span>}
                                                        {item.size && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-border text-text-secondary uppercase">{item.size}</span>}
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-7 mt-1">
                                                    <p className="text-[10px] text-text-secondary font-mono">{item.barcode || 'Sem código'}</p>
                                                    <span className="text-[10px] text-text-secondary/60">|</span>
                                                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100/50 rounded-lg px-2 py-0.5 group/price hover:border-emerald-200 transition-all shadow-sm">
                                                        <span className="text-[10px] font-bold text-emerald-600/60 uppercase">R$</span>
                                                        <input
                                                            type="text"
                                                            value={maskCurrency(item.price)}
                                                            onChange={(e) => updateCartPrice(item.selectedKey, e.target.value)}
                                                            onFocus={(e) => e.target.select()}
                                                            inputMode="numeric"
                                                            className="w-20 h-5 bg-transparent border-none focus:ring-0 p-0 text-xs font-black text-emerald-600"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-[1fr_auto_auto] sm:flex sm:items-center sm:justify-end gap-2 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                                                <div className="text-left sm:text-right min-w-0 sm:w-32 shrink-0">
                                                    <p className="text-[9px] text-text-secondary uppercase font-black">Total</p>
                                                    <p className="text-[13px] sm:text-[15px] font-black text-text-primary truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}</p>
                                                </div>
                                                <div className="flex items-center bg-card border border-border rounded-xl p-0.5 shadow-sm">
                                                    <button
                                                        onClick={() => { const n = Math.max(0, item.quantity - 1); if (n === 0) setItemToRemove(item.selectedKey); else updateCartQuantity(item.selectedKey, String(n), item.unit); }}
                                                        className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-error rounded-lg transition-colors"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        step={isIntegerUnit(item.unit) ? "1" : "0.01"}
                                                        value={item.quantity}
                                                        onChange={(e) => updateCartQuantity(item.selectedKey, e.target.value, item.unit)}
                                                        onBlur={() => handleQuantityBlur(item.selectedKey)}
                                                        className="w-10 h-8 text-center text-sm font-bold text-text-primary border-none focus:ring-0 px-0"
                                                    />
                                                    <button
                                                        onClick={() => updateCartQuantity(item.selectedKey, String(item.quantity + 1), item.unit)}
                                                        className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-primary rounded-lg transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => setItemToRemove(item.selectedKey)}
                                                    className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-error hover:bg-error/10 rounded-xl transition-all active:scale-90"
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
                    <div className="hidden lg:flex flex-col">
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:sticky lg:top-24">
                            <h2 className="text-base font-black text-text-primary mb-6 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-success" /> Resumo
                            </h2>
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center pb-4 border-b border-border">
                                    <span className="text-sm font-semibold text-text-secondary">Cliente</span>
                                    <span className="text-sm font-bold text-text-primary truncate max-w-[150px]">{customerName || 'Consumidor'}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-border">
                                    <span className="text-sm font-semibold text-text-secondary">Total de Linhas</span>
                                    <span className="text-sm font-black text-text-primary">{cartItems.length}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-border">
                                    <span className="text-sm font-semibold text-text-secondary">Unidades Totais</span>
                                    <span className="text-sm font-black text-text-primary">{cartItems.reduce((acc, i) => acc + i.quantity, 0)}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-border">
                                    <span className="text-sm font-semibold text-text-secondary">Subtotal</span>
                                    <span className="text-sm font-black text-text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(romaneioSubtotal)}</span>
                                </div>

                                <div className="flex justify-between items-center pb-4 border-b border-border">
                                    <span className="text-sm font-semibold text-text-secondary">Desconto {discountPercentage > 0 ? `(${discountPercentage.toFixed(2)}%)` : ''}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-error">
                                            {discountAmount > 0 ? `- ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountAmount)}` : 'R$ 0,00'}
                                        </span>
                                        <button
                                            onClick={() => setShowDiscountModal(true)}
                                            className="px-2 py-1 bg-background hover:bg-border/50 text-xs font-bold text-text-secondary rounded-lg transition-colors border border-border"
                                        >
                                            Alterar
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pb-4">
                                    <span className="text-sm font-black text-text-primary">Valor Total</span>
                                    <span className="text-xl font-black text-success">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(romaneioTotal)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleFinalizeRomaneio}
                                    disabled={submitting || cartItems.length === 0}
                                    className="w-full h-12 bg-primary hover:bg-primary-dark disabled:bg-border disabled:text-text-secondary text-card font-black rounded-xl transition-all shadow-md shadow-primary/20 active:scale-[0.98]"
                                >
                                    {submitting ? 'Registrando...' : 'Finalizar Romaneio'}
                                </button>
                                <button
                                    onClick={() => setShowDraftModal(true)}
                                    disabled={cartItems.length === 0}
                                    className="w-full h-12 bg-card hover:bg-background disabled:opacity-50 text-text-secondary font-bold rounded-xl border border-border transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <Printer className="w-4 h-4" />
                                    Imprimir Rascunho
                                </button>
                                <button
                                    onClick={handleSavePending}
                                    disabled={isSavingPending || cartItems.length === 0}
                                    className="w-full h-12 bg-warning/10 hover:bg-warning/20 disabled:opacity-50 text-warning font-bold rounded-xl border border-warning/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    {isSavingPending ? 'Salvando...' : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Salvar Separação
                                        </>
                                    )}
                                </button>
                                {cartItems.length > 0 && (
                                    <button
                                        onClick={handleCancelRomaneio}
                                        className="w-full h-12 bg-error/10 hover:bg-error/20 text-error font-bold rounded-xl border border-error/30 transition-all flex items-center justify-center gap-2 mt-2 active:scale-[0.98]"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Cancelar Romaneio
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 backdrop-blur lg:hidden">
                    <div className="mx-auto max-w-lg">
                        {mobileSummaryExpanded && (
                            <div className="mb-3 rounded-2xl border border-border bg-background p-3">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold text-text-secondary">Cliente</span>
                                        <span className="truncate text-xs font-bold text-text-primary">{customerName || 'Consumidor'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-xl bg-card p-2">
                                            <p className="text-[9px] font-black uppercase text-text-secondary">Linhas</p>
                                            <p className="text-sm font-black text-text-primary">{cartItems.length}</p>
                                        </div>
                                        <div className="rounded-xl bg-card p-2">
                                            <p className="text-[9px] font-black uppercase text-text-secondary">Unidades</p>
                                            <p className="text-sm font-black text-text-primary">{cartItems.reduce((acc, i) => acc + i.quantity, 0)}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1 border-t border-border pt-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs text-text-secondary">Subtotal</span>
                                            <span className="text-xs font-bold text-text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(romaneioSubtotal)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs text-text-secondary">Desconto {discountPercentage > 0 ? `(${discountPercentage.toFixed(2)}%)` : ''}</span>
                                            <button
                                                type="button"
                                                onClick={() => setShowDiscountModal(true)}
                                                className="text-xs font-bold text-error"
                                            >
                                                {discountAmount > 0 ? `- ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountAmount)}` : 'R$ 0,00'}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 pt-1">
                                            <span className="text-sm font-black text-text-primary">Valor Total</span>
                                            <span className="text-base font-black text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(romaneioTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mb-2 grid grid-cols-[1fr_auto_auto] items-end">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
                                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'} / {cartItems.reduce((acc, i) => acc + i.quantity, 0)} un.
                                </p>
                                <p className="truncate text-xl font-black text-text-primary">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(romaneioTotal)}
                                </p>
                            </div>
                            {discountAmount > 0 && (
                                <button
                                    onClick={() => setShowDiscountModal(true)}
                                    className="h-9 rounded-xl border border-error/20 bg-error/10 px-3 text-xs font-bold text-error"
                                >
                                    -{discountPercentage.toFixed(0)}%
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setMobileSummaryExpanded((value) => !value)}
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-text-secondary"
                                aria-label={mobileSummaryExpanded ? 'Recolher resumo' : 'Expandir resumo'}
                                title={mobileSummaryExpanded ? 'Recolher resumo' : 'Expandir resumo'}
                            >
                                {mobileSummaryExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </button>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
                            <button
                                onClick={handleFinalizeRomaneio}
                                disabled={submitting || cartItems.length === 0}
                                className="h-11 rounded-xl bg-primary px-4 text-sm font-bold text-card transition-all disabled:bg-border disabled:text-text-secondary"
                            >
                                {submitting ? 'Registrando...' : 'Finalizar'}
                            </button>
                            <button
                                onClick={() => setShowDiscountModal(true)}
                                disabled={cartItems.length === 0}
                                className="h-11 w-11 rounded-xl border border-border bg-card text-xs font-black text-text-secondary disabled:opacity-40"
                                title="Desconto"
                            >
                                %
                            </button>
                            <button
                                onClick={handleSavePending}
                                disabled={isSavingPending || cartItems.length === 0}
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-warning/30 bg-warning/10 text-warning disabled:opacity-40"
                                title="Salvar separação"
                            >
                                <Save className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setShowDraftModal(true)}
                                disabled={cartItems.length === 0}
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-primary disabled:opacity-40"
                                title="Imprimir rascunho"
                            >
                                <Printer className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
                </>
            )}
            {activeTab === 'separacao' && (
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden min-h-[400px]">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-warning/10/30">
                        <div>
                            <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                                <Clock className="w-5 h-5 text-warning" />
                                Pedidos em Separação
                            </h2>
                            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mt-1">Rascunhos salvos para finalizar depois</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-6 gap-6">
                        {pendingRomaneios.length === 0 ? (
                            <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-text-secondary/60">
                                <Clock className="w-12 h-12 mb-4 opacity-10" />
                                <p className="text-sm font-bold italic">Nenhum pedido em separação no momento.</p>
                            </div>
                        ) : (
                            pendingRomaneios.map(p => (
                                <div key={p.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:border-warning/30 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Cliente</p>
                                            <h3 className="text-sm font-black text-text-primary truncate max-w-[180px]">
                                                {p.customer_name || 'Consumidor'}
                                            </h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Itens</p>
                                            <p className="text-sm font-black text-primary">{p.items.length}</p>
                                        </div>
                                    </div>

                                    <div className="mb-6 space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(p.created_at).toLocaleDateString()} às {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-gray-50">
                                        <button
                                            onClick={() => {
                                                setCartItems(p.items.map(i => ({
                                                    selectedKey: `${i.product_id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                                    id: i.product_id,
                                                    name: i.name,
                                                    barcode: i.barcode,
                                                    quantity: i.quantity,
                                                    unit: i.unit,
                                                    price: i.price,
                                                    color: i.color,
                                                    size: i.size
                                                })))
                                                setCustomerName(p.customer_name || '')
                                                setCustomerPhone(p.customer_phone)
                                                setSelectedClientId(p.client_id)
                                                setDiscountPercentage(0)
                                                setShowDraftModal(true)
                                            }}
                                            className="h-10 bg-card border border-border text-text-secondary hover:bg-background px-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                                            title="Imprimir Rascunho"
                                        >
                                            <Printer className="w-4 h-4 text-brand-500" />
                                        </button>
                                        <button
                                            onClick={() => handleResumePending(p)}
                                            className="flex-1 h-10 bg-primary hover:bg-brand-500 text-card rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200"
                                        >
                                            Continuar
                                        </button>
                                        <button
                                            onClick={() => handleDeletePending(p.id)}
                                            className="w-10 h-10 bg-background hover:bg-error/10 text-text-secondary hover:text-error rounded-xl transition-all flex items-center justify-center"
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
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border bg-background/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/60" />
                            <input
                                type="text"
                                placeholder="Pesquisar no estoque (Nome, Código)..."
                                value={estoqueSearch}
                                onChange={(e) => { setEstoqueSearch(e.target.value); setEstoquePage(1); }}
                                className="w-full h-11 pl-10 pr-4 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="grid min-w-0 gap-3 p-3 sm:p-4 md:hidden">
                        {currentEstoqueItems.map(s => (
                            <div key={s.product_id} className="min-w-0 rounded-2xl border border-border bg-card p-3">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="line-clamp-2 text-sm font-black text-text-primary">{s.product_name}</p>
                                        <p className="mt-1 truncate font-mono text-[10px] text-text-secondary">{s.barcode || 'Sem código'}</p>
                                        {(s.color || s.size) && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {s.color && <span className="rounded bg-border/50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-text-secondary">{s.color}</span>}
                                                {s.size && <span className="rounded bg-border/50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-text-secondary">{s.size}</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-[9px] font-black uppercase text-text-secondary">Estoque</p>
                                        <p className={`text-sm font-black ${s.is_low_stock ? 'text-warning' : 'text-text-primary'}`}>
                                            {s.stock_quantity} <span className="text-[10px] uppercase text-text-secondary/60">{s.unit}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="grid min-w-0 grid-cols-1 gap-2 border-t border-border pt-3 min-[380px]:grid-cols-[minmax(0,1fr)_auto]">
                                    <div className="flex min-w-0 items-center justify-center rounded-xl border border-border bg-card p-0.5">
                                        <button
                                            onClick={() => {
                                                const q = parseFloat(stockQuantities[s.product_id] || '1')
                                                const step = isIntegerUnit(s.unit) ? 1 : 0.1
                                                setStockQuantities(p => ({ ...p, [s.product_id]: String(Math.max(step, q - step).toFixed(isIntegerUnit(s.unit) ? 0 : 2)) }))
                                            }}
                                            className="flex h-9 w-10 items-center justify-center rounded-lg text-text-secondary hover:text-primary"
                                        >
                                            <Minus className="h-3.5 w-3.5" />
                                        </button>
                                        <input
                                            type="number"
                                            value={stockQuantities[s.product_id] || ''}
                                            onChange={(e) => setStockQuantities(p => ({ ...p, [s.product_id]: e.target.value }))}
                                            placeholder="1"
                                            className="h-9 min-w-0 flex-1 border-none px-0 text-center text-sm font-bold focus:ring-0"
                                        />
                                        <button
                                            onClick={() => {
                                                const q = parseFloat(stockQuantities[s.product_id] || '0')
                                                const step = isIntegerUnit(s.unit) ? 1 : 0.1
                                                setStockQuantities(p => ({ ...p, [s.product_id]: String((q + step).toFixed(isIntegerUnit(s.unit) ? 0 : 2)) }))
                                            }}
                                            className="flex h-9 w-10 items-center justify-center rounded-lg text-text-secondary hover:text-primary"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const qStr = stockQuantities[s.product_id] || '1'
                                            let q = parseFloat(qStr)
                                            if (isNaN(q) || q <= 0) q = 1
                                            addToCart({ id: s.product_id, name: s.product_name, barcode: s.barcode, unit: s.unit, price: s.price, color: s.color, size: s.size }, q)
                                            setStockQuantities(p => ({ ...p, [s.product_id]: '' }))
                                            setActiveTab('romaneio')
                                        }}
                                        className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-card transition-all active:scale-95 min-[380px]:w-32"
                                    >
                                        <Plus className="h-4 w-4 shrink-0" />
                                        <span className="truncate">Adicionar</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-background/80 border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-text-secondary border-none cursor-pointer" onClick={() => handleSortEstoque('product_name')}>
                                        Produto {estoqueSortField === 'product_name' && (estoqueSortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-secondary border-none">Código</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-secondary border-none text-center cursor-pointer" onClick={() => handleSortEstoque('stock_quantity')}>
                                        Estoque {estoqueSortField === 'stock_quantity' && (estoqueSortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-secondary border-none text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {currentEstoqueItems.map(s => (
                                    <tr key={s.product_id} className="hover:bg-background/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-text-primary">{s.product_name}</p>
                                                {(s.color || s.size) && (
                                                    <div className="flex gap-1 mt-1">
                                                        {s.color && <span className="text-[9px] font-bold bg-border/50 text-text-secondary px-1.5 py-0.5 rounded uppercase">{s.color}</span>}
                                                        {s.size && <span className="text-[9px] font-bold bg-border/50 text-text-secondary px-1.5 py-0.5 rounded uppercase">{s.size}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-text-secondary">
                                            {s.barcode || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 font-bold ${s.is_low_stock ? 'text-warning' : 'text-text-secondary'}`}>
                                                {s.stock_quantity}
                                                <span className="text-[10px] uppercase text-text-secondary/60">{s.unit}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="flex items-center bg-card border border-border rounded-lg p-0.5 shadow-sm">
                                                    <button
                                                        onClick={() => {
                                                            const q = parseFloat(stockQuantities[s.product_id] || '1')
                                                            const step = isIntegerUnit(s.unit) ? 1 : 0.1
                                                            setStockQuantities(p => ({ ...p, [s.product_id]: String(Math.max(step, q - step).toFixed(isIntegerUnit(s.unit) ? 0 : 2)) }))
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-primary rounded-md"
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
                                                        className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-primary rounded-md"
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
                                                        setStockQuantities(p => ({ ...p, [s.product_id]: '' }))
                                                    }}
                                                    className="w-9 h-9 flex items-center justify-center bg-primary text-card rounded-lg hover:bg-primary-dark transition-all shadow-md active:scale-95"
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
                    {totalEstoquePages > 1 && (
                        <div className="p-6 border-t border-border flex items-center justify-between">
                            <span className="text-xs font-bold text-text-secondary">Página {estoquePage} de {totalEstoquePages} ({totalEstoqueItems} itens)</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const newPage = Math.max(1, estoquePage - 1)
                                        setEstoquePage(newPage)
                                        fetchStockLevels(newPage)
                                    }}
                                    disabled={estoquePage === 1}
                                    className="h-9 px-4 rounded-xl border text-xs font-bold disabled:opacity-30 hover:bg-background transition-colors"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => {
                                        const newPage = Math.min(totalEstoquePages, estoquePage + 1)
                                        setEstoquePage(newPage)
                                        fetchStockLevels(newPage)
                                    }}
                                    disabled={estoquePage === totalEstoquePages}
                                    className="h-9 px-4 rounded-xl border text-xs font-bold disabled:opacity-30 hover:bg-background transition-colors"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showExportModal && <RomaneioExportModal isOpen={showExportModal} onClose={resetCart} customerName={customerName || 'Consumidor'} customerPhone={customerPhone} clientId={selectedClientId} items={cartItems} discount={discountAmount} />}
            {showDraftModal && <RomaneioExportModal isOpen={showDraftModal} onClose={() => setShowDraftModal(false)} customerName={customerName || 'Consumidor'} customerPhone={customerPhone} clientId={selectedClientId} items={cartItems} discount={discountAmount} isDraft={true} />}
            <DiscountCalculatorModal isOpen={showDiscountModal} subtotal={romaneioSubtotal} currentPercentage={discountPercentage} onClose={() => setShowDiscountModal(false)} onApply={(_, pct) => { setDiscountPercentage(pct); if (pct > 0) { toast.success(`Desconto de ${pct.toFixed(2)}% aplicado!`, { id: 'discount-toast' }) } else { toast.success('Desconto removido!', { id: 'discount-toast' }) } }} />
            <ClientModal isOpen={clientModalOpen} onClose={() => setClientModalOpen(false)} onSuccess={(newClient) => { setCustomerName(newClient.name); setSelectedClientId(newClient.id); setCustomerPhone(newClient.phone); }} />
            {cameraOpen && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setCameraOpen(false)} status={scanStatus} />}
            {stockValidationError && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setStockValidationError(null)} />
                    <div className="relative bg-card rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b bg-error/10/50 flex items-center gap-4"><div className="w-12 h-12 bg-error/20 text-error rounded-2xl flex items-center justify-center shrink-0"><AlertTriangle className="w-6 h-6" /></div><div><h2 className="text-xl font-black text-red-900 tracking-tight">Estoque Baixo</h2><p className="text-xs font-bold text-error/60 uppercase tracking-widest mt-1">Saldo Insuficiente</p></div></div>
                        <div className="p-8 space-y-4 max-h-[300px] overflow-y-auto">{stockValidationError.map((err, idx) => (
                            <div key={idx} className="p-4 bg-background rounded-2xl border border-border"><p className="font-bold text-sm text-text-primary">{err.productName}</p><div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-wider"><span className="text-text-secondary">Pedido: {err.requested}</span><span className="text-error">Livre: {err.available}</span></div></div>
                        ))}</div>
                        <div className="p-8 pt-0 flex flex-col gap-3"><button onClick={() => { setStockValidationError(null); executeFinalize(true); }} className="w-full h-14 bg-error hover:bg-error text-card rounded-2xl font-black text-sm active:scale-95 transition-all">Sair Mesmo Assim</button><button onClick={() => setStockValidationError(null)} className="w-full h-14 bg-border/50 hover:bg-border text-text-secondary rounded-2xl font-black text-sm active:scale-95 transition-all">Ajustar</button></div>
                    </div>
                </div>
            )}
            {blocker.state === 'blocked' && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => blocker.reset()} />
                    <div className="relative bg-card rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 pb-4 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-amber-100 text-warning rounded-3xl flex items-center justify-center mb-6">
                                <Clock className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-text-primary tracking-tight">Salvar Separação?</h2>
                            <p className="text-sm font-bold text-text-secondary leading-relaxed mt-2">
                                Você tem itens no carrinho. Deseja salvar como rascunho antes de sair?
                            </p>
                        </div>

                        <div className="px-8 py-2">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                                    {(!customerName || !customerName.trim()) ? 'Para quem é este pedido?' : 'Confirmar Nome do Cliente'}
                                </label>
                                <input
                                    type="text"
                                    placeholder="Nome do Cliente"
                                    value={customerName || ''}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full h-12 px-4 bg-background border border-border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-warning/20 focus:border-warning outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="p-8 flex flex-col gap-3">
                            <button
                                onClick={handleBlockerSave}
                                disabled={isSavingPending}
                                className="w-full h-14 bg-warning hover:bg-warning text-card rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {isSavingPending ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Salvar e Sair
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={handleDiscardAndExit} className="h-12 bg-border/50 hover:bg-border text-text-secondary rounded-xl font-black text-xs active:scale-95 transition-all">Sair sem salvar</button>
                                <button onClick={() => blocker.reset()} className="h-12 bg-background hover:bg-border/50 text-text-secondary rounded-xl font-black text-xs active:scale-95 transition-all">Voltar</button>
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
