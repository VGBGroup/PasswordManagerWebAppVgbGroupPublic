export const createInitials = (displayName: string | null): string => {
    return (displayName ?? '')
        .split(' ')
        .filter((w) => w.length > 0)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '';
};