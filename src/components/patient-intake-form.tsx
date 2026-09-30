import * as React from "react"
import { CheckCircle2, Loader2, RotateCcw, Send, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/micto/date-picker"
import { SearchSelect } from "@/components/micto/search-select"
import { SampleCard } from "@/components/micto/sample-card"
import { confirmDialog } from "@/components/micto/confirm-dialog"
import { cn } from "@/lib/utils"
import {
  ANGONO_BARANGAYS,
  EMPTY_FORM,
  GENDER_OPTIONS,
  SUFFIX_OPTIONS,
  submitRegistration,
  toPayload,
  type PatientIntakeFormValues,
  type RegistrationResult,
} from "@/lib/patient"

type FieldErrors = Partial<Record<keyof PatientIntakeFormValues, string>>

/** Normalize a PH mobile number to bare digits, e.g. "+63 912-345-6789" -> "639123456789". */
function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "")
}

/** Accepts 09XXXXXXXXX (11 digits) or 639XXXXXXXXX (12 digits). */
function isValidPhMobile(raw: string): boolean {
  const digits = normalizePhone(raw)
  return /^09\d{9}$/.test(digits) || /^639\d{9}$/.test(digits)
}

function validate(values: PatientIntakeFormValues): FieldErrors {
  const errors: FieldErrors = {}

  if (!values.last_name.trim()) errors.last_name = "Last name is required."
  if (!values.first_name.trim()) errors.first_name = "First name is required."

  if (!values.date_of_birth) {
    errors.date_of_birth = "Date of birth is required."
  } else {
    const dob = new Date(values.date_of_birth)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (Number.isNaN(dob.getTime())) {
      errors.date_of_birth = "Please enter a valid date."
    } else if (dob > today) {
      errors.date_of_birth = "Date of birth cannot be in the future."
    }
  }

  if (!values.gender) errors.gender = "Please select a gender."
  if (!values.brgy.trim()) errors.brgy = "Please select a barangay."

  if (!values.cellphone.trim()) {
    errors.cellphone = "Cellphone number is required."
  } else if (!isValidPhMobile(values.cellphone)) {
    errors.cellphone = "Enter a valid PH mobile number (e.g. 0912-3456789)."
  }

  return errors
}

interface FieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}

function Field({ label, htmlFor, required, error, className, children }: FieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function PatientIntakeForm() {
  const [values, setValues] = React.useState<PatientIntakeFormValues>(EMPTY_FORM)
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<RegistrationResult | null>(null)

  const set = <K extends keyof PatientIntakeFormValues>(
    key: K,
    value: PatientIntakeFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const resetForm = () => {
    setValues(EMPTY_FORM)
    setErrors({})
    setResult(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return

    const validationErrors = validate(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    const payload = toPayload(values)
    const confirmed = await confirmDialog({
      icon: "info",
      title: "Submit patient registration?",
      body: (
        <span>
          Register <strong>{payload.first_name} {payload.last_name}</strong> for
          dental services? Please make sure the details entered are correct.
        </span>
      ),
      confirmText: "Submit",
      cancelText: "Review",
      dismissable: true,
    })
    if (!confirmed) return

    setSubmitting(true)
    setResult(null)
    try {
      const response = await submitRegistration(payload)
      setResult(response)
    } finally {
      setSubmitting(false)
    }
  }

  if (result?.ok) {
    return (
      <SampleCard
        title="Registration submitted"
        description="The patient has been successfully registered for dental services."
        className="mx-auto w-full max-w-2xl"
      >
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle2 className="size-8" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              {values.first_name} {values.last_name} is now registered.
            </p>
            <p className="text-sm text-muted-foreground">{result.message}</p>
          </div>
          <Button onClick={resetForm} className="mt-2">
            <RotateCcw className="size-4" />
            Register another patient
          </Button>
        </div>
      </SampleCard>
    )
  }

  return (
    <SampleCard
      title="Patient Intake Form"
      description="Complete the details below to register a patient for dental services. Fields marked with * are required."
      className="mx-auto w-full max-w-3xl"
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-6">
        <fieldset className="grid gap-6 border-0 p-0" disabled={submitting}>
          <legend className="sr-only">Patient details</legend>

          {/* Name */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Last name" htmlFor="last_name" required error={errors.last_name}>
              <Input
                id="last_name"
                name="last_name"
                autoComplete="family-name"
                value={values.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                aria-invalid={Boolean(errors.last_name)}
                placeholder="Dela Cruz"
              />
            </Field>

            <Field label="First name" htmlFor="first_name" required error={errors.first_name}>
              <Input
                id="first_name"
                name="first_name"
                autoComplete="given-name"
                value={values.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                aria-invalid={Boolean(errors.first_name)}
                placeholder="Juan"
              />
            </Field>

            <Field label="Middle name" htmlFor="middle_name" error={errors.middle_name}>
              <Input
                id="middle_name"
                name="middle_name"
                autoComplete="additional-name"
                value={values.middle_name}
                onChange={(e) => set("middle_name", e.target.value)}
                placeholder="Santos"
              />
            </Field>

            <Field label="Suffix" error={errors.suffix}>
              <SearchSelect
                options={SUFFIX_OPTIONS}
                value={values.suffix}
                onChange={(value) => set("suffix", typeof value === "string" ? value : "")}
                placeholder="None"
                searchPlaceholder="Search suffix..."
                emptyMessage="No matching suffix."
              />
            </Field>
          </div>

          {/* Birth / gender */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date of birth" required error={errors.date_of_birth}>
              <DatePicker
                mode="single"
                value={values.date_of_birth}
                onChange={(date) => set("date_of_birth", typeof date === "string" ? date : "")}
                placeholder="Select date of birth"
              />
            </Field>

            <Field label="Gender" required error={errors.gender}>
              <SearchSelect
                options={GENDER_OPTIONS}
                value={values.gender}
                onChange={(value) => set("gender", typeof value === "string" ? value : "")}
                placeholder="Select gender"
                searchPlaceholder="Search gender..."
              />
            </Field>
          </div>

          {/* Address */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Street number" htmlFor="street_number" error={errors.street_number}>
              <Input
                id="street_number"
                name="street_number"
                value={values.street_number}
                onChange={(e) => set("street_number", e.target.value)}
                placeholder="12"
              />
            </Field>

            <Field label="Street name" htmlFor="street_name" error={errors.street_name}>
              <Input
                id="street_name"
                name="street_name"
                value={values.street_name}
                onChange={(e) => set("street_name", e.target.value)}
                placeholder="Sample Street"
              />
            </Field>

            <Field label="Barangay" required error={errors.brgy} className="lg:col-span-2">
              <SearchSelect
                options={ANGONO_BARANGAYS}
                value={values.brgy}
                onChange={(value) => set("brgy", typeof value === "string" ? value : "")}
                placeholder="Select barangay"
                searchPlaceholder="Search barangay..."
                emptyMessage="No matching barangay."
              />
            </Field>
          </div>

          {/* Contact */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cellphone number" htmlFor="cellphone" required error={errors.cellphone}>
              <Input
                id="cellphone"
                name="cellphone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={values.cellphone}
                onChange={(e) => set("cellphone", e.target.value)}
                aria-invalid={Boolean(errors.cellphone)}
                placeholder="0912-3456789"
              />
            </Field>
          </div>
        </fieldset>

        {result && !result.ok ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{result.message}</p>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={submitting}
          >
            <RotateCcw className="size-4" />
            Clear
          </Button>
          <Button type="submit" disabled={submitting} className="min-w-36">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Submit registration
              </>
            )}
          </Button>
        </div>
      </form>
    </SampleCard>
  )
}
