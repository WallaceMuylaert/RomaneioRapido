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
    MoreVertical,
    Minus,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
} from 'lucide-react'
import BarcodeScanner from '../components/BarcodeScanner'
import RomaneioExportModal from '../components/RomaneioExportModal'
import type { CartItem } from '../components/RomaneioExportModal'
import { isIntegerUnit } from '../utils/units'
import ClientModal from '../components/ClientModal'
import MovementDetailsModal from '../components/MovementDetailsModal'
import ConfirmModal from '../components/ConfirmModal'

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

export default function RomaneioPage() {
    const [activeTab, setActiveTab] = useState<'romaneio' | 'movimentacoes' | 'estoque'>('romaneio')
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
    const [isSearchingText, setIsSearchingText] = useState(false)

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

    const [movements, setMovements] = useState<any[]>([])
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([])

    // Estado para Regerar Romaneio Histórico
    const [historicExport, setHistoricExport] = useState<{ clientId: number | null, customerName: string, createdAt: string, items: CartItem[] } | null>(null)
    const [viewMovement, setViewMovement] = useState<{ clientId: number | null, customerName: string, createdAt: string, items: CartItem[] } | null>(null)
    const [openHistoryMenuId, setOpenHistoryMenuId] = useState<string | number | null>(null)

    // Estado para Validação de Estoque
    const [stockValidationError, setStockValidationError] = useState<{
        productName: string,
        available: number,
        requested: number,
        unit: string
    }[] | null>(null)
    const [itemToRemove, setItemToRemove] = useState<number | null>(null)

    // Estado para feedback em tempo real do scanner
    const [scanStatus, setScanStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle')

    // Bloqueador de Navegação do React Router (Para rotas externas)
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            cartItems.length > 0 && currentLocation.pathname !== nextLocation.pathname
    );

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

    // Agrupamento de Movimentações para permitir Re-gerar Romaneios
    const groupedMovements = useMemo(() => {
        const groups: Record<string, any> = {}
        const singles: any[] = []

        if (!Array.isArray(movements)) return []

        movements.forEach(m => {
            if (m.romaneio_id) {
                if (!groups[m.romaneio_id]) {
                    // Tenta extrair o nome do cliente da nota "Romaneio: Nome do Cliente "
                    let cName = ""
                    if (m.notes && m.notes.startsWith("Romaneio: ")) {
                        cName = m.notes.replace("Romaneio: ", "").trim()
                    }

                    groups[m.romaneio_id] = {
                        id: m.romaneio_id,
                        created_at: m.created_at,
                        clientId: m.client_id || m.client?.id || null,
                        customerName: m.client?.name || cName || 'Consumidor',
                        customerPhone: m.client?.phone || null,
                        items: [],
                        type: m.movement_type,
                        totalValue: 0
                    }
                }
                groups[m.romaneio_id].items.push(m)
                groups[m.romaneio_id].totalValue += (m.quantity * (m.unit_price_snapshot || 0))

                // Atualiza com dados do cliente se disponíveis (em caso de múltiplos itens, o último sobrescreve mas são do mesmo romaneio)
                if (m.client || m.client_id) {
                    groups[m.romaneio_id].customerName = m.client?.name || groups[m.romaneio_id].customerName;
                    groups[m.romaneio_id].customerPhone = m.client?.phone || groups[m.romaneio_id].customerPhone;
                    groups[m.romaneio_id].clientId = m.client_id || m.client?.id || groups[m.romaneio_id].clientId;
                }
            } else {
                singles.push({
                    ...m,
                    totalValue: (m.quantity * (m.unit_price_snapshot || 0))
                })
            }
        })

        const result = [
            ...Object.values(groups).map(g => ({ ...g, isGroup: true })),
            ...singles.map(s => ({
                ...s,
                isGroup: false,
                id: s.id,
                clientId: s.client_id || s.client?.id || null,
                items: [s], // Treat as a single-item group for actions
                customerName: s.notes && s.notes.includes("Romaneio: ") ? s.notes.replace("Romaneio: ", "").trim() : (s.notes || ""),
                totalValue: s.totalValue
            }))
        ]

        return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }, [movements])

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
        // Fechar o outro dropdown se este for aberto
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
        // Fechar o outro dropdown se este for aberto
        setShowClientDropdown(false)
        setActiveClientIndex(-1)

        if (val.trim().length < 2) {
            setDropdownResults([])
            setActiveProductIndex(-1)
            return
        }
        setIsSearchingText(true)
        try {
            const res = await api.get('/products/', { params: { search: val, per_page: 5 } })
            setDropdownResults(res.data.items)
            setActiveProductIndex(res.data.items.length > 0 ? 0 : -1)
        } catch (err) {
            console.error('Erro ao buscar produtos:', err)
        } finally {
            setIsSearchingText(false)
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
    // Efeito para scroll automático no dropdown de clientes
    useEffect(() => {
        if (activeClientIndex >= 0 && clientListRef.current) {
            const list = clientListRef.current
            const item = list.children[activeClientIndex] as HTMLElement
            if (item) {
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        }
    }, [activeClientIndex])

    // Efeito para scroll automático no dropdown de produtos
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

    const fetchMovements = async () => {
        setLoading(true)
        try {
            const res = await api.get('/inventory/movements', { params: { movement_type: 'OUT', limit: 300 } })
            setMovements(res.data.items || (Array.isArray(res.data) ? res.data : []))
        } catch (err) {
            console.error('Erro ao buscar movimentações:', err)
        } finally {
            setLoading(false)
        }
    }

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

    useEffect(() => {
        fetchStockLevels()
    }, [])

    useEffect(() => {
        if (activeTab === 'movimentacoes') fetchMovements()
        if (activeTab === 'estoque') {
            setEstoquePage(1)
            setEstoqueSearch('')
            fetchStockLevels()
        }
    }, [activeTab])

    // Aviso de saída da página se houver itens no romaneio
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

    const handleTabChange = (tab: 'romaneio' | 'movimentacoes' | 'estoque') => {
        setActiveTab(tab)
    }

    // Busca Esperta: Autocomplete em tempo real ao digitar
    useEffect(() => {
        const timer = setTimeout(() => {
            handleBarcodeSearch(barcodeInput.trim())
        }, 400)
        return () => clearTimeout(timer)
    }, [barcodeInput])

    // Busca Esperta para Clientes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (customerName.trim().length >= 2) { // Removed showClientDropdown from condition as it's set by handleSearchClient
                handleSearchClient(customerName.trim())
            } else if (customerName.trim().length < 2) {
                setDropdownClients([])
                setShowClientDropdown(false)
                setActiveClientIndex(-1)
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [customerName])

    // Suporte para Scanner USB (Bip) Global
    useEffect(() => {
        let buffer = ''
        let lastKeyTime = Date.now()

        const handleKeyDown = (e: KeyboardEvent) => {
            // Se o usuário estiver digitando em um input de notas, ignoramos o listener global
            if (e.target instanceof HTMLInputElement && e.target.type !== 'text') return
            if (e.target instanceof HTMLTextAreaElement) return

            const currentTime = Date.now()

            // Scanners USB digitam muito rápido. Se passar de 50ms entre teclas, provavelmente é humano.
            if (currentTime - lastKeyTime > 50) {
                buffer = ''
            }

            if (e.key === 'Enter') {
                if (buffer.length > 3) {
                    handleBarcodeScan(buffer)
                    buffer = ''
                }
            } else if (e.key.length === 1) {
                buffer += e.key
            }

            lastKeyTime = currentTime
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const addToCart = (product: Product, quantityOverride?: number) => {
        const qtyToAdd = quantityOverride !== undefined ? quantityOverride : 1;
        if (qtyToAdd <= 0) return;

        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id)
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + qtyToAdd } : item)
            }
            return [{ id: product.id, name: product.name, barcode: product.barcode, quantity: qtyToAdd, unit: product.unit, price: product.price || 0, color: product.color, size: product.size }, ...prev]
        })
    }

    const updateCartQuantity = (id: number, quant: string, unit: string) => {
        let val = parseFloat(quant)
        if (isNaN(val) || val < 0) return

        if (isIntegerUnit(unit)) {
            val = Math.floor(val)
        }

        setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: val } : item))
    }

    const handleQuantityBlur = (id: number) => {
        setCartItems(prev => prev.filter(item => {
            if (item.id === id && (item.quantity <= 0 || isNaN(item.quantity))) {
                return false
            }
            return true
        }))
    }

    const removeFromCart = (id: number) => {
        setCartItems(prev => prev.filter(item => item.id !== id))
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
            // Tenta busca direta por código de barras
            const res = await api.get(`/products/barcode/${trimmedCode}`)
            if (res.data) {
                const productInfo = Array.isArray(res.data) ? res.data[0] : res.data

                // Pequeno delay artificial para o usuário ver o "Lendo..." se for muito rápido
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
        } catch (err) {
            // Ignora o erro da busca por barcode e tenta pesquisa por texto
        }

        try {
            // Tenta busca por texto (caso o "barcode" na verdade seja parte do nome ou código SKU)
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
                // Se encontrar múltiplos, ajuda o usuário abrindo a busca manual com o termo
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

        // Se chegou aqui, não encontrou nada
        setScanStatus('error')
        toast.error(`Produto "${trimmedCode}" não localizado.`, {
            id: 'barcode-scan',
            icon: '❌',
            duration: 3000
        })

        // Se a câmera estiver fechada (USB) ou após um tempo na câmera, limpa o status
        setTimeout(() => setScanStatus('idle'), 2000)
    }


    const handleFinalizeRomaneio = async () => {
        if (cartItems.length === 0) return

        // Validação de Estoque
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
            // Gerar um ID de agrupamento para este Romaneio (Batch UUID)
            const romaneioBatchId = `ROM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

            // Envia cada item do carrinho como uma movimentação de SAÍDA individual
            for (const item of cartItems) {
                await api.post('/inventory/movements', {
                    product_id: item.id,
                    quantity: item.quantity,
                    movement_type: 'OUT',
                    notes: customerName ? `Romaneio: ${customerName} ` : 'Romaneio Rápido',
                    romaneio_id: romaneioBatchId,
                    client_id: selectedClientId,
                    product_name_snapshot: item.name,
                    product_barcode_snapshot: item.barcode,
                    unit_price_snapshot: item.price,
                    unit_snapshot: item.unit
                })
            }

            // Exibe modal de exportação ao invés de limpar a tela direto
            setShowExportModal(true)
            toast.success('Romaneio registrado com sucesso!')
            fetchStockLevels() // Atualiza estoque local

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
    }

    const renderHistoryMenu = (g: any) => {
        if (openHistoryMenuId !== (g.id || g.romaneio_id)) return null

        const exportItems = g.items.map((m: any) => ({
            id: m.product_id,
            name: m.product_name || 'Produto Excluído',
            barcode: m.product_barcode_snapshot || m.product?.barcode || null,
            quantity: m.quantity,
            unit: m.unit_snapshot || m.product?.unit || 'un',
            price: m.unit_price_snapshot || m.product?.price || 0
        }))

        return (
            <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenHistoryMenuId(null)} />
                <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right text-left">
                    <button
                        onClick={() => {
                            setViewMovement({
                                clientId: g.clientId,
                                customerName: g.customerName || 'Consumidor',
                                createdAt: g.created_at,
                                items: exportItems
                            })
                            setCustomerPhone(g.customerPhone)
                            setOpenHistoryMenuId(null)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                    >
                        <ShoppingCart className="w-4 h-4" /> Ver Itens / Detalhes
                    </button>
                    <button
                        onClick={() => {
                            setHistoricExport({
                                clientId: g.clientId,
                                customerName: g.customerName || 'Consumidor',
                                createdAt: g.created_at,
                                items: exportItems
                            })
                            setCustomerPhone(g.customerPhone)
                            setOpenHistoryMenuId(null)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    >
                        <Smartphone className="w-4 h-4" /> Imprimir / Zap
                    </button >
                    <button
                        onClick={async () => {
                            setOpenHistoryMenuId(null)
                            try {
                                setLoading(true)
                                const newCart: CartItem[] = []
                                for (const historicItem of g.items) {
                                    try {
                                        const res = await api.get(`/products/${historicItem.product_id}`)
                                        if (res.data) {
                                            newCart.push({
                                                id: res.data.id,
                                                name: res.data.name,
                                                barcode: res.data.barcode,
                                                quantity: historicItem.quantity,
                                                unit: res.data.unit,
                                                price: res.data.price
                                            })
                                        }
                                    } catch {
                                        toast.error(`Produto "${historicItem.product_name || 'Desconhecido'}" não encontrado.`)
                                    }
                                }
                                setCartItems(newCart)
                                setCustomerName(g.customerName || '')
                                setCustomerPhone(null) // Phone não está no snapshot de movimento ainda
                                setActiveTab('romaneio')
                                toast.success('Pedido copiado! Revise o romaneio.')
                            } catch (err) {
                                toast.error('Erro ao copiar pedido.')
                            } finally {
                                setLoading(false)
                            }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Copiar Pedido
                    </button>
                </div >
            </>
        )
    }

    const filteredAndSortedStock = useMemo(() => {
        let result = [...stockLevels]

        if (estoqueSearch.trim()) {
            const query = estoqueSearch.toLowerCase()
            result = result.filter(s =>
                s.product_name.toLowerCase().includes(query) ||
                (s.barcode && s.barcode.toLowerCase().includes(query))
            )
        }

        // Ordenação Dinâmica
        return result.sort((a, b) => {
            const valA = a[estoqueSortField]
            const valB = b[estoqueSortField]

            if (valA === undefined || valB === undefined) return 0

            // Helper para comparação nula
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

            if (comparison !== 0) {
                return estoqueSortDirection === 'asc' ? comparison : -comparison
            }

            // Fallback consistente por nome
            return a.product_name.localeCompare(b.product_name)
        })
    }, [stockLevels, estoqueSearch, estoqueSortField, estoqueSortDirection])

    const totalEstoquePages = Math.ceil(filteredAndSortedStock.length / ESTOQUE_PER_PAGE)
    const currentEstoqueItems = useMemo(() => {
        const start = (estoquePage - 1) * ESTOQUE_PER_PAGE
        return filteredAndSortedStock.slice(start, start + ESTOQUE_PER_PAGE)
    }, [filteredAndSortedStock, estoquePage])

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">Romaneio</h1>
                <p className="text-sm text-gray-400 mt-0.5">Gestão de estoque e movimentações</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-white border border-gray-100 rounded-xl p-1 mb-6 shadow-sm max-w-fit">
                <button
                    onClick={() => handleTabChange('romaneio')}
                    className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${activeTab === 'romaneio' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Romaneio
                </button>
                <button
                    onClick={() => handleTabChange('movimentacoes')}
                    className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${activeTab === 'movimentacoes' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Movimentações
                </button>
                <button
                    onClick={() => handleTabChange('estoque')}
                    className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${activeTab === 'estoque' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Estoque
                </button>
            </div>

            {activeTab === 'romaneio' && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px] gap-3 sm:gap-6 pb-24 lg:pb-0">
                    {/* LEFTSIDE: BARCODE + CARRINHO */}
                    <div className="flex flex-col gap-6">

                        {/* Header do Romaneio */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-6 shadow-sm">
                            <h2 className="text-sm font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-blue-600" />
                                Montar Romaneio
                            </h2>

                            <div className="space-y-4">
                                <div ref={clientSearchContainerRef} className="relative">
                                    <label className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 block">Cliente / Destino</label>
                                    <div className="flex justify-between items-end mb-1.5 ml-1">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setClientModalOpen(true)}
                                                className="text-[11px] font-black text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 uppercase tracking-wider"
                                                title="Cadastrar novo cliente agora"
                                            >
                                                <Plus className="w-3 h-3" /> Cadastre / Novo Cliente
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="text"
                                            placeholder="Digite o nome do cliente para buscar..."
                                            value={customerName}
                                            onChange={(e) => {
                                                handleSearchClient(e.target.value)
                                            }}
                                            onFocus={() => {
                                                // Fechar o outro dropdown
                                                setDropdownResults([])
                                                setActiveProductIndex(-1)

                                                if (customerName.trim().length >= 2) handleSearchClient(customerName.trim())
                                                else setShowClientDropdown(true)
                                            }}
                                            onKeyDown={handleClientKeyDown}
                                            onBlur={() => {
                                                // Delay para permitir o clique no dropdown
                                                setTimeout(() => setShowClientDropdown(false), 200)
                                            }}
                                            className="w-full h-11 pl-10 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder-gray-400 text-gray-900 font-semibold"
                                        />

                                        {/* Dropdown de Clientes */}
                                        {showClientDropdown && (dropdownClients.length > 0 || isSearchingClient) && customerName.trim().length >= 2 && (
                                            <div
                                                ref={clientListRef}
                                                className="absolute z-40 top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1"
                                            >
                                                {isSearchingClient ? (
                                                    <div className="p-4 text-center text-sm text-gray-400 font-medium animate-pulse">Buscando clientes...</div>
                                                ) : dropdownClients.map((client, index) => (
                                                    <button
                                                        key={client.id}
                                                        type="button"
                                                        onClick={() => selectClient(client)}
                                                        className={`w-full px-5 py-4 text-left hover:bg-slate-50 flex items-center justify-between group transition-colors ${activeClientIndex === index ? 'bg-slate-50 border-l-4 border-brand-500' : ''}`}
                                                    >
                                                        <div className="min-w-0 pr-4">
                                                            <p className="text-sm font-bold text-gray-900 truncate">{client.name}</p>
                                                            {client.document && <p className="text-[10px] text-gray-400 font-mono truncate">{client.document}</p>}
                                                        </div>
                                                        {client.phone && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-gray-600 transition-colors shrink-0">
                                                                <Smartphone className="w-3 h-3" />
                                                                <span>{client.phone}</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Barcode Input */}
                            <div ref={productSearchContainerRef} className="relative">
                                <label className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 block">Adicionar Produto</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="text"
                                            placeholder="Busca esperta (Nome, Código, SKU...)"
                                            value={barcodeInput}
                                            onChange={(e) => setBarcodeInput(e.target.value)}
                                            onFocus={() => {
                                                // Fechar o outro dropdown
                                                setShowClientDropdown(false)
                                                setActiveClientIndex(-1)
                                            }}
                                            onKeyDown={handleProductKeyDown}
                                            autoFocus
                                            className="w-full h-11 pl-10 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder-gray-400 font-medium"
                                        />

                                        {/* Dropdown de Busca Esperta */}
                                        {(dropdownResults.length > 0 || isSearchingText) && barcodeInput.trim().length >= 2 && (
                                            <div
                                                ref={productListRef}
                                                className="absolute z-50 top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1"
                                            >
                                                {isSearchingText ? (
                                                    <div className="p-4 text-center text-sm text-gray-400 font-medium animate-pulse">Buscando produto...</div>
                                                ) : dropdownResults.map((product, index) => (
                                                    <button
                                                        key={product.id}
                                                        type="button"
                                                        onClick={() => {
                                                            addToCart(product)
                                                            setBarcodeInput('')
                                                            setDropdownResults([])
                                                        }}
                                                        className={`w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center gap-4 transition-colors ${activeProductIndex === index ? 'bg-slate-50 border-l-4 border-brand-500' : ''}`}
                                                    >
                                                        <div className="min-w-0 pr-4">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {product.name}
                                                                {(product.color || product.size) && (
                                                                    <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-semibold">
                                                                        {[product.color, product.size].filter(Boolean).join(' • ')}
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-mono truncate">{product.barcode || product.sku || 'Sem Cód.'}</p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-xs font-bold text-gray-700">{product.stock_quantity}</p>
                                                            <p className="text-[10px] text-gray-300 font-medium uppercase">{product.unit}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setCameraOpen(true)}
                                        className="h-11 px-4 bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all flex items-center justify-center shrink-0 gap-2 font-bold text-xs active:scale-95 shadow-sm"
                                        title="Usar câmera"
                                    >
                                        <Camera className="w-5 h-5" />
                                        <span className="hidden sm:inline uppercase tracking-widest">Leitor</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* LISTA DE ITENS DO ROMANEIO */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-6 shadow-sm flex-1 min-h-[200px] sm:min-h-[300px]">
                            <h2 className="text-sm font-bold text-gray-900 mb-3 sm:mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-emerald-600" />
                                    Itens do Romaneio
                                </span>
                                {cartItems.length > 0 && (
                                    <span className="bg-blue-100 text-blue-700 font-bold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full">
                                        {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}
                                    </span>
                                )}
                            </h2>

                            {cartItems.length === 0 ? (
                                <div className="text-center py-10 sm:py-16 border-2 border-dashed border-gray-100 rounded-xl h-full flex flex-col items-center justify-center">
                                    <ScanBarcode className="w-10 h-10 text-gray-200 mb-3" />
                                    <p className="text-sm font-semibold text-gray-400">Carrinho Vazio</p>
                                    <p className="text-xs text-gray-300 mt-1 max-w-[200px]">Bipe os produtos para adicioná-los ao romaneio de saída.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 overflow-x-auto pb-2">
                                    <div className="min-w-full sm:min-w-[600px]">
                                        {cartItems.map((item, idx) => (
                                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 p-2.5 sm:p-3 bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition-all group animate-in slide-in-from-left-2">
                                                <div className="flex-1 min-w-0 sm:pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 w-4 sm:w-5 shrink-0">{idx + 1}.</span>
                                                        <p className="text-xs sm:text-sm font-bold text-gray-900 truncate" title={item.name}>{item.name}</p>
                                                    </div>
                                                    {(item.color || item.size) && (
                                                        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 ml-5 sm:ml-7 mt-0.5">
                                                            {item.color && <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold bg-gray-200 text-gray-700 uppercase tracking-wider">{item.color}</span>}
                                                            {item.size && <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold bg-gray-200 text-gray-700 uppercase tracking-wider">{item.size}</span>}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-2 sm:gap-x-3 ml-5 sm:ml-7 mt-0.5 sm:mt-1">
                                                        <p className="text-[9px] sm:text-[10px] text-gray-400 font-mono shrink-0">{item.barcode || 'Sem código'}</p>
                                                        <span className="hidden sm:inline text-[10px] text-gray-300">|</span>
                                                        <p className="text-[11px] sm:text-xs font-bold text-emerald-600 shrink-0">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</p>
                                                        <span className="hidden sm:inline text-[10px] text-gray-300">|</span>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Est:</span>
                                                            <span className={`text-[9px] sm:text-[10px] font-black ${(stockLevels.find(s => s.product_id === item.id)?.stock_quantity || 0) <= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                                                {stockLevels.find(s => s.product_id === item.id)?.stock_quantity || 0} {item.unit}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-6 border-t sm:border-t-0 border-gray-100 pt-2 sm:pt-0 mt-2 sm:mt-0">
                                                    <div className="text-left sm:text-right w-20 sm:w-32 shrink-0">
                                                        <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase font-black tracking-widest sm:block mb-0.5">Total</p>
                                                        <p className="text-xs sm:text-[15px] font-black text-slate-800 leading-none">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}</p>
                                                    </div>

                                                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm shrink-0">
                                                        <button
                                                            onClick={() => {
                                                                const newQty = Math.max(0, item.quantity - 1)
                                                                if (newQty === 0) {
                                                                    setItemToRemove(item.id)
                                                                } else {
                                                                    updateCartQuantity(item.id, String(newQty), item.unit)
                                                                }
                                                            }}
                                                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step={isIntegerUnit(item.unit) ? "1" : "0.01"}
                                                            value={item.quantity}
                                                            onChange={(e) => updateCartQuantity(item.id, e.target.value, item.unit)}
                                                            onBlur={() => handleQuantityBlur(item.id)}
                                                            className="w-8 sm:w-12 h-6 sm:h-7 text-center text-[10px] sm:text-sm font-bold text-gray-900 border-none focus:ring-0 bg-transparent px-0"
                                                        />
                                                        <button
                                                            onClick={() => updateCartQuantity(item.id, String(item.quantity + 1), item.unit)}
                                                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 pr-1 sm:pr-2 uppercase ml-0.5 sm:ml-1">{item.unit}</span>
                                                    </div>

                                                    <button
                                                        onClick={() => setItemToRemove(item.id)}
                                                        className="w-7 h-7 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg sm:rounded-xl transition-colors shrink-0"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHTSIDE: RESUMO E FINALIZAÇÃO */}
                    <div className="flex flex-col h-full order-last lg:order-none">
                        <div className="bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-xl lg:sticky lg:top-24">
                            <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                Resumo do Romaneio
                            </h2>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                                    <span className="text-sm text-slate-400">Cliente/Destino</span>
                                    <span className="text-sm font-semibold text-white truncate max-w-[150px]" title={customerName}>{customerName || <span className="text-slate-500 italic">Não informado</span>}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                                    <span className="text-sm text-slate-400">Total de Linhas</span>
                                    <span className="text-sm font-bold text-white">{cartItems.length}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                                    <span className="text-sm text-slate-400">Total de Peças (Qtd)</span>
                                    <span className="text-lg font-bold text-slate-300">
                                        {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                                    <span className="text-sm font-bold text-slate-300">Valor Total Estimado</span>
                                    <span className="text-xl font-black text-emerald-400">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0))}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleFinalizeRomaneio}
                                disabled={submitting || cartItems.length === 0}
                                className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[15px] font-bold rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {submitting ? 'Registrando BD...' : 'Finalizar Romaneio (Saída)'}
                            </button>
                            {cartItems.length > 0 && (
                                <p className="text-[10px] text-center text-slate-400 mt-4 leading-relaxed">
                                    Ao clicar em finalizar, o estoque de todos os {cartItems.length} itens será <strong className="text-slate-300">reduzido</strong> imediatamente.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Mobile Sticky Footer */}
                    {cartItems.length > 0 && (
                        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom duration-300">
                            <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</span>
                                    <span className="text-lg font-black text-emerald-400">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0))}
                                    </span>
                                </div>
                                <button
                                    onClick={handleFinalizeRomaneio}
                                    disabled={submitting}
                                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Registrando...' : 'Finalizar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'movimentacoes' && (
                <div className="space-y-4">
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-100">
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição / Produto</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Qtd / Itens</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan={5} className="py-10 text-center text-gray-400 italic">Carregando...</td></tr>
                                    ) : groupedMovements.length === 0 ? (
                                        <tr><td colSpan={5} className="py-10 text-center text-gray-400 italic">Nenhuma movimentação registrada</td></tr>
                                    ) : (
                                        groupedMovements.map((g) => (
                                            <tr key={g.id} className={`hover:bg-gray-50/50 transition-colors ${g.isGroup ? 'bg-blue-50/20' : ''}`}>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {new Date(g.created_at).toLocaleString('pt-BR')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {g.isGroup ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-900">Romaneio: {g.customerName || 'Consumidor'}</span>
                                                            <span className="text-[10px] text-gray-400 uppercase tracking-tight">ID: {g.id}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-800">
                                                                {g.product_name || 'Produto Excluído'}
                                                            </span>
                                                            {g.notes && <span className="text-[10px] text-gray-400 italic">{g.notes}</span>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${g.type === 'OUT' || g.movement_type === 'OUT' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {g.isGroup ? 'ROMANEIO' : (g.movement_type === 'IN' ? 'ENTRADA' : 'SAÍDA')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {g.isGroup ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-bold text-blue-600">{g.items.length} itens</span>
                                                            <span className="text-xs font-black text-emerald-600 mt-0.5">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(g.totalValue)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-semibold text-gray-700">{g.quantity} {g.unit || 'UN'}</span>
                                                            {g.totalValue > 0 && (
                                                                <span className="text-[10px] text-gray-400">
                                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(g.totalValue)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {(g.isGroup || g.movement_type === 'OUT') && (
                                                        <div className="relative flex justify-end">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setOpenHistoryMenuId(openHistoryMenuId === (g.id || g.romaneio_id) ? null : (g.id || g.romaneio_id))
                                                                }}
                                                                className={`p-2.5 rounded-xl transition-all ${openHistoryMenuId === (g.id || g.romaneio_id) ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                                                            >
                                                                <MoreVertical className="w-5 h-5" />
                                                            </button>
                                                            <div className={`${openHistoryMenuId === (g.id || g.romaneio_id) ? 'relative' : 'hidden'}`}>
                                                                <div className={`absolute right-0 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-200 text-left
                                                                    ${groupedMovements.indexOf(g) >= groupedMovements.length - 3 && groupedMovements.length > 3 ? 'bottom-full mb-2 origin-bottom-right' : 'top-12 origin-top-right'}`}>
                                                                    {/* Conteúdo do menu movido para cá para permitir controle de posição dinâmico */}
                                                                    <button
                                                                        onClick={() => {
                                                                            const exportItems = g.items.map((m: any) => ({
                                                                                id: m.product_id,
                                                                                name: m.product_name || 'Produto Excluído',
                                                                                barcode: m.product_barcode_snapshot || m.product?.barcode || null,
                                                                                quantity: m.quantity,
                                                                                unit: m.unit_snapshot || m.product?.unit || 'un',
                                                                                price: m.unit_price_snapshot || m.product?.price || 0
                                                                            }))
                                                                            setViewMovement({
                                                                                clientId: g.clientId,
                                                                                customerName: g.customerName || 'Consumidor',
                                                                                createdAt: g.created_at,
                                                                                items: exportItems
                                                                            })
                                                                            setCustomerPhone(g.customerPhone)
                                                                            setOpenHistoryMenuId(null)
                                                                        }}
                                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                                                                    >
                                                                        <ShoppingCart className="w-4 h-4" /> Ver Itens / Detalhes
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const exportItems = g.items.map((m: any) => ({
                                                                                id: m.product_id,
                                                                                name: m.product_name || 'Produto Excluído',
                                                                                barcode: m.product_barcode_snapshot || m.product?.barcode || null,
                                                                                quantity: m.quantity,
                                                                                unit: m.unit_snapshot || m.product?.unit || 'un',
                                                                                price: m.unit_price_snapshot || m.product?.price || 0
                                                                            }))
                                                                            setHistoricExport({
                                                                                clientId: g.clientId,
                                                                                customerName: g.customerName || 'Consumidor',
                                                                                createdAt: g.created_at,
                                                                                items: exportItems
                                                                            })
                                                                            setCustomerPhone(g.customerPhone)
                                                                            setOpenHistoryMenuId(null)
                                                                        }}
                                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                                                    >
                                                                        <Smartphone className="w-4 h-4" /> Imprimir / Zap
                                                                    </button >
                                                                    <button
                                                                        onClick={async () => {
                                                                            setOpenHistoryMenuId(null)
                                                                            try {
                                                                                setLoading(true)
                                                                                const newCart: CartItem[] = []
                                                                                for (const historicItem of g.items) {
                                                                                    try {
                                                                                        const res = await api.get(`/products/${historicItem.product_id}`)
                                                                                        if (res.data) {
                                                                                            newCart.push({
                                                                                                id: res.data.id,
                                                                                                name: res.data.name,
                                                                                                barcode: res.data.barcode,
                                                                                                quantity: historicItem.quantity,
                                                                                                unit: res.data.unit,
                                                                                                price: res.data.price
                                                                                            })
                                                                                        }
                                                                                    } catch {
                                                                                        toast.error(`Produto "${historicItem.product_name || 'Desconhecido'}" não encontrado.`)
                                                                                    }
                                                                                }
                                                                                setCartItems(newCart)
                                                                                setCustomerName(g.customerName || '')
                                                                                setCustomerPhone(null)
                                                                                setActiveTab('romaneio')
                                                                                toast.success('Pedido copiado! Revise o romaneio.')
                                                                            } catch (err) {
                                                                                toast.error('Erro ao copiar pedido.')
                                                                            } finally {
                                                                                setLoading(false)
                                                                            }
                                                                        }}
                                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                                                    >
                                                                        <Plus className="w-4 h-4" /> Copiar Pedido
                                                                    </button>
                                                                </div>
                                                                <div className="fixed inset-0 z-40" onClick={() => setOpenHistoryMenuId(null)} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {loading ? (
                            <div className="text-center py-10 text-gray-400 italic">Carregando...</div>
                        ) : groupedMovements.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 italic">Nenhuma movimentação registrada</div>
                        ) : (
                            groupedMovements.map((g) => (
                                <div key={g.id} className={`p-4 rounded-2xl border ${g.isGroup ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-gray-100'} shadow-sm space-y-3`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {new Date(g.created_at).toLocaleString('pt-BR')}
                                            </span>
                                            {g.isGroup ? (
                                                <span className="font-bold text-gray-900 mt-1">Romaneio: {g.customerName || 'Consumidor'}</span>
                                            ) : (
                                                <span className="font-bold text-gray-900 mt-1">{g.product_name || 'Produto Excluído'}</span>
                                            )}
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${g.type === 'OUT' || g.movement_type === 'OUT' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {g.isGroup ? 'ROMANEIO' : (g.movement_type === 'IN' ? 'ENTRADA' : 'SAÍDA')}
                                        </span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            {g.isGroup ? (
                                                <p className="text-[10px] text-gray-400 uppercase font-black">ID: {g.id}</p>
                                            ) : (
                                                g.notes && <p className="text-xs text-gray-400 italic">{g.notes}</p>
                                            )}
                                            <div className="flex flex-col">
                                                <p className="text-sm font-black text-slate-700 mt-1">
                                                    {g.isGroup ? `${g.items.length} Produtos` : `${g.quantity} ${g.unit || 'UN'}`}
                                                </p>
                                                {g.totalValue > 0 && (
                                                    <p className="text-xs font-black text-emerald-600">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(g.totalValue)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {(g.isGroup || g.movement_type === 'OUT') && (
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setOpenHistoryMenuId(openHistoryMenuId === (g.id || g.romaneio_id) ? null : (g.id || g.romaneio_id))
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 rounded-xl active:bg-brand-50 active:text-brand-600 transition-all border border-gray-100 shadow-sm"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                                {renderHistoryMenu(g)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'estoque' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="relative w-full">
                            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Filtrar por nome ou código..."
                                value={estoqueSearch}
                                onChange={(e) => {
                                    setEstoqueSearch(e.target.value)
                                    setEstoquePage(1)
                                }}
                                className="w-full h-11 pl-11 pr-10 text-sm bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all placeholder-gray-400 font-medium"
                            />
                        </div>

                        {/* Mobile Sorting Selector */}
                        <div className="md:hidden w-full sm:w-auto">
                            <div className="relative">
                                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={`${estoqueSortField}-${estoqueSortDirection}`}
                                    onChange={(e) => {
                                        const [field, direction] = e.target.value.split('-') as [keyof StockLevel, 'asc' | 'desc']
                                        setEstoqueSortField(field)
                                        setEstoqueSortDirection(direction)
                                        setEstoquePage(1)
                                    }}
                                    className="w-full h-11 pl-10 pr-8 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-gray-700 font-bold appearance-none cursor-pointer"
                                >
                                    <option value="product_name-asc">Nome (A-Z)</option>
                                    <option value="product_name-desc">Nome (Z-A)</option>
                                    <option value="stock_quantity-asc">Estoque (Menor)</option>
                                    <option value="stock_quantity-desc">Estoque (Maior)</option>
                                    <option value="is_low_stock-desc">Status (Aviso Primeiro)</option>
                                    <option value="color-asc">Cor (A-Z)</option>
                                    <option value="size-asc">Tamanho (Menor)</option>
                                </select>
                            </div>
                        </div>

                        <span className="whitespace-nowrap text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                            {filteredAndSortedStock.length} {filteredAndSortedStock.length === 1 ? 'Produto' : 'Produtos'}
                        </span>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto w-full pb-2">
                            <table className="w-full text-sm min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Foto</th>
                                        <th
                                            onClick={() => handleSortEstoque('product_name')}
                                            className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-1">
                                                Produto
                                                {estoqueSortField === 'product_name' ? (
                                                    estoqueSortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                                                ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSortEstoque('color')}
                                            className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-1">
                                                Cor
                                                {estoqueSortField === 'color' ? (
                                                    estoqueSortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                                                ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSortEstoque('size')}
                                            className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-1">
                                                Tamanho
                                                {estoqueSortField === 'size' ? (
                                                    estoqueSortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                                                ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSortEstoque('stock_quantity')}
                                            className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Estoque Atual
                                                {estoqueSortField === 'stock_quantity' ? (
                                                    estoqueSortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                                                ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSortEstoque('is_low_stock')}
                                            className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Status
                                                {estoqueSortField === 'is_low_stock' ? (
                                                    estoqueSortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                                                ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                            </div>
                                        </th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan={9} className="py-10 text-center text-gray-400 italic">Carregando...</td></tr>
                                    ) : currentEstoqueItems.length === 0 ? (
                                        <tr><td colSpan={9} className="py-10 text-center text-gray-400 italic">Nenhum dado de estoque encontrado</td></tr>
                                    ) : (
                                        currentEstoqueItems.map((s) => (
                                            <tr key={s.product_id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-4 py-3">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden mx-auto shadow-sm group-hover:shadow-md transition-shadow">
                                                        {s.image_base64 ? (
                                                            <img src={s.image_base64} alt={s.product_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Camera className="w-5 h-5 text-gray-200" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{s.product_name}</td>
                                                <td className="px-4 py-3">
                                                    {s.color ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600 uppercase whitespace-nowrap">{s.color}</span> : <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {s.size ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600 uppercase whitespace-nowrap">{s.size}</span> : <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                                    {s.stock_quantity} <span className="text-[10px] text-gray-400 uppercase">{s.unit}</span>
                                                    {s.is_low_stock && <AlertTriangle className="w-3 h-3 text-amber-500 inline ml-1" />}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_low_stock ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {s.is_low_stock ? 'BAIXO' : 'OK'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 shadow-sm">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const currentQty = parseFloat(stockQuantities[s.product_id] || '1');
                                                                    const step = isIntegerUnit(s.unit) ? 1 : 0.1;
                                                                    setStockQuantities(prev => ({ ...prev, [s.product_id]: String(Math.max(step, currentQty - step).toFixed(isIntegerUnit(s.unit) ? 0 : 2)) }));
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min={isIntegerUnit(s.unit) ? "1" : "0.01"}
                                                                step={isIntegerUnit(s.unit) ? "1" : "0.01"}
                                                                value={stockQuantities[s.product_id] || ''}
                                                                onChange={(e) => setStockQuantities(prev => ({ ...prev, [s.product_id]: e.target.value }))}
                                                                placeholder="1"
                                                                className="w-12 h-8 text-center text-sm font-bold text-gray-700 bg-white border-x border-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-400 focus:z-10 px-0"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const currentQty = parseFloat(stockQuantities[s.product_id] || '0');
                                                                    const step = isIntegerUnit(s.unit) ? 1 : 0.1;
                                                                    setStockQuantities(prev => ({ ...prev, [s.product_id]: String((currentQty + step).toFixed(isIntegerUnit(s.unit) ? 0 : 2)) }));
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const qtyStr = stockQuantities[s.product_id] || '1';
                                                                let qty = parseFloat(qtyStr);
                                                                if (isNaN(qty) || qty <= 0) qty = 1;
                                                                if (isIntegerUnit(s.unit)) qty = Math.floor(qty);

                                                                addToCart({
                                                                    id: s.product_id,
                                                                    name: s.product_name,
                                                                    barcode: s.barcode,
                                                                    stock_quantity: s.stock_quantity,
                                                                    min_stock: s.min_stock,
                                                                    unit: s.unit,
                                                                    price: s.price,
                                                                    color: s.color,
                                                                    size: s.size,
                                                                    sku: null
                                                                }, qty)
                                                                toast.success(`${qty}x Produto adicionado!`, { icon: '🛒', duration: 1500 })
                                                                setStockQuantities(prev => ({ ...prev, [s.product_id]: '' }))
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 mx-auto"
                                                            title="Adicionar ao Romaneio"
                                                        >
                                                            <Plus className="w-3 h-3 shrink-0" />
                                                            Romaneio
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3 pb-20">
                        {loading ? (
                            <div className="text-center py-10 text-gray-400 italic">Carregando...</div>
                        ) : currentEstoqueItems.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 italic">Nenhum dado de estoque encontrado</div>
                        ) : (
                            currentEstoqueItems.map((s) => (
                                <div key={s.product_id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-16 h-16 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                                {s.image_base64 ? (
                                                    <img src={s.image_base64} alt={s.product_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Camera className="w-6 h-6 text-gray-200" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 line-clamp-2 leading-snug">{s.product_name}</h3>
                                                {(s.color || s.size) && (
                                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                        {s.color && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider">{s.color}</span>}
                                                        {s.size && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider">{s.size}</span>}
                                                    </div>
                                                )}
                                                <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-wider">{s.barcode || 'Sem código'}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_low_stock ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {s.is_low_stock ? 'BAIXO' : 'OK'}
                                        </span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estoque Atual</p>
                                            <p className="text-lg font-black text-slate-800">
                                                {s.stock_quantity} <span className="text-xs font-bold text-gray-400 uppercase">{s.unit}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-sm mr-2 w-auto shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentQty = parseFloat(stockQuantities[s.product_id] || '1');
                                                        const step = isIntegerUnit(s.unit) ? 1 : 0.1;
                                                        setStockQuantities(prev => ({ ...prev, [s.product_id]: String(Math.max(step, currentQty - step).toFixed(isIntegerUnit(s.unit) ? 0 : 2)) }));
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center text-gray-500 bg-white hover:bg-gray-100 active:bg-gray-200 transition-colors border-r border-gray-200 z-10"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <input
                                                    type="number"
                                                    min={isIntegerUnit(s.unit) ? "1" : "0.01"}
                                                    step={isIntegerUnit(s.unit) ? "1" : "0.01"}
                                                    value={stockQuantities[s.product_id] || ''}
                                                    onChange={(e) => setStockQuantities(prev => ({ ...prev, [s.product_id]: e.target.value }))}
                                                    placeholder="1"
                                                    className="w-12 h-10 text-center text-[15px] font-bold text-gray-800 bg-gray-50 border-none focus:outline-none focus:ring-0 px-0"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentQty = parseFloat(stockQuantities[s.product_id] || '0');
                                                        const step = isIntegerUnit(s.unit) ? 1 : 0.1;
                                                        setStockQuantities(prev => ({ ...prev, [s.product_id]: String((currentQty + step).toFixed(isIntegerUnit(s.unit) ? 0 : 2)) }));
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center text-gray-500 bg-white hover:bg-gray-100 active:bg-gray-200 transition-colors border-l border-gray-200 z-10"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const qtyStr = stockQuantities[s.product_id] || '1';
                                                    let qty = parseFloat(qtyStr);
                                                    if (isNaN(qty) || qty <= 0) qty = 1;
                                                    if (isIntegerUnit(s.unit)) qty = Math.floor(qty);

                                                    addToCart({
                                                        id: s.product_id,
                                                        name: s.product_name,
                                                        barcode: s.barcode,
                                                        stock_quantity: s.stock_quantity,
                                                        min_stock: s.min_stock,
                                                        unit: s.unit,
                                                        price: s.price,
                                                        sku: null
                                                    }, qty)
                                                    toast.success(`${qty}x Produto adicionado!`, { icon: '🛒', duration: 1500 })
                                                    setStockQuantities(prev => ({ ...prev, [s.product_id]: '' }))
                                                }}
                                                className="flex-1 h-10 px-4 bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-brand-500/20"
                                            >
                                                <Plus className="w-4 h-4 shrink-0" />
                                                Romaneio
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Paginação */}
                    {totalEstoquePages > 0 && (
                        <div className="p-4 bg-white rounded-2xl border border-gray-100 flex items-center justify-between text-sm shadow-sm">
                            <span className="text-gray-500 font-medium">
                                Página <strong className="text-gray-900">{estoquePage}</strong> de {totalEstoquePages}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setEstoquePage(p => Math.max(1, p - 1))}
                                    disabled={estoquePage === 1}
                                    className="h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold disabled:opacity-30 disabled:grayscale hover:bg-gray-50 transition-colors"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setEstoquePage(p => Math.min(totalEstoquePages, p + 1))}
                                    disabled={estoquePage === totalEstoquePages}
                                    className="h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold disabled:opacity-30 disabled:grayscale hover:bg-gray-50 transition-colors"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* FLOATING CART SUMMARY (ESTOQUE) */}
            {activeTab === 'estoque' && cartItems.length > 0 && (
                <div className="fixed bottom-24 sm:bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
                    <button
                        onClick={() => setActiveTab('romaneio')}
                        className="bg-brand-600 hover:bg-brand-500 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl flex items-center gap-4 transition-transform active:scale-95"
                    >
                        <div className="relative">
                            <ShoppingCart className="w-7 h-7" />
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-brand-600">
                                {cartItems.length}
                            </span>
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-200 leading-tight">Ver Carrinho</p>
                            <p className="font-bold text-sm leading-tight mt-0.5">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0))}
                            </p>
                        </div>
                    </button>
                </div>
            )}

            {showExportModal && (
                <RomaneioExportModal
                    isOpen={showExportModal}
                    onClose={resetCart}
                    clientId={selectedClientId}
                    customerName={customerName || 'Consumidor'}
                    customerPhone={customerPhone}
                    items={cartItems}
                />
            )}

            {historicExport && (
                <RomaneioExportModal
                    isOpen={!!historicExport}
                    onClose={() => setHistoricExport(null)}
                    customerName={historicExport.customerName}
                    customerPhone={customerPhone}
                    clientId={historicExport.clientId}
                    items={historicExport.items}
                    createdAt={historicExport.createdAt}
                />
            )}

            {/* Modal de Cadastro Rápido de Cliente */}
            <ClientModal
                isOpen={clientModalOpen}
                onClose={() => setClientModalOpen(false)}
                onSuccess={(newClient) => {
                    const docInfo = newClient.document ? ` - CPF/CNPJ: ${newClient.document}` : ''
                    setCustomerName(`${newClient.name}${docInfo}`)
                    setSelectedClientId(newClient.id)
                    setCustomerPhone(newClient.phone)
                }}
            />

            {/* Camera Scanner */}
            {cameraOpen && (
                <BarcodeScanner
                    onScan={handleBarcodeScan}
                    onClose={() => setCameraOpen(false)}
                    status={scanStatus}
                />
            )}

            {/* Visualização de Detalhes do Histórico */}
            {viewMovement && (
                <MovementDetailsModal
                    clientId={viewMovement.clientId}
                    customerName={viewMovement.customerName}
                    items={viewMovement.items}
                    createdAt={viewMovement.createdAt}
                    onClose={() => setViewMovement(null)}
                    onExport={(cid) => {
                        setHistoricExport({
                            clientId: cid,
                            customerName: viewMovement.customerName,
                            createdAt: viewMovement.createdAt,
                            items: viewMovement.items
                        })
                        setViewMovement(null)
                    }}
                />
            )}

            {/* Modal de Validação de Estoque (Aviso) */}
            {stockValidationError && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-red-950/40 backdrop-blur-md" onClick={() => setStockValidationError(null)} />
                    <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
                        <div className="px-8 py-6 border-b border-red-50 bg-red-50/50 flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-red-900 tracking-tight">Estoque Insuficiente</h2>
                                <p className="text-sm font-bold text-red-600/60 mt-0.5">Alguns itens excedem o saldo atual</p>
                            </div>
                        </div>

                        <div className="p-8 space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar">
                            {stockValidationError.map((err, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="font-bold text-slate-900 text-sm leading-tight">{err.productName}</p>
                                    <div className="flex items-center justify-between mt-3 text-xs">
                                        <div className="text-slate-500">
                                            Solicitado: <span className="font-black text-slate-900">{err.requested} {err.unit}</span>
                                        </div>
                                        <div className="text-red-600 font-bold bg-white px-2 py-1 rounded-lg border border-red-100">
                                            Disponível: {err.available} {err.unit}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <p className="text-xs text-slate-400 font-medium leading-relaxed text-center px-4">
                                Deseja prosseguir com a saída mesmo com o estoque negativo ou prefere ajustar as quantidades?
                            </p>
                        </div>

                        <div className="p-8 pt-4 flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setStockValidationError(null)
                                    executeFinalize()
                                }}
                                className="w-full h-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl shadow-red-600/20"
                            >
                                Confirmar Saída Mesmo Assim
                            </button>
                            <button
                                onClick={() => setStockValidationError(null)}
                                className="w-full h-14 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-sm transition-all active:scale-95"
                            >
                                Voltar e Ajustar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Navegação (Para saída da rota) */}
            {blocker.state === 'blocked' && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => blocker.reset()} />
                    <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="px-8 py-8 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-red-100/50">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Abandonar Romaneio?</h2>
                            <p className="text-sm font-bold text-slate-500 leading-relaxed px-2">
                                Você tem itens no carrinho que serão <span className="text-red-600">perdidos</span> se sair desta tela agora.
                            </p>
                        </div>

                        <div className="p-8 pt-0 flex flex-col gap-3">
                            <button
                                onClick={() => blocker.proceed()}
                                className="w-full h-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl shadow-red-600/20"
                            >
                                Sim, desejo sair
                            </button>
                            <button
                                onClick={() => blocker.reset()}
                                className="w-full h-14 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-sm transition-all active:scale-95"
                            >
                                Continuar Editando
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={itemToRemove !== null}
                onClose={() => setItemToRemove(null)}
                onConfirm={() => {
                    if (itemToRemove !== null) {
                        removeFromCart(itemToRemove)
                        setItemToRemove(null)
                    }
                }}
                title="Remover Item?"
                message="Tem certeza que deseja remover este produto do romaneio?"
                confirmText="Sim, remover"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    )
}
