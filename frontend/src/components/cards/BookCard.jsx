import { Calendar, Tag } from "lucide-react"
import { Link } from "react-router"
import { authorNames } from "../../lib/format.js"
import { BookStatus } from "./BookStatus.jsx"

export function BookCard({ book, compact = false, plain = false, catalog = false }) {
  const authors = authorNames(book.authors)
  if (catalog) {
    return (
      <article className="h-full rounded-2xl border border-line bg-white p-3 shadow-card">
        <Link to={`/catalogue/${book.slug}`} className="flex h-full gap-3 rounded-control">
          <img src={book.cover} alt="" className="h-32 w-20 shrink-0 rounded-lg object-cover shadow-cover" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="line-clamp-2 text-body font-bold text-heading">{book.title}</span>
            <span className="mt-1 line-clamp-2 text-meta text-muted">{authors || "Auteur non indiqué"}</span>
            <span className="mt-2 inline-flex items-center gap-1.5 text-meta text-muted">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {book.publicationYear || "Année inconnue"}
            </span>
            {book.category?.name ? (
              <span className="mt-1 inline-flex items-center gap-1.5 text-meta text-muted">
                <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {book.category.name}
              </span>
            ) : null}
            <span className="mt-auto pt-3">
              <BookStatus book={book} marked />
            </span>
          </span>
        </Link>
      </article>
    )
  }
  if (plain) {
    return (
      <article className="flex h-full flex-col">
        <Link to={`/catalogue/${book.slug}`} className="flex h-full flex-col">
          <img src={book.cover} alt="" className="aspect-[2/3] w-full rounded-lg object-cover shadow-cover" />
          <h3 className="cover-title mt-3 text-cover text-heading">{book.title}</h3>
          <p className="mt-1 line-clamp-1 min-h-[1.5em] text-meta text-muted">{authors || "\u00a0"}</p>
          <div className="mt-auto pt-3">
            <BookStatus book={book} prominent />
          </div>
        </Link>
      </article>
    )
  }
  return (
    <article className="flex h-full flex-col rounded-card border border-line bg-white p-3 shadow-card">
      <Link to={`/catalogue/${book.slug}`} className="flex h-full flex-col rounded-control">
        <img src={book.cover} alt="" className="aspect-[3/4] w-full rounded-control bg-lavender object-cover" />
        <h3 className="mt-3 text-card text-ink">{book.title}</h3>
        {authors ? <p className="mt-1 text-meta text-muted">{authors}</p> : null}
        {compact ? null : (
          <p className="mt-1 text-meta text-muted">
            {book.publicationYear || "Année inconnue"}
            {book.category?.name ? ` · ${book.category.name}` : ""}
          </p>
        )}
        <div className="mt-auto pt-3">
          <BookStatus book={book} />
        </div>
      </Link>
    </article>
  )
}
