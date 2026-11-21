const ALLOWED = new Set(["P", "BR", "STRONG", "EM", "U", "H2", "H3", "UL", "OL", "LI", "BLOCKQUOTE", "A", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD"])

function cleanedTree(html) {
  const parsed = new DOMParser().parseFromString(String(html || ""), "text/html")
  const root = document.createElement("div")

  function append(parent, node) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.append(node.textContent)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    let tag = node.tagName
    if (tag === "DIV") tag = "P"
    if (tag === "B") tag = "STRONG"
    if (tag === "I") tag = "EM"
    if (!ALLOWED.has(tag)) {
      node.childNodes.forEach((child) => append(parent, child))
      return
    }
    if (tag === "A") {
      const href = node.getAttribute("href") || ""
      if (!/^https?:\/\//i.test(href)) {
        node.childNodes.forEach((child) => append(parent, child))
        return
      }
      const link = document.createElement("a")
      link.setAttribute("href", href)
      link.setAttribute("rel", "noopener noreferrer")
      link.setAttribute("target", "_blank")
      node.childNodes.forEach((child) => append(link, child))
      parent.append(link)
      return
    }
    const element = document.createElement(tag.toLowerCase())
    node.childNodes.forEach((child) => append(element, child))
    parent.append(element)
  }

  parsed.body.childNodes.forEach((child) => append(root, child))
  return root
}

export function sanitizeRichText(html) {
  return cleanedTree(html).innerHTML
}

export function richTextIsEmpty(html) {
  return !cleanedTree(html).textContent.trim()
}
