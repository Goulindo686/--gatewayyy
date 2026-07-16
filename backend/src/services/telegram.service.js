const axios = require('axios');
const { supabase } = require('../config/database');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Envia mensagem para um usuário do Telegram
 * @param {string} chatId - ID do chat do Telegram
 * @param {string} text - Texto da mensagem (suporta HTML)
 */
const sendMessage = async (chatId, text) => {
    try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        });
        return true;
    } catch (error) {
        console.error('Erro ao enviar mensagem Telegram:', error.response?.data || error.message);
        return false;
    }
};

/**
 * Processa webhook do Telegram (comando /start)
 * @param {object} message - Objeto message do Telegram
 */
const handleWebhook = async (message) => {
    try {
        // Verifica se é um comando /start com payload
        // Formato: /start <user_id>
        if (message.text && message.text.startsWith('/start ')) {
            const userId = message.text.split(' ')[1];
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
 * @param {string} userId - ID do usuário no sistema
 * @param {object} saleData - Dados da venda
 */
const notifySale = async (userId, saleData) => {
    try {
        // Busca o chat_id do usuário
        const { data: user } = await supabase
            .from('users')
            .select('telegram_chat_id')
            .eq('id', userId)
            .single();

        if (!user || !user.telegram_chat_id) return;

        const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saleData.amount / 100);
        
        const message = `<b>Venda Aprovada!</b>\n<b>Valor:</b> ${amount}`;

        await sendMessage(user.telegram_chat_id, message);
    } catch (error) {
        console.error('Erro ao notificar venda:', error);
    }
};

module.exports = {
    sendMessage,
    handleWebhook,
    notifySale
};
