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

export type LoopInput = {
  stillness: boolean;
  loopReady: boolean;
  sourceSet: boolean;
};

export type LoopAction = 'hold' | 'fetch' | 'play' | 'wait';

export function chooseLoopAction(input: LoopInput): LoopAction {
  if (input.stillness) return 'hold';
  if (!input.sourceSet) return 'fetch';
  if (!input.loopReady) return 'wait';

  return 'play';
}
