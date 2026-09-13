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

## 🚀 What is Spotify Local?

**Spotify Local** is a modern, lightweight music client built specifically for self-hosted libraries[cite: 1]. 

It interfaces directly with **Navidrome** using the **OpenSubsonic API**[cite: 1], delivering a polished, high-performance UI modeled after Spotify[cite: 1]—minus the telemetry, subscription fees, and cloud lock-in.

* **Your music:** Stays entirely on your infrastructure[cite: 1].
* **Your library:** Fully owned and locally controlled[cite: 1].

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📚 Music Library
Seamlessly navigate your collection:
- Artists & Albums[cite: 1]
- Individual Tracks & Playlists[cite: 1]
- Recently Added & Recommendations[cite: 1]

</td>
<td width="50%">

### 🔎 Instant Search
Lightning-fast querying powered natively by Navidrome's backend API[cite: 1].

</td>
</tr>

<tr>
<td width="50%">

### 🎤 Rich Lyrics
Built-in synchronization support featuring two distinct viewing modes[cite: 1].

</td>
<td width="50%">

### 📱 Fully Responsive
Adaptive layout optimized for desktops, laptops, and mobile screens[cite: 1].

</td>
</tr>

<tr>
<td width="50%">

### ⚡ Native Linux App
Built with Tauri[cite: 1] for a blazing-fast, lightweight desktop footprint. *(Cross-platform support coming soon)*[cite: 1]

</td>
<td width="50%">

### 🐳 Docker Ready
Containerized and ready for quick deployment alongside your existing self-hosted stack[cite: 1].

</td>
</tr>
</table>

---

## 🛠️ Architecture

```text
┌──────────────────────────────────────────────┐
│                Spotify Local                 │
│             Web / Tauri Desktop              │
└──────────────────────┬───────────────────────┘
                       │
                       │ OpenSubsonic API
                       ▼
┌──────────────────────────────────────────────┐
│                  Navidrome                   │
│                 Music Server                 │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                  Your Media                  │
│       Artists · Albums · Tracks · Lyrics     │
└──────────────────────────────────────────────┘
