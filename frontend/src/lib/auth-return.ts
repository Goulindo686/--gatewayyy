export function getSafeReturnTo(search: string) {
    const requestedReturnTo = new URLSearchParams(search).get('returnTo');

    return requestedReturnTo
        && requestedReturnTo.startsWith('/')
        && !requestedReturnTo.startsWith('//')
        ? requestedReturnTo
        : null;
}

export function buildAuthUrl(pathname: '/login' | '/register', returnTo: string | null) {
    return returnTo
        ? `${pathname}?returnTo=${encodeURIComponent(returnTo)}`
        : pathname;
}
