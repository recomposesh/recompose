<p align="center">
  <a href="https://recompose.sh"><img src="docs/assets/icon.png" alt="The recompose app icon" width="128"></a>
</p>
<h1 align="center">recompose</h1>

<p align="center">
  Every model, in every harness, one gateway to run.
</p>

<div align="center">
  <a href="https://recompose.sh">Website</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://recompose.sh/download">Download</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://recompose.sh/docs">Docs</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://recompose.sh/changelog">Changelog</a>
</div>

<br>

<div align="center">

[![CI][ci-badge]][ci-url]
[![CodeQL][codeql-badge]][codeql-url]
[![latest release][release-badge]][release-url]
[![license][license-badge]][license-url]
[![platforms][platform-badge]][download-url]

[![Electron][electron-badge]][electron-url]
[![TypeScript][typescript-badge]][typescript-url]
[![React][react-badge]][react-url]
[![Tailwind CSS][tailwind-badge]][tailwind-url]
[![TanStack][tanstack-badge]][tanstack-url]
[![Vitest][vitest-badge]][vitest-url]
[![Playwright][playwright-badge]][playwright-url]
[![pnpm][pnpm-badge]][pnpm-url]
[![Turborepo][turbo-badge]][turbo-url]

</div>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/canvas-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/canvas-light.png">
    <img alt="The gateway canvas: virtual models wired through routers to provider targets." src="docs/assets/canvas-light.png">
  </picture>
</p>

<p align="center">
  <i>The gateway canvas: virtual models wired through routers to provider targets.</i>
</p>

recompose is a free, open-source desktop app that composes your AI subscriptions, API keys, aggregators, and local runtimes into gateways served from your own machine. You define virtual models, wire them to real providers on a node canvas, and point clients such as Claude Code, Codex, and Cursor at one local address.

## Download

```sh
brew install --cask recomposesh/tap/recompose
```

| macOS                           | Windows                 | Linux                         |
| ------------------------------- | ----------------------- | ----------------------------- |
| [Homebrew][brew] (recommended)  | [Installer (.exe)][win] | [AppImage][appimage]          |
| [Apple Silicon (.dmg)][mac-arm] |                         | [Debian / Ubuntu (.deb)][deb] |
| [Intel (.dmg)][mac-intel]       |                         |                               |

The app updates itself through whichever channel installed it. A macOS copy in the Applications folder pulls updates on its own, and a Homebrew install counts: `brew upgrade` leaves it alone. The AppImage replaces itself, and a deb install waits for apt. macOS builds carry a Developer ID signature and Apple's notary ticket, and need macOS 12 Monterey or later.

> [!NOTE]
> The Windows installer carries no signature yet, so SmartScreen shows a warning on first launch. Pick "More info," then "Run anyway." Until signing lands, a Windows install also updates by downloading the new installer rather than through the app.

## How it works

A gateway is a running local server that owns one port. Its canvas wires virtual models through routers to provider targets:

```
Claude Code ──▶ http://127.0.0.1:8397
                       │
              [ gateway "coding" ]
                       │
             [ virtual model "fast" ]
                       │
              [ router · failover ]
                #1 │         #2 │
     [ Claude · sonnet ]  [ OpenAI · gpt-5 ]
```

Claude Code points at the gateway through an environment variable:

```sh
export ANTHROPIC_BASE_URL=http://127.0.0.1:8397
```

Every gateway carries a connect sheet that writes the exact setup for each client it knows. The sheet covers terminal agents such as Codex CLI and opencode, editors such as Cursor and Cline, desktop apps, and a plain curl for everything else.

## Features

- **One address for every client**: each gateway serves five API dialects on its own port: Anthropic Messages (`/v1/messages`), OpenAI Chat Completions (`/v1/chat/completions`), OpenAI Responses (`/v1/responses`), Gemini (`/v1beta/models`), and Gemini Interactions (`/v1/interactions`). The request path picks the dialect, and there is nothing to configure per client.
- **Virtual models**: clients see aliases such as `fast` or `smart`. Swap the real model behind that name without touching a single client config.
- **Composable routing**: a failover router sends traffic to the topmost healthy target, a round-robin router spreads it evenly, and routers nest to combine strategies.
- **Every provider shape**: subscription plans such as Claude, ChatGPT, and GitHub Copilot, API keys the gateway spends request by request, aggregators such as OpenRouter and Groq, and the local runtimes Ollama, LM Studio, llama.cpp, and vLLM, plus any server of your own.
- **Private by default**: no signup, no telemetry. Credentials stay on your machine in `~/.recompose`, with secrets sealed through the system keychain where the platform provides one. Gateways answer this machine alone until you widen the bind address in settings, and each gateway can require its own API key.

## Documentation

The handbook lives at [recompose.sh/docs](https://recompose.sh/docs): installation, connecting providers, composing gateways, and operating them day to day.

## Building from source

Requires Node 22.18 or later and pnpm 11.

```sh
pnpm install
pnpm dev
```

`pnpm dev` opens the Electron app with hot reload and serves the site beside it. `pnpm build` compiles every workspace, and `pnpm test` runs the unit suites.

## Architecture

- **`apps/desktop`**: the Electron app. The main process owns the gateway engine in a utility process, and the renderer is a React app organized by Feature-Sliced Design.
- **`apps/web`**: the public site: landing, docs, download, and changelog.
- **`packages/engine`**: the gateway server itself: dialect translation, routing, and serving.
- **`packages/contracts`**: the schemas the desktop app and the engine share.
- **`docs/adr`**: every technical decision, recorded as an Architecture Decision Record (ADR).

[ci-badge]: https://github.com/recomposesh/recompose/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/recomposesh/recompose/actions/workflows/ci.yml
[codeql-badge]: https://github.com/recomposesh/recompose/actions/workflows/codeql.yml/badge.svg
[codeql-url]: https://github.com/recomposesh/recompose/actions/workflows/codeql.yml
[release-badge]: https://img.shields.io/github/v/release/recomposesh/recompose?label=release&color=369eff
[release-url]: https://recompose.sh/changelog
[license-badge]: https://img.shields.io/github/license/recomposesh/recompose?color=8ae8ff
[license-url]: LICENSE
[platform-badge]: https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-444
[download-url]: https://recompose.sh/download
[electron-badge]: https://img.shields.io/badge/Electron_43-2f3241?logo=electron&logoColor=9feaf9
[electron-url]: https://www.electronjs.org
[typescript-badge]: https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white
[typescript-url]: https://www.typescriptlang.org
[react-badge]: https://img.shields.io/badge/React_19-087ea4?logo=react&logoColor=white
[react-url]: https://react.dev
[tailwind-badge]: https://img.shields.io/badge/Tailwind_CSS_4-0f172a?logo=tailwindcss&logoColor=38bdf8
[tailwind-url]: https://tailwindcss.com
[tanstack-badge]: https://img.shields.io/badge/TanStack-fd4f00
[tanstack-url]: https://tanstack.com
[vitest-badge]: https://img.shields.io/badge/Vitest_4-6e9f18?logo=vitest&logoColor=white
[vitest-url]: https://vitest.dev
[playwright-badge]: https://img.shields.io/badge/Playwright-2ead33?logo=playwright&logoColor=white
[playwright-url]: https://playwright.dev
[pnpm-badge]: https://img.shields.io/badge/pnpm-f69220?logo=pnpm&logoColor=white
[pnpm-url]: https://pnpm.io
[turbo-badge]: https://img.shields.io/badge/Turborepo-000?logo=turborepo&logoColor=ef4444
[turbo-url]: https://turborepo.com
[brew]: https://github.com/recomposesh/homebrew-tap
[mac-arm]: https://recompose.sh/download/mac-arm64
[mac-intel]: https://recompose.sh/download/mac-x64
[win]: https://recompose.sh/download/windows
[appimage]: https://recompose.sh/download/linux-appimage
[deb]: https://recompose.sh/download/linux-deb
