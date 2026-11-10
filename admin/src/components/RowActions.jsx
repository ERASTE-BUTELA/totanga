import { Eye, Pencil, Trash2 } from "lucide-react"
import { Link } from "react-router"

const button = "inline-flex h-11 w-11 items-center justify-center rounded-control"

export function RowActions({ viewTo, editTo, onRemove, removeLabel }) {
  return (
    <span className="flex gap-1">
      <Link to={viewTo} aria-label="Voir" className={`${button} text-[#1d4ed8]`}>
        <Eye size={18} />
      </Link>
      <Link to={editTo} aria-label="Modifier" className={`${button} text-gold`}>
        <Pencil size={18} />
      </Link>
      <button type="button" aria-label={removeLabel} className={`${button} text-unavailable`} onClick={onRemove}>
        <Trash2 size={18} />
      </button>
    </span>
  )
}
