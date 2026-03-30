const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Erro de validação',
            details: err.message
        });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token inválido'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expirado'
        });
    }

    if (err.response?.data) {
        // Pagar.me API error — nunca expõe detalhes internos em produção
        const isProduction = process.env.NODE_ENV === 'production';
        return res.status(err.response.status || 500).json({
            error: 'Erro ao processar pagamento. Tente novamente.',
            ...(isProduction ? {} : { details: err.response.data })
        });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        error: isProduction ? 'Erro interno do servidor.' : (err.message || 'Erro interno do servidor.')
    });
};

module.exports = { errorHandler };
