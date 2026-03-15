const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/database');
const pagarmeService = require('../services/pagarme.service');

class AuthController {
    async register(req, res, next) {
        try {
            const { name, email, password, cpf_cnpj, phone } = req.body;

            // Check if user exists
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();

            if (existing) {
                return res.status(400).json({ error: 'Email já cadastrado.' });
            }

            const password_hash = await bcrypt.hash(password, 12);
            const email_verification_token = uuidv4();

            // Create user
            const { data: user, error } = await supabase
                .from('users')
                .insert({
                    name,
                    email,
                    password_hash,
                    cpf_cnpj,
                    phone,
                    email_verification_token,
                    role: 'seller'
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`[AUTH] User created: ${user.id} (${user.email})`);

            // --- ORDER LINKING MOVED TO EMAIL VERIFICATION ---
            // This prevents unauthorized users from claiming orders before proving email ownership.
            // -------------------------------------------------

            // Create Pagar.me recipient
            try {
                const recipient = await pagarmeService.createRecipient(user);

                await supabase
                    .from('recipients')
                    .insert({
                        user_id: user.id,
                        pagarme_recipient_id: recipient.id,
                        status: recipient.status || 'active'
                    });
            } catch (pagarmeError) {
                console.error('Failed to create Pagar.me recipient:', pagarmeError.message);
                // Store pending recipient for later retry
                await supabase
                    .from('recipients')
                    .insert({
                        user_id: user.id,
                        status: 'pending'
                    });
            }

            const token = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.status(201).json({
                message: 'Conta criada com sucesso!',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !user) {
                return res.status(401).json({ error: 'Email ou senha incorretos.' });
            }

            if (user.status === 'blocked') {
                return res.status(403).json({ error: 'Conta bloqueada.' });
            }

            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ error: 'Email ou senha incorretos.' });
            }

            const token = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.json({
                message: 'Login realizado com sucesso!',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar_url: user.avatar_url
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;

            const resetToken = uuidv4();
            const resetExpires = new Date(Date.now() + 3600000); // 1 hour

            const { error } = await supabase
                .from('users')
                .update({
                    password_reset_token: resetToken,
                    password_reset_expires: resetExpires.toISOString()
                })
                .eq('email', email);

            // Always return success to prevent email enumeration
            res.json({
                message: 'Se o email existir, instruções de recuperação serão enviadas.'
            });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { token, password } = req.body;

            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('password_reset_token', token)
                .single();

            if (error || !user) {
                return res.status(400).json({ error: 'Token inválido ou expirado.' });
            }

            if (new Date(user.password_reset_expires) < new Date()) {
                return res.status(400).json({ error: 'Token expirado.' });
            }

            const password_hash = await bcrypt.hash(password, 12);

            await supabase
                .from('users')
                .update({
                    password_hash,
                    password_reset_token: null,
                    password_reset_expires: null
                })
                .eq('id', user.id);

            res.json({ message: 'Senha alterada com sucesso!' });
        } catch (error) {
            next(error);
        }
    }

    async verifyEmail(req, res, next) {
        try {
            const { token } = req.params;

            const { data, error } = await supabase
                .from('users')
                .update({ email_verified: true, email_verification_token: null })
                .eq('email_verification_token', token)
                .select()
                .single();

            if (error || !data) {
                return res.status(400).json({ error: 'Token de verificação inválido.' });
            }

            res.json({ message: 'Email verificado com sucesso!' });

            // --- LINK EXISTING ORDERS AFTER VERIFICATION ---
            try {
                const normalizedEmail = data.email.toLowerCase().trim();
                console.log(`[AUTH-DEBUG] Linking orders for newly verified user: ${normalizedEmail}`);

                const { data: relevantOrders } = await supabase
                    .from('orders')
                    .select('id, product_id')
                    .eq('status', 'paid')
                    .ilike('buyer_email', normalizedEmail);

                if (relevantOrders && relevantOrders.length > 0) {
                    const enrollments = relevantOrders.map(order => ({
                        user_id: data.id,
                        product_id: order.product_id,
                        order_id: order.id,
                        status: 'active'
                    }));

                    await supabase.from('enrollments').upsert(enrollments);
                    console.log(`[AUTH-DEBUG] Linked ${relevantOrders.length} orders for user ${data.id}`);
                }
            } catch (linkErr) {
                console.error('[AUTH-DEBUG] Order linking error during verification:', linkErr.message);
            }
            // -----------------------------------------------
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req, res, next) {
        try {
            const { data: recipient } = await supabase
                .from('recipients')
                .select('*')
                .eq('user_id', req.user.id)
                .single();

            const user = { ...req.user };
            delete user.password_hash;
            delete user.email_verification_token;
            delete user.password_reset_token;
            delete user.password_reset_expires;

            res.json({ user, recipient });
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req, res, next) {
        try {
            const allowedFields = [
                'name', 'phone', 'cpf_cnpj',
                'address_street', 'address_number', 'address_complement',
                'address_neighborhood', 'address_city', 'address_state', 'address_zipcode',
                'pix_key', 'pix_key_type',
                'bank_name', 'bank_agency', 'bank_account', 'bank_account_digit', 'bank_account_type',
                'avatar_url',
                'store_name', 'store_slug', 'store_description', 'store_active',
                'store_theme', 'store_banner_url'
            ];

            const updates = {};
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    if (field === 'cpf_cnpj') {
                        const value = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
                        updates[field] = value === '' ? null : value;
                    } else {
                        updates[field] = req.body[field];
                    }
                }
            });

            console.log(`[BACKEND AUTH] Updating user ${req.user.id}:`, JSON.stringify(updates));

            updates.updated_at = new Date().toISOString();

            const { error, count, status } = await supabase
                .from('users')
                .update(updates)
                .eq('id', req.user.id);

            console.log(`[BACKEND AUTH] Supabase update: status=${status}, rows_affected=${count}, error=`, error);

            if (error) throw error;

            // Fetch the updated user properly
            const { data: updatedData, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', req.user.id);

            if (fetchError) throw fetchError;

            const user = updatedData && updatedData.length > 0 ? updatedData[0] : {};
            if (user.password_hash) delete user.password_hash;

            console.log(`[BACKEND AUTH] Final user after update:`, JSON.stringify({
                id: user.id,
                email: user.email,
                store_slug: user.store_slug,
                store_active: user.store_active
            }));

            res.json({ user, message: 'Perfil atualizado com sucesso!' });
        } catch (error) {
            console.error('[BACKEND AUTH] updateProfile error:', error);
            next(error);
        }
    }
}

module.exports = new AuthController();
