import gsap from 'gsap';

type Story = ReturnType<typeof gsap.timeline>;

function typeLine(story: Story, line: string, at: number, spread: number) {
  story.to(
    `[data-typed-line="${line}"] [data-typed-char]`,
    { opacity: 1, duration: 0.001, ease: 'none', stagger: { amount: spread } },
    at,
  );
}

function showProp(story: Story, prop: string, at: number) {
  story.to(`[data-story-prop="${prop}"]`, { opacity: 1, duration: 0.01, ease: 'none' }, at);
}

function glowTargets(wire: string) {
  return `[data-wire-live="${wire}"], [data-wire-pulse="${wire}"]`;
}

function wireLive(story: Story, wire: string, at: number) {
  story.to(glowTargets(wire), { opacity: 1, duration: 0.015, ease: 'none' }, at);
}

function wireRest(story: Story, wire: string, at: number) {
  story.to(glowTargets(wire), { opacity: 0, duration: 0.015, ease: 'none' }, at);
}

function typeNarration(story: Story, act: string, at: number, spread: number) {
  story.to(
    `[data-narration-act="${act}"] [data-narration-char]`,
    { opacity: 1, duration: 0.001, ease: 'none', stagger: { amount: spread } },
    at,
  );
}

function scrimIn(story: Story, at: number) {
  story.to('[data-diorama-scrim]', { opacity: 1, duration: 0.06, ease: 'none' }, at);
}

function scrimOut(story: Story, at: number) {
  story.to('[data-diorama-scrim]', { opacity: 0, duration: 0.06, ease: 'none' }, at);
}

interface TrafficCounters {
  clients: number;
  latencyMs: number;
  reqMin: number;
  tokMin: number;
}

const restingCounters: TrafficCounters = { clients: 0, latencyMs: 0, reqMin: 0, tokMin: 0 };

function tokensLabel(tokMin: number): string {
  return tokMin >= 1000 ? `${(tokMin / 1000).toFixed(1)}k` : String(Math.round(tokMin));
}

function writeStat(stat: string, text: string) {
  for (const element of gsap.utils.toArray<HTMLElement>(`[data-status-stat="${stat}"]`)) {
    element.textContent = text;
  }
}

function writeCounters(counters: TrafficCounters) {
  writeStat('req-min', String(Math.round(counters.reqMin)));
  writeStat('latency', `${Math.round(counters.latencyMs)}ms`);
  writeStat('clients', String(Math.round(counters.clients)));
  writeStat('tok-min', tokensLabel(counters.tokMin));
}

function playTrafficCounters(story: Story) {
  const counters: TrafficCounters = { ...restingCounters };
  const write = () => {
    writeCounters(counters);
  };

  story.to(counters, { clients: 1, duration: 0.01, ease: 'none', onUpdate: write }, 0.155);
  story.to(
    counters,
    { reqMin: 38, latencyMs: 412, tokMin: 9200, duration: 0.09, ease: 'none', onUpdate: write },
    0.21,
  );
  story.to(
    counters,
    { reqMin: 61, latencyMs: 386, tokMin: 15400, duration: 0.16, ease: 'none', onUpdate: write },
    0.3,
  );
  story.to(counters, { clients: 2, duration: 0.01, ease: 'none', onUpdate: write }, 0.695);
  story.to(
    counters,
    { reqMin: 84, latencyMs: 428, tokMin: 21700, duration: 0.12, ease: 'none', onUpdate: write },
    0.74,
  );
}

export function hideStoryProps() {
  gsap.set('[data-typed-char], [data-story-prop], [data-narration-char]', { opacity: 0 });
  gsap.set('[data-story-prop="codex-window"]', { y: 14, scale: 0.96 });
  writeCounters(restingCounters);
}

function playClaudeSetup(story: Story) {
  typeLine(story, 'claude-export', 0.03, 0.03);
  typeLine(story, 'claude-url', 0.065, 0.025);
  showProp(story, 'claude-shell', 0.095);
  typeLine(story, 'claude-launch', 0.1, 0.025);
  showProp(story, 'claude-welcome', 0.135);
  showProp(story, 'claude-status', 0.135);
  showProp(story, 'claude-ready', 0.155);
  typeLine(story, 'claude-prompt', 0.16, 0.035);
}

function playFastRequest(story: Story) {
  showProp(story, 'claude-working', 0.21);
  wireLive(story, 'fast-in', 0.21);
  wireLive(story, 'fast-out', 0.21);
  wireLive(story, 'rr-codex', 0.22);
  wireRest(story, 'rr-codex', 0.3);
  wireLive(story, 'rr-kimi', 0.3);
  wireRest(story, 'rr-kimi', 0.38);
  wireLive(story, 'rr-codex', 0.38);
  showProp(story, 'claude-done', 0.46);
  wireRest(story, 'fast-in', 0.46);
  wireRest(story, 'fast-out', 0.46);
  wireRest(story, 'rr-codex', 0.46);
}

function playCodexAct(story: Story) {
  showProp(story, 'dock-codex', 0.55);
  story.to(
    '[data-story-prop="codex-window"]',
    { opacity: 1, y: 0, scale: 1, duration: 0.02, ease: 'power2.out' },
    0.56,
  );
  typeLine(story, 'codex-export', 0.585, 0.025);
  typeLine(story, 'codex-url', 0.615, 0.02);
  showProp(story, 'codex-shell', 0.64);
  typeLine(story, 'codex-launch', 0.645, 0.025);
  showProp(story, 'codex-welcome', 0.675);
  showProp(story, 'codex-status', 0.675);
  showProp(story, 'codex-ready', 0.695);
  typeLine(story, 'codex-prompt', 0.7, 0.03);
  showProp(story, 'codex-working', 0.74);
  wireLive(story, 'smart-in', 0.74);
  wireLive(story, 'smart-out', 0.74);
}

function playClaudeNarration(story: Story) {
  scrimIn(story, 0.2);
  typeNarration(story, 'claude', 0.23, 0.22);
  story.to('[data-narration-act="claude"]', { opacity: 0, duration: 0.05, ease: 'none' }, 0.5);
  scrimOut(story, 0.5);
}

function playCodexNarration(story: Story) {
  scrimIn(story, 0.72);
  typeNarration(story, 'codex', 0.74, 0.1);
}

export function playExitFade(story: Story) {
  story.to('[data-diorama-scrim]', { opacity: 0, ease: 'none', duration: 0.14 }, 0.86);
  story.to('[data-narration]', { opacity: 0, ease: 'none', duration: 0.1 }, 0.86);
}

export function playStory(story: Story) {
  playClaudeSetup(story);
  playFastRequest(story);
  playTrafficCounters(story);
  playClaudeNarration(story);
  playCodexAct(story);
  playCodexNarration(story);
}
