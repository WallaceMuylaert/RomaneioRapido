export const CONTACTS = {
    whatsapp: import.meta.env.VITE_WHATSAPP_NUMBER || '5511920688389',
    support_email: 'suporte@romaneiorapido.com.br'
};

export const getWhatsAppLink = (message?: string) => {
    const phone = CONTACTS.whatsapp.replace(/\D/g, '');
    const baseUrl = `https://api.whatsapp.com/send?phone=${phone}`;
    return message ? `${baseUrl}&text=${encodeURIComponent(message)}` : baseUrl;
};
