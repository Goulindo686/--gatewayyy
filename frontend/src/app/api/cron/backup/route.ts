/**
 * 🕐 CRON JOB: BACKUP AUTOMÁTICO
 * 
 * Esta rota é chamada automaticamente pela Vercel Cron
 * todo dia às 3h da manhã (horário de Brasília)
 * 
 * Vercel Cron é GRÁTIS! ✅
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const TABLES_TO_BACKUP = [
    'users',
    'products',
    'orders',
    'transactions',
    'withdrawals',
    'recipients',
    'platform_fees',
    'platform_settings',
    'enrollments',
    'product_plans',
    'subscriptions'
];

/**
 * Fazer backup de uma tabela
 */
async function backupTable(tableName: string) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');
        
        if (error) {
            console.error(`Erro ao buscar ${tableName}:`, error.message);
            return null;
        }
        
        return { table: tableName, data: data || [], count: data?.length || 0 };
        
    } catch (error: any) {
        console.error(`Erro ao fazer backup de ${tableName}:`, error.message);
        return null;
    }
}

/**
 * Gerar SQL do backup
 */
function generateSQL(backupData: any[]) {
    let sql = `-- ============================================\n`;
    sql += `-- BACKUP DO BANCO DE DADOS\n`;
    sql += `-- Data: ${new Date().toISOString()}\n`;
    sql += `-- Tabelas: ${TABLES_TO_BACKUP.length}\n`;
    sql += `-- ============================================\n\n`;
    
    backupData.forEach(({ table, data }) => {
        if (!data || data.length === 0) {
            sql += `-- Tabela ${table}: vazia\n\n`;
            return;
        }
        
        sql += `-- Tabela: ${table} (${data.length} registros)\n`;
        sql += `DELETE FROM ${table};\n\n`;
        
        data.forEach((row: any) => {
            const columns = Object.keys(row).join(', ');
            const values = Object.values(row).map(val => {
                if (val === null) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                if (val instanceof Date) return `'${val.toISOString()}'`;
                if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                return val;
            }).join(', ');
            
            sql += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
        });
        
        sql += `\n`;
    });
    
    return sql;
}

/**
 * Salvar backup no Supabase Storage (GRÁTIS até 1GB)
 */
async function saveBackupToStorage(sql: string, filename: string) {
    try {
        // Converter SQL para Blob
        const blob = new Blob([sql], { type: 'text/plain' });
        
        // Upload para Supabase Storage
        const { data, error } = await supabase.storage
            .from('backups') // Bucket 'backups' (você precisa criar)
            .upload(filename, blob, {
                contentType: 'text/plain',
                upsert: true
            });
        
        if (error) {
            console.error('Erro ao salvar no storage:', error.message);
            return false;
        }
        
        console.log('✅ Backup salvo no Supabase Storage:', filename);
        return true;
        
    } catch (error: any) {
        console.error('Erro ao salvar backup:', error.message);
        return false;
    }
}

/**
 * Limpar backups antigos (manter últimos 30 dias)
 */
async function cleanOldBackups() {
    try {
        const { data: files } = await supabase.storage
            .from('backups')
            .list();
        
        if (!files || files.length <= 30) return;
        
        // Ordenar por data (mais antigo primeiro)
        const sortedFiles = files
            .filter(f => f.name.startsWith('backup-'))
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Deletar os mais antigos
        const toDelete = sortedFiles.slice(0, sortedFiles.length - 30);
        
        for (const file of toDelete) {
            await supabase.storage
                .from('backups')
                .remove([file.name]);
            
            console.log('🗑️ Backup antigo removido:', file.name);
        }
        
    } catch (error: any) {
        console.error('Erro ao limpar backups:', error.message);
    }
}

/**
 * Endpoint do Cron Job
 */
export async function GET(request: NextRequest) {
    try {
        // Verificar autorização (Vercel Cron envia um header especial)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET || 'seu-secret-aqui';
        
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            );
        }
        
        console.log('🕐 Iniciando backup automático...');
        const startTime = Date.now();
        
        // 1. Fazer backup de todas as tabelas
        const backupPromises = TABLES_TO_BACKUP.map(table => backupTable(table));
        const backupResults = await Promise.all(backupPromises);
        
        // Filtrar resultados válidos
        const validBackups = backupResults.filter(b => b !== null);
        
        if (validBackups.length === 0) {
            return NextResponse.json(
                { error: 'Nenhuma tabela foi copiada' },
                { status: 500 }
            );
        }
        
        // 2. Gerar SQL
        const sql = generateSQL(validBackups);
        
        // 3. Salvar no Supabase Storage
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `backup-${timestamp}.sql`;
        
        const saved = await saveBackupToStorage(sql, filename);
        
        if (!saved) {
            return NextResponse.json(
                { error: 'Erro ao salvar backup' },
                { status: 500 }
            );
        }
        
        // 4. Limpar backups antigos
        await cleanOldBackups();
        
        // 5. Resumo
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const totalRecords = validBackups.reduce((sum, b) => sum + b.count, 0);
        
        console.log(`✅ Backup concluído: ${validBackups.length} tabelas, ${totalRecords} registros, ${duration}s`);
        
        return NextResponse.json({
            success: true,
            filename,
            tables: validBackups.length,
            records: totalRecords,
            duration: `${duration}s`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error: any) {
        console.error('❌ Erro no backup:', error.message);
        
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// Permitir POST também (para testes manuais)
export async function POST(request: NextRequest) {
    return GET(request);
}
