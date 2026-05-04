import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import type { Html5QrcodeCameraScanConfig } from 'html5-qrcode'
import { X, Camera, RefreshCcw, CheckCircle2, ScanBarcode, QrCode } from 'lucide-react'

type ScannerMode = 'barcode' | 'qr'

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void
    onClose: () => void
    status?: 'idle' | 'searching' | 'success' | 'error'
    initialMode?: ScannerMode
}

const barcodeFormats = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.CODE_93,
    Html5QrcodeSupportedFormats.ITF,
    Html5QrcodeSupportedFormats.CODABAR
]

const qrFormats = [Html5QrcodeSupportedFormats.QR_CODE]

const getFormats = (mode: ScannerMode) => mode === 'barcode' ? barcodeFormats : qrFormats

const getScannerConfig = (mode: ScannerMode): Html5QrcodeCameraScanConfig => ({
    fps: mode === 'barcode' ? 18 : 10,
    qrbox: mode === 'barcode'
        ? (viewfinderWidth: number, viewfinderHeight: number) => ({
            width: Math.floor(Math.min(viewfinderWidth * 0.92, 420)),
            height: Math.floor(Math.min(viewfinderHeight * 0.34, 150))
        })
        : (viewfinderWidth: number, viewfinderHeight: number) => {
            const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72)
            return { width: size, height: size }
        },
    aspectRatio: mode === 'barcode' ? 1.7777778 : 1,
    disableFlip: mode === 'barcode',
    videoConstraints: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
    }
})

export default function BarcodeScanner({ onScan, onClose, status = 'idle', initialMode = 'barcode' }: BarcodeScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const containerId = "reader"
    const [selectedMode, setSelectedMode] = useState<ScannerMode>(initialMode)
    const [scanSuccess, setScanSuccess] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isSecureContext, setIsSecureContext] = useState(true)
    const [needsPermission, setNeedsPermission] = useState(true)
    const isScanningRef = useRef(false)
    const isStartingRef = useRef(false)

    const isBarcodeMode = selectedMode === 'barcode'
    const modeTitle = isBarcodeMode ? 'Codigo de barras' : 'QR Code'
    const modeHint = isBarcodeMode
        ? 'Alinhe o codigo na faixa central, com boa luz e sem inclinar a camera.'
        : 'Centralize o QR Code dentro do quadrado e aguarde a deteccao.'

    useEffect(() => {
        if (status === 'success') {
            setScanSuccess(true)
        }
    }, [status])

    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop()
            } catch (err) {
                console.warn("Stop error (safe to ignore):", err)
            }
        }
    }

    const applyPrecisionConstraints = async () => {
        if (!scannerRef.current || !isBarcodeMode) return

        try {
            const capabilities = scannerRef.current.getRunningTrackCapabilities() as MediaTrackCapabilities & {
                zoom?: { min?: number; max?: number; step?: number }
                focusMode?: string[]
            }
            const advanced: Record<string, unknown>[] = []

            if (capabilities.focusMode?.includes('continuous')) {
                advanced.push({ focusMode: 'continuous' })
            }

            if (capabilities.zoom?.max && capabilities.zoom.max > 1) {
                const minZoom = capabilities.zoom.min ?? 1
                const targetZoom = Math.min(capabilities.zoom.max, Math.max(minZoom, 2))
                advanced.push({ zoom: targetZoom })
            }

            if (advanced.length > 0) {
                await scannerRef.current.applyVideoConstraints({ advanced } as MediaTrackConstraints)
            }
        } catch (err) {
            console.warn("Nao foi possivel aplicar foco/zoom automatico:", err)
        }
    }

    const handleDecoded = (decodedText: string) => {
        if (isScanningRef.current) return
        isScanningRef.current = true
        setScanSuccess(true)
        if (navigator.vibrate) navigator.vibrate([100, 50, 100])
        setTimeout(() => {
            onScan(decodedText)
            stopScanner().then(onClose)
        }, 650)
    }

    const startScanner = async () => {
        if (!scannerRef.current || isStartingRef.current) return
        isStartingRef.current = true
        setErrorMessage(null)
        setNeedsPermission(false)
        setIsSecureContext(window.isSecureContext)

        if (!window.isSecureContext) {
            setErrorMessage("A camera so pode ser acessada em conexoes seguras (HTTPS).")
            isStartingRef.current = false
            return
        }

        try {
            await stopScanner()
            await new Promise(resolve => setTimeout(resolve, 300))

            const config = getScannerConfig(selectedMode)

            try {
                await scannerRef.current.start(
                    { facingMode: "environment" },
                    config,
                    handleDecoded,
                    () => { }
                )
                await applyPrecisionConstraints()
            } catch (err) {
                console.warn("Falha ao iniciar com environment, tentando qualquer camera...", err)
                await scannerRef.current.start(
                    { facingMode: "user" },
                    config,
                    handleDecoded,
                    () => { }
                )
                await applyPrecisionConstraints()
            }
        } catch (err: any) {
            console.error("FALHA AO INICIAR:", err)
            const errStr = String(err)
            if (errStr.includes("NotAllowedError") || err?.name === "NotAllowedError") {
                setErrorMessage("Permissao de camera negada. Permita o acesso nas configuracoes do navegador.")
            } else if (errStr.includes("NotReadableError") || err?.name === "NotReadableError") {
                setErrorMessage("A camera esta sendo usada por outro aplicativo ou aba. Feche outros apps de video e tente novamente.")
            } else {
                setErrorMessage("Nao foi possivel acessar a camera. Verifique se ela esta conectada ou tente atualizar a pagina.")
            }
        } finally {
            isStartingRef.current = false
        }
    }

    useEffect(() => {
        isScanningRef.current = false
        setScanSuccess(false)
        setErrorMessage(null)
        setNeedsPermission(true)

        const html5QrCode = new Html5Qrcode(containerId, {
            formatsToSupport: getFormats(selectedMode),
            useBarCodeDetectorIfSupported: true,
            verbose: false
        })
        scannerRef.current = html5QrCode

        navigator.permissions?.query?.({ name: 'camera' as PermissionName }).then(status => {
            if (status.state === 'granted') {
                startScanner()
            }
        }).catch(() => {
            // Browsers sem Permissions API deixam o botao pedir acesso normalmente.
        })

        return () => {
            stopScanner().finally(() => {
                try {
                    html5QrCode.clear()
                } catch (err) {
                    console.warn("Clear error (safe to ignore):", err)
                }
            })
        }
    }, [selectedMode])

    const switchMode = async (mode: ScannerMode) => {
        if (mode === selectedMode || isStartingRef.current || scanSuccess) return
        await stopScanner()
        setSelectedMode(mode)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-7 py-5 border-b border-border flex items-center justify-between bg-card relative z-10">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${status === 'success' ? 'bg-emerald-100 text-emerald-600 scale-110' :
                            status === 'searching' ? 'bg-brand-100 text-primary animate-bounce' :
                                status === 'error' ? 'bg-error/20 text-error' :
                                    'bg-brand-50 text-primary'
                            }`}>
                            {status === 'success' ? <CheckCircle2 className="w-4.5 h-4.5" /> :
                                status === 'searching' ? <RefreshCcw className="w-4.5 h-4.5 animate-spin" /> :
                                    status === 'error' ? <X className="w-4.5 h-4.5" /> :
                                        isBarcodeMode ? <ScanBarcode className="w-4.5 h-4.5" /> : <QrCode className="w-4.5 h-4.5" />}
                        </div>
                        <h2 className={`text-[15px] font-bold transition-colors duration-300 ${status === 'success' ? 'text-emerald-600' :
                            status === 'searching' ? 'text-primary' :
                                status === 'error' ? 'text-error' :
                                    'text-text-primary'
                            } text-nowrap`}>
                            {status === 'success' ? 'Lido com sucesso!' :
                                status === 'searching' ? 'Processando leitura...' :
                                    status === 'error' ? 'Falha na identificacao' :
                                        `Ler ${modeTitle}`}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-text-secondary hover:bg-background rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 bg-background border-x border-gray-900 relative">
                    <div className="mb-4 grid grid-cols-2 rounded-2xl bg-black/40 p-1.5">
                        <button
                            type="button"
                            onClick={() => switchMode('barcode')}
                            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${isBarcodeMode ? 'bg-card text-primary shadow-sm' : 'text-card/70 hover:text-card'}`}
                        >
                            <ScanBarcode className="h-4 w-4" /> Barras
                        </button>
                        <button
                            type="button"
                            onClick={() => switchMode('qr')}
                            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${!isBarcodeMode ? 'bg-card text-primary shadow-sm' : 'text-card/70 hover:text-card'}`}
                        >
                            <QrCode className="h-4 w-4" /> QR Code
                        </button>
                    </div>

                    <div className={`relative rounded-2xl overflow-hidden ${needsPermission ? 'bg-card border border-border' : 'bg-black'} ${needsPermission ? 'h-[320px]' : isBarcodeMode ? 'h-[260px]' : 'aspect-square'} shadow-2xl flex items-center justify-center`}>
                        {needsPermission && !errorMessage && (
                            <div className="absolute inset-0 z-50 bg-card flex flex-col items-center justify-center px-7 py-8 text-center animate-in fade-in duration-300">
                                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-primary shadow-sm">
                                    <Camera className="h-8 w-8" />
                                </div>
                                <h3 className="mb-3 text-xl font-black text-text-primary">Permitir camera</h3>
                                <p className="mx-auto mb-7 max-w-xs text-sm font-semibold leading-relaxed text-text-secondary">
                                    Use a camera traseira para ler {isBarcodeMode ? 'codigos de barras com mais precisao' : 'QR Codes'}.
                                </p>
                                <button
                                    onClick={startScanner}
                                    className="w-full max-w-xs py-4 bg-primary hover:bg-primary-dark text-card font-black rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 text-sm uppercase tracking-wider"
                                >
                                    Permitir Camera
                                </button>
                                <button
                                    onClick={onClose}
                                    className="mt-5 text-text-secondary text-xs font-bold uppercase tracking-widest hover:text-text-primary transition-colors"
                                >
                                    Agora nao
                                </button>
                            </div>
                        )}

                        {scanSuccess && (
                            <div className="absolute inset-0 z-30 bg-emerald-500/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
                                <CheckCircle2 className="w-16 h-16 text-card mb-3 drop-shadow-md animate-bounce" />
                                <p className="text-card font-bold text-lg drop-shadow-md">Codigo Localizado</p>
                                <p className="text-emerald-50 text-sm font-medium mt-1">Processando...</p>
                            </div>
                        )}

                        <div id={containerId} className="w-full h-full" />

                        {status === 'idle' && !scanSuccess && (
                            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                                <div className={`${isBarcodeMode ? 'h-[112px] w-[88%]' : 'h-[220px] w-[220px]'} border-2 border-brand-500/50 rounded-2xl relative shadow-[0_0_0_999px_rgba(0,0,0,0.34)] transition-all`}>
                                    <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-brand-500 rounded-tl-lg" />
                                    <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-brand-500 rounded-tr-lg" />
                                    <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-brand-500 rounded-bl-lg" />
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-brand-500 rounded-br-lg" />
                                    <div className="absolute top-1/2 left-4 right-4 h-px bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-pulse" />
                                </div>
                            </div>
                        )}

                        {status === 'searching' && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-brand-500/30 border-t-blue-500 rounded-full animate-spin" />
                                    <ScanBarcode className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-card animate-pulse" />
                                </div>
                                <span className="mt-4 text-card font-black text-xs uppercase tracking-[0.2em] animate-pulse">Lendo codigo...</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`px-7 py-6 transition-colors duration-300 text-center ${scanSuccess ? 'bg-emerald-50' : errorMessage ? 'bg-error/10' : 'bg-card'}`}>
                    {errorMessage ? (
                        <>
                            <p className="text-[13px] text-error font-bold mb-3">
                                {errorMessage}
                            </p>
                            {!isSecureContext && (
                                <p className="text-[11px] text-warning mb-4 bg-warning/10 p-2 rounded-lg border border-amber-100">
                                    Dica: acesse usando <strong>https://</strong> ou <strong>localhost</strong> para habilitar a camera.
                                </p>
                            )}
                            <button
                                onClick={startScanner}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-error/20 hover:bg-error/30 text-error rounded-full text-xs font-bold transition-colors"
                            >
                                <RefreshCcw className="w-3.5 h-3.5" /> Tentar Novamente
                            </button>
                        </>
                    ) : status === 'searching' ? (
                        <p className="text-[13px] text-primary-dark leading-relaxed font-bold animate-pulse">
                            Buscando no banco de dados...
                        </p>
                    ) : !scanSuccess ? (
                        <>
                            <button
                                onClick={() => stopScanner().then(startScanner)}
                                className="mb-5 inline-flex items-center gap-2 px-5 py-2.5 bg-border/50 hover:bg-border text-text-secondary rounded-full text-xs font-bold transition-colors"
                            >
                                <RefreshCcw className="w-3.5 h-3.5" /> Reiniciar Camera
                            </button>
                            <p className="mx-auto max-w-xs text-[12px] text-text-secondary leading-relaxed font-medium">
                                {modeHint}<br />
                                Use a opcao correta para acelerar e melhorar a leitura.
                            </p>
                        </>
                    ) : (
                        <p className="text-[13px] text-emerald-700 leading-relaxed font-bold animate-pulse">
                            Produto localizado!
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
