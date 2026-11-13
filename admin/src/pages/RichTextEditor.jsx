import { useEffect, useRef, useState } from "react"
import { Bold, Italic, Link2, List, ListOrdered, Quote, Redo2, Table, Underline, Undo2 } from "lucide-react"
import { fillRichText, sanitizeRichText } from "./richText.js"

function ToolButton({ label, pressed, children, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-control ${pressed ? "bg-lavender text-violet" : "text-heading hover:bg-canvas"}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ value, onChange, disabled, label = "Contenu de la publication" }) {
  const editor = useRef(null)
  const initial = useRef(value)
  const [marks, setMarks] = useState({})

  useEffect(() => {
    if (editor.current) fillRichText(editor.current, initial.current)
  }, [])

  function refresh() {
    try {
      setMarks({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
      })
    } catch {
      setMarks({})
    }
  }

  function publish() {
    onChange(sanitizeRichText(editor.current.innerHTML))
    refresh()
  }

  function command(name, argument) {
    editor.current.focus()
    document.execCommand(name, false, argument)
    publish()
  }

  function addLink() {
    const href = window.prompt("Adresse du lien (http ou https)")
    if (!href) return
    if (!/^https?:\/\//i.test(href.trim())) return
    command("createLink", href.trim())
  }

  function addTable() {
    command("insertHTML", "<table><tbody><tr><td> </td><td> </td></tr><tr><td> </td><td> </td></tr></tbody></table>")
  }

  function onPaste(event) {
    event.preventDefault()
    const html = event.clipboardData.getData("text/html")
    const text = event.clipboardData.getData("text/plain")
    if (html) command("insertHTML", sanitizeRichText(html))
    else command("insertText", text)
  }

  return (
    <div className="overflow-hidden rounded-control border border-line">
      {disabled ? null : (
        <div className="flex flex-wrap items-center gap-1 border-b border-line bg-canvas px-2 py-1">
          <select
            aria-label="Style de paragraphe"
            className="h-11 rounded-control border border-line bg-panel px-2"
            defaultValue="Paragraphe"
            onChange={(event) => command("formatBlock", event.target.value === "Citation" ? "blockquote" : "p")}
          >
            <option>Paragraphe</option>
            <option>Citation</option>
          </select>
          <ToolButton label="Gras" pressed={marks.bold} onClick={() => command("bold")}><Bold size={18} /></ToolButton>
          <ToolButton label="Italique" pressed={marks.italic} onClick={() => command("italic")}><Italic size={18} /></ToolButton>
          <ToolButton label="Souligné" pressed={marks.underline} onClick={() => command("underline")}><Underline size={18} /></ToolButton>
          <ToolButton label="Liste à puces" onClick={() => command("insertUnorderedList")}><List size={18} /></ToolButton>
          <ToolButton label="Liste numérotée" onClick={() => command("insertOrderedList")}><ListOrdered size={18} /></ToolButton>
          <ToolButton label="Lien" onClick={addLink}><Link2 size={18} /></ToolButton>
          <ToolButton label="Citation" onClick={() => command("formatBlock", "blockquote")}><Quote size={18} /></ToolButton>
          <ToolButton label="Tableau" onClick={addTable}><Table size={18} /></ToolButton>
          <ToolButton label="Annuler" onClick={() => command("undo")}><Undo2 size={18} /></ToolButton>
          <ToolButton label="Rétablir" onClick={() => command("redo")}><Redo2 size={18} /></ToolButton>
        </div>
      )}
      <div
        ref={editor}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        contentEditable={disabled ? "false" : "true"}
        className="rich-text min-h-56 px-3 py-3"
        onInput={publish}
        onKeyUp={refresh}
        onMouseUp={refresh}
        onPaste={onPaste}
      />
    </div>
  )
}
