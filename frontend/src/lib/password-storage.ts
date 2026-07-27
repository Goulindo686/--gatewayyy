type PasswordUserRow = Record<string, unknown>;

function hasOwn(row: PasswordUserRow, key: string) {
    return Object.prototype.hasOwnProperty.call(row, key);
}

export function getStoredPasswordHash(row: PasswordUserRow) {
    if (typeof row.password_hash === 'string' && row.password_hash) {
        return row.password_hash;
    }
    if (typeof row.password === 'string' && row.password) {
        return row.password;
    }
    return null;
}

export function buildPasswordResetUpdate(
    row: PasswordUserRow,
    passwordHash: string,
    updatedAt = new Date().toISOString()
) {
    const update: Record<string, string | null> = {
        password_reset_token: null,
        password_reset_expires: null,
    };

    let passwordColumnFound = false;

    if (hasOwn(row, 'password_hash')) {
        update.password_hash = passwordHash;
        passwordColumnFound = true;
    }

    if (hasOwn(row, 'password')) {
        update.password = passwordHash;
        passwordColumnFound = true;
    }

    if (!passwordColumnFound) {
        throw new Error('Nenhuma coluna de senha foi encontrada na tabela users');
    }

    if (hasOwn(row, 'updated_at')) {
        update.updated_at = updatedAt;
    }

    return update;
}
