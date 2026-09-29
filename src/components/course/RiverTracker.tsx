import type { RiverNumber } from "../../types";
import { IncomeStreamTracker } from "../trackers/IncomeStreamTracker";
import { SavingsTracker } from "../trackers/SavingsTracker";
import { InvestmentTracker } from "../trackers/InvestmentTracker";
import { GivingTracker } from "../trackers/GivingTracker";

/** Picks the right companion tracker for a river. */
export function RiverTracker({ river }: { river: RiverNumber }) {
  switch (river) {
    case 1:
      return <IncomeStreamTracker />;
    case 2:
      return <SavingsTracker />;
    case 3:
      return <InvestmentTracker />;
    case 4:
      return <GivingTracker />;
  }
}
