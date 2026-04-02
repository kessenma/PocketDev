# 🚀 PocketDev

**Run your dev environment from your pocket.**

PocketDev turns any cheap Linux server (like Hetzner) into a **mobile-controlled AI development environment**.

Install once → pair your phone → control AI coding agents (Claude, Codex, etc.) from anywhere.

---

## ✨ Why PocketDev Exists

AI coding workflows are changing how we build software:

- Long-running agent tasks
- Iterative file edits
- Continuous testing + refinement

But today’s experience is still:

- ❌ terminal-heavy  
- ❌ desktop-dependent  
- ❌ hard to monitor remotely  
- ❌ reliant on hacks (SSH, Telegram bots)

---

## 💡 The Idea

PocketDev gives you:

> A mobile-first interface to control AI agents running on your server

Instead of SSH + logs + guesswork, you get:

- 📱 Mobile UI for control  
- 🔄 Live task streaming  
- 🧾 File + diff viewer  
- 🌐 Localhost preview (React apps, etc.)  
- 🔐 Secure device pairing  

---

## 🧠 Core Concept



[ Mobile App ]
↓
HTTPS / WebSocket
↓
[ PocketDev Agent (Server) ]
↓
[ Claude / Codex / CLI Tools ]
↓
[ Filesystem + Dev Server ]

---

## ⚙️ Installation (Linux)

### Requirements

- Ubuntu 20.04+ (recommended)
- Root or sudo access
- Public IP (Hetzner / VPS / local server)
- Docker (will be installed if missing)

---

### One-Line Install

```bash
curl -fsSL https://pocketdev.run/install.sh | bash


What This Does

The installer will:
	•	Create /opt/pocketdev
	•	Install Docker (if needed)
	•	Download PocketDev services
	•	Start the server agent
	•	Generate a temporary setup code
	•	Print connection instructions

⸻

After Install

You’ll see something like:
```
PocketDev installed successfully.

Open on your phone:
http://203.0.113.10:4387/setup

Setup code:
ABCD-7291

This code expires in 15 minutes.
```

🔐 Pairing Flow

PocketDev uses a two-phase security model:

Phase 1 — Setup (Temporary)
	•	Server exposes /setup
	•	User enters setup code
	•	Mobile app connects

Phase 2 — Secure Pairing
	•	Mobile app generates a device keypair
	•	Sends public key to server
	•	Server registers device
	•	Setup mode is disabled

⸻

After Pairing
	•	❌ Setup route disabled
	•	🔐 Only your device can connect
	•	🔄 All communication authenticated

⸻

🏗️ MVP Scope

Server
	•	Setup endpoint (/setup)
	•	Device registration
	•	WebSocket event streaming
	•	CLI wrapper (Claude / Codex)
	•	File + diff tracking

Mobile App
	•	Connect via IP + setup code
	•	View active tasks
	•	Stream logs
	•	Approve / reject changes

⸻

📁 Project Structure

```
/install.sh
/server
  /agent
  /api
  /docker
/mobile
  /app
  ```


  🔮 Future Features
	•	HTTPS + custom domain
	•	Passkey authentication
	•	Multi-device support
	•	Push notifications
	•	Live browser preview
	•	Git integration (PR-style flow)
	•	Team collaboration

⸻

🔐 Security Model
	•	Setup mode is temporary and expires
	•	Only /setup is exposed before pairing
	•	Device-based authentication after setup
	•	No long-term shared secrets

⸻

⚠️ Disclaimer

PocketDev runs code on your server.

Use at your own risk and review the install script before running:


```
curl -fsSL https://pocketdev.run/install.sh -o install.sh
less install.sh
bash install.sh
```


📜 License

Source-available. Free for personal and internal use.

Commercial use is not permitted without permission.

⸻

💭 Vision

“Vercel + GitHub + Claude Code… but mobile-first”

A world where you can:
	•	start dev tasks
	•	monitor progress
	•	steer AI agents

…all from your phone.

⸻

🚧 Status

Early-stage MVP — building in public.

⸻

👋 Author

Built by Kyle Essenmacher
