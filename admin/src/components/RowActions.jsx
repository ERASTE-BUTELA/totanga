import { Eye, Pencil, Trash2 } from "lucide-react"
import { Link } from "react-router"

const button = "inline-flex h-11 w-11 items-center justify-center rounded-control"

export function RowActions({ viewTo, editTo, onView, onEdit, onRemove, removeLabel }) {
  return (
    <span className="flex gap-1">
      {onView ? (
        <button type="button" aria-label="Voir" className={`${button} text-info`} onClick={onView}>
          <Eye size={18} />
        </button>
      ) : (
        <Link to={viewTo} aria-label="Voir" className={`${button} text-info`}>
          <Eye size={18} />
        </Link>
      )}
      {onEdit ? (
        <button type="button" aria-label="Modifier" className={`${button} text-gold`} onClick={onEdit}>
          <Pencil size={18} />
        </button>
      ) : (
        <Link to={editTo} aria-label="Modifier" className={`${button} text-gold`}>
          <Pencil size={18} />
        </Link>
      )}
      <button type="button" aria-label={removeLabel} className={`${button} text-unavailable`} onClick={onRemove}>
        <Trash2 size={18} />
      </button>
    </span>
  )
}
