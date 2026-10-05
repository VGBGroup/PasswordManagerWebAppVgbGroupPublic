# VGB Group Password Manager

A web-based password manager with client-side (end-to-end) encryption. Your vault is encrypted in the browser with a key derived from your master password, so the server only ever stores ciphertext.

> **Project status: early stage.** This is a young, solo-developed project that has **not been independently security audited**. Don't store anything you can't afford to lose or expose until it has been reviewed. See [Security](#security) for what is and isn't protected.

## Features

- Encrypted vault for logins, with categories, favourites and search
- Master password never leaves the browser
- Two-factor authentication (TOTP) with recovery codes
- Email verification and account lockout after repeated failed logins
- Breach check against Have I Been Pwned using k-anonymity (only a 5-character hash prefix is sent)
- Password audit view and auto-lock after inactivity
- Import and export of credentials
- Optional paid plan via Stripe

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Web Crypto API, `hash-wasm` (Argon2id) |
| Backend | ASP.NET Core (.NET 9), Entity Framework Core, JWT bearer authentication |
| Database | PostgreSQL |
| Email | SMTP via MailKit |
| Payments | Stripe |

## How the encryption works

1. **Key stretching:** the master password is run through **Argon2id** in the browser (64 MiB memory, 3 iterations, 4 lanes) with a random per-user salt.
2. **Key separation:** the result is split with **HKDF-SHA256** into two independent keys: an *auth key* (proves who you are to the server) and an *encryption key* (never sent anywhere).
3. **Vault key:** a random **AES-256-GCM** key encrypts your data. It is stored on the server only after being wrapped (encrypted) with your encryption key.
4. **Items:** every credential and category name is encrypted with AES-GCM using a fresh random IV before it leaves the browser.
5. **Login:** the browser requests a single-use challenge, then sends the auth key over TLS. The server stores only a salted PBKDF2 hash of it, so a stolen database doesn't let an attacker log in as a user.

## Security

**What stays protected if the database leaks:** credential contents (usernames, passwords, websites, notes) and category names are stored as ciphertext. Breaking them requires guessing the user's master password, which Argon2id makes slow. A strong, unique master password is what keeps your vault safe.

**What is not protected, and known limits:**

- Email addresses and account metadata (number of items, sign-up and login dates, subscription status) are stored in plain text, because the server needs them to run the service.
- A weak master password can be cracked offline by someone who steals the database.
- Because the server delivers the JavaScript, a compromised server or an XSS bug could capture master passwords as they're typed. "Zero-knowledge" assumes the server stays honest.
- The session token is kept in browser storage, so XSS would expose an active session.

### Reporting a vulnerability

Please **don't open a public issue** for security problems. Report them privately through GitHub's **Security → Report a vulnerability** on this repository, or by email to `contact@vgbgroup.eu`. I'll respond as soon as I can.

## Getting started (development)

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) 20.19 or newer (22 recommended)
- PostgreSQL 14 or newer

### 1. Database

Create an empty database and run the schema:

```bash
createdb passwordmanager
psql -d passwordmanager -f SQL/PasswordManager.sql
```

### 2. Backend

Configuration is not committed to the repo. Set it with [.NET user secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) or environment variables:

```bash
cd Backend.Api

dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=passwordmanager;Username=postgres;Password=YOUR_DB_PASSWORD"
dotnet user-secrets set "Jwt:Secret" "$(openssl rand -base64 48)"
dotnet user-secrets set "App:FrontendUrl" "http://localhost:5173"

# Email (verification emails)
dotnet user-secrets set "Zoho:SmtpHost" "smtp.example.com"
dotnet user-secrets set "Zoho:SmtpPort" "587"
dotnet user-secrets set "Zoho:Username" "you@example.com"
dotnet user-secrets set "Zoho:Password" "YOUR_SMTP_PASSWORD"
dotnet user-secrets set "Zoho:FromName" "Password Manager"

# Stripe (only needed for the paid plan)
dotnet user-secrets set "App:Stripe:SecretKey" "sk_test_..."
dotnet user-secrets set "App:Stripe:PriceId" "price_..."
dotnet user-secrets set "App:Stripe:WebhookSecret" "whsec_..."

dotnet run
```

The API listens on `http://localhost:5142`. Use a long, random `Jwt:Secret` (at least 32 bytes) and never reuse it across environments.

### 3. Frontend

```bash
cd Frontend
echo "VITE_API_URL=http://localhost:5142/api" > .env.local
npm install
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`).

## Production build

```bash
cd Frontend
npm run build          # outputs to Frontend/dist
```

Copy the contents of `Frontend/dist` into `Backend.Api/wwwroot`, then publish the backend:

```bash
cd Backend.Api
dotnet publish -c Release -o publish
```

Before going live:

- Serve everything over **HTTPS** only, and add security headers (HSTS, CSP, `X-Content-Type-Options`).
- If you run behind a reverse proxy or tunnel, make sure the app sees the real client IP, since rate limiting depends on it.
- Keep your database private, use a strong database password, and encrypt backups.
- Never commit `appsettings.*.json`, `.env` files or compiled `publish/` output.

## Project structure

```
Backend.Api/   ASP.NET Core API (controllers, services, models)
Frontend/      React + TypeScript web app and client-side crypto
SQL/           Database schema and helper scripts
```

## Contributing

Issues and pull requests are welcome. For anything larger than a small fix, please open an issue first so we can agree on the approach. By submitting a contribution you agree that it will be released under the same license as the project (AGPL-3.0).

## License

This project is licensed under the **GNU Affero General Public License v3.0**. See [LICENSE](LICENSE) for the full text.

In short: you may use, modify and distribute this software, but if you run a modified version as a network service, or distribute it, you must make your complete source code available under the same license.

Copyright (C) 2026 VGB Group
