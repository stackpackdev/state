// Bounded action history buffer — ring buffer implementation
// O(1) push, O(n) only on getAll/filter operations
const DEFAULT_LIMIT = 10_000;
export function createHistory(limit = DEFAULT_LIMIT) {
    let buffer = new Array(limit);
    let head = 0;
    let size = 0;
    function toArray() {
        if (size === 0)
            return [];
        const result = new Array(size);
        // Return newest-first: head-1 is newest, walk backwards wrapping around
        for (let i = 0; i < size; i++) {
            const idx = (head - 1 - i + limit) % limit;
            result[i] = buffer[idx];
        }
        return result;
    }
    return {
        push(action) {
            buffer[head] = action;
            head = (head + 1) % limit;
            if (size < limit)
                size++;
        },
        getAll() {
            return toArray();
        },
        getByActor(actorId) {
            return toArray().filter(a => a.actor.id === actorId);
        },
        getByPath(path) {
            return toArray().filter(a => a.path?.startsWith(path));
        },
        getLast(n = 1) {
            return toArray().slice(0, n);
        },
        clear() {
            buffer = new Array(limit);
            head = 0;
            size = 0;
        },
        get length() {
            return size;
        },
    };
}
//# sourceMappingURL=history.js.map