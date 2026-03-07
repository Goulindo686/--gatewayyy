import axios from 'axios';
import { supabase } from '@/lib/db';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Envia mensagem para um usuário do Telegram
 * @param chatId - ID do chat do Telegram
 * @param text - Texto da mensagem (suporta HTML)
 */
export const sendMessage = async (chatId: string | number, text: string) => {
    try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        });
        return true;
    } catch (error: any) {
        console.error('Erro ao enviar mensagem Telegram:', error.response?.data || error.message);
        return false;
    }
};

/**
 * Envia foto com legenda para um usuário do Telegram
 * @param chatId - ID do chat do Telegram
 * @param photoUrl - URL da imagem
 * @param caption - Legenda da foto (suporta HTML)
 */
export const sendPhoto = async (chatId: string | number, photoUrl: string, caption: string) => {
    try {
        await axios.post(`${TELEGRAM_API}/sendPhoto`, {
            chat_id: chatId,
            photo: photoUrl,
            caption: caption,
            parse_mode: 'HTML'
        });
        return true;
    } catch (error: any) {
        console.error('Erro ao enviar foto Telegram:', error.response?.data || error.message);
        // Fallback para texto se falhar a imagem
        return sendMessage(chatId, caption);
    }
};

/**
 * Processa webhook do Telegram (comando /start)
 * @param message - Objeto message do Telegram
 */
export const handleWebhook = async (message: any) => {
    try {
        // Verifica se é um comando /start com payload
        // Formato: /start <user_id>
        if (message.text && message.text.startsWith('/start ')) {
            const parts = message.text.split(' ');
            const userId = parts[1];
            const chatId = message.chat.id;

            if (!userId) return;

            // Atualiza o usuário com o ID do Telegram
            const { error } = await supabase
                .from('users')
                .update({ telegram_chat_id: chatId })
                .eq('id', userId);

            if (error) {
                console.error('Erro ao vincular Telegram:', error);
                await sendMessage(chatId, '❌ Erro ao vincular sua conta. Tente novamente.');
                return;
            }

            await sendMessage(chatId, '✅ <b>Conta vinculada com sucesso!</b>\n\nAgora você receberá notificações de suas vendas aqui.');
        } else if (message.text === '/start') {
            await sendMessage(message.chat.id, 'Olá! Para vincular sua conta, use o botão "Conectar Telegram" no painel do GouPay.');
        }
    } catch (error) {
        console.error('Erro no webhook Telegram:', error);
    }
};

/**
 * Notifica venda aprovada
 * @param userId - ID do usuário no sistema
 * @param saleData - Dados da venda
 */
export const notifySale = async (userId: string, saleData: any) => {
    try {
        // Busca o chat_id do usuário
        const { data: user } = await supabase
            .from('users')
            .select('telegram_chat_id')
            .eq('id', userId)
            .single();

        if (!user || !user.telegram_chat_id) return;

        const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saleData.amount / 100);
        
        const message = `
💰 <b>Venda Aprovada!</b>

📦 <b>Produto:</b> ${saleData.product_name}
💵 <b>Valor:</b> ${amount}
💳 <b>Método:</b> ${saleData.payment_method}
👤 <b>Cliente:</b> ${saleData.customer_name}

<i>GouPay Notificações</i>
`;

        if (saleData.image_url) {
            await sendPhoto(user.telegram_chat_id, saleData.image_url, message);
        } else {
            await sendMessage(user.telegram_chat_id, message);
        }
    } catch (error) {
        console.error('Erro ao notificar venda:', error);
    }
};
