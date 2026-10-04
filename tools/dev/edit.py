"""Whitespace-flexible string replacement helper for bulk UI edits (prettier line wrapping makes exact matches brittle)."""
import re, sys

def flex(text: str) -> str:
    parts = re.split(r"\s+", text.strip())
    return r"\s+".join(re.escape(p) for p in parts)

def sub(path, pairs, count=1):
    s = open(path).read()
    for a, b in pairs:
        pat = flex(a) if isinstance(a, str) else a.pattern
        m = re.search(pat, s)
        if not m:
            print("MISSING in", path, "::", (a if isinstance(a, str) else a.pattern)[:90])
            sys.exit(1)
        s = s[:m.start()] + (b if not callable(b) else b(m)) + s[m.end():]
    open(path, "w").write(s)
