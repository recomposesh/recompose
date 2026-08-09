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
};

function withReport(traffic: GatewayTraffic, report: EngineTrafficReport): GatewayTraffic {
  return {
    ...traffic,
    [report.slug]: { ...traffic[report.slug], [report.virtualModel]: report.request },
  };
}

function servedIds(gateway: EngineGateway): Set<string> {
  return new Set(gateway.virtualModels.map((virtualModel) => virtualModel.id));
}

function keptEntries(
  held: NonNullable<GatewayTraffic[string]>,
  gateway: EngineGateway,
): NonNullable<GatewayTraffic[string]> {
  const serving = servedIds(gateway);

  return Object.fromEntries(Object.entries(held).filter(([id]) => serving.has(id)));
}

type Desk = {
  traffic: GatewayTraffic;
  pending: ReturnType<typeof setTimeout> | null;
};

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
export function openTrafficDesk(push: (traffic: GatewayTraffic) => void): TrafficDesk {
  const desk: Desk = { traffic: {}, pending: null };

  return {
    hears: (message) => {
      const report = engineTrafficReportSchema.safeParse(message);

      if (!report.success) {
        return false;
      }

      desk.traffic = withReport(desk.traffic, report.data);
      tellTheWindowsSoon(desk, push);

      return true;
    },
    keepOnly: (gateway) => {
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
    },
  };
}
