import { useState, useRef } from 'react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Check } from 'lucide-react'

interface ImageCropperProps {
    imageSrc: string
    onCropComplete: (blob: Blob) => void
    onCancel: () => void
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight
        ),
        mediaWidth,
        mediaHeight
    )
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
    const [crop, setCrop] = useState<Crop>()
    const [completedCrop, setCompletedCrop] = useState<Crop>()
    const imgRef = useRef<HTMLImageElement>(null)

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget
        setCrop(centerAspectCrop(width, height, 1))
    }

    const handleSave = async () => {
        if (!completedCrop || !imgRef.current) return

        const canvas = document.createElement('canvas')
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height

        // Vamos forçar que o corte seja exportado no tamanho máximo de 300x300
        const exportSize = 300
        canvas.width = exportSize
        canvas.height = exportSize

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const cropX = completedCrop.x * scaleX
        const cropY = completedCrop.y * scaleY
        const cropWidth = completedCrop.width * scaleX
        const cropHeight = completedCrop.height * scaleY

        // Desenhar no canvas 300x300 (redimensionando na hora)
        ctx.drawImage(
            imgRef.current,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            exportSize,
            exportSize
        )

        canvas.toBlob((blob) => {
            if (blob) onCropComplete(blob)
        }, 'image/jpeg', 0.82)
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                    <h2 className="text-base font-bold text-gray-900">Ajustar Foto</h2>
                    <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-6 min-h-[300px]">
                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={1}
                        circularCrop={false}
                        className="max-h-[50vh]"
                    >
                        <img
                            ref={imgRef}
                            alt="Prévia do corte"
                            src={imageSrc}
                            onLoad={onImageLoad}
                            className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-sm"
                            crossOrigin="anonymous"
                        />
                    </ReactCrop>
                </div>

                <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-3 z-10">
                    <button
                        onClick={onCancel}
                        className="h-10 px-5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!completedCrop}
                        className="h-10 px-6 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Cortar e Salvar
                    </button>
                </div>
            </div>
        </div>
    )
}
