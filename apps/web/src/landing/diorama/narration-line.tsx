export function NarrationLine({ text, tone }: { text: string; tone: string }) {
  return (
    <span className={`block ${tone}`}>
      {text.split('').map((char, index) => (
        <span key={`${index}-${char}`} data-narration-char>
          {char}
        </span>
      ))}
    </span>
  );
}
