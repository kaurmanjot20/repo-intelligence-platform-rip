"use client"
import type { CopilotReference } from "@rip/types"

interface Props {
  reference: CopilotReference
  onClick: () => void
}

export function CopilotCitationChip({ reference, onClick }: Props) {
  const fileName = reference.file.split("/").pop() ?? reference.file

  return (
    <button
      type="button"
      onClick={onClick}
      title={reference.file}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-700 hover:bg-indigo-800 text-zinc-300 hover:text-zinc-100 text-xs rounded transition-colors cursor-pointer"
    >
      <span className="text-indigo-400">→</span>
      <span className="font-medium">{reference.name}</span>
      <span className="text-zinc-500 text-[10px] hidden sm:inline">{fileName}</span>
    </button>
  )
}
