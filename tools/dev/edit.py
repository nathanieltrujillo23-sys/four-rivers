"""Whitespace-flexible string replacement helper for bulk UI edits (line wrapping makes exact matches brittle)."""
import re, sys


def flex(text: str) -> str:
    parts = re.split(r"\s+", text.strip())
    body = r"\s+".join(re.escape(p) for p in parts)
    # Never match in the middle of an identifier (e.g. "Correct" inside "isCorrect").
    if re.match(r"\w", text.strip()[0]):
        body = r"(?<![A-Za-z0-9_])" + body
    if re.match(r"\w", text.strip()[-1]):
        body = body + r"(?![A-Za-z0-9_])"
    return body


def sub(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        m = re.search(flex(a), s)
        if not m:
            print("MISSING in", path, "::", a[:90])
            sys.exit(1)
        start, end = m.start(), m.end()
        # A pattern that began with indentation should replace that indentation, not stack on it.
        lead = a[: len(a) - len(a.lstrip())]
        if lead and "\n" not in lead and s[start - len(lead) : start] == lead:
            start -= len(lead)
        # A pattern that ended with a newline should not leave an extra blank line behind.
        if a.endswith("\n") and b.endswith("\n") and s[end : end + 1] == "\n":
            end += 1
        s = s[:start] + b + s[end:]
    open(path, "w").write(s)
