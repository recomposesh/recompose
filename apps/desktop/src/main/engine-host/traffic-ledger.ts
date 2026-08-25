import {
  type EngineGateway,
  type EngineTrafficReport,
  engineTrafficReportSchema,
  type GatewayTraffic,
} from '@recompose/contracts';

/**
 * How long the desk holds a fresh outcome before telling the windows.
 *
 * @summary Roughly one frame, so a gateway answering hundreds of requests a second still costs the
 * windows one message per painted frame, and a single request still lights its cable at once.
 */
export const TRAFFIC_PUSH_MS = 16;

export type TrafficDesk = {
  hears: (message: unknown) => boolean;
  keepOnly: (gateway: EngineGateway) => void;
  interrupt: (slug: string) => void;
  forget: (slug: string) => void;
};

type ModelTraffic = NonNullable<GatewayTraffic[string]>;

type NodeTraffic = NonNullable<ModelTraffic[string]>;

function withReport(traffic: GatewayTraffic, report: EngineTrafficReport): GatewayTraffic {
  const held = traffic[report.slug];

  return {
    ...traffic,
    [report.slug]: {
      ...held,
      [report.virtualModel]: {
        ...held?.[report.virtualModel],
        [report.routeNode]: report.request,
      },
    },
  };
}

function servedIds(gateway: EngineGateway): Set<string> {
  return new Set(gateway.virtualModels.map((virtualModel) => virtualModel.id));
}

function keptEntries(held: ModelTraffic, gateway: EngineGateway): ModelTraffic {
  const serving = servedIds(gateway);

  return Object.fromEntries(Object.entries(held).filter(([id]) => serving.has(id)));
}

type Desk = {
  traffic: GatewayTraffic;
  pending: ReturnType<typeof setTimeout> | null;
  inactive: Set<string>;
};

const INTERRUPTED_STATUS = 503;
const INTERRUPTED_DETAIL = 'The gateway stopped before the request finished.';

function dropRetiredModels(
  desk: Desk,
  push: (traffic: GatewayTraffic) => void,
  gateway: EngineGateway,
): void {
  const held = desk.traffic[gateway.slug];

  if (held === undefined) {
    return;
  }

  const kept = keptEntries(held, gateway);

  if (Object.keys(kept).length === Object.keys(held).length) {
    return;
  }

  desk.traffic = { ...desk.traffic, [gateway.slug]: kept };
  tellTheWindowsSoon(desk, push);
}

function nodesWithLiveFailed(held: NodeTraffic): NodeTraffic | null {
  let changed = false;
  const interrupted: NodeTraffic = {};

  for (const [routeNode, outcome] of Object.entries(held)) {
    if (outcome.outcome !== 'live') {
      interrupted[routeNode] = outcome;
      continue;
    }

    changed = true;
    interrupted[routeNode] = {
      outcome: 'failed',
      at: Date.now(),
      status: INTERRUPTED_STATUS,
      detail: INTERRUPTED_DETAIL,
    };
  }

  return changed ? interrupted : null;
}

function withLiveOutcomesFailed(held: ModelTraffic): ModelTraffic | null {
  let changed = false;
  const interrupted: ModelTraffic = {};

  for (const [modelId, nodes] of Object.entries(held)) {
    const failed = nodesWithLiveFailed(nodes);

    changed ||= failed !== null;
    interrupted[modelId] = failed ?? nodes;
  }

  return changed ? interrupted : null;
}

function tellTheWindowsSoon(desk: Desk, push: (traffic: GatewayTraffic) => void): void {
  if (desk.pending !== null) {
    return;
  }

  desk.pending = setTimeout(() => {
    desk.pending = null;
    push(desk.traffic);
  }, TRAFFIC_PUSH_MS);
}

/**
 * Holds the latest outcome of every virtual model and tells the windows about it in one word.
 *
 * @summary The child speaks once per finished request, and a busy gateway would otherwise repaint
 * the canvas as fast as it serves. Folding here means the windows hear a whole snapshot at most
 * once a frame, with nothing left to reconcile and no ordering rule to get wrong.
 */
/**
 * @summary The desk is the one place every recorded outcome passes, so an observer that has to see
 * outcomes rather than snapshots is handed one here. The push carries a whole snapshot and could
 * never tell a caller which row in it just changed.
 */
export function openTrafficDesk(
  push: (traffic: GatewayTraffic) => void,
  onReport: (report: EngineTrafficReport) => void = () => undefined,
): TrafficDesk {
  const desk: Desk = { traffic: {}, pending: null, inactive: new Set() };

  return {
    hears: (message) => {
      const report = engineTrafficReportSchema.safeParse(message);

      if (!report.success) {
        return false;
      }

      if (desk.inactive.has(report.data.slug)) {
        return true;
      }

      desk.traffic = withReport(desk.traffic, report.data);
      onReport(report.data);
      tellTheWindowsSoon(desk, push);

      return true;
    },
    keepOnly: (gateway) => {
      desk.inactive.delete(gateway.slug);
      dropRetiredModels(desk, push, gateway);
    },
    interrupt: (slug) => {
      desk.inactive.add(slug);
      const held = desk.traffic[slug];

      if (held === undefined) {
        return;
      }

      const interrupted = withLiveOutcomesFailed(held);

      if (interrupted === null) {
        return;
      }

      desk.traffic = { ...desk.traffic, [slug]: interrupted };
      tellTheWindowsSoon(desk, push);
    },
    forget: (slug) => {
      desk.inactive.delete(slug);

      if (desk.traffic[slug] === undefined) {
        return;
      }

      const remaining = { ...desk.traffic };

      delete remaining[slug];
      desk.traffic = remaining;
      tellTheWindowsSoon(desk, push);
    },
  };
}
