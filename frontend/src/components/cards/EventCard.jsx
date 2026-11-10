import { eventDay, formatDate, formatTimeRange } from "../../lib/format.js"
import { ExternalLink } from "../ui/ExternalLink.jsx"
import { IconCalendar, IconPin } from "../ui/Icons.jsx"

export function EventCard({ event, plain = false }) {
  const day = eventDay(event.startsAt)
  const hours = formatTimeRange(event.startsAt, event.endsAt)
  const dateLabel = formatDate(event.startsAt)
  const when = [dateLabel, hours].filter(Boolean).join(" · ")
  const details = (
    <>
      <div className="min-w-0 flex-1">
        <h3 className="text-card text-ink">{event.title}</h3>
        {event.image && when ? (
          <p className="mt-1 flex items-center gap-2 text-meta text-muted">
            <IconCalendar className="h-4 w-4 shrink-0" />
            {when}
          </p>
        ) : hours ? (
          <p className="mt-1 flex items-center gap-2 text-meta text-muted">
            <IconCalendar className="h-4 w-4 shrink-0" />
            {hours}
          </p>
        ) : null}
        {event.location ? (
          <p className="mt-1 flex items-center gap-2 text-meta text-muted">
            <IconPin className="h-4 w-4 shrink-0" />
            {event.location}
          </p>
        ) : null}
      </div>
      <ExternalLink
        href={event.registrationUrl}
        className="control rounded-control border border-violet px-4 py-2 font-semibold text-violet"
      >
        S'inscrire
      </ExternalLink>
    </>
  )

  if (event.image) {
    return (
      <article className={plain ? "flex flex-col gap-4 sm:flex-row sm:items-center" : "overflow-hidden rounded-card border border-line bg-white shadow-card sm:flex sm:items-stretch"}>
        <img
          src={event.image}
          alt=""
          className={
            plain
              ? "aspect-[3/2] w-full rounded-lg object-cover shadow-cover sm:w-48 sm:shrink-0"
              : "aspect-[3/2] w-full object-cover sm:w-48 sm:shrink-0"
          }
        />
        <div className={plain ? "flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center" : "flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center"}>
          {details}
        </div>
      </article>
    )
  }

  return (
    <article className={plain ? "flex flex-col gap-4 sm:flex-row sm:items-center" : "rounded-card border border-line bg-white p-4 shadow-card"}>
      <div className={plain ? "flex flex-col gap-4 sm:flex-row sm:items-center" : "flex flex-col gap-4 sm:flex-row sm:items-center"}>
        {day ? (
          <p className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-control bg-lavender text-violet">
            <span className="text-section">{day.day}</span>
            <span className="text-badge">{day.month}</span>
          </p>
        ) : null}
        {details}
      </div>
    </article>
  )
}
