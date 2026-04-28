#!/usr/bin/env node

/**
 * 💾 SCRIPT DE BACKUP AUTOMÁTICO DO BANCO DE DADOS
 * 
 * O que faz:
 * 1. Conecta no Supabase
 * 2. Faz backup de todas as tabelas
 * 3. Compacta em arquivo .sql.gz
 * 4. Salva localmente
 * 5. Limpa backups antigos (mantém últimos 30 dias)
 * 
 * Como usar:
 * node scripts/backup-database.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

require('dotenv').config();

// Configurações
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 30; // Manter últimos 30 dias
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

// Criar pasta de backups se não existir
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Pasta de backups criada: ${BACKUP_DIR}`);
}

// Cliente Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fazer backup de uma tabela
 */
async function backupTable(tableName) {
    try {
        console.log(`  📊 Fazendo backup da tabela: ${tableName}`);
        
        const { data, error } = await supabase
            .from(tableName)
            .select('*');
        
        if (error) {
            console.error(`  ❌ Erro ao buscar ${tableName}: ${error.message}`);
            return null;
        }
        
        console.log(`  ✅ ${tableName}: ${data?.length || 0} registros`);
        return { table: tableName, data: data || [] };
        
    } catch (error) {
        console.error(`  ❌ Erro ao fazer backup de ${tableName}: ${error.message}`);
        return null;
    }
}

/**
 * Criar arquivo SQL com os dados
 */
function generateSQL(backupData) {
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
        
        sql += `-- ============================================\n`;
        sql += `-- Tabela: ${table} (${data.length} registros)\n`;
        sql += `-- ============================================\n\n`;
        
        // Limpar tabela antes de inserir
        sql += `DELETE FROM ${table};\n\n`;
        
        // Gerar INSERTs
        data.forEach(row => {
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
 * Compactar arquivo
 */
async function compressFile(filepath) {
    try {
        console.log(`📦 Compactando arquivo...`);
        
        // Usar gzip nativo do Node.js
        const zlib = require('zlib');
        const gzip = zlib.createGzip();
        const source = fs.createReadStream(filepath);
        const destination = fs.createWriteStream(`${filepath}.gz`);
        
        await new Promise((resolve, reject) => {
            source.pipe(gzip).pipe(destination)
                .on('finish', resolve)
                .on('error', reject);
        });
        
        // Deletar arquivo original
        fs.unlinkSync(filepath);
        
        const stats = fs.statSync(`${filepath}.gz`);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log(`✅ Arquivo compactado: ${path.basename(filepath)}.gz (${sizeMB} MB)`);
        return `${filepath}.gz`;
        
    } catch (error) {
        console.error(`❌ Erro ao compactar: ${error.message}`);
        return filepath;
    }
}

/**
 * Limpar backups antigos
 */
function cleanOldBackups() {
    try {
        console.log(`\n🧹 Limpando backups antigos...`);
        
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('backup-') && f.endsWith('.sql.gz'))
            .map(f => ({
                name: f,
                path: path.join(BACKUP_DIR, f),
                time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Mais recente primeiro
        
        if (files.length <= MAX_BACKUPS) {
            console.log(`✅ Total de backups: ${files.length}/${MAX_BACKUPS}`);
            return;
        }
        
        // Deletar backups excedentes
        const toDelete = files.slice(MAX_BACKUPS);
        toDelete.forEach(file => {
            fs.unlinkSync(file.path);
            console.log(`🗑️  Removido: ${file.name}`);
        });
        
        console.log(`✅ Mantidos: ${MAX_BACKUPS} backups mais recentes`);
        
    } catch (error) {
        console.error(`❌ Erro ao limpar backups: ${error.message}`);
    }
}

/**
 * Função principal
 */
async function createBackup() {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`💾 INICIANDO BACKUP DO BANCO DE DADOS`);
        console.log(`${'='.repeat(60)}\n`);
        
        const startTime = Date.now();
        const timestamp = new Date().toISOString().split('T')[0]; // 2026-04-28
        const filename = `backup-${timestamp}.sql`;
        const filepath = path.join(BACKUP_DIR, filename);
        
        // 1. Fazer backup de todas as tabelas
        console.log(`📊 Fazendo backup de ${TABLES_TO_BACKUP.length} tabelas...\n`);
        
        const backupPromises = TABLES_TO_BACKUP.map(table => backupTable(table));
        const backupResults = await Promise.all(backupPromises);
        
        // Filtrar resultados válidos
        const validBackups = backupResults.filter(b => b !== null);
        
        if (validBackups.length === 0) {
            console.error(`\n❌ ERRO: Nenhuma tabela foi copiada com sucesso!`);
            process.exit(1);
        }
        
        // 2. Gerar arquivo SQL
        console.log(`\n📝 Gerando arquivo SQL...`);
        const sql = generateSQL(validBackups);
        fs.writeFileSync(filepath, sql, 'utf8');
        
        const fileStats = fs.statSync(filepath);
        const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ Arquivo criado: ${filename} (${fileSizeMB} MB)`);
        
        // 3. Compactar arquivo
        const compressedPath = await compressFile(filepath);
        
        // 4. Limpar backups antigos
        cleanOldBackups();
        
        // 5. Resumo final
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ BACKUP CONCLUÍDO COM SUCESSO!`);
        console.log(`${'='.repeat(60)}`);
        console.log(`📊 Tabelas copiadas: ${validBackups.length}/${TABLES_TO_BACKUP.length}`);
        console.log(`📁 Arquivo: ${path.basename(compressedPath)}`);
        console.log(`⏱️  Tempo: ${duration}s`);
        console.log(`📍 Local: ${BACKUP_DIR}`);
        console.log(`${'='.repeat(60)}\n`);
        
        return {
            success: true,
            filename: path.basename(compressedPath),
            filepath: compressedPath,
            tables: validBackups.length,
            duration: duration
        };
        
    } catch (error) {
        console.error(`\n❌ ERRO CRÍTICO NO BACKUP: ${error.message}`);
        console.error(error.stack);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Executar backup se chamado diretamente
if (require.main === module) {
    createBackup()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error(`❌ Erro fatal: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { createBackup };
