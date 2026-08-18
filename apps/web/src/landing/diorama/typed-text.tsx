export function TypedText({ text }: { text: string }) {
  return (
    <>
      {text.split('').map((char, index) => (
        <span key={`${index}-${char}`} data-typed-char>
          {char}
        </span>
      ))}
    </>
  );
}
