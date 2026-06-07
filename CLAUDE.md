# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Autech Lead Capture** — A Node.js web app that presents a customer enquiry form and forwards each submission as a formatted WhatsApp message to configured team members via the Twilio WhatsApp API.

## Commands

```bash
# Install dependencies
npm install

# Run server (production)
node server.js

# Run server (auto-restart on change)
npm run dev        # uses nodemon
```

Server starts at `http://localhost:3000` (or `PORT` from `.env`).

## Architecture

```
.env              ← all secrets and config (never commit)
server.js         ← Express app: serves static files + POST /api/leads
public/index.html ← single-page customer form (vanilla HTML/CSS/JS)
```

**Request flow:**
1. Customer fills form at `/` → JS `fetch` → `POST /api/leads`
2. `server.js` validates fields, builds a formatted WhatsApp message
3. Twilio client sends the message in parallel to all numbers in `TEAM_NUMBERS`
4. JSON response (`{ success, message }`) shown as a toast on the form

## Key Config (`.env`)

| Variable | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio secret token |
| `TWILIO_WHATSAPP_FROM` | Sender number, e.g. `whatsapp:+14155238886` |
| `TEAM_NUMBERS` | Comma-separated recipient numbers, e.g. `whatsapp:+917984845750,whatsapp:+91...` |
| `COMPANY_NAME` | Displayed in server logs |
| `PORT` | HTTP port (default 3000) |

## WhatsApp Sandbox Requirement

This uses Twilio's **free sandbox**. Every recipient number must opt in once by sending the sandbox join keyword to `+14155238886` before they can receive messages. Get the keyword from Twilio Console → Messaging → Try it out → WhatsApp.

## Adding / Removing Team Numbers

Edit `TEAM_NUMBERS` in `.env` — comma-separated, each prefixed with `whatsapp:` and full country code. Restart the server after changes.
