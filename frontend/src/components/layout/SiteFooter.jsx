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
  { to: "/a-propos#services", label: "Services" },
  { to: "/faq", label: "FAQ" },
  { to: "/a-propos#contact-bibliotheque", label: "Nous contacter" },
]

const LEGAL_LINKS = [
  { to: "/mentions-legales", label: "Mentions légales" },
  { to: "/confidentialite", label: "Confidentialité" },
  { to: "/conditions", label: "Conditions d'utilisation" },
]

const SOCIAL_ICONS = {
  Facebook: IconFacebook,
  X: IconX,
  Instagram: IconInstagram,
  YouTube: IconYouTube,
}

const linkClass = "inline-flex py-0.5 text-meta text-lavender hover:text-white focus-visible:outline-gold-bright"

export function SiteFooter({ library, error }) {
  const year = new Date().getFullYear()
  const name = library?.name || "Bibliothèque Totanga"

  return (
    <footer className="mt-auto bg-violet-dark text-white">
      <div className="grid gap-10 px-4 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-12 lg:px-14">
        <div>
          <Link
            to="/"
            aria-label="Bibliothèque Totanga, Sœurs des pauvres de Bergame"
            className="inline-flex rounded-2xl bg-white px-3 py-2 focus-visible:outline-gold-bright"
          >
            <img src="/images/logo.png" alt="" className="h-14 w-auto" />
          </Link>
          <p className="mt-4 max-w-xs text-meta text-lavender">
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
                      className="inline-flex text-white hover:text-gold-bright focus-visible:outline-gold-bright"
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
          <h2 className="text-cover text-white">Contact</h2>
          {error ? <p className="mt-4 text-meta text-lavender">{error}</p> : null}
          {library ? (
            <div className="mt-4 space-y-3">
              <p className="flex items-start gap-3 text-meta text-lavender">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white" aria-hidden="true" />
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

      <div className="border-t border-white/15 px-4 py-4 sm:px-8 lg:px-14">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-meta text-lavender">© {year} {name}. Tous droits réservés.</p>
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {LEGAL_LINKS.map((link, index) => (
              <li key={link.to} className="flex items-center gap-3">
                {index > 0 ? <span aria-hidden="true" className="text-lavender">|</span> : null}
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
      <h2 className="text-cover text-white">{title}</h2>
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
  const className = "flex items-start gap-3 text-meta text-lavender hover:text-white focus-visible:outline-gold-bright"
  const content = (
    <>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white" aria-hidden="true" />
      <span>{children}</span>
    </>
  )
  if (!href) return <p className="flex items-start gap-3 text-meta text-lavender">{content}</p>
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

function IconX({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M4 4h4.2l3.3 4.6L15.4 4H20l-6.1 7.2L20.3 20h-4.2l-3.6-5L8.4 20H4l6.4-7.6L4 4z" />
    </svg>
  )
}

function IconInstagram({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconYouTube({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M22 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C18.2 5.4 12 5.4 12 5.4s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 9 2 12.2 2 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6zM10 15.5v-6.6l5.2 3.3-5.2 3.3z" />
    </svg>
  )
}
