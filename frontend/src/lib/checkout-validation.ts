export const BRAZILIAN_STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export function onlyDigits(value: unknown) {
    return String(value || '').replace(/\D/g, '');
}

export function isValidCpf(value: unknown) {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

    let sum = 0;
    for (let index = 0; index < 9; index++) sum += Number(cpf[index]) * (10 - index);
    let digit = (sum * 10) % 11;
    if (digit === 10) digit = 0;
    if (digit !== Number(cpf[9])) return false;

    sum = 0;
    for (let index = 0; index < 10; index++) sum += Number(cpf[index]) * (11 - index);
    digit = (sum * 10) % 11;
    if (digit === 10) digit = 0;
    return digit === Number(cpf[10]);
}

export function isValidPhone(value: unknown) {
    const phone = onlyDigits(value);
    return phone.length === 10 || phone.length === 11;
}

export function isValidCep(value: unknown) {
    return onlyDigits(value).length === 8;
}

export function isValidBrazilianState(value: unknown) {
    return BRAZILIAN_STATES.includes(String(value || '').trim().toUpperCase() as typeof BRAZILIAN_STATES[number]);
}

export function isValidCardNumber(value: unknown) {
    const number = onlyDigits(value);
    if (number.length < 13 || number.length > 19 || /^(\d)\1+$/.test(number)) return false;

    let sum = 0;
    let doubleDigit = false;
    for (let index = number.length - 1; index >= 0; index--) {
        let digit = Number(number[index]);
        if (doubleDigit) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        doubleDigit = !doubleDigit;
    }
    return sum % 10 === 0;
}

export function isValidCardExpiration(monthInput: unknown, yearInput: unknown, now = new Date()) {
    const month = Number(monthInput);
    const rawYear = onlyDigits(yearInput);
    const year = Number(rawYear.length === 2 ? `20${rawYear}` : rawYear);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) return false;
    if (year < now.getFullYear() || year > now.getFullYear() + 25) return false;
    return year > now.getFullYear() || month >= now.getMonth() + 1;
}

export function validateCreditCardBuyer(buyer: Record<string, unknown> | null | undefined) {
    if (!buyer) return 'Dados do comprador incompletos.';
    if (String(buyer.name || '').trim().length < 3) return 'Informe o nome completo do comprador.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(buyer.email || '').trim())) return 'Informe um e-mail valido.';
    if (!isValidCpf(buyer.cpf)) return 'CPF invalido.';
    if (!isValidPhone(buyer.phone)) return 'Telefone invalido.';

    const address = buyer.address as Record<string, unknown> | undefined;
    if (!address || !isValidCep(address.zip_code)) return 'CEP invalido.';
    if (!isValidBrazilianState(address.state)) return 'UF invalida.';
    if (!String(address.street || '').trim() || !String(address.number || '').trim()) return 'Endereco de cobranca incompleto.';
    if (!String(address.neighborhood || '').trim() || !String(address.city || '').trim()) return 'Endereco de cobranca incompleto.';
    return null;
}

export function normalizeInstallments(value: unknown) {
    const installments = Math.trunc(Number(value));
    return Number.isInteger(installments) && installments >= 1 && installments <= 12 ? installments : null;
}
