import { PatientIntakeForm } from "@/components/patient-intake-form"
import { ConfirmProvider } from "@/components/micto/confirm-dialog"

export default function App() {
  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 sm:px-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Municipal Health Office
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Dental Patient Registration
          </h1>
          <p className="text-sm text-muted-foreground">
            Municipality of Angono, Rizal
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <PatientIntakeForm />
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-10 text-center text-xs text-muted-foreground sm:px-6">
        Your personal information is processed in accordance with the Data Privacy
        Act of 2012 (RA 10173).
      </footer>

      <ConfirmProvider />
    </div>
  )
}
