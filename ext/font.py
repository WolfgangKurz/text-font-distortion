import os
import io
import sys
import math
from fontTools.ttLib import TTFont

def create_lcg_prng(seed):
    a = 1103515245
    c = 12345
    m = 2**31
    state = seed
    
    def prng():
        nonlocal state
        state = (a * state + c) % m
        return state / m
    return prng

def seeded_shuffle(array, seed):
    prng = create_lcg_prng(seed)
    result = array[:]

    for i in range(len(result) - 1, 0, -1):
        j = math.floor(prng() * (i + 1))
        result[i], result[j] = result[j], result[i]

    return result
def create_seed_from_bytes(byte_array):
    if len(byte_array) != 32:
        raise ValueError("Input must be a byte array of length 32.")

    seed = 0
    for i in range(0, 32, 4):
        chunk = (
            (byte_array[i]   << 24) |
            (byte_array[i+1] << 16) |
            (byte_array[i+2] << 8)  |
            (byte_array[i+3])
        )
        seed ^= chunk

    return seed & 0xFFFFFFFF

def shuffle_font_glyphs(token: bytes, hash_for_text: str) -> bytes | None:
    # try:
        cacheFont = f"../cache/TFD_{hash_for_text}.woff"
        if not os.path.exists(cacheFont):
            return None

        font = TTFont(cacheFont)

        cmap = font.getBestCmap()
        if not cmap:
            print("오류: 폰트에서 적절한 cmap 테이블을 찾을 수 없습니다.", file=sys.stderr)
            return None

        ref_keys = []
        ref_table = []
        _keys = list(cmap.keys())
        for i in range(len(_keys)):
            k = _keys[i]
            ref_keys.append(k) # source key list
            ref_table.append(cmap[k]) # ref index list

        lcgSeed = create_seed_from_bytes(token)
        ref_table = seeded_shuffle(ref_table, lcgSeed) # shuffle ref

        for i in range(len(ref_keys)):
            # print(f"{chr(ref_keys[i])} -> {chr(ref_keys[ref_table[i]])}")
            cmap[ref_keys[i]] = ref_table[i]

        buffer = io.BytesIO()
        font.flavor = "woff"
        font.save(buffer)
        
        buffer.seek(0)
        return buffer.read()
    # except Exception as e:
    #     return None

def main():
    token = bytes.fromhex(sys.argv[1])
    sig = sys.argv[2]
    mod = shuffle_font_glyphs(token, sig)

    if mod:
        sys.stdout.buffer.write(mod)
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
