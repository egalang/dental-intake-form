import * as React from "react"

/**
 * Minimal Cloudflare Turnstile widget.
 *
 * Loads the official script once and renders the widget explicitly so the form
 * owns the token lifecycle (verify / expire / reset). Site keys are public and
 * safe to ship in the browser; the secret key must stay server-side.
 */

interface TurnstileRenderOptions {
  sitekey: string
  theme?: "light" | "dark" | "auto"
  size?: "normal" | "compact" | "flexible"
  callback?: (token: string) => void
  "expired-callback"?: () => void
  "timeout-callback"?: () => void
  "error-callback"?: (errorCode?: string) => void
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_ID = "cf-turnstile-script"
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

let loadPromise: Promise<void> | null = null

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement("script")
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    script.addEventListener("load", () => resolve())
    script.addEventListener("error", () =>
      reject(new Error("Failed to load the Turnstile script.")),
    )
  })

  return loadPromise
}

export interface TurnstileHandle {
  /** Re-run the challenge. Required because tokens are single-use. */
  reset: () => void
}

export interface TurnstileProps {
  siteKey: string
  /** Called with a fresh token whenever the challenge is solved. */
  onVerify: (token: string) => void
  onExpire?: () => void
  /** Receives the Turnstile client error code (e.g. 110200) when available. */
  onError?: (errorCode?: string) => void
  className?: string
}

export const Turnstile = React.forwardRef<TurnstileHandle, TurnstileProps>(
  function Turnstile({ siteKey, onVerify, onExpire, onError, className }, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const widgetIdRef = React.useRef<string | null>(null)
    const callbacksRef = React.useRef({ onVerify, onExpire, onError })

    React.useEffect(() => {
      callbacksRef.current = { onVerify, onExpire, onError }
    })

    React.useImperativeHandle(
      ref,
      () => ({
        reset() {
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current)
          }
        },
      }),
      [],
    )

    React.useEffect(() => {
      let cancelled = false

      loadTurnstile()
        .then(() => {
          if (cancelled || widgetIdRef.current || !containerRef.current) return
          if (!window.turnstile) throw new Error("Turnstile unavailable")
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: "auto",
            callback: (token) => callbacksRef.current.onVerify(token),
            "expired-callback": () => callbacksRef.current.onExpire?.(),
            "timeout-callback": () => callbacksRef.current.onExpire?.(),
            "error-callback": (errorCode) => callbacksRef.current.onError?.(errorCode),
          })
        })
        .catch(() => {
          if (!cancelled) callbacksRef.current.onError?.()
        })

      return () => {
        cancelled = true
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }
      }
    }, [siteKey])

    return <div ref={containerRef} className={className} />
  },
)
