/**
 * Patient registration domain types, reference data, and API client.
 *
 * Field names map 1:1 to the public registration endpoint:
 *   POST https://dental-registration.angonorizal.net/api/v1/public/registrations
 */
import type { SearchSelectOption } from "@/components/micto/search-select"

export type Gender = "male" | "female"

/** Payload accepted by the public registration API. */
export interface PatientRegistrationPayload {
  last_name: string
  first_name: string
  middle_name: string
  suffix: string | null
  date_of_birth: string
  gender: Gender
  street_number: string
  street_name: string
  brgy: string
  cellphone: string | null
}

/** Shape of the form while the user is editing (no nulls, plain strings). */
export interface PatientIntakeFormValues {
  last_name: string
  first_name: string
  middle_name: string
  suffix: string
  date_of_birth: string
  gender: string
  street_number: string
  street_name: string
  brgy: string
  cellphone: string
}

export const EMPTY_FORM: PatientIntakeFormValues = {
  last_name: "",
  first_name: "",
  middle_name: "",
  suffix: "",
  date_of_birth: "",
  gender: "",
  street_number: "",
  street_name: "",
  brgy: "",
  cellphone: "",
}

export const GENDER_OPTIONS: SearchSelectOption[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
]

export const SUFFIX_OPTIONS: SearchSelectOption[] = [
  { value: "Jr.", label: "Jr." },
  { value: "Sr.", label: "Sr." },
  { value: "II", label: "II" },
  { value: "III", label: "III" },
  { value: "IV", label: "IV" },
  { value: "V", label: "V" },
]

/**
 * Barangays of Angono, Rizal. The API validates `brgy` against lowercase
 * values, so `value` is lowercase while `label` is the display name.
 */
export const ANGONO_BARANGAYS: SearchSelectOption[] = [
  ["santo niño", "Sto. Niño"],
  ["kalayaan", "Kalayaan"],
  ["san roque", "San Roque"],
  ["san isidro", "San Isidro"],
  ["san pedro", "San Pedro"],
  ["san vicente", "San Vicente"],
  ["bagumbayan", "Bagumbayan"],
  ["poblacion ibaba", "Poblacion Ibaba"],
  ["mahabang parang", "Mahabang Parang"],
  ["poblacion itaas", "Poblacion Itaas"],
].map(([value, label]) => ({ value, label }))

/**
 * Normalize a PH mobile number to the API's expected `09XX-XXXXXXX` form.
 * Accepts bare digits or a `+63`/`63` prefix; returns the trimmed input
 * unchanged when it cannot be interpreted, so server validation can report it.
 */
export function formatPhMobile(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "")
  const local = digits.startsWith("63") ? `0${digits.slice(2)}` : digits
  return /^09\d{9}$/.test(local)
    ? `${local.slice(0, 4)}-${local.slice(4)}`
    : raw.trim()
}

/** Convert the editable form state into the API payload. */
export function toPayload(values: PatientIntakeFormValues): PatientRegistrationPayload {
  const trimmed = (v: string) => v.trim()
  const orNull = (v: string) => {
    const t = trimmed(v)
    return t.length > 0 ? t : null
  }

  const cellphone = orNull(values.cellphone)

  return {
    last_name: trimmed(values.last_name),
    first_name: trimmed(values.first_name),
    middle_name: trimmed(values.middle_name),
    suffix: orNull(values.suffix),
    date_of_birth: values.date_of_birth.slice(0, 10), // DatePicker returns "yyyy-MM-dd HH:mm"
    gender: (values.gender === "female" ? "female" : "male") as Gender,
    street_number: trimmed(values.street_number),
    street_name: trimmed(values.street_name),
    brgy: trimmed(values.brgy),
    cellphone: cellphone ? formatPhMobile(cellphone) : null,
  }
}

export interface RegistrationResult {
  ok: boolean
  status: number
  /** Server response body (parsed JSON when possible). */
  data: unknown
  message: string
}

const API_BASE_URL: string =
  import.meta.env.VITE_REGISTRATION_API_URL ?? ""

const REGISTRATIONS_PATH = "/api/v1/public/registrations"

/**
 * Public Cloudflare Turnstile site key. Safe to expose in the browser; the
 * matching secret key is verified server-side. Overridable at build time via
 * `VITE_TURNSTILE_SITE_KEY`.
 */
export const TURNSTILE_SITE_KEY: string =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAFKudkMQvbGBPoLK"

/** Request body field the API expects the Turnstile token in. */
const TURNSTILE_FIELD = "turnstile_token"

/** Extract a human-readable error message from an unknown API error body. */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback
  const record = body as Record<string, unknown>

  if (typeof record.message === "string") return record.message
  if (typeof record.detail === "string") return record.detail

  const errors = record.errors
  if (errors && typeof errors === "object") {
    const first = Object.values(errors as Record<string, unknown>)[0]
    if (Array.isArray(first) && typeof first[0] === "string") return first[0]
    if (typeof first === "string") return first
  }

  return fallback
}

/**
 * Submit a patient registration to the public API.
 * Never throws for HTTP errors — inspect `result.ok` instead.
 */
export async function submitRegistration(
  payload: PatientRegistrationPayload,
  turnstileToken?: string,
): Promise<RegistrationResult> {
  try {
    const body = turnstileToken
      ? { ...payload, [TURNSTILE_FIELD]: turnstileToken }
      : payload

    const response = await fetch(`${API_BASE_URL}${REGISTRATIONS_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data,
        message: extractErrorMessage(
          data,
          `Registration failed (HTTP ${response.status}). Please try again.`,
        ),
      }
    }

    return {
      ok: true,
      status: response.status,
      data,
      message: extractErrorMessage(data, "Registration submitted successfully."),
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      message:
        error instanceof Error && error.message
          ? `Could not reach the registration service: ${error.message}`
          : "Could not reach the registration service. Please check your connection.",
    }
  }
}
