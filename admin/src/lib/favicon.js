const DEFAULT_FAVICON = `${import.meta.env.BASE_URL}favicon.png`
const DEFAULT_LOGO = `${import.meta.env.BASE_URL}images/logo.png`

/**
 * Favicon = logo (violet), sans fond blanc.
 * Un léger halo clair autour du dessin rend le violet lisible sur fond sombre.
 */
export function setSiteFavicon(logoUrl) {
  const href = String(logoUrl || "").trim()
  if (
    !href
    || href === DEFAULT_FAVICON
    || href === DEFAULT_LOGO
    || href.endsWith("/images/logo.png")
    || href.endsWith("/favicon.png")
  ) {
    applyIcon(DEFAULT_FAVICON, "image/png")
    return
  }

  const image = new Image()
  image.decoding = "async"
  image.onload = () => {
    const size = 64
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      applyIcon(href, "image/png")
      return
    }

    const pad = 4
    const box = size - pad * 2
    const ratio = image.naturalWidth / Math.max(1, image.naturalHeight)
    let tw
    let th
    if (ratio >= 1) {
      tw = box
      th = Math.max(1, Math.round(box / ratio))
    } else {
      th = box
      tw = Math.max(1, Math.round(box * ratio))
    }
    const x = Math.round((size - tw) / 2)
    const y = Math.round((size - th) / 2)

    ctx.save()
    ctx.shadowColor = "rgba(255, 248, 235, 0.95)"
    ctx.shadowBlur = 3
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    for (let i = 0; i < 3; i += 1) {
      ctx.drawImage(image, x, y, tw, th)
    }
    ctx.restore()
    ctx.drawImage(image, x, y, tw, th)
    applyIcon(canvas.toDataURL("image/png"), "image/png")
  }
  image.onerror = () => applyIcon(DEFAULT_FAVICON, "image/png")
  image.src = href
}

function applyIcon(href, type) {
  let link = document.querySelector("link[rel='icon']")
  if (!link) {
    link = document.createElement("link")
    link.rel = "icon"
    document.head.append(link)
  }
  link.type = type
  link.href = href
}
