# Dental Patient Registration — Intake Form

A public **patient intake form** for the Municipality of Angono's dental services,
built with the [MICTO UI Kit](https://micto-ui-kit.misangono.net/) (shadcn/ui +
Tailwind CSS v4) on Vite + React + TypeScript.

It submits registrations to:

```
POST https://dental-registration.angorizaral.net/api/v1/public/registrations
```

## Features

- **MICTO UI Kit components** — `SampleCard`, `DatePicker`, `SearchSelect`, and the
  promise-based `confirmDialog`/`ConfirmProvider`.
- **Accessible controls** — shadcn/Radix primitives with labels, `aria-invalid`
  and inline, screen-reader-friendly error messages.
- **Client-side validation** — required names, valid/non-future date of birth,
  gender, barangay, and PH mobile number (`09XXXXXXXXX` or `639XXXXXXXXX`).
- **Confirmation step** before submit, with loading + success/error states and a
  "Register another patient" reset.
- **Same-origin API calls** — the dev server and bundled nginx both reverse-proxy
  `/api`, so no CORS configuration is needed on the API.

## Getting started

Requires Node.js 20+ (Node 22 recommended).

```bash
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to the registration API.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server (with `/api` proxy). |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run `oxlint`. |

## API integration

The request body is produced in `src/lib/patient.ts` (`toPayload`). Empty optional
fields are sent as `null`:

```json
{
  "last_name": "Test",
  "first_name": "Juan",
  "middle_name": "Santos",
  "suffix": null,
  "date_of_birth": "1995-06-15",
  "gender": "male",
  "street_number": "12",
  "street_name": "Sample Street",
  "brgy": "San Roque",
  "cellphone": "0912-3456789"
}
```

### Field mapping

| Form field | API field | Notes |
| --- | --- | --- |
| Last name | `last_name` | required |
| First name | `first_name` | required |
| Middle name | `middle_name` | optional → `null` |
| Suffix | `suffix` | optional (Jr., Sr., II–V) → `null` |
| Date of birth | `date_of_birth` | required, `YYYY-MM-DD` |
| Gender | `gender` | required, `male` / `female` |
| Street number | `street_number` | optional → `null` |
| Street name | `street_name` | optional → `null` |
| Barangay | `brgy` | required, Angono barangay list |
| Cellphone | `cellphone` | required, PH mobile format |

### Configuration

Copy `.env.example` to `.env` to override the API base URL:

- **Empty (default)** — call the API on the same origin (`/api/...`); the Vite dev
  proxy and the production nginx config forward these to the real API.
- **Absolute URL** — call the API directly from the browser (requires CORS on the
  API).

## Docker

Builds a static bundle and serves it with nginx (which also proxies `/api`).

```bash
docker compose up -d --build
```

The form is published on `http://localhost:8181`.

To put it behind the existing host nginx (mirroring `dental.obbsco.com`), add a
vhost that proxies to `http://localhost:8181` — the container's own nginx handles
the `/api` proxy and SPA fallback.

## Project structure

```
src/
  App.tsx                          Page shell + ConfirmProvider
  components/
    patient-intake-form.tsx        The intake form
    micto/                         MICTO UI Kit components
    ui/                            shadcn/ui primitives
  lib/
    patient.ts                     Types, reference data, validation, API client
    utils.ts                       cn() helper
```

> Components were added from the MICTO registry with the shadcn CLI:
> `npx shadcn@3.8.5 add https://micto-ui-kit.misangono.net/r/micto/<name>.json`.
