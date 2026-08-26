/**
 * What this window has watched one gateway do, which is what tells a silence from a decision.
 *
 * @summary A gateway a person stopped and a gateway that stopped on its own read exactly alike in
 * the engine snapshot: both say stopped, and neither carries a reason. The difference lives in
 * what this window watched happen, so it is kept here rather than asked for over the bridge.
 */
export type AnsweringWatch = {
  /** Whether this window has seen the gateway serving since it opened. */
  served: boolean;
  /** Whether a start or stop act stood while it was last serving, so its going down was asked for. */
  asked: boolean;
  /** Whether the gateway went down with nothing here having asked it to. */
  stoppedAnswering: boolean;
};

export const NOTHING_WATCHED: AnsweringWatch = {
  served: false,
  asked: false,
  stoppedAnswering: false,
};

/** One reading of the gateway: what the engine says, and whether this window is asking anything. */
export type AnsweringReading = {
  /** Whether the engine snapshot says this gateway is serving right now. */
  serving: boolean;
  /** Whether a start or stop act from this window is still in flight. */
  asking: boolean;
};

/**
 * Folds one reading into what this window has watched, and says whether the gateway went quiet.
 *
 * @summary A gateway raises the notice only after this window has seen it serve, which is what
 * keeps a fleet that has simply never been started from greeting a person with a wall of them, and
 * what keeps a start refused over a busy port on the port surface where the offer to move lives.
 *
 * A stop that a start or stop act was standing over is a stop somebody asked for, so it says
 * nothing: the person who pressed it already knows. Everything else that takes a serving gateway
 * down is a silence, whether a save restarted it and it never came back up or the engine died
 * under it, and both leave requests refused with nothing on screen to read.
 */
export function watchedAnswering(held: AnsweringWatch, reading: AnsweringReading): AnsweringWatch {
  if (reading.serving) {
    return { served: true, asked: held.asked || reading.asking, stoppedAnswering: false };
  }

  if (!held.served) {
    return { served: false, asked: false, stoppedAnswering: held.stoppedAnswering };
  }

  return {
    served: false,
    asked: false,
    stoppedAnswering: !held.asked && !reading.asking,
  };
}

/**
 * The same watch with the notice put away, for a person who has read it and wants the canvas back.
 *
 * @summary Only the notice goes: the watch still remembers the gateway is down and unasked for, so
 * putting it away leaves it away rather than letting the next reading raise it again. It comes
 * back only once the gateway has served and gone quiet a second time, which is a new fact.
 */
export function putAway(held: AnsweringWatch): AnsweringWatch {
  return { ...held, stoppedAnswering: false };
}
