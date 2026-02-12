export function debounce<T extends (...args: unknown[]) => void>(fn: T, wait = 300) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}
