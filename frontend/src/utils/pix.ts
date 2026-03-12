import QRCode from 'qrcode'

/**
 * Utilitário para gerar o BRCode (Payload de Pix Copia e Cola)
 * Baseado nas especificações do Banco Central (EMV QRCPS)
 */

interface PixOptions {
    key: string
    name: string
    city: string
    amount?: number
    txid?: string
}

function crc16(data: string): string {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < data.length; i++) {
        let b = data.charCodeAt(i);
        for (let j = 0; j < 8; j++) {
            let bit = ((b >> (7 - j) & 1) === 1);
            let c15 = ((crc >> 15 & 1) === 1);
            crc <<= 1;
            if (c15 !== bit) crc ^= polynomial;
        }
    }

    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function formatField(id: string, value: string): string {
    const val = value || '';
    return id + val.length.toString().padStart(2, '0') + val;
}

function normalize(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, ''); // Keep only alphanumeric and space
}

export function generatePixPayload({ key, name, city, amount, txid = '***' }: PixOptions): string {
    const gui = 'br.gov.bcb.pix';
    
    // Formatação da Chave Pix
    let formattedKey = key.replace(/\s/g, ''); // Remove espaços
    
    // Se a chave for um telefone (apenas números, 10 ou 11 dígitos), adiciona +55 se não tiver
    const isPhone = /^[0-9]{10,11}$/.test(formattedKey);
    if (isPhone) {
        formattedKey = '+55' + formattedKey;
    } else if (/^[0-9]{11}$/.test(formattedKey.replace('+', '')) && formattedKey.startsWith('55')) {
        // Já tem 55 mas falta o +
        formattedKey = '+' + formattedKey;
    }
    
    // Merchant Account Information (ID 26)
    const merchantAccountInfo = formatField('00', gui) + formatField('01', formattedKey);
    
    let payload = formatField('00', '01'); // Payload Format Indicator
    payload += formatField('26', merchantAccountInfo);
    payload += formatField('52', '0000'); // Merchant Category Code
    payload += formatField('53', '986');  // Transaction Currency (BRL)
    
    if (amount) {
        payload += formatField('54', amount.toFixed(2));
    }
    
    payload += formatField('58', 'BR');   // Country Code
    payload += formatField('59', normalize(name).substring(0, 25)); // Merchant Name
    payload += formatField('60', normalize(city).substring(0, 15)); // Merchant City
    
    // Additional Data Field Template (ID 62)
    const additionalData = formatField('05', txid || '***');
    payload += formatField('62', additionalData);
    
    // CRC16 (ID 63)
    payload += '6304';
    payload += crc16(payload);
    
    return payload;
}

export async function generatePixQRCode(payload: string): Promise<string> {
    try {
        return await QRCode.toDataURL(payload, {
            margin: 2,
            scale: 10,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
    } catch (err) {
        console.error('Erro ao gerar QR Code Pix:', err);
        throw err;
    }
}
