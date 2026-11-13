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
  Facebook: IconFacebook,
  WhatsApp: IconWhatsApp,
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
            <ul className="mt-5 flex flex-wrap items-center gap-4">
              {library.socials.map((item) => {
                const Icon = SOCIAL_ICONS[item.label]
                return (
                  <li key={item.label}>
                    <ExternalLink
                      href={item.url}
                      label={item.label}
                      className="inline-flex text-on-bar hover:text-gold-bright focus-visible:outline-gold-bright"
                    >
                      {Icon ? <Icon className="h-5 w-5" /> : <span className="text-badge">{item.label}</span>}
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
      <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v7h4v-7h3l1-4h-4V9c0-.6.4-1 1-1z" />
    </svg>
  )
}

function IconWhatsApp({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 3.2c-4.8 0-8.7 3.9-8.7 8.7 0 1.5.4 3 1.1 4.3L3 21l4.9-1.3c1.3.7 2.7 1.1 4.1 1.1 4.8 0 8.7-3.9 8.7-8.7S16.8 3.2 12 3.2zm0 15.9c-1.3 0-2.6-.3-3.7-.9l-.3-.2-2.9.8.8-2.8-.2-.3c-.7-1.1-1-2.4-1-3.7 0-3.9 3.2-7.1 7.1-7.1s7.1 3.2 7.1 7.1-3.2 7.1-7.1 7.1zm4-5.3c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.8-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.5c.1-.1.2-.3.2-.4 0-.1 0-.3-.1-.4-.1-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4.5.2.9.4 1.3.5.5.2 1 .1 1.3.1.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1 0-.1-.2-.2-.4-.3z" />
    </svg>
  )
}
