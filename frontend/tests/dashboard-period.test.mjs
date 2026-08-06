import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    buildDashboardPeriod,
    getDashboardPeriodRequest,
} from '../src/lib/dashboard-period.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const referenceDate = new Date(2026, 7, 6, 12, 0, 0);

test('last seven days is an inclusive seven-day calendar period', () => {
    const period = buildDashboardPeriod('last7', { now: referenceDate });

    assert.equal(period.startDate, '2026-07-31');
    assert.equal(period.endDate, '2026-08-06');
    assert.ok(new Date(period.start) < new Date(period.end));
});

test('all dashboard shortcuts resolve to complete date ranges', () => {
    const expected = {
        today: ['2026-08-06', '2026-08-06'],
        yesterday: ['2026-08-05', '2026-08-05'],
        last30: ['2026-07-08', '2026-08-06'],
        thisWeek: ['2026-08-02', '2026-08-06'],
        lastWeek: ['2026-07-26', '2026-08-01'],
        thisMonth: ['2026-08-01', '2026-08-06'],
        lastMonth: ['2026-07-01', '2026-07-31'],
    };

    for (const [preset, [startDate, endDate]] of Object.entries(expected)) {
        const period = buildDashboardPeriod(preset, { now: referenceDate });
        assert.equal(period.startDate, startDate, preset);
        assert.equal(period.endDate, endDate, preset);
    }
});

test('custom periods require both dates in chronological order', () => {
    const period = buildDashboardPeriod('custom', {
        startDate: '2026-07-10',
        endDate: '2026-07-15',
    });

    assert.equal(period.startDate, '2026-07-10');
    assert.equal(period.endDate, '2026-07-15');
    assert.throws(() => buildDashboardPeriod('custom', { startDate: '2026-07-10' }));
    assert.throws(() => buildDashboardPeriod('custom', {
        startDate: '2026-07-16',
        endDate: '2026-07-15',
    }));
});

test('dashboard requests use seven days by default and preserve explicit dates', () => {
    const emptyParams = new URLSearchParams();
    const defaultRequest = getDashboardPeriodRequest(emptyParams, referenceDate);
    assert.equal(buildDashboardPeriod('last7', { now: referenceDate }).start, defaultRequest.start);
    assert.equal(buildDashboardPeriod('last7', { now: referenceDate }).end, defaultRequest.end);

    const explicitParams = new URLSearchParams({ start: 'start-value', end: 'end-value' });
    assert.deepEqual(getDashboardPeriodRequest(explicitParams, referenceDate), {
        start: 'start-value',
        end: 'end-value',
    });
});

test('dashboard confirmation applies the selected range and the page uses the visible default', () => {
    const layout = read('../src/app/dashboard/layout.tsx');
    const page = read('../src/app/dashboard/page.tsx');
    const route = read('../src/app/api/dashboard/stats/route.ts');

    assert.match(layout, /onClick=\{applyDashboardFilters\}/);
    assert.match(layout, /buildDashboardPeriod\(rangePreset/);
    assert.match(page, /loadPeriod\(getDashboardPeriodRequest\(searchParams\)\)/);
    assert.match(route, /startDate && endDate && startDate > endDate/);
});
