export function buyerProductDestination(orderId: string, hasUniqueDelivery: boolean) {
    return hasUniqueDelivery
        ? `/minhas-entregas?order=${encodeURIComponent(orderId)}`
        : '/area-membros';
}

export function buyerSupportDestination(orderId: string) {
    return `/minhas-entregas?order=${encodeURIComponent(orderId)}&view=support`;
}
