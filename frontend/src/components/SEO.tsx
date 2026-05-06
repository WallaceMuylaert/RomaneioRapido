import { useEffect } from 'react'

const SITE_URL = 'https://romaneiorapido.com.br'
const DEFAULT_OG_IMAGE = `${SITE_URL}/login-warehouse-1200.jpg`

type SEOProps = {
    title: string
    description: string
    path: string
    image?: string
    noindex?: boolean
    keywords?: string
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
    if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
    }
    el.setAttribute('content', content)
}

function setLink(rel: string, href: string, attrs: Record<string, string> = {}) {
    const selectorAttrs = Object.entries(attrs).map(([k, v]) => `[${k}="${v}"]`).join('')
    let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]${selectorAttrs}`)
    if (!el) {
        el = document.createElement('link')
        el.setAttribute('rel', rel)
        Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v))
        document.head.appendChild(el)
    }
    el.setAttribute('href', href)
}

export default function SEO({ title, description, path, image, noindex, keywords }: SEOProps) {
    useEffect(() => {
        const url = `${SITE_URL}${path}`
        const ogImage = image ?? DEFAULT_OG_IMAGE

        document.title = title
        setMeta('name', 'description', description)
        if (keywords) setMeta('name', 'keywords', keywords)
        setMeta('name', 'robots', noindex
            ? 'noindex,nofollow'
            : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1')

        setLink('canonical', url)

        setMeta('property', 'og:url', url)
        setMeta('property', 'og:title', title)
        setMeta('property', 'og:description', description)
        setMeta('property', 'og:image', ogImage)

        setMeta('name', 'twitter:title', title)
        setMeta('name', 'twitter:description', description)
        setMeta('name', 'twitter:image', ogImage)
    }, [title, description, path, image, noindex, keywords])

    return null
}
