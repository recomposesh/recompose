/**
 * Every vendor and tool recompose draws a mark for.
 *
 * @summary Reach for it where a surface walks the whole set rather than naming one of them. A mark
 * standing here is a mark recompose can draw, never a claim that the vendor can be connected or
 * that the tool has instructions. Vendors reach the provider destinations and tools reach the
 * connect sheet, and both draw through the one component so no surface invents a second drawing.
 */
export const brandMarkNames = [
  'anthropic',
  'cerebras',
  'claude',
  'claudeCode',
  'cline',
  'codex',
  'cursor',
  'deepinfra',
  'deepseek',
  'fireworks',
  'gemini',
  'geminiCli',
  'githubCopilot',
  'grok',
  'groq',
  'kiloCode',
  'kimi',
  'lmstudio',
  'minimax',
  'mistral',
  'moonshot',
  'ollama',
  'openai',
  'opencode',
  'openrouter',
  'rooCode',
  'qwen',
  'together',
  'vllm',
  'zhipu',
] as const;

export type BrandMarkName = (typeof brandMarkNames)[number];

/** Which of a vendor's two drawings a surface asks for. */
export type BrandMarkVariant = 'color' | 'mono';

/**
 * How any surface asks for a vendor drawing, whatever it falls back on when there is no mark.
 *
 * @summary Every such surface answers the same two questions, its size and whose colors it takes,
 * and they differ only in what stands in for a missing mark. Naming the pair once is what keeps a
 * client's row and a plan's card asking for a drawing in the same words.
 */
export type VendorDrawingProps = {
  /** Size classes, replacing the standing square rather than adding to it. */
  className?: string;
  /** Whether a vendor mark takes its own colors or the ink around it. */
  variant?: BrandMarkVariant;
};
