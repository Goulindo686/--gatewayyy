type PasswordUserRow = Record<string, unknown>;

export type StoredPasswordCandidate = {
    column: 'password_hash' | 'password';
    hash: string;
};

function hasOwn(row: PasswordUserRow, key: string) {
    return Object.prototype.hasOwnProperty.call(row, key);
}

export function getStoredPasswordCandidates(row: PasswordUserRow) {
    if (typeof row.password_hash === 'string' && row.password_hash) {
        return [{ column: 'password_hash', hash: row.password_hash }] satisfies StoredPasswordCandidate[];
    }

    if (typeof row.password === 'string' && row.password) {
        return [{ column: 'password', hash: row.password }] satisfies StoredPasswordCandidate[];
    }

    return [];
}

export function getStoredPasswordHash(row: PasswordUserRow) {
    return getStoredPasswordCandidates(row)[0]?.hash || null;
}

export function buildPasswordSyncUpdate(
    row: PasswordUserRow,
    passwordHash: string,
    updatedAt = new Date().toISOString()
) {
    const update: Record<string, string> = {};

    if (hasOwn(row, 'password_hash')) update.password_hash = passwordHash;
    if (hasOwn(row, 'password')) update.password = passwordHash;

    if (Object.keys(update).length === 0) {
        throw new Error('Nenhuma coluna de senha foi encontrada na tabela users');
    }

    if (hasOwn(row, 'updated_at')) update.updated_at = updatedAt;
    return update;
}

export function buildPasswordResetUpdate(
    row: PasswordUserRow,
    passwordHash: string,
    updatedAt = new Date().toISOString()
) {
    const update: Record<string, string | null> = {
        ...buildPasswordSyncUpdate(row, passwordHash, updatedAt),
        password_reset_token: null,
        password_reset_expires: null,
    };

    return update;
}
