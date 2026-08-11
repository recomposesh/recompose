import { walkedWithArrow } from './arrow-walk';

let stage: HTMLElement | undefined;

export function stagedControls(markup: string): void {
  stage?.remove();
  stage = document.createElement('div');
  stage.innerHTML = markup;
  document.body.append(stage);
}

export function clearedStage(): void {
  stage?.remove();
  stage = undefined;
}

export function walked(key: string, holding: KeyboardEventInit = {}): KeyboardEvent {
  const press = new KeyboardEvent('keydown', { key, cancelable: true, ...holding });

  walkedWithArrow(press);

  return press;
}

export function controlNamed(label: string): HTMLElement {
  const controls = document.querySelectorAll<HTMLElement>('button, input, [tabindex]');
  const named = [...controls].find(
    (control) => control.textContent === label || control.getAttribute('aria-label') === label,
  );

  if (named === undefined) {
    throw new Error(`no control labeled ${label} stands on the stage`);
  }

  return named;
}

export function standingLabel(): string {
  const standing = document.activeElement;

  if (standing === null || standing === document.body) {
    return '';
  }

  return standing.getAttribute('aria-label') ?? standing.textContent;
}
