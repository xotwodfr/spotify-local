<div align="center">

# 🎵 Spotify Local

### A beautiful, self-hosted music player built around Navidrome.

[![GitHub release](https://img.shields.io/github/v/release/xotwodfr/spotify-local?style=for-the-badge)](https://github.com/xotwodfr/spotify-local/releases)
[![License](https://img.shields.io/github/license/xotwodfr/spotify-local?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux-1793D1?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/xotwodfr/spotify-local)
[![Navidrome](https://img.shields.io/badge/Powered%20by-Navidrome-5B5B5B?style=for-the-badge)](https://www.navidrome.org/)

<br>

**Spotify-inspired. Self-hosted. Yours.**

[Download](https://github.com/xotwodfr/spotify-local/releases) ·
[Documentation](docs/) ·
[Report a Bug](https://github.com/xotwodfr/spotify-local/issues) ·
[Contribute](https://github.com/xotwodfr/spotify-local/pulls)

</div>

---

##  What is Spotify Local?

Spotify Local is a modern music client for your own music library.

It connects directly to **Navidrome** through the **OpenSubsonic API**, giving you a familiar Spotify-style experience without relying on Spotify's infrastructure.

Your music stays on your server.

Your library stays yours.

---

## Features

<table>
<tr>
<td width="50%">

### Music Library

Browse your:

- Artists
- Albums
- Tracks
- Playlists
- Recently added music
- Recommended music

</td>
<td width="50%">

### 🔎 Search

Quickly search your entire music library through Navidrome's API.

</td>
</tr>

<tr>
<td width="50%">

### Lyrics

Built-in lyrics support with a dedicated Spotify-inspired lyrics experience.

</td>
<td width="50%">

### Responsive

Designed to work across:

- Desktop
- Laptop
- Mobile

</td>
</tr>

<tr>
<td width="50%">

### Native Linux App

Run Spotify Local as a native Linux desktop application using Tauri.

</td>
<td width="50%">

### Docker

Run the web application using Docker for easy self-hosting.

</td>
</tr>
</table>

---

## How it works

```text
┌──────────────────────┐
│                      │
│    Spotify Local     │
│                      │
│   Web / Desktop      │
│                      │
└──────────┬───────────┘
           │
           │ OpenSubsonic API
           ▼
┌──────────────────────┐
│                      │
│      Navidrome       │
│                      │
│    Music Server      │
│                      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│                      │
│    Your Music        │
│                      │
│  Albums · Artists    │
│  Tracks · Playlists  │
│                      │
└──────────────────────┘
