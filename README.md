```markdown
<div align="center">

# 🎵 Spotify Local

### A beautiful, self-hosted music player for your Navidrome library.

[![GitHub Release](https://img.shields.io/github/v/release/xotwodfr/spotify-local?style=for-the-badge&logo=github)](https://github.com/xotwodfr/spotify-local/releases)
[![License](https://img.shields.io/github/license/xotwodfr/spotify-local?style=for-the-badge)](LICENSE)
[![Linux](https://img.shields.io/badge/Linux-1793D1?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/xotwodfr/spotify-local)
[![Navidrome](https://img.shields.io/badge/Navidrome-5B5B5B?style=for-the-badge)](https://www.navidrome.org/)

**Spotify-inspired. Self-hosted. Yours.**

A modern music client built around your own music library, with a familiar interface and direct Navidrome integration.

[**Download**](https://github.com/xotwodfr/spotify-local/releases) ·
[**Documentation**](docs/) ·
[**Report an Issue**](https://github.com/xotwodfr/spotify-local/issues) ·
[**Contribute**](https://github.com/xotwodfr/spotify-local/pulls)

</div>

---

## ✨ What is Spotify Local?

Spotify Local is a modern music client for people who own their music.

It connects directly to **Navidrome** through the **OpenSubsonic API**, giving you a familiar Spotify-style interface while keeping your music infrastructure under your control.

- No Spotify account.
- No Spotify servers.
- No uploading your library to another service.
- Just your music, your server, and your player.

---

## 🎧 Features

| Feature | Description |
| --- | --- |
| 🎵 **Your Library** | Browse your entire music collection through Navidrome — artists, albums, tracks, playlists, recently added, and recommended music. |
| 🔎 **Fast Search** | Search across your music library using Navidrome's API. Find artists, albums, songs, and playlists without leaving the app. |
| 🎤 **Lyrics** | A dedicated lyrics experience inspired by modern streaming clients — synchronized lyrics, active-line highlighting, animated interface, and full-screen view. |
| 📱 **Responsive Design** | One interface across desktop, laptop, and mobile. |
| 🖥️ **Desktop App** | Run Spotify Local as a native desktop application using **Tauri**. |
| 🐳 **Self-Host with Docker** | Deploy the web application alongside your existing services. Works naturally with a self-hosted Navidrome setup. |

---

## 🧠 How It Works

```
┌─────────────────────────────┐
│                             │
│       🎵 Spotify Local      │
│                             │
│     Web / Desktop / Mobile  │
│                             │
└──────────────┬──────────────┘
               │
               │ OpenSubsonic API
               ▼
┌─────────────────────────────┐
│                             │
│         🎶 Navidrome        │
│                             │
│        Music Server         │
│                             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│                             │
│          Your Music         │
│                             │
│   Albums · Artists · Tracks │
│   Playlists · Lyrics        │
│                             │
└─────────────────────────────┘
```

Spotify Local acts as the client.

Navidrome handles your music library, authentication, streaming, and server-side functionality.

Your music stays on your own infrastructure.

---

## 🚀 Installation

Spotify Local supports two installation methods:

- 🖥️ Native Desktop
- 🐳 Docker

Both versions require an existing Navidrome server.

### 🖥️ Native Desktop

The native desktop application uses Tauri.

#### Requirements

- Node.js
- npm
- Rust
- Cargo
- Tauri system dependencies

Check your installed versions:

```bash
node --version
npm --version
rustc --version
cargo --version
```

#### 1. Clone the repository

```bash
git clone https://github.com/xotwodfr/spotify-local.git
cd spotify-local
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Start the desktop application

```bash
npm run tauri dev
```

The application will start as a native desktop window.

#### Build a production application

```bash
npm run tauri build
```

Built applications will be placed in:

```
src-tauri/target/release/bundle/
```

Depending on your platform and Tauri configuration, this includes formats such as:

- AppImage
- `.deb`
- `.rpm`

### 🐳 Docker

Docker is recommended for server deployments and self-hosted installations.

#### Requirements

- Docker
- Docker Compose
- A running Navidrome server

#### 1. Clone the repository

```bash
git clone https://github.com/xotwodfr/spotify-local.git
cd spotify-local
```

#### 2. Build the Docker image

```bash
docker build -t spotify-local .
```

#### 3. Start Spotify Local

```bash
docker run -d \
  --name spotify-local \
  -p 3000:3000 \
  --restart unless-stopped \
  spotify-local
```

Spotify Local will now be available at:

```
http://localhost:3000
```

If you're running it on another machine, replace `localhost` with the server's IP address or hostname.

### 🐳 Docker Compose

For a persistent deployment, Docker Compose is recommended.

Create a `compose.yml` file:

```yaml
services:
  spotify-local:
    build: .
    container_name: spotify-local
    ports:
      - "3000:3000"
    restart: unless-stopped
```

Start the container:

```bash
docker compose up -d
```

Stop the container:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f
```

---

## 🔌 Connecting to Navidrome

After installing Spotify Local, connect it to your Navidrome server.

You will need:

- Navidrome URL
- Username
- Password

Example:

```
https://music.example.com
```

Spotify Local communicates with Navidrome through the OpenSubsonic API.

Navidrome handles:

- Music storage
- Authentication
- Metadata
- Audio streaming
- Playlists
- Library management

Spotify Local provides the interface.

---

## 🛠️ Development

Want to work on Spotify Local?

### Clone the repository

```bash
git clone https://github.com/xotwodfr/spotify-local.git
cd spotify-local
```

### Install dependencies

```bash
npm install
```

### Start the web application

```bash
npm run dev
```

The development server will be available at:

```
http://localhost:3000
```

### Start the Tauri application

```bash
npm run tauri dev
```

### Create a production web build

```bash
npm run build
```

### Create a native production build

```bash
npm run tauri build
```

---

## 🗺️ Roadmap

### Completed

- [x] Navidrome connection
- [x] OpenSubsonic API integration
- [x] Music library
- [x] Artist pages
- [x] Album pages
- [x] Search
- [x] Recently added music
- [x] Recommended music
- [x] Playlists
- [x] Responsive layout
- [x] Lyrics interface
- [x] Mobile layout
- [x] Native desktop application
- [x] Docker deployment

### Planned

- [ ] Improved offline support
- [ ] Advanced playlist management
- [ ] Queue improvements
- [ ] Additional audio controls
- [ ] Additional lyrics providers
- [ ] More desktop integrations
- [ ] Further UI polish

---

## 🤝 Contributing

Contributions are welcome.

If you find a bug, have an idea, or want to improve the project:

1. Open an issue.
2. Fork the repository.
3. Create a branch.
4. Make your changes.
5. Open a pull request.

Keep changes focused and explain what they improve.

---

## 📄 License

Spotify Local is released under the MIT License.

See [LICENSE](LICENSE) for the full license text.

---

<div align="center">

**🎵 Your music. Your server. Your interface.**

Built for people who prefer owning their music.

[GitHub](https://github.com/xotwodfr/spotify-local) ·
[Issues](https://github.com/xotwodfr/spotify-local/issues) ·
[Releases](https://github.com/xotwodfr/spotify-local/releases)

</div>
```
