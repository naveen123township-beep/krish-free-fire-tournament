# KRISH FREE FIRE TOURNAMENT — Vercel + Neon

A server-backed Free Fire tournament registration site designed for Vercel serverless hosting and Neon PostgreSQL.

## Included

- KRISH FREE FIRE TOURNAMENT branding
- `public/krish.jpg` logo
- Web ON / OFF
- Solo ON / Squad ON / Both ON
- Admin-editable Solo and Squad prices
- Solo: 48 default slots
- Squad: 12 default teams, 4 players per team
- Custom WhatsApp number from admin
- Direct WhatsApp registration with a pre-filled message
- Server-side registration storage in Neon PostgreSQL
- Admin payment + slot confirmation
- Public slot counts update from the database
- No localStorage for registration data
- Admin authentication via secure HttpOnly cookie
- PostgreSQL transaction/advisory-lock protection against overselling slots

## 1. Create Neon database

Create a Neon PostgreSQL project and copy its connection string.

Put it in Vercel as:

`DATABASE_URL`

The application automatically creates its tables/settings on first API request.

Neon supports serverless access from Vercel through its serverless driver.

## 2. Deploy to Vercel

Upload this folder to GitHub, then import the repository into Vercel.

Or use:

`npm install`
`npx vercel`

Set these Vercel Environment Variables:

- DATABASE_URL = your Neon connection string
- ADMIN_PASSWORD = krish@15
- JWT_SECRET = a long random secret
- ADMIN_WHATSAPP = your WhatsApp number, digits only, including country code

Example:

`919876543210`

Do not put `https://`, `+`, spaces, or the WhatsApp `wa.me` URL in ADMIN_WHATSAPP.

## 3. Replace the logo

Replace:

`public/krish.jpg`

with your real KRISH logo, keeping the same filename.

## 4. Open

Public website:

`https://YOUR-PROJECT.vercel.app/`

Admin:

`https://YOUR-PROJECT.vercel.app/admin`

Admin password:

`krish@15`

## WhatsApp behavior

When a player submits a form:

1. The registration is saved in Neon immediately as pending.
2. The server returns a WhatsApp link containing all submitted details.
3. The player's device opens WhatsApp with the message pre-filled.
4. The player presses Send in WhatsApp.

A normal website cannot silently send a WhatsApp message from the user's account without the user sending it or using an approved WhatsApp Business/API integration.

## Admin workflow

- Pending = submitted but not confirmed.
- Paid = payment confirmed.
- Slot Confirmed = slot/team confirmed.
- Rejected = rejected registration.
- Delete = permanently removes that registration.

Confirmed slots reduce the public available count. Pending registrations also reserve capacity so two people cannot oversell the same last slot.

## Important

Keep `DATABASE_URL`, `ADMIN_PASSWORD`, and `JWT_SECRET` only in Vercel Environment Variables. Never put them in frontend files.

For a public tournament, use a strong ADMIN_PASSWORD and JWT_SECRET before launch.
