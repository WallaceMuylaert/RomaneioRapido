import { lazy, Suspense, useState, useEffect, useRef, type FormEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import api from '@/services/api'
import LoadingOverlay from '@/components/LoadingOverlay'
import { toast } from 'react-hot-toast'
import { translateError } from '@/utils/errors'
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    X,
    Loader2,
    Boxes,
    ScanBarcode,
    AlertTriangle,
    Camera,
    Image as ImageIcon,
    MoreVertical,
    ArrowDownUp,
    ChevronUp,
    ChevronDown,
    Download
} from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import { getBase64FromUrl } from '@/utils/imageUtils'
import logoImg from '@/assets/romaneiorapido_logo.png'

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))
const ImageCropper = lazy(() => import('@/components/ImageCropper'))

const applyCurrencyMask = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) return "";
    const numberValue = Number(cleaned) / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numberValue);
}

const parseCurrency = (value: string | number) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const cleaned = value.replace(/\D/g, '');
    return Number(cleaned) / 100;
}

const validateNonNegative = (value: number, label: string) => {
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`${label} deve ser maior ou igual a 0.`)
    }
}

const numberChanged = (current: number, previous?: number | null) => {
    return previous == null || Math.abs(current - previous) > 0.000001
}

interface Category {
    id: number
    name: string
}

interface Product {
    id: number
    name: string
    sku: string | null
    barcode: string | null
    description: string | null
    price: number
    cost_price: number | null
    stock_quantity: number
    min_stock: number
    category_id: number | null
    unit: string
    image_base64: string | null
    is_active: boolean
    color: string | null
    size: string | null
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
    const [openMenuId, setOpenMenuId] = useState<number | null>(null)
    const [openMenuSource, setOpenMenuSource] = useState<'mobile' | 'desktop' | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
    const [sortBy, setSortBy] = useState('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [cameraOpen, setCameraOpen] = useState(false)
    const [focusedIndex, setFocusedIndex] = useState(-1)

    // Create category on the fly
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [creatingCategoryLoader, setCreatingCategoryLoader] = useState(false)

    // Image Upload State
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Pagination state
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalProducts, setTotalProducts] = useState(0)
    const perPage = 10

    // Form state
    const [form, setForm] = useState({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        price: '',
        cost_price: '',
        stock_quantity: '',
        min_stock: '',
        unit: 'UN',
        category_id: '',
        image_base64: '',
        color: '',
        size: ''
    })

    const [colorFilter, setColorFilter] = useState('')
    const [sizeFilter, setSizeFilter] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [logoBase64, setLogoBase64] = useState<string>('')
    const [reportMenuOpen, setReportMenuOpen] = useState(false)
    const [stockModalOpen, setStockModalOpen] = useState(false)
    const [stockProduct, setStockProduct] = useState<Product | null>(null)
    const [stockQuantity, setStockQuantity] = useState('')
    const [stockSaving, setStockSaving] = useState(false)

    useEffect(() => {
        getBase64FromUrl(logoImg).then(setLogoBase64).catch(console.error)
    }, [])


    const fetchProducts = async (p: number = page) => {
        try {
            const params: any = {
                page: p,
                per_page: perPage,
                sort_by: sortBy,
                order: sortOrder
            }
            if (search) params.search = search
            if (colorFilter) params.color = colorFilter
            if (sizeFilter) params.size = sizeFilter
            if (categoryFilter) params.category_id = categoryFilter
            const res = await api.get('/products/', { params })
            setProducts(res.data.items)
            setTotalPages(res.data.pages)
            setTotalProducts(res.data.total)
            setPage(res.data.page)
        } catch (err) {
            console.error('Erro ao buscar produtos:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const res = await api.get('/categories/')
            setCategories(res.data)
        } catch (err) {
            console.error('Erro ao buscar categorias:', err)
        }
    }

    useEffect(() => {
        fetchProducts(1)
    }, [sortBy, sortOrder, search])

    useEffect(() => {
        fetchCategories()
    }, [])

    const handleScanResult = async (code: string) => {
        try {
            const res = await api.get(`/products/barcode/${code.trim()}`)
            if (res.data) {
                const productInfo = Array.isArray(res.data) ? res.data[0] : res.data
                if (productInfo) {
                    openEdit(productInfo)
                    return
                }
            }
            openCreate(code.trim())
        } catch {
            openCreate(code.trim())
        }
    }

    // Suporte para Scanner USB (Bip) Global
    useEffect(() => {
        let buffer = ''
        let lastKeyTime = Date.now()

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            const currentTime = Date.now()
            if (currentTime - lastKeyTime > 50) buffer = ''

            if (e.key === 'Enter') {
                if (buffer.length > 3) {
                    handleScanResult(buffer)
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


    useEffect(() => {
        const timeout = setTimeout(() => {
            setPage(1)
            setFocusedIndex(-1)
            fetchProducts(1)
        }, 300)
        return () => clearTimeout(timeout)
    }, [search, colorFilter, sizeFilter, categoryFilter])

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (products.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedIndex(prev => (prev < products.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev))
        } else if (e.key === 'Enter') {
            if (focusedIndex >= 0) {
                e.preventDefault()
                openEdit(products[focusedIndex])
            }
        } else if (e.key === 'Escape') {
            setFocusedIndex(-1)
        }
    }

    const tableBodyRef = useRef<HTMLTableSectionElement>(null)

    useEffect(() => {
        if (focusedIndex >= 0 && tableBodyRef.current) {
            const row = tableBodyRef.current.children[focusedIndex] as HTMLElement
            if (row) {
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        }
    }, [focusedIndex])

    const openCreate = (initialBarcode: string = '') => {
        setEditingProduct(null)
        setForm({
            name: '',
            sku: '',
            barcode: initialBarcode,
            description: '',
            price: '',
            cost_price: '',
            stock_quantity: '0',
            min_stock: '0',
            unit: 'UN',
            category_id: '',
            image_base64: '',
            color: '',
            size: ''
        })
        setImagePreview(null)
        setCropImageSrc(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setIsCreatingCategory(false)
        setNewCategoryName('')
        setModalOpen(true)
    }

    const openEdit = (p: Product) => {
        setEditingProduct(p)
        setForm({
            name: p.name,
            sku: p.sku || '',
            barcode: p.barcode || '',
            description: p.description || '',
            price: p.price != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price) : '',
            cost_price: p.cost_price != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.cost_price) : '',
            stock_quantity: String(p.stock_quantity),
            min_stock: String(p.min_stock),
            unit: p.unit || 'UN',
            category_id: p.category_id ? String(p.category_id) : '',
            image_base64: p.image_base64 || '',
            color: p.color || '',
            size: p.size || ''
        })
        setImagePreview(p.image_base64 || null)
        setCropImageSrc(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setIsCreatingCategory(false)
        setNewCategoryName('')
        setModalOpen(true)
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.onload = () => {
                // Se for muito grande, obriga a cortar (aqui simulamos cortar sempre que selecionar para garantir padronização 1:1)
                setCropImageSrc(reader.result as string)
            }
            reader.readAsDataURL(file)
            e.target.value = '' // reset
        }
    }

    const handleCropComplete = (blob: Blob) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            const base64String = reader.result as string
            setForm(prev => ({ ...prev, image_base64: base64String }))
            setImagePreview(base64String)
        }
        reader.readAsDataURL(blob)
        setCropImageSrc(null)
    }

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setCreatingCategoryLoader(true)
        try {
            const res = await api.post('/categories/', { name: newCategoryName.trim(), description: null })
            const newCat = res.data
            setCategories(prev => [...prev, newCat])
            setForm(prev => ({ ...prev, category_id: String(newCat.id) }))
            setIsCreatingCategory(false)
            setNewCategoryName('')
            toast.success('Categoria criada!', { id: 'product-success' })
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Erro ao criar categoria', { id: 'product-error' })
        } finally {
            setCreatingCategoryLoader(false)
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const price = typeof form.price === 'string' ? parseCurrency(form.price) : (parseFloat(form.price) || 0)
            const costPrice = typeof form.cost_price === 'string' ? parseCurrency(form.cost_price) : (parseFloat(form.cost_price) || 0)
            const stockQuantity = parseFloat(form.stock_quantity) || 0
            const minStock = parseFloat(form.min_stock) || 0

            const payload: any = {
                name: form.name,
                sku: form.sku || null,
                barcode: form.barcode || null,
                description: form.description || null,
                unit: form.unit,
                category_id: form.category_id ? parseInt(form.category_id) : null,
                image_base64: form.image_base64 || null,
                color: form.color || null,
                size: form.size || null
            }

            if (editingProduct) {
                if (numberChanged(price, editingProduct.price) || price >= 0) {
                    validateNonNegative(price, 'Preço de venda')
                    payload.price = price
                }
                if (numberChanged(costPrice, editingProduct.cost_price) || costPrice >= 0) {
                    validateNonNegative(costPrice, 'Preço de custo')
                    payload.cost_price = costPrice
                }
                if (numberChanged(stockQuantity, editingProduct.stock_quantity) || stockQuantity >= 0) {
                    validateNonNegative(stockQuantity, 'Quantidade')
                    payload.stock_quantity = stockQuantity
                }
                if (numberChanged(minStock, editingProduct.min_stock) || minStock >= 0) {
                    validateNonNegative(minStock, 'Estoque mínimo')
                    payload.min_stock = minStock
                }
                await api.put(`/products/${editingProduct.id}`, payload)
            } else {
                validateNonNegative(price, 'Preço de venda')
                validateNonNegative(costPrice, 'Preço de custo')
                validateNonNegative(stockQuantity, 'Quantidade')
                validateNonNegative(minStock, 'Estoque mínimo')
                payload.price = price
                payload.cost_price = costPrice
                payload.stock_quantity = stockQuantity
                payload.min_stock = minStock
                await api.post('/products/', payload)
            }

            setModalOpen(false)
            fetchProducts()
            toast.success('Produto salvo com sucesso!', { id: 'product-success' })
        } catch (err: any) {
            toast.error(!err.response && err.message ? err.message : translateError(err.response?.data?.detail) || 'Erro ao salvar produto', { id: 'product-error' })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/products/${id}`)
            setDeleteConfirm(null)
            toast.success('Produto excluído com sucesso', { id: 'product-success' })
            fetchProducts()
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Erro ao deletar produto', { id: 'product-error' })
            console.error('Erro ao deletar produto:', err)
        }
    }

    const getCategoryName = (categoryId: number | null) => {
        if (!categoryId) return '—'
        return categories.find(c => c.id === categoryId)?.name || '—'
    }

    const getStockStatus = (p: Product) => {
        if (p.stock_quantity <= 0) return { label: 'Zerado', class: 'bg-error/10 text-error' }
        if (p.stock_quantity <= p.min_stock) return { label: 'Baixo', class: 'bg-warning/10 text-warning' }
        return { label: 'OK', class: 'bg-emerald-50 text-emerald-600' }
    }

    const closeActionsMenu = () => {
        setOpenMenuId(null)
        setOpenMenuSource(null)
        setMenuPosition(null)
    }

    const updateActionsMenuPosition = (button: HTMLButtonElement) => {
        if (window.innerWidth < 640) {
            setMenuPosition(null)
            return
        }

        const rect = button.getBoundingClientRect()
        const menuWidth = 176
        const menuHeight = 168
        const gap = 8
        const edgePadding = 12

        const left = Math.min(
            Math.max(edgePadding, rect.right - menuWidth),
            window.innerWidth - menuWidth - edgePadding
        )
        const hasRoomBelow = window.innerHeight - rect.bottom >= menuHeight + gap
        const top = hasRoomBelow
            ? Math.min(rect.bottom + gap, window.innerHeight - menuHeight - edgePadding)
            : Math.max(edgePadding, rect.top - menuHeight - gap)

        setMenuPosition({ top, left })
    }

    const toggleActionsMenu = (e: MouseEvent<HTMLButtonElement>, productId: number, source: 'mobile' | 'desktop') => {
        e.stopPropagation()

        if (openMenuId === productId && openMenuSource === source) {
            closeActionsMenu()
            return
        }

        updateActionsMenuPosition(e.currentTarget)
        setOpenMenuId(productId)
        setOpenMenuSource(source)
    }

    const renderActionsMenu = (p: Product, source: 'mobile' | 'desktop') => {
        if (openMenuId !== p.id || openMenuSource !== source) return null
        if (typeof document === 'undefined') return null

        return createPortal(
            <>
                <div className="fixed inset-0 z-[90]" onClick={closeActionsMenu} />
                <div
                    style={menuPosition ? { top: menuPosition.top, left: menuPosition.left } : undefined}
                    className="fixed w-44 bg-card rounded-2xl shadow-2xl border border-border z-[100] py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden max-sm:left-3 max-sm:right-3 max-sm:bottom-4 max-sm:top-auto max-sm:w-auto max-sm:origin-bottom"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => { openAddStock(p); closeActionsMenu(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors text-left"
                    >
                        <Plus className="w-4 h-4" /> Adicionar estoque
                    </button>
                    <button
                        onClick={() => { openEdit(p); closeActionsMenu(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-text-secondary hover:bg-background hover:text-brand-600 transition-colors text-left"
                    >
                        <Pencil className="w-4 h-4" /> Editar Produto
                    </button>
                    <button
                        onClick={() => { setDeleteConfirm(p.id); closeActionsMenu(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-error hover:bg-error/10 transition-colors text-left border-t border-slate-50"
                    >
                        <Trash2 className="w-4 h-4" /> Excluir Registro
                    </button>
                </div>
            </>,
            document.body
        )
    }

    const openAddStock = (p: Product) => {
        setStockProduct(p)
        setStockQuantity('')
        setStockModalOpen(true)
    }

    const handleAddStock = async (e: FormEvent) => {
        e.preventDefault()
        if (!stockProduct) return

        const quantity = parseFloat(stockQuantity)
        if (!Number.isFinite(quantity) || quantity <= 0) {
            toast.error('Informe uma quantidade válida.', { id: 'stock-error' })
            return
        }

        setStockSaving(true)
        try {
            await api.post('/inventory/movements', {
                product_id: stockProduct.id,
                quantity,
                movement_type: 'IN',
                notes: 'Reposição rápida'
            })
            toast.success('Estoque atualizado com sucesso!', { id: 'stock-success' })
            setStockModalOpen(false)
            setStockProduct(null)
            fetchProducts()
        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao adicionar estoque', { id: 'stock-error' })
        } finally {
            setStockSaving(false)
        }
    }

    const handleExportStockPDF = async (includePrices: boolean = true) => {
        try {
            toast.loading('Gerando relatório...', { id: 'report' });
            
            // Buscar todos os produtos com os filtros atuais (sem paginação limitando)
            const params: any = {
                page: 1,
                per_page: 1000, // Limite alto para o relatório
                sort_by: sortBy,
                order: sortOrder,
                include_images: false
            }
            if (search) params.search = search
            if (colorFilter) params.color = colorFilter
            if (sizeFilter) params.size = sizeFilter
            if (categoryFilter) params.category_id = categoryFilter

            const res = await api.get('/products/', { params })
            const allProducts: Product[] = res.data.items

            const printWindow = window.open('', '', 'width=900,height=800');
            if (!printWindow) {
                toast.error('Bloqueador de popup impediu a abertura do relatório.', { id: 'report' });
                return;
            }

            const now = new Date();
            const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
            const filename = `Relatorio_Estoque_${includePrices ? 'Completo' : 'Sem_Precos'}_${timestamp}`;

            const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

            const html = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <title>${filename}</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: 'Inter', -apple-system, sans-serif; 
                            padding: 50px; 
                            color: #1f2937; 
                            line-height: 1.5;
                            background: #fff;
                        }
                        .watermark-container { 
                            position: fixed; 
                            top: 0; left: 0; width: 100%; height: 100%; 
                            display: flex; align-items: center; justify-content: center; 
                            pointer-events: none; z-index: -1; 
                        }
                        .watermark-logo { 
                            width: 500px; 
                            opacity: 0.04; 
                            transform: rotate(-35deg); 
                        }
                        .header { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center; 
                            margin-bottom: 40px; 
                            border-bottom: 1px solid #e5e7eb; 
                            padding-bottom: 24px; 
                        }
                        .brand { display: flex; align-items: center; gap: 12px; }
                        .brand-logo { height: 40px; width: auto; object-fit: contain; }
                        .brand-name { font-size: 18px; font-weight: 800; color: #111827; letter-spacing: -0.025em; }
                        
                        .report-title-container { text-align: right; }
                        .report-title { font-size: 24px; font-weight: 900; color: #111827; letter-spacing: -0.025em; margin-bottom: 4px; }
                        .report-period { font-size: 14px; color: #6b7280; font-weight: 500; }

                        .stats-grid { 
                            display: grid; 
                            grid-template-columns: repeat(2, 1fr); 
                            gap: 20px; 
                            margin-bottom: 40px; 
                        }
                        .stat-card { 
                            padding: 24px; 
                            border-radius: 16px; 
                            background: #f9fafb; 
                            border: 1px solid #f3f4f6;
                        }
                        .stat-label { 
                            font-size: 12px; 
                            font-weight: 700; 
                            text-transform: uppercase; 
                            letter-spacing: 0.05em; 
                            color: #6b7280; 
                            margin-bottom: 8px; 
                        }
                        .stat-value { 
                            font-size: 32px; 
                            font-weight: 800; 
                            color: #111827; 
                            letter-spacing: -0.025em;
                        }

                        .section-title { 
                            font-size: 14px; 
                            font-weight: 800; 
                            text-transform: uppercase; 
                            letter-spacing: 0.05em; 
                            color: #111827; 
                            margin-bottom: 16px; 
                            padding-left: 4px;
                            border-left: 4px solid #10b981;
                        }

                        table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 40px; }
                        th { 
                            text-align: left; 
                            font-size: 11px; 
                            font-weight: 700; 
                            text-transform: uppercase; 
                            color: #6b7280; 
                            padding: 12px 16px; 
                            background: #f9fafb;
                            border-bottom: 1px solid #e5e7eb;
                        }
                        th:first-child { border-top-left-radius: 8px; }
                        th:last-child { border-top-right-radius: 8px; }
                        
                        td { 
                            padding: 12px 16px; 
                            font-size: 13px; 
                            border-bottom: 1px solid #f3f4f6; 
                            vertical-align: middle;
                        }
                        .row-main { font-weight: 600; color: #111827; }
                        .row-sub { font-size: 10px; color: #9ca3af; text-transform: uppercase; font-weight: 700; margin-top: 2px; }
                        .variant-info { font-size: 11px; color: #6b7280; font-weight: 600; }
                        .row-qty { font-weight: 700; color: #111827; text-align: center; }
                        .row-val { font-weight: 700; color: #4b5563; text-align: right; }
                        .row-total { font-weight: 800; color: #111827; text-align: right; }

                        .footer { 
                            margin-top: 60px; 
                            padding-top: 24px;
                            border-top: 1px solid #f3f4f6;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            font-size: 11px; 
                            color: #9ca3af; 
                            font-weight: 500;
                        }
                        
                        @media print {
                            body { padding: 30px; }
                            .stat-card { background: #f9fafb !important; -webkit-print-color-adjust: exact; }
                            th { background: #f9fafb !important; -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="watermark-container">
                        ${logoBase64 ? `<img src="${logoBase64}" class="watermark-logo" />` : ''}
                    </div>
                    <div class="header">
                        <div class="brand">
                            ${logoBase64 ? `<img src="${logoBase64}" class="brand-logo" />` : '<div style="width: 40px; height: 40px; background: #10b981; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px;">R</div>'}
                            <div class="brand-name">Romaneio Rápido</div>
                        </div>
                        <div class="report-title-container">
                            <div class="report-title">Relatório de Estoque</div>
                            <div class="report-period">Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}</div>
                        </div>
                    </div>

                    <div class="stats-grid" style="${!includePrices ? 'grid-template-columns: 1fr;' : ''}">
                        <div class="stat-card">
                            <div class="stat-label">Total de Itens</div>
                            <div class="stat-value">${allProducts.reduce((acc, p) => acc + p.stock_quantity, 0).toFixed(0)}</div>
                        </div>
                        ${includePrices ? `
                        <div class="stat-card">
                            <div class="stat-label">Valor Total em Estoque</div>
                            <div class="stat-value" style="color: #10b981;">${formatCurrency(allProducts.reduce((acc, p) => acc + (p.stock_quantity * p.price), 0))}</div>
                        </div>
                        ` : ''}
                    </div>

                    <div class="section-title">Listagem de Produtos</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Produto / Referência</th>
                                <th>Cor/Variação</th>
                                <th>Tam.</th>
                                <th style="text-align: center;">Qtd.</th>
                                ${includePrices ? `
                                <th style="text-align: right;">Preço Unit.</th>
                                <th style="text-align: right;">Total</th>
                                ` : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${allProducts.map(p => `
                                <tr>
                                    <td>
                                        <div class="row-main">${p.name}</div>
                                        <div class="row-sub">${p.barcode || p.sku || 'SEM SKU'}</div>
                                    </td>
                                    <td class="variant-info">${p.color || '-'}</td>
                                    <td class="variant-info">${p.size || '-'}</td>
                                    <td class="row-qty" style="${!includePrices ? 'text-align: right;' : ''}">${p.stock_quantity} <span style="font-size: 9px; color: #9ca3af;">${p.unit}</span></td>
                                    ${includePrices ? `
                                    <td class="row-val">${formatCurrency(p.price)}</td>
                                    <td class="row-total">${formatCurrency(p.stock_quantity * p.price)}</td>
                                    ` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="footer">
                        <div>www.romaneiorapido.com.br</div>
                        <div>Folha 1 de 1</div>
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                toast.dismiss('report');
            }, 300);

        } catch (err) {
            console.error('Erro ao gerar relatório:', err);
            toast.error('Erro ao gerar relatório de estoque.', { id: 'report' });
        }
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-text-primary">Produtos</h1>
                    <p className="text-sm text-text-secondary mt-0.5">{totalProducts} produto{totalProducts !== 1 ? 's' : ''} cadastrado{totalProducts !== 1 ? 's' : ''}</p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center">
                    <button
                        onClick={() => setCameraOpen(true)}
                        className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-[12px] font-bold text-text-secondary transition-colors hover:bg-background sm:h-9 sm:px-4 sm:text-[13px]"
                    >
                        <Camera className="w-4 h-4" /> Leitura rápida
                    </button>
                    <div className="relative min-w-0">
                        <button
                            onClick={() => setReportMenuOpen(!reportMenuOpen)}
                            className="flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-[12px] font-bold text-card shadow-sm transition-colors hover:bg-emerald-700 sm:h-9 sm:px-4 sm:text-[13px]"
                        >
                            <Download className="w-4 h-4" /> Relatório <ChevronDown className={`w-3 h-3 transition-transform ${reportMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {reportMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setReportMenuOpen(false)} />
                                <div className="absolute right-0 top-10 w-48 bg-card rounded-xl shadow-xl border border-border z-50 py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <button
                                        onClick={() => { handleExportStockPDF(true); setReportMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                                    >
                                        Relatório Completo
                                    </button>
                                    <button
                                        onClick={() => { handleExportStockPDF(false); setReportMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left border-t border-gray-50"
                                    >
                                        Relatório sem Preços
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => openCreate()}
                        className="col-span-2 flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-bold text-card shadow-sm transition-colors hover:bg-primary-dark sm:col-span-1 sm:h-9"
                    >
                        <Plus className="w-4 h-4" /> Novo Produto
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative sm:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/60" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, código de barras ou SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full h-10 pl-10 pr-4 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all placeholder-gray-300"
                    />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all font-medium text-text-secondary"
                    >
                        <option value="">Todas Categorias</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
                    <input
                        type="text"
                        placeholder="Cor..."
                        value={colorFilter}
                        onChange={(e) => setColorFilter(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all"
                    />
                    <input
                        type="text"
                        placeholder="Tam..."
                        value={sizeFilter}
                        onChange={(e) => setSizeFilter(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="py-4">
                    <LoadingOverlay message="Carregando produtos" rows={6} />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20">
                    <Boxes className="w-12 h-12 text-text-secondary/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-text-secondary">Nenhum produto encontrado</p>
                    <p className="text-xs text-text-secondary/60 mt-1">Clique em "Novo Produto" para começar</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid gap-3 md:hidden">
                        {products.map(p => {
                            const status = getStockStatus(p)
                            return (
                                <div key={p.id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(p)}
                                            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-border/50"
                                        >
                                            {p.image_base64 ? (
                                                <img src={p.image_base64} alt={p.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <ImageIcon className="h-4 w-4 text-text-secondary" />
                                            )}
                                        </button>

                                        <button type="button" onClick={() => openEdit(p)} className="min-w-0 flex-1 text-left">
                                            <p className="line-clamp-2 text-sm font-black leading-snug text-text-primary">{p.name}</p>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {(p.color || p.size) && (
                                                    <span className="rounded-md bg-border/50 px-1.5 py-0.5 text-[10px] font-bold text-text-secondary">
                                                        {[p.color, p.size].filter(Boolean).join(' / ')}
                                                    </span>
                                                )}
                                                {p.category_id && (
                                                    <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                                        {getCategoryName(p.category_id)}
                                                    </span>
                                                )}
                                            </div>
                                            {(p.sku || p.barcode) && (
                                                <p className="mt-1 truncate font-mono text-[10px] text-text-secondary">
                                                    {p.sku || p.barcode}
                                                </p>
                                            )}
                                        </button>

                                        <div className="relative shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => toggleActionsMenu(e, p.id, 'mobile')}
                                                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${openMenuId === p.id ? 'bg-brand-50 text-brand-600' : 'text-text-secondary hover:bg-border/50 hover:text-text-primary'}`}
                                                aria-label="Ações do produto"
                                            >
                                                <MoreVertical className="h-5 w-5" />
                                            </button>
                                            {renderActionsMenu(p, 'mobile')}
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-text-secondary">Estoque</p>
                                            <p className="mt-0.5 text-sm font-black text-text-primary">
                                                {p.stock_quantity} <span className="text-[10px] font-bold uppercase text-text-secondary">{p.unit}</span>
                                                {p.stock_quantity <= p.min_stock && p.min_stock > 0 && (
                                                    <AlertTriangle className="ml-1 inline h-3 w-3 text-warning" />
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-text-secondary">Preço</p>
                                            <p className="mt-0.5 text-sm font-black text-text-primary">R$ {p.price.toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black uppercase text-text-secondary">Status</p>
                                            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${status.class}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="hidden rounded-xl border border-border bg-card shadow-sm md:block">
                    <div className="overflow-x-auto min-h-[400px] pb-5">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-background/80 border-b border-border">
                                    <th
                                        className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-brand-600 transition-colors"
                                        onClick={() => {
                                            if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                            else { setSortBy('name'); setSortOrder('asc'); }
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            Produto
                                            {sortBy === 'name' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowDownUp className="w-3 h-3 opacity-30" />}
                                        </div>
                                    </th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden md:table-cell">SKU / Cód. Barras</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden lg:table-cell">Categoria</th>
                                    <th
                                        className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:text-brand-600 transition-colors"
                                        onClick={() => {
                                            if (sortBy === 'price') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                            else { setSortBy('price'); setSortOrder('desc'); }
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            Preço
                                            {sortBy === 'price' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowDownUp className="w-3 h-3 opacity-30" />}
                                        </div>
                                    </th>
                                    <th
                                        className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-brand-600 transition-colors"
                                        onClick={() => {
                                            if (sortBy === 'stock_quantity') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                            else { setSortBy('stock_quantity'); setSortOrder('desc'); }
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            Estoque
                                            {sortBy === 'stock_quantity' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowDownUp className="w-3 h-3 opacity-30" />}
                                        </div>
                                    </th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody ref={tableBodyRef} className="divide-y divide-gray-50">
                                {products.map((p, index) => {
                                    const status = getStockStatus(p)
                                    return (
                                        <tr
                                            key={p.id}
                                            className={`transition-colors ${focusedIndex === index ? 'bg-brand-50 border-l-4 border-brand-500 shadow-inner' : 'hover:bg-background/50'} `}
                                            onClick={() => openEdit(p)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-border/50 rounded-lg overflow-hidden border border-border flex items-center justify-center">
                                                        {p.image_base64 ? (
                                                            <img src={p.image_base64} alt={p.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <ImageIcon className="w-4 h-4 text-text-secondary" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-text-primary leading-tight flex items-center gap-2">
                                                            {p.name}
                                                            {(p.color || p.size) && (
                                                                <span className="text-[10px] bg-border/50 text-text-secondary px-1.5 py-0.5 rounded-md font-semibold">
                                                                    {[p.color, p.size].filter(Boolean).join(' • ')}
                                                                </span>
                                                            )}
                                                        </p>
                                                        {p.description && <p className="text-[11px] text-text-secondary mt-1 line-clamp-2 max-w-sm leading-snug">{p.description}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <div className="space-y-0.5">
                                                    {p.sku && <p className="text-xs font-mono text-text-secondary">{p.sku}</p>}
                                                    {p.barcode && (
                                                        <p className="text-xs font-mono text-text-secondary flex items-center justify-center gap-1">
                                                            <ScanBarcode className="w-3 h-3" />{p.barcode}
                                                        </p>
                                                    )}
                                                    {!p.sku && !p.barcode && <span className="text-text-secondary/60">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-text-secondary hidden lg:table-cell">{getCategoryName(p.category_id)}</td>
                                            <td className="px-4 py-3 text-center font-medium text-text-secondary hidden sm:table-cell">
                                                R$ {p.price.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-semibold text-text-primary">{p.stock_quantity} <span className="text-[10px] text-text-secondary font-medium uppercase">{p.unit}</span></span>
                                                {p.stock_quantity <= p.min_stock && p.min_stock > 0 && (
                                                    <AlertTriangle className="w-3 h-3 text-warning inline ml-1" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.class}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="relative flex justify-center">
                                                    <button
                                                        onClick={(e) => toggleActionsMenu(e, p.id, 'desktop')}
                                                        className={`rounded-xl p-2.5 transition-all ${openMenuId === p.id ? 'bg-brand-50 text-brand-600' : 'text-text-secondary hover:bg-border/50 hover:text-text-primary'} `}
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>

                                                    {renderActionsMenu(p, 'desktop')}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-xs text-text-secondary order-2 sm:order-1">
                                Mostrando <span className="font-semibold text-text-secondary">{(page - 1) * 10 + 1}–{Math.min(page * 10, totalProducts)}</span> de <span className="font-semibold text-text-secondary">{totalProducts}</span>
                            </p>
                            <div className="flex items-center gap-1.5 order-1 sm:order-2">
                                <button
                                    onClick={() => fetchProducts(page - 1)}
                                    disabled={page <= 1}
                                    className="h-8 px-3 text-xs font-semibold border border-border rounded-lg hover:bg-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    ←
                                </button>
                                <div className="flex items-center gap-0.5">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                        .map((p, i, arr) => (
                                            <span key={p}>
                                                {i > 0 && arr[i - 1] !== p - 1 && <span className="text-text-secondary/60 px-0.5">…</span>}
                                                <button
                                                    onClick={() => fetchProducts(p)}
                                                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${p === page
                                                        ? 'bg-primary text-card shadow-sm'
                                                        : 'text-text-secondary hover:bg-border/50'
                                                        } `}
                                                >
                                                    {p}
                                                </button>
                                            </span>
                                        ))
                                    }
                                </div>
                                <button
                                    onClick={() => fetchProducts(page + 1)}
                                    disabled={page >= totalPages}
                                    className="h-8 px-3 text-xs font-semibold border border-border rounded-lg hover:bg-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    )}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 shadow-sm md:hidden">
                            <button
                                onClick={() => fetchProducts(page - 1)}
                                disabled={page <= 1}
                                className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-text-secondary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-30"
                            >
                                Anterior
                            </button>
                            <span className="text-xs font-bold text-text-secondary">
                                {page} de {totalPages}
                            </span>
                            <button
                                onClick={() => fetchProducts(page + 1)}
                                disabled={page >= totalPages}
                                className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-text-secondary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-30"
                            >
                                Proxima
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Criar/Editar */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 z-10 bg-card px-6 py-4 border-b border-border flex items-center justify-between rounded-t-2xl">
                            <h2 className="text-base font-bold text-text-primary">
                                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-text-secondary hover:text-text-secondary">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">

                            {/* Upload de Foto */}
                            <div className="flex justify-center mb-6">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border bg-background flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-brand-50">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <ImageIcon className="w-6 h-6 text-text-secondary group-hover:text-brand-500 mb-1" />
                                                <span className="text-[10px] font-semibold text-text-secondary group-hover:text-brand-500 text-center leading-tight">Adicionar<br />Foto</span>
                                            </>
                                        )}
                                    </div>
                                    {imagePreview && (
                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                            <Pencil className="w-5 h-5 text-card" />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageSelect}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            {/* Nome */}
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nome *</label>
                                <input
                                    required
                                    autoFocus
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all"
                                    placeholder="Nome do produto"
                                />
                            </div>

                            {/* SKU + Barcode */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">SKU</label>
                                    <input
                                        value={form.sku}
                                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all font-mono"
                                        placeholder="BRQ-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Código de Barras</label>
                                    <input
                                        value={form.barcode}
                                        onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all font-mono"
                                        placeholder="7891234567890"
                                    />
                                </div>
                            </div>

                            {/* Descrição */}
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Descrição</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all resize-none"
                                    placeholder="Descrição opcional..."
                                />
                            </div>

                            {/* Cor + Tamanho */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Cor / Variante</label>
                                    <input
                                        value={form.color}
                                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all font-semibold"
                                        placeholder="Ex: Vermelho, Ouro"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Tamanho</label>
                                    <input
                                        value={form.size}
                                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all font-semibold uppercase"
                                        placeholder="Ex: M, 42, Único"
                                    />
                                </div>
                            </div>

                            {/* Preço + Custo */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Preço Venda</label>
                                    <input
                                        type="text"
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: applyCurrencyMask(e.target.value) })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all font-semibold"
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Preço Custo</label>
                                    <input
                                        type="text"
                                        value={form.cost_price}
                                        onChange={(e) => setForm({ ...form, cost_price: applyCurrencyMask(e.target.value) })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all font-semibold"
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                            </div>

                            {/* Estoque + Mínimo + Unidade */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Quantidade</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step={form.unit === 'UN' ? '1' : '0.01'}
                                        value={form.stock_quantity}
                                        onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all font-semibold"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Mínimo</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step={form.unit === 'UN' ? '1' : '0.01'}
                                        value={form.min_stock}
                                        onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Unidade</label>
                                    <select
                                        value={form.unit}
                                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all appearance-none font-bold text-primary"
                                    >
                                        <option value="UN">UN — Unidade</option>
                                        <option value="PCT">PCT — Pacote</option>
                                        <option value="CX">CX — Caixa</option>
                                        <option value="KG">KG — Quilograma</option>
                                        <option value="M">M — Metro</option>
                                        <option value="M2">M² — Metro Quadrado</option>
                                        <option value="PC">PC — Peça</option>
                                        <option value="L">L — Litro</option>
                                        <option value="DZ">DZ — Dúzia</option>
                                    </select>
                                </div>
                            </div>

                            {/* Categoria */}
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Categoria</label>
                                {!isCreatingCategory ? (
                                    <div className="flex gap-2">
                                        <select
                                            value={form.category_id}
                                            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                                            className="flex-1 h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all appearance-none"
                                        >
                                            <option value="">Sem categoria</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingCategory(true)}
                                            className="w-10 h-10 flex shrink-0 items-center justify-center bg-background text-text-secondary border border-border rounded-xl hover:bg-card hover:text-primary hover:border-blue-200 transition-colors shadow-sm"
                                            title="Nova Categoria"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <input
                                            autoFocus
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleCreateCategory();
                                                }
                                            }}
                                            className="flex-1 h-10 px-3 text-sm bg-brand-50/50 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all placeholder-blue-300 text-blue-900 font-semibold"
                                            placeholder="Nome da categoria..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCreatingCategory(false)
                                                setNewCategoryName('')
                                            }}
                                            className="w-10 h-10 flex shrink-0 items-center justify-center bg-background text-text-secondary border border-border rounded-xl hover:bg-border/50 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCreateCategory}
                                            disabled={creatingCategoryLoader || !newCategoryName.trim()}
                                            className="w-10 h-10 flex shrink-0 items-center justify-center bg-primary text-card rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors shadow-sm"
                                        >
                                            {creatingCategoryLoader ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Botões */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 h-10 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-background transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 h-10 text-sm font-semibold bg-primary text-card rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {editingProduct ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {stockModalOpen && stockProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setStockModalOpen(false)} />
                    <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <div>
                                <h3 className="text-sm font-bold text-text-primary">Adicionar estoque</h3>
                                <p className="text-[11px] text-text-secondary">{stockProduct.name}</p>
                            </div>
                            <button
                                onClick={() => setStockModalOpen(false)}
                                className="rounded-lg p-1 text-text-secondary hover:text-text-secondary"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleAddStock} className="px-5 py-4 space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Quantidade</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step={stockProduct.unit === 'UN' ? '1' : '0.01'}
                                        value={stockQuantity}
                                        onChange={(e) => setStockQuantity(e.target.value)}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all font-semibold"
                                        placeholder="0"
                                    />
                                    <span className="text-xs font-bold text-text-secondary uppercase">{stockProduct.unit}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStockModalOpen(false)}
                                    disabled={stockSaving}
                                    className="flex-1 h-10 text-sm font-semibold text-text-secondary bg-card border border-border rounded-xl hover:bg-background transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={stockSaving}
                                    className="flex-1 h-10 text-sm font-semibold text-card bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {stockSaving && (
                                        <span className="w-3 h-3 border-2 border-card/30 border-t-white rounded-full animate-spin" />
                                    )}
                                    Adicionar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Camera Scanner */}
            {cameraOpen && (
                <Suspense fallback={null}>
                <BarcodeScanner
                    onScan={async (code) => {
                        setCameraOpen(false)
                        try {
                            const res = await api.get(`/products/barcode/${code.trim()}`)
                            if (res.data) {
                                // Se for array, pega o primeiro, senão usa o objeto direto
                                const productInfo = Array.isArray(res.data) ? res.data[0] : res.data
                                if (productInfo) {
                                    openEdit(productInfo)
                                    return
                                }
                            }
                            openCreate(code)
                        } catch {
                            // Se der erro (404), o produto não existe, então cria um novo
                            openCreate(code)
                        }
                    }}
                    onClose={() => setCameraOpen(false)}
                />
                </Suspense>
            )}

            {/* Cropper */}
            {cropImageSrc && (
                <Suspense fallback={null}>
                <ImageCropper
                    imageSrc={cropImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCropImageSrc(null)}
                />
                </Suspense>
            )}
            {/* CONFIRM DELETE */}
            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                title="Excluir Produto"
                message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita e afetará o histórico de movimentações."
                confirmText="Excluir"
                loading={loading}
            />
        </div>
    )
}
