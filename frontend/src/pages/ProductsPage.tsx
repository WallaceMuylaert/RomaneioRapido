import { useState, useEffect, useRef, type FormEvent } from 'react'
import api from '../services/api'
import LoadingOverlay from '../components/LoadingOverlay'
import { toast } from 'react-hot-toast'
import { translateError } from '../utils/errors'
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
import BarcodeScanner from '../components/BarcodeScanner'
import ImageCropper from '../components/ImageCropper'
import ConfirmModal from '../components/ConfirmModal'
import { getBase64FromUrl } from '../utils/imageUtils'
import logoImg from '../assets/romaneiorapido_logo.png'

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
            const payload = {
                name: form.name,
                sku: form.sku || null,
                barcode: form.barcode || null,
                description: form.description || null,
                price: typeof form.price === 'string' ? parseCurrency(form.price) : (parseFloat(form.price) || 0),
                cost_price: typeof form.cost_price === 'string' ? parseCurrency(form.cost_price) : (parseFloat(form.cost_price) || 0),
                stock_quantity: parseFloat(form.stock_quantity) || 0,
                min_stock: parseFloat(form.min_stock) || 0,
                unit: form.unit,
                category_id: form.category_id ? parseInt(form.category_id) : null,
                image_base64: form.image_base64 || null,
                color: form.color || null,
                size: form.size || null
            }

            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, payload)
            } else {
                await api.post('/products/', payload)
            }

            setModalOpen(false)
            fetchProducts()
            toast.success('Produto salvo com sucesso!', { id: 'product-success' })
        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao salvar produto', { id: 'product-error' })
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
        if (p.stock_quantity <= 0) return { label: 'Zerado', class: 'bg-red-50 text-red-600' }
        if (p.stock_quantity < p.min_stock) return { label: 'Baixo', class: 'bg-amber-50 text-amber-600' }
        return { label: 'OK', class: 'bg-emerald-50 text-emerald-600' }
    }

    const renderActionsMenu = (p: Product) => {
        if (openMenuId !== p.id) return null

        return (
            <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                <div className="absolute right-0 top-10 w-44 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:bottom-4 max-sm:top-auto max-sm:w-auto max-sm:origin-bottom">
                    <button
                        onClick={(e) => { e.stopPropagation(); openEdit(p); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors text-left"
                    >
                        <Pencil className="w-4 h-4" /> Editar Produto
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p.id); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left border-t border-slate-50"
                    >
                        <Trash2 className="w-4 h-4" /> Excluir Registro
                    </button>
                </div>
            </>
        )
    }

    const handleExportStockPDF = async (includePrices: boolean = true) => {
        try {
            toast.loading('Gerando relatório...', { id: 'report' });
            
            // Buscar todos os produtos com os filtros atuais (sem paginação limitando)
            const params: any = {
                page: 1,
                per_page: 1000, // Limite alto para o relatório
                sort_by: sortBy,
                order: sortOrder
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
                    <h1 className="text-xl font-bold text-gray-900">Produtos</h1>
                    <p className="text-sm text-gray-400 mt-0.5">{totalProducts} produto{totalProducts !== 1 ? 's' : ''} cadastrado{totalProducts !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCameraOpen(true)}
                        className="h-9 px-4 text-[13px] font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <Camera className="w-4 h-4" /> Leitura rápida
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setReportMenuOpen(!reportMenuOpen)}
                            className="h-9 px-4 text-[13px] font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Relatório <ChevronDown className={`w-3 h-3 transition-transform ${reportMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {reportMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setReportMenuOpen(false)} />
                                <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <button
                                        onClick={() => { handleExportStockPDF(true); setReportMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                                    >
                                        Relatório Completo
                                    </button>
                                    <button
                                        onClick={() => { handleExportStockPDF(false); setReportMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left border-t border-gray-50"
                                    >
                                        Relatório sem Preços
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => openCreate()}
                        className="h-9 px-4 text-[13px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Novo Produto
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, código de barras ou SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder-gray-300"
                    />
                </div>
                <div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium text-gray-600"
                    >
                        <option value="">Todas Categorias</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <input
                        type="text"
                        placeholder="Cor..."
                        value={colorFilter}
                        onChange={(e) => setColorFilter(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                    <input
                        type="text"
                        placeholder="Tam..."
                        value={sizeFilter}
                        onChange={(e) => setSizeFilter(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 relative min-h-[400px]">
                    <LoadingOverlay message="Carregando Produtos..." />
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin opacity-20" />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20">
                    <Boxes className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-400">Nenhum produto encontrado</p>
                    <p className="text-xs text-gray-300 mt-1">Clique em "Novo Produto" para começar</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="overflow-x-auto min-h-[400px] pb-32">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                    <th
                                        className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-brand-600 transition-colors"
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
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">SKU / Cód. Barras</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Categoria</th>
                                    <th
                                        className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:text-brand-600 transition-colors"
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
                                        className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-brand-600 transition-colors"
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
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody ref={tableBodyRef} className="divide-y divide-gray-50">
                                {products.map((p, index) => {
                                    const status = getStockStatus(p)
                                    return (
                                        <tr
                                            key={p.id}
                                            className={`transition - colors ${focusedIndex === index ? 'bg-blue-50 border-l-4 border-blue-500 shadow-inner' : 'hover:bg-gray-50/50'} `}
                                            onClick={() => openEdit(p)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                                                        {p.image_base64 ? (
                                                            <img src={p.image_base64} alt={p.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <ImageIcon className="w-4 h-4 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 leading-tight flex items-center gap-2">
                                                            {p.name}
                                                            {(p.color || p.size) && (
                                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-semibold">
                                                                    {[p.color, p.size].filter(Boolean).join(' • ')}
                                                                </span>
                                                            )}
                                                        </p>
                                                        {p.description && <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 max-w-sm leading-snug">{p.description}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <div className="space-y-0.5">
                                                    {p.sku && <p className="text-xs font-mono text-gray-500">{p.sku}</p>}
                                                    {p.barcode && (
                                                        <p className="text-xs font-mono text-gray-400 flex items-center justify-center gap-1">
                                                            <ScanBarcode className="w-3 h-3" />{p.barcode}
                                                        </p>
                                                    )}
                                                    {!p.sku && !p.barcode && <span className="text-gray-300">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-500 hidden lg:table-cell">{getCategoryName(p.category_id)}</td>
                                            <td className="px-4 py-3 text-center font-medium text-gray-700 hidden sm:table-cell">
                                                R$ {p.price.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-semibold text-gray-800">{p.stock_quantity} <span className="text-[10px] text-gray-400 font-medium uppercase">{p.unit}</span></span>
                                                {p.stock_quantity < p.min_stock && p.min_stock > 0 && (
                                                    <AlertTriangle className="w-3 h-3 text-amber-500 inline ml-1" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px - 2 py - 0.5 rounded - full text - [10px] font - semibold ${status.class} `}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="relative flex justify-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(openMenuId === p.id ? null : p.id);
                                                        }}
                                                        className={`p - 2.5 rounded - xl transition - all ${openMenuId === p.id ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'} `}
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>

                                                    {renderActionsMenu(p)}
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
                        <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-xs text-gray-400 order-2 sm:order-1">
                                Mostrando <span className="font-semibold text-gray-600">{(page - 1) * 10 + 1}–{Math.min(page * 10, totalProducts)}</span> de <span className="font-semibold text-gray-600">{totalProducts}</span>
                            </p>
                            <div className="flex items-center gap-1.5 order-1 sm:order-2">
                                <button
                                    onClick={() => fetchProducts(page - 1)}
                                    disabled={page <= 1}
                                    className="h-8 px-3 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    ←
                                </button>
                                <div className="flex items-center gap-0.5">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                        .map((p, i, arr) => (
                                            <span key={p}>
                                                {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-300 px-0.5">…</span>}
                                                <button
                                                    onClick={() => fetchProducts(p)}
                                                    className={`w - 8 h - 8 text - xs font - semibold rounded - lg transition - colors ${p === page
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'text-gray-500 hover:bg-gray-100'
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
                                    className="h-8 px-3 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Criar/Editar */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
                            <h2 className="text-base font-bold text-gray-900">
                                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">

                            {/* Upload de Foto */}
                            <div className="flex justify-center mb-6">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-500 mb-1" />
                                                <span className="text-[10px] font-semibold text-gray-400 group-hover:text-blue-500 text-center leading-tight">Adicionar<br />Foto</span>
                                            </>
                                        )}
                                    </div>
                                    {imagePreview && (
                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                            <Pencil className="w-5 h-5 text-white" />
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
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nome *</label>
                                <input
                                    required
                                    autoFocus
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                    placeholder="Nome do produto"
                                />
                            </div>

                            {/* SKU + Barcode */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">SKU</label>
                                    <input
                                        value={form.sku}
                                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono"
                                        placeholder="BRQ-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Código de Barras</label>
                                    <input
                                        value={form.barcode}
                                        onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono"
                                        placeholder="7891234567890"
                                    />
                                </div>
                            </div>

                            {/* Descrição */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Descrição</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
                                    placeholder="Descrição opcional..."
                                />
                            </div>

                            {/* Cor + Tamanho */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cor / Variante</label>
                                    <input
                                        value={form.color}
                                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-semibold"
                                        placeholder="Ex: Vermelho, Ouro"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tamanho</label>
                                    <input
                                        value={form.size}
                                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-semibold uppercase"
                                        placeholder="Ex: M, 42, Único"
                                    />
                                </div>
                            </div>

                            {/* Preço + Custo */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Preço Venda</label>
                                    <input
                                        type="text"
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: applyCurrencyMask(e.target.value) })}
                                        className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-semibold"
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Preço Custo</label>
                                    <input
                                        type="text"
                                        value={form.cost_price}
                                        onChange={(e) => setForm({ ...form, cost_price: applyCurrencyMask(e.target.value) })}
                                        className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-semibold"
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                            </div>

                            {/* Estoque + Mínimo + Unidade */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                                    <input
                                        type="number"
                                        step={form.unit === 'UN' ? '1' : '0.01'}
                                        value={form.stock_quantity}
                                        onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-semibold"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mínimo</label>
                                    <input
                                        type="number"
                                        step={form.unit === 'UN' ? '1' : '0.01'}
                                        value={form.min_stock}
                                        onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Unidade</label>
                                    <select
                                        value={form.unit}
                                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all appearance-none font-bold text-blue-600"
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
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Categoria</label>
                                {!isCreatingCategory ? (
                                    <div className="flex gap-2">
                                        <select
                                            value={form.category_id}
                                            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                                            className="flex-1 h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all appearance-none"
                                        >
                                            <option value="">Sem categoria</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingCategory(true)}
                                            className="w-10 h-10 flex shrink-0 items-center justify-center bg-gray-50 text-gray-600 border border-gray-200 rounded-xl hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
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
                                            className="flex-1 h-10 px-3 text-sm bg-blue-50/50 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder-blue-300 text-blue-900 font-semibold"
                                            placeholder="Nome da categoria..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCreatingCategory(false)
                                                setNewCategoryName('')
                                            }}
                                            className="w-10 h-10 flex shrink-0 items-center justify-center bg-gray-50 text-gray-400 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCreateCategory}
                                            disabled={creatingCategoryLoader || !newCategoryName.trim()}
                                            className="w-10 h-10 flex shrink-0 items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
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
                                    className="flex-1 h-10 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 h-10 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {editingProduct ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Camera Scanner */}
            {cameraOpen && (
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
            )}

            {/* Cropper */}
            {cropImageSrc && (
                <ImageCropper
                    imageSrc={cropImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCropImageSrc(null)}
                />
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
