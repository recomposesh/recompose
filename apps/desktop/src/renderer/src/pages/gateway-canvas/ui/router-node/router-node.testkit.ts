import type { RouterNodeData } from './router-node';

/**
 * The routers every story about this card stands on, in the three modes the canvas draws.
 *
 * @summary They live beside the card rather than inside one story file, because the modes are one
 * fixture read by every scenario about the card and a second copy drifts the first time a field
 * is added to the node.
 */
export const spreadingRouter: RouterNodeData = {
  id: 'route:fast:r1',
  kind: 'router',
  modelId: 'fast',
  routeNodeId: 'r1',
  depth: 0,
  mode: 'failover',
  displayName: undefined,
  childCount: 2,
  onAddChild: () => {},
};

export const rotatingRouter: RouterNodeData = {
  ...spreadingRouter,
  mode: 'round-robin',
  childCount: 3,
};

export const judgingRouter: RouterNodeData = {
  ...spreadingRouter,
  mode: 'conditional',
  childCount: 3,
  judged: { branches: 2, judge: 'advisor', judgeAnswers: true },
};
