/**
 * Converte uma URL de imagem (importada via Vite/Webpack) para uma string Data URI Base64.
 * Isso permite que a imagem seja usada em janelas de impressão (window.open) sem problemas de path.
 */
export const getBase64FromUrl = async (url: string): Promise<string> => {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64data = reader.result as string;
            // Remove o prefixo "data:image/png;base64," se necessário, 
            // mas para o <img> src, o formato completo é melhor.
            resolve(base64data);
        };
        reader.onerror = reject;
    });
};
