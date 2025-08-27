import os
import sys
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter

__dir__ = os.path.dirname(__file__)

def subset_font(text: str, hash: str) -> bytes | None:
    try:
        font = TTFont(os.path.join(__dir__, "../res/woff2/PretendardVariable.woff2"))
        subsetter = Subsetter()
        subsetter.options.layout_features = "*"
        subsetter.options.glyph_names = True
        subsetter.populate(text=text)
        subsetter.subset(font)

        cmap = font.getBestCmap()
        with open(os.path.join(__dir__, f"../cache/TFD_{hash}.txt"), "wb") as f:
            f.write(
                "".join([chr(x) for x in list(cmap.keys())])
                    .encode("utf-8")
            )
            f.close()

        font.flavor = "woff"
        font.save(os.path.join(__dir__, f"../cache/TFD_{hash}.woff"))
    except:
        return None

def main():
    text = sys.argv[1]
    hash = sys.argv[2]

    subset_font(text, hash)
    sys.exit(0)

if __name__ == "__main__":
    main()
