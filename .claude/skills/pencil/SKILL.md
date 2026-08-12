---
name: pen-design
description: >
  Create high-quality visual designs â€” websites, app screens, dashboards, slides, marketing materials, social media graphics â€” using the pen.dev CLI tool. Use this skill whenever the user wants to create, generate, or visualize any kind of UI design, mockup, wireframe, layout, webpage, app screen, presentation slide, poster, banner, or marketing asset. Also use it when the user says things like "design me a...", "make a visual for...", "create a mockup of...", "what would X look like?", or wants to turn an idea into a visual. Even if the user doesn't mention "pen.dev" or "design tool" explicitly â€” if they want something visual created, this is the skill to use.
---

# pen.dev Design

Create professional visual designs from natural language descriptions using the pen.dev CLI. pen.dev is a headless design tool that generates `.pen` files (a structured JSON design format) and can export them as images.

## Setup

Before designing, make sure the pen.dev CLI is available.

### Check installation

```bash
which pen || npx pen version
```

If `pen` is not found, install it:

```bash
npm install -g @pen.dev/cli
```

If global install fails due to permissions, install locally instead:

```bash
npm install @pen.dev/cli
```

Then run it via `npx pen` (or `./node_modules/.bin/pen`) instead of `pen`.
You can learn about the available commands via the `pen --help` command.

### Authentication

#### pen.dev user

To use the CLI, an authenticated user logged in to pen.dev is required. First, check
the current user configuration on the machine with the `pen status` command.

If not logged in, there are the following options:

- use `pen signup --email you@example.com --username johndoe --name "John Doe"` command, to create a new user.
- use `pen login --email you@example.com [--code abc123]` to authenticate an existing or newly created user.
- optionally, the `PEN_CLI_KEY` env var can also be used for authentication if its set in your session.

#### Claude Code agent

The CLI needs auth to run its AI agent for which Claude Code is required. For that
there needs to be an authenticated Claude Code user set in the system configuration
either via env var or a user subscription.

If none of these are available, tell the user what options they have and help them set one up.

### Staying up to date

This skill stays in sync with the **pen.dev CLI npm package** (`@pen.dev/cli`). The published package includes `SKILL.md` at its root; the package version is the skill version.

**Check for a newer CLI / skill**

- Latest version on the registry: `npm view @pen.dev/cli version`
- Installed CLI: `pen version`, or `npm list -g @pen.dev/cli` (global) / `npm list @pen.dev/cli` (project)

**Upgrade the CLI**, then refresh your copied skill file (agents do not auto-update skill files you placed in config folders):

```bash
npm install -g @pen.dev/cli
```

**Where to copy the skill from after installing**

- From a dependency tree: `node_modules/@pen.dev/cli/SKILL.md` (path is the same for global and local installs; resolve from your project root or global `node_modules` prefix).

**Fetch the same file without cloning the repo** (mirrors the npm tarball; optional third-party CDNs):

- `https://unpkg.com/@pen.dev/cli@latest/SKILL.md`
- `https://cdn.jsdelivr.net/npm/@pen.dev/cli@latest/SKILL.md`

Use `@latest` for the newest publish, or pin (e.g. `@0.2.4`) for a reproducible snapshot.

**If you donâ€™t know where skills live on this machine**

Agents donâ€™t always get the skills directory from context. When the path isnâ€™t obvious:

- **Ask the user** where their agent or IDE loads skills from, or where they want this skill installed.
- **Check the productâ€™s docs** for â€œskillsâ€, â€œagent skillsâ€, or â€œpluginsâ€ â€” paths differ by tool and version.
- You can still **use the skill content without installing**: fetch or open the **`SKILL.md` URL above** (unpkg/jsDelivr) in the session so guidance applies even when the on-disk path is unknown. For a persistent install, copy the fetched file into the path the user or docs specify.

**Typical skill locations** (confirm with your toolâ€™s current docs â€” layouts change):

| Environment | Where to put `SKILL.md` |
|-------------|-------------------------|
| **Cursor** | Project: `.cursor/skills/pen-design/SKILL.md`; user-level: under `~/.cursor/skills/` |
| **Claude Code** | Often `.claude/skills/pen-design/SKILL.md` or user-level under `~/.claude/` |
| **OpenClaw** | Often `~/.openclaw/skills/`, workspace `.agents/skills/`, or paths in [OpenClaw skills docs](https://docs.openclaw.ai/skills/) â€” verify for the userâ€™s setup |
| **Other agents (Codex, etc.)** | Use the directory your product uses for skills or prompts |

Example (adjust the destination path to match your agent):

```bash
curl -fsSL "https://unpkg.com/@pen.dev/cli@latest/SKILL.md" -o .cursor/skills/pen-design/SKILL.md
```

**When to check for an update**

- **Early in the session**, before the first pen.dev design run (compare `npm view @pen.dev/cli version` to the installed CLI), so you arenâ€™t following stale instructions.
- **Again** if the user says they upgraded the CLI, or if behavior doesnâ€™t match this doc (flags, auth, timing).
- **Not** before every single command â€” once per session is enough unless something changed or errors suggest a version mismatch.

## Creating a Design

The core command:

```bash
pen --out <output.pen> --prompt "<design description>" --export <output.png> --export-scale 2
```

Key flags:
- `--out, -o` â€” where to save the `.pen` file (required)
- `--prompt, -p` â€” what to design (required)
- `--prompt-file, -f` â€” attach an image or text file to send with the prompt (repeatable). Same idea as attaching reference images in the pen.dev editor chat; not for loading the prompt text from a file.
- `--export, -e` â€” export an image of the result
- `--export-scale` â€” image resolution multiplier (use 2 for crisp output)
- `--export-type` â€” format: `png` (default), `jpeg`, `webp`, `pdf`
- `--in, -i` â€” start from an existing `.pen` file (for iteration)
- `--model, -m` â€” Claude model to use (defaults to Opus)

### Passing the Prompt

Pass the user's request directly as the prompt â€” do not expand, or add detail beyond what the user actually said. The pen.dev CLI has its own AI designer agent that handles creative decisions like layout structure, color palettes, typography, spacing, and content. Adding your own design specifics on top of the user's request will conflict with the CLI agent's own judgment and produce worse results.

If the user says "make me a landing page for a coffee shop", the prompt should be exactly that â€” not a paragraph with hero sections, color palettes, and font choices you invented.

### Timing Expectations

Design generation is not instant â€” the CLI runs an AI agent that plans the layout, creates each element, and validates the result visually. Expect:

- **Simple designs** (a card, a single component): 1-2 minutes
- **Medium designs** (an app screen, a landing page section): 2-3 minutes
- **Complex designs** (full landing page, detailed dashboard): 3-5+ minutes

Let the user know upfront that generation will take a few minutes so they're not left wondering. Use a generous timeout (at least 600000ms / 10 minutes) when running the command.

### Showing the Result

After the command completes, read the exported image to show it to the user:

```bash
# The command exports to the path you specified
pen --out design.pen --prompt "..." --export design.png --export-scale 2
```

Then use the Read tool on the exported PNG â€” it will render visually since you're a multimodal model.

Always show the image to the user after creating it. This is the whole point â€” they want to see the visual.

## Iterating on a Design

When the user wants changes to an existing design, use the `--in` flag to load the previous `.pen` file:

```bash
pen --in design.pen --out design-v2.pen --prompt "Make the header larger and change the accent color to green" --export design-v2.png --export-scale 2
```

The agent will read the existing design and apply modifications rather than starting from scratch.

For quick successive iterations, keep a consistent naming pattern:
- `design.pen` â†’ `design-v2.pen` â†’ `design-v3.pen`
- Or use a single file: `--in design.pen --out design.pen` (overwrites)

## Working Directory

Save design files in the user's current working directory or a subdirectory like `designs/`. Don't use temp directories â€” the user will want to find and iterate on these files later.
