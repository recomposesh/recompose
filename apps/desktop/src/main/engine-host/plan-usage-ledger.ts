import { enginePlanUsageReportSchema, type PlanUsageReadings } from '@recompose/contracts';

export type PlanUsageDesk = { hears: (message: unknown) => boolean };

/**
 * Holds what each vendor last said about the plan behind one account, and says so on receipt.
 *
 * @summary A reading is filed under the account alone, so the route node desk is the wrong shape
 * for it twice over: nothing here is named by a gateway, and nothing waits for the traffic frame.
 * One answer moves one account, and a person watching a spent share is owed the figure the vendor
 * just sent rather than one a frame old.
 */
export function openPlanUsageDesk(push: (readings: PlanUsageReadings) => void): PlanUsageDesk {
  let filed: PlanUsageReadings = {};

  return {
    hears: (message) => {
      const report = enginePlanUsageReportSchema.safeParse(message);

      if (!report.success) {
        return false;
      }

      const { reading } = report.data;

      filed = { ...filed, [reading.accountId]: reading };
      push(filed);

      return true;
    },
  };
}
