"""Nettoyage HTML côté serveur (même famille de balises que l'éditeur admin)."""

from html.parser import HTMLParser
from urllib.parse import urlparse


ALLOWED_TAGS = frozenset(
    {
        "p",
        "br",
        "strong",
        "em",
        "u",
        "ul",
        "ol",
        "li",
        "blockquote",
        "a",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
    }
)
VOID_TAGS = frozenset({"br"})


def _safe_href(value):
    href = (value or "").strip()
    parsed = urlparse(href)
    if parsed.scheme in ("http", "https") and parsed.netloc:
        return href
    return ""


class _Sanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self._parts = []
        self._stack = []

    def handle_starttag(self, tag, attrs):
        name = tag.lower()
        if name == "b":
            name = "strong"
        elif name == "i":
            name = "em"
        elif name == "div":
            name = "p"
        if name not in ALLOWED_TAGS:
            return
        if name == "a":
            href = ""
            for key, value in attrs:
                if key.lower() == "href":
                    href = _safe_href(value)
                    break
            if not href:
                return
            self._parts.append(
                f'<a href="{href}" rel="noopener noreferrer" target="_blank">'
            )
            self._stack.append("a")
            return
        if name in VOID_TAGS:
            self._parts.append(f"<{name}>")
            return
        self._parts.append(f"<{name}>")
        self._stack.append(name)

    def handle_endtag(self, tag):
        name = tag.lower()
        if name == "b":
            name = "strong"
        elif name == "i":
            name = "em"
        elif name == "div":
            name = "p"
        if name in VOID_TAGS or name not in ALLOWED_TAGS:
            return
        if not self._stack or self._stack[-1] != name:
            return
        self._stack.pop()
        self._parts.append(f"</{name}>")

    def handle_data(self, data):
        if not data:
            return
        escaped = (
            data.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
        )
        self._parts.append(escaped)

    def handle_entityref(self, name):
        self._parts.append(f"&{name};")

    def handle_charref(self, name):
        self._parts.append(f"&#{name};")

    def result(self):
        while self._stack:
            self._parts.append(f"</{self._stack.pop()}>")
        return "".join(self._parts)


def sanitize_rich_text(html):
    parser = _Sanitizer()
    parser.feed(str(html or ""))
    parser.close()
    return parser.result()
