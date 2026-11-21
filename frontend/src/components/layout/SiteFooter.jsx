import { Mail, MapPin, Phone } from "lucide-react"
import { Link } from "react-router"
import { ExternalLink } from "../ui/ExternalLink.jsx"

const QUICK_LINKS = [
  { to: "/", label: "Accueil" },
  { to: "/catalogue", label: "Catalogue" },
  { to: "/annonces", label: "Annonces" },
  { to: "/publications", label: "Publications" },
  { to: "/evenements", label: "Événements" },
  { to: "/a-propos", label: "À propos" },
]

const INFO_LINKS = [
  { to: "/a-propos#horaires-bibliotheque", label: "Horaires d'ouverture" },
  { to: "/reglement", label: "Règlement intérieur" },
]

const LEGAL_LINKS = [
  { to: "/mentions-legales", label: "Mentions légales" },
  { to: "/confidentialite", label: "Confidentialité" },
  { to: "/conditions", label: "Conditions d'utilisation" },
]

const SOCIAL_ICONS = {
  facebook: IconFacebook,
  whatsapp: IconWhatsApp,
  youtube: IconYouTube,
  instagram: IconInstagram,
  tiktok: IconTikTok,
}

function socialIconKey(item) {
  const raw = String(item?.id || item?.label || "").toLowerCase().replace(/\s+/g, "")
  if (raw.includes("facebook")) return "facebook"
  if (raw.includes("whatsapp")) return "whatsapp"
  if (raw.includes("youtube") || raw.includes("youtu")) return "youtube"
  if (raw.includes("instagram")) return "instagram"
  if (raw.includes("tiktok")) return "tiktok"
  return raw
}

const linkClass = "inline-flex py-0.5 text-meta text-on-bar/80 hover:text-on-bar focus-visible:outline-gold-bright"

export function SiteFooter({ library, error }) {
  const year = new Date().getFullYear()
  const name = library?.name || "Bibliothèque Totanga"

  return (
    <footer className="mt-auto bg-violet-dark text-on-bar">
      <div className="grid gap-10 px-4 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-12 lg:px-14">
        <div>
          <Link
            to="/"
            aria-label="Bibliothèque Totanga, Sœurs des pauvres de Bergame"
            className="inline-flex rounded-2xl bg-panel px-3 py-2 focus-visible:outline-gold-bright"
          >
            <img src="/images/logo.png" alt="" className="theme-logo h-14 w-auto" />
          </Link>
          <p className="mt-4 max-w-xs text-meta text-on-bar/80">
            Un espace de savoir, de culture et de découverte au service de la communauté de Kinshasa.
          </p>
          {library?.socials?.length ? (
            <ul className="mt-5 flex flex-wrap items-center gap-3">
              {library.socials.map((item) => {
                const key = socialIconKey(item)
                const Icon = SOCIAL_ICONS[key]
                return (
                  <li key={item.label}>
                    <ExternalLink
                      href={item.url}
                      label={item.label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-on-bar/25 bg-on-bar/10 text-on-bar transition hover:border-gold-bright hover:bg-gold-bright hover:text-violet-dark focus-visible:outline-gold-bright"
                    >
                      {Icon ? <Icon className="h-5 w-5" /> : <span className="text-badge font-semibold">{item.label.slice(0, 2)}</span>}
                    </ExternalLink>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>

        <FooterColumn title="Liens rapides" links={QUICK_LINKS} />
        <FooterColumn title="Informations" links={INFO_LINKS} />

        <div>
          <h2 className="text-cover text-on-bar">Contact</h2>
          {error ? <p className="mt-4 text-meta text-on-bar/80">{error}</p> : null}
          {library ? (
            <div className="mt-4 space-y-3">
              <p className="flex items-start gap-3 text-meta text-on-bar/80">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-on-bar" aria-hidden="true" />
                <span>
                  {library.address}
                  <br />
                  {library.city}
                </span>
              </p>
              <ContactLine icon={Phone} href={phoneHref(library.phone)}>
                {library.phone}
              </ContactLine>
              <ContactLine icon={Mail} href={mailHref(library.email)}>
                {library.email}
              </ContactLine>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-on-bar/15 px-4 py-4 sm:px-8 lg:px-14">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-meta text-on-bar/80">© {year} {name}. Tous droits réservés.</p>
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {LEGAL_LINKS.map((link, index) => (
              <li key={link.to} className="flex items-center gap-3">
                {index > 0 ? <span aria-hidden="true" className="text-on-bar/50">|</span> : null}
                <Link to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h2 className="text-cover text-on-bar">{title}</h2>
      <ul className="mt-4 space-y-1.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className={linkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContactLine({ icon: Icon, href, children }) {
  const className = "flex items-start gap-3 text-meta text-on-bar/80 hover:text-on-bar focus-visible:outline-gold-bright"
  const content = (
    <>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-on-bar" aria-hidden="true" />
      <span>{children}</span>
    </>
  )
  if (!href) return <p className="flex items-start gap-3 text-meta text-on-bar/80">{content}</p>
  return (
    <a href={href} className={className}>
      {content}
    </a>
  )
}

function phoneHref(phone) {
  const compact = String(phone || "").replace(/[^\d+]/g, "")
  if (!/^\+?[0-9]{8,15}$/.test(compact)) return null
  return `tel:${compact}`
}

function mailHref(email) {
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email || "")) return null
  return `mailto:${email}`
}

function IconFacebook({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.03H7.9v-2.9h2.4V9.85c0-2.37 1.41-3.68 3.56-3.68 1.03 0 2.11.18 2.11.18v2.33h-1.19c-1.17 0-1.54.73-1.54 1.48v1.78h2.62l-.42 2.9h-2.2V22c4.78-.75 8.44-4.91 8.44-9.93z" />
    </svg>
  )
}

function IconWhatsApp({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M20.5 3.5A10.5 10.5 0 0 0 3.4 17.7L2 22l4.4-1.3A10.5 10.5 0 1 0 20.5 3.5zM12 20.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-2.5.7.7-2.4-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1s-.7.8-.8 1c-.1.1-.3.2-.6.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.1.2-.3.3-.4.1-.1.1-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.4-.2.2-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.8.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  )
}

function IconYouTube({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.75 15.5v-7L16 12l-6.25 3.5z" />
    </svg>
  )
}

function IconInstagram({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </svg>
  )
}

function IconTikTok({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M19.6 7.3a6.5 6.5 0 0 1-3.8-1.2v8.1a5.9 5.9 0 1 1-5.1-5.8v3a2.9 2.9 0 1 0 2.1 2.8V2.5h3a6.5 6.5 0 0 0 3.8 3.7v1.1z" />
    </svg>
  )
}
