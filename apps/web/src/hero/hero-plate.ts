export type PlateInput = {
  stillness: boolean;
  loopReady: boolean;
  playbackRefused: boolean;
};

export type PlateChoice = 'poster' | 'loop';

export function choosePlate(input: PlateInput): PlateChoice {
  if (input.stillness) return 'poster';
  if (input.playbackRefused) return 'poster';
  if (!input.loopReady) return 'poster';

  return 'loop';
}
