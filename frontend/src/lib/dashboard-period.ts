export type DashboardPeriodPreset =
    | 'today'
    | 'yesterday'
    | 'last7'
    | 'last30'
    | 'thisWeek'
    | 'lastWeek'
    | 'thisMonth'
    | 'lastMonth'
    | 'custom';

export type DashboardPeriod = {
    start: string;
    end: string;
    startDate: string;
    endDate: string;
};

export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriodPreset = 'last7';

const DASHBOARD_PRESETS: Exclude<DashboardPeriodPreset, 'custom'>[] = [
    'today',
    'yesterday',
    'last7',
    'last30',
    'thisWeek',
    'lastWeek',
    'thisMonth',
    'lastMonth',
];

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addCalendarDays(date: Date, amount: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
}

export function toDashboardDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateInput(value: string, boundary: 'start' | 'end') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new Error('Selecione uma data valida para o periodo');

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (toDashboardDateInput(date) !== value) {
        throw new Error('Selecione uma data valida para o periodo');
    }

    return boundary === 'start' ? startOfDay(date) : endOfDay(date);
}

export function buildDashboardPeriod(
    preset: DashboardPeriodPreset,
    options: { now?: Date; startDate?: string; endDate?: string } = {},
): DashboardPeriod {
    const now = options.now ? new Date(options.now) : new Date();
    let start: Date;
    let end: Date;

    if (preset === 'custom') {
        if (!options.startDate || !options.endDate) {
            throw new Error('Selecione a data inicial e a data final');
        }
        start = parseDateInput(options.startDate, 'start');
        end = parseDateInput(options.endDate, 'end');
    } else if (preset === 'today') {
        start = startOfDay(now);
        end = endOfDay(now);
    } else if (preset === 'yesterday') {
        const yesterday = addCalendarDays(now, -1);
        start = startOfDay(yesterday);
        end = endOfDay(yesterday);
    } else if (preset === 'last7') {
        start = startOfDay(addCalendarDays(now, -6));
        end = endOfDay(now);
    } else if (preset === 'last30') {
        start = startOfDay(addCalendarDays(now, -29));
        end = endOfDay(now);
    } else if (preset === 'thisWeek') {
        start = startOfDay(addCalendarDays(now, -now.getDay()));
        end = endOfDay(now);
    } else if (preset === 'lastWeek') {
        const startOfThisWeek = startOfDay(addCalendarDays(now, -now.getDay()));
        start = addCalendarDays(startOfThisWeek, -7);
        end = endOfDay(addCalendarDays(startOfThisWeek, -1));
    } else if (preset === 'thisMonth') {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = endOfDay(now);
    } else {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    if (start > end) throw new Error('A data inicial deve ser anterior a data final');

    return {
        start: start.toISOString(),
        end: end.toISOString(),
        startDate: toDashboardDateInput(start),
        endDate: toDashboardDateInput(end),
    };
}

export function getDashboardPeriodRequest(
    searchParams: { get(name: string): string | null },
    now = new Date(),
) {
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;

    if (start || end) return { start, end };

    const defaultPeriod = buildDashboardPeriod(DEFAULT_DASHBOARD_PERIOD, { now });
    return { start: defaultPeriod.start, end: defaultPeriod.end };
}

export function inferDashboardPeriodPreset(startDate: string, endDate: string, now = new Date()) {
    return DASHBOARD_PRESETS.find((preset) => {
        const period = buildDashboardPeriod(preset, { now });
        return period.startDate === startDate && period.endDate === endDate;
    }) || 'custom';
}
