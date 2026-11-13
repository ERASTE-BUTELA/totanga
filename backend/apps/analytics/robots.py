"""Détection simple des robots connus (User-Agent), sans rien stocker."""

BOT_MARKERS = (
    "googlebot",
    "bingbot",
    "slurp",
    "duckduckbot",
    "baiduspider",
    "yandexbot",
    "facebookexternalhit",
    "facebot",
    "twitterbot",
    "linkedinbot",
    "embedly",
    "quora link preview",
    "showyoubot",
    "outbrain",
    "pinterest/",
    "applebot",
    "semrushbot",
    "ahrefsbot",
    "dotbot",
    "mj12bot",
    "petalbot",
    "bytespider",
    "gptbot",
    "claudebot",
    "anthropic-ai",
    "ccbot",
    "scrapy",
    "httpclient",
    "python-requests",
    "curl/",
    "wget/",
    "headlesschrome",
    "phantomjs",
    "selenium",
)


def is_known_robot(user_agent):
    text = str(user_agent or "").lower()
    if not text:
        return False
    return any(marker in text for marker in BOT_MARKERS)
