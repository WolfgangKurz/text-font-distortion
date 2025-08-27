function createLcgPrng(seed) {
    const a = 1103515245n;
    const c = 12345n;
    const m = 2n ** 31n;

    let state = BigInt(seed);

    return function() {
        state = (a * state + c) % m;
        return Number(state) / Number(m);
    };
}

export function seededShuffle (array, seed) {
    const prng = createLcgPrng(seed);
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(prng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
export function createSeedFromUint8Array (uint8Array) {
    if (uint8Array.length !== 32)
        throw new Error("Input must be a Uint8Array of length 32.");

    let seed = 0;
    for (let i = 0; i < 32; i += 4) {
        const chunk =
            (uint8Array[i] << 24) |
            (uint8Array[i + 1] << 16) |
            (uint8Array[i + 2] << 8) |
            (uint8Array[i + 3]);
        seed ^= chunk;
    }
    return seed >>> 0;
}
