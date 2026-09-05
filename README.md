<div align="center">
  <img src="resources/app-icon.svg" alt="TequillaMail logo" width="120">

# TequillaMail

A local-first desktop email client built with Electron and React.
</div>

TequillaMail connects directly to standard IMAP and SMTP servers. It keeps downloaded mail in a local SQLite database and uses the operating system's secure storage for account passwords.

## Features

- Unlimited connected email accounts.
- No ads, no annoying features, no bloat. Just you, and your emails.
- Apart from downloading and sending emails, fully local. No "trusted third party" crap.
- Optional automatic updates. You will never be forced to upgrade to a newer version. But when you decide you do, its just a click of a button away.
- Runs on Windows, macOS, and Linux.
- Is, and forever will be fully free and open source.

## Why?

Emails never were a big part of my job. There were there for occasional contact with the client, or when registering for work specific sites. But when i wanted to use them, i almost always had trouble with that. Outlook would keep logging me out and deleting my connected accounts, Thunderbird just didn't work for me at all. All the "free" apps that i later found were bloated with dark pattern features, needless ai integrations, or restricting functionality beyond paid subscriptions. I understand that these businesses have to earn money, but their products were just annoying or unappealing. So i decided that i would create a simple application that would solve my problems. Is it good enough to pay for it? I don't know. If you think so, i would appreciate if you shared it with more people in need for a simple email client like that, or donating, once i figure out how to set it up.

## Development

Requires Node.js `20.19+` or `22.12+` and npm.

```powershell
npm install
npm run dev
```

Useful commands:

| Command               | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `npm test`            | Run the test suite                                      |
| `npm run lint`        | Run ESLint                                              |
| `npm run build:win`   | Build the Windows installer on Windows                  |
| `npm run build:mac`   | Build Intel and Apple Silicon DMG/ZIP packages on macOS |
| `npm run build:linux` | Build AppImage, Snap, and Debian packages on Linux      |

## Cross-platform builds

GitHub Actions builds all three platforms on their native runners. Open **Actions -> Build desktop apps -> Run workflow** to create downloadable build artifacts without publishing a release.

Pushing a version tag such as `v1.0.5` builds every platform and collects the packages in one GitHub release draft:

```powershell
npm version patch
git push --follow-tags
```

The tag must match the version in `package.json`. Review the resulting draft and publish it when ready. Windows, macOS, and Linux updater metadata is included in the same draft, avoiding separate blockmap releases.

The builds are currently unsigned. Windows and macOS may display security warnings, and macOS automatic updates require code signing before general distribution.
