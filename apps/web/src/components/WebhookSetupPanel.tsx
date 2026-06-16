"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy } from "lucide-react"

interface Props {
  repositoryId: string
  webhookSecret: string
  apiBase: string
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors shrink-0"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

function Row({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-500 text-xs w-28 shrink-0">{label}</span>
      <span className="flex-1 font-mono text-xs text-zinc-200 truncate">
        {secret ? "•".repeat(24) : value}
      </span>
      <CopyButton value={value} />
    </div>
  )
}

export function WebhookSetupPanel({ repositoryId, webhookSecret, apiBase }: Props) {
  const router = useRouter()
  const webhookUrl = `${apiBase}/repositories/${repositoryId}/webhook`

  const [checklist, setChecklist] = useState({
    url: false,
    contentType: false,
    secret: false,
    event: false,
  })

  const toggle = (key: keyof typeof checklist) =>
    setChecklist((c) => ({ ...c, [key]: !c[key] }))

  return (
    <div className="flex flex-col gap-6 p-5 bg-zinc-900 border border-zinc-800 rounded-lg">
      <div>
        <h2 className="text-zinc-100 font-semibold text-sm">Webhook Setup</h2>
        <p className="text-zinc-400 text-xs mt-1">
          Add this webhook to your GitHub repository: Settings → Webhooks → Add webhook
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Row label="Payload URL" value={webhookUrl} />
        <div className="flex items-center gap-3">
          <span className="text-zinc-500 text-xs w-28 shrink-0">Content type</span>
          <span className="text-zinc-200 text-xs flex-1">application/json</span>
        </div>
        <Row label="Secret" value={webhookSecret} secret />
        <div className="flex items-center gap-3">
          <span className="text-zinc-500 text-xs w-28 shrink-0">Events</span>
          <span className="text-zinc-200 text-xs flex-1">Just the push event</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-zinc-400 text-xs font-medium">Setup checklist</p>
        {[
          { key: "url" as const, label: "Payload URL pasted into GitHub" },
          { key: "contentType" as const, label: "Content type set to application/json" },
          { key: "secret" as const, label: "Secret pasted into GitHub" },
          { key: "event" as const, label: '"Just the push event" selected' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist[key]}
              onChange={() => toggle(key)}
              className="w-3.5 h-3.5 accent-indigo-500"
            />
            <span className="text-zinc-400 text-xs">{label}</span>
          </label>
        ))}
      </div>

      <p className="text-amber-400 text-xs">
        This secret will not be shown again. Save it before continuing.
      </p>

      <button
        type="button"
        onClick={() => router.push(`/repositories/${repositoryId}`)}
        className="self-end px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium transition-colors"
      >
        Go to Repository →
      </button>
    </div>
  )
}
