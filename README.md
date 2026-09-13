<div align="center">

# 🎵 Spotify Local

### A beautiful, self-hosted music player for your Navidrome library.

[![GitHub Release](https://img.shields.io/github/v/release/xotwodfr/spotify-local?style=for-the-badge&logo=github)](https://github.com/xotwodfr/spotify-local/releases)
[![License](https://img.shields.io/github/license/xotwodfr/spotify-local?style=for-the-badge)](LICENSE)
[![Linux](https://img.shields.io/badge/Linux-1793D1?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/xotwodfr/spotify-local)
[![Navidrome](https://img.shields.io/badge/Navidrome-5B5B5B?style=for-the-badge)](https://www.navidrome.org/)

<br>

**Spotify-inspired. Self-hosted. Yours.**

A modern music client built around your own music library,
with a familiar interface and direct Navidrome integration.

<br>

[**Download**](https://github.com/xotwodfr/spotify-local/releases) ·
[**Documentation**](docs/) ·
[**Report an Issue**](https://github.com/xotwodfr/spotify-local/issues) ·
[**Contribute**](https://github.com/xotwodfr/spotify-local/pulls)

</div>

---

## 📸 Screenshots

<div align="center">

<img src="screenshots/final-desktop-1440.png" width="90%" alt="Spotify Local desktop interface">

<br><br>

<img src="screenshots/final-mobile-390.png" width="30%" alt="Spotify Local mobile interface">

</div>

---

## ✨ What is Spotify Local?

Spotify Local is a modern music client for people who own their music.

It connects directly to **Navidrome** through the **OpenSubsonic API**, giving you a familiar Spotify-style interface while keeping your music infrastructure under your control.

No Spotify account.

No Spotify servers.

No uploading your library to another service.

Just your music, your server, and your player.

---

## 🎧 Features

<table>
<tr>
<td width="50%">

### 🎵 Your Library

Browse your entire music collection through Navidrome.

- Artists
- Albums
- Tracks
- Playlists
- Recently added music
- Recommended music

</td>
<td width="50%">

### 🔎 Fast Search

Search across your music library using Navidrome's API.

Find artists, albums, songs, and playlists without leaving the app.

</td>
</tr>

<tr>
<td width="50%">

### 🎤 Lyrics

A dedicated lyrics experience inspired by modern streaming clients.

- Synchronized lyrics
- Active-line highlighting
- Animated lyrics interface
- Full-screen lyrics view

</td>
<td width="50%">

### 📱 Responsive Design

One interface across different screen sizes.

- Desktop
- Laptop
- Mobile
- Touch-friendly layouts

</td>
</tr>

<tr>
<td width="50%">

### 🖥️ Desktop App

Run Spotify Local as a native desktop application using **Tauri**.

Lightweight, fast, and integrated with your desktop.

</td>
<td width="50%">

### 🐳 Self-Host with Docker

Deploy the web application alongside your existing services.

Works naturally with a self-hosted Navidrome setup.

</td>
</tr>
</table>

---

## 🧠 How It Works

```text
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
