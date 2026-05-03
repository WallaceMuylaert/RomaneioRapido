import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/services/api'
import LoadingOverlay from '@/components/LoadingOverlay'
import { toast } from 'react-hot-toast'
import { translateError } from '@/utils/errors'
import {
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    X,
    Loader2,
    Boxes,
    ScanBarcode,
    AlertTriangle,
    Tags,
    Camera,
    Image as ImageIcon,
    MoreVertical,
    ArrowDownUp,
    ChevronUp,
    ChevronDown
} from 'lucide-react'
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

interface Category {
    id: number
    name: string
    description: string | null
    position: number
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

export default function CategoryProductsPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const categoryId = parseInt(id || '0')

    const [category, setCategory] = useState<Category | null>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [allCategories, setAllCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
    const [openMenuId, setOpenMenuId] = useState<number | null>(null)
    const [sortBy, setSortBy] = useState('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [cameraOpen, setCameraOpen] = useState(false)

    // Image Upload State
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Pagination
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalProducts, setTotalProducts] = useState(0)
    const perPage = 10

    const [form, setForm] = useState({
        name: '',
        sku: '',
        barcode: '',
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


    const fetchCategory = async () => {
        try {
            const res = await api.get(`/categories/${categoryId}`)
            setCategory(res.data)
        } catch {
            navigate('/categorias')
        }
    }

    const fetchProducts = async (p: number = page) => {
        try {
            const params: any = {
                page: p,
                per_page: perPage,
                category_id: categoryId,
                sort_by: sortBy,
                order: sortOrder
            }
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

    const fetchAllCategories = async () => {
        try {
            const res = await api.get('/categories/')
            setAllCategories(res.data)
        } catch (err) {
            console.error('Erro ao buscar categorias:', err)
        }
    }

    useEffect(() => {
        fetchProducts(1)
    }, [sortBy, sortOrder])

    useEffect(() => {
        fetchCategory()
        fetchProducts()
        fetchAllCategories()
    }, [categoryId])

    const getStockStatus = (p: Product) => {
        if (p.stock_quantity <= 0) return { label: 'Zerado', class: 'bg-error/10 text-error' }
        if (p.stock_quantity <= p.min_stock) return { label: 'Baixo', class: 'bg-warning/10 text-warning' }
        return { label: 'OK', class: 'bg-emerald-50 text-emerald-600' }
    }

    const openCreate = (barcode: string = '') => {
        setEditingProduct(null)
        setForm({
            name: '',
            sku: '',
            barcode,
            description: '',
            price: '',
            cost_price: '',
            stock_quantity: '0',
            min_stock: '0',
            unit: 'UN',
            category_id: String(categoryId),
            image_base64: '',
            color: '',
            size: ''
        })
        setImagePreview(null)
        setCropImageSrc(null)
        setModalOpen(true)
    }

    const openEdit = (p: Product) => {
        setEditingProduct(p)
        setForm({
            name: p.name,
            sku: p.sku || '',
            barcode: p.barcode || '',
            description: p.description || '',
            price: String(p.price),
            cost_price: String(p.cost_price || ''),
            stock_quantity: String(p.stock_quantity),
            min_stock: String(p.min_stock),
            unit: p.unit || 'UN',
            category_id: p.category_id ? String(p.category_id) : String(categoryId),
            image_base64: p.image_base64 || '',
            color: p.color || '',
            size: p.size || ''
        })
        setImagePreview(p.image_base64 || null)
        setCropImageSrc(null)
        setModalOpen(true)
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.onload = () => {
                setCropImageSrc(reader.result as string)
            }
            reader.readAsDataURL(file)
            e.target.value = ''
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
                category_id: form.category_id ? parseInt(form.category_id) : categoryId,
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
            toast.success('Produto salvo com sucesso!')
        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao salvar produto')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/products/${id}`)
            setDeleteConfirm(null)
            fetchProducts()
        } catch (err) {
            console.error('Erro ao deletar produto:', err)
        }
    }

    if (!category) {
        return (
            <div className="py-4">
                <LoadingOverlay message="Buscando informações da categoria" rows={4} />
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/categorias')}
                        className="p-2 text-text-secondary hover:text-text-secondary hover:bg-border/50 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 text-primary flex items-center justify-center">
                                <Tags className="w-4 h-4" />
                            </div>
                            <h1 className="text-xl font-bold text-text-primary">{category.name}</h1>
                        </div>
                        <p className="text-sm text-text-secondary mt-0.5 ml-10">
                            {totalProducts} produto{totalProducts !== 1 ? 's' : ''} nesta categoria
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCameraOpen(true)}
                        className="h-9 px-4 text-[13px] font-semibold border border-border text-text-secondary rounded-lg hover:bg-background transition-colors flex items-center gap-2"
                    >
                        <Camera className="w-4 h-4" /> Escanear
                    </button>
                    <button
                        onClick={() => openCreate()}
                        className="h-9 px-4 text-[13px] font-semibold bg-primary text-card rounded-lg hover:bg-primary-dark transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Novo Produto
                    </button>
                </div>
            </div>

            {/* Product List */}
            {loading ? (
                <div className="py-4">
                    <LoadingOverlay message="Carregando produtos" rows={6} />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20">
                    <Boxes className="w-12 h-12 text-text-secondary/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-text-secondary">Nenhum produto nesta categoria</p>
                    <p className="text-xs text-text-secondary/60 mt-1">Clique em "Novo Produto" para adicionar</p>
                </div>
            ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                    <div className="overflow-x-auto min-h-[400px]">
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
                            <tbody className="divide-y divide-gray-50">
                                {products.map((p) => {
                                    const status = getStockStatus(p)
                                    return (
                                        <tr key={p.id} className="hover:bg-background/50 transition-colors">
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
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.class}`}>
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
                                                        className={`p-2 rounded-full transition-all ${openMenuId === p.id ? 'text-brand-600 bg-brand-50' : 'text-text-secondary hover:text-text-primary hover:bg-border/50'}`}
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {openMenuId === p.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                            <div className="absolute right-0 top-10 w-44 bg-card rounded-2xl shadow-2xl border border-border z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:bottom-4 max-sm:top-auto max-sm:w-auto max-sm:origin-bottom">
                                                                <button
                                                                    onClick={() => { openEdit(p); setOpenMenuId(null); }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-background hover:text-brand-600 transition-colors text-left"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" /> Editar
                                                                </button>
                                                                <button
                                                                    onClick={() => { setDeleteConfirm(p.id); setOpenMenuId(null); }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 transition-colors text-left"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}

                                                    {deleteConfirm === p.id && (
                                                        <div className="absolute right-0 top-0 bg-card border border-error/20 rounded-xl shadow-lg p-2 z-[80] animate-in fade-in slide-in-from-right-4">
                                                            <p className="text-[10px] font-bold text-error mb-2 truncate">Excluir?</p>
                                                            <div className="flex gap-1.5">
                                                                <button onClick={() => handleDelete(p.id)} className="px-2 py-1 text-[10px] bg-error text-card rounded-md font-bold hover:bg-error transition-colors">Sim</button>
                                                                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-[10px] bg-border/50 text-text-secondary rounded-md font-bold hover:bg-border transition-colors">Não</button>
                                                            </div>
                                                        </div>
                                                    )}
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
                                Mostrando <span className="font-semibold text-text-secondary">{(page - 1) * perPage + 1}–{Math.min(page * perPage, totalProducts)}</span> de <span className="font-semibold text-text-secondary">{totalProducts}</span>
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
                                                    className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${p === page
                                                        ? 'bg-primary text-card shadow-sm'
                                                        : 'text-text-secondary hover:bg-border/50'
                                                        }`}
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
            )}

            {/* Modal Criar/Editar */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-card px-6 py-4 border-b border-border flex items-center justify-between rounded-t-2xl">
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

                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nome *</label>
                                <input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all"
                                    placeholder="Nome do produto" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">SKU</label>
                                    <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all font-mono"
                                        placeholder="BRQ-001" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Código de Barras</label>
                                    <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all font-mono"
                                        placeholder="7891234567890" />
                                </div>
                            </div>
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
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Quantidade</label>
                                    <input type="number" step={form.unit === 'UN' ? '1' : '0.01'} value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all font-semibold"
                                        placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Mínimo</label>
                                    <input type="number" step={form.unit === 'UN' ? '1' : '0.01'} value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all"
                                        placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Unidade</label>
                                    <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all appearance-none font-bold text-primary">
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
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Categoria</label>
                                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all appearance-none">
                                    <option value="">Sem categoria</option>
                                    {allCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 h-10 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-background transition-colors">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex-1 h-10 text-sm font-semibold bg-primary text-card rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
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
                <Suspense fallback={null}>
                <BarcodeScanner
                    onScan={async (code) => {
                        setCameraOpen(false)
                        try {
                            const res = await api.get(`/products/barcode/${code.trim()}`)
                            if (res.data) {
                                const productInfo = Array.isArray(res.data) ? res.data[0] : res.data
                                if (productInfo) { openEdit(productInfo); return }
                            }
                            openCreate(code)
                        } catch {
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
        </div>
    )
}
