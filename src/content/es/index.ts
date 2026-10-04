import type { RiverNumber } from "../../types";
import { INTRODUCTION_TEXT } from "./introduction";
import { RIVER1_TEXT } from "./river1";
import { RIVER2_TEXT } from "./river2";
import { RIVER3_TEXT } from "./river3";
import { RIVER4_TEXT } from "./river4";
import type { IntroductionText, RiverText } from "./types";

/** Spanish lesson text. Anything missing falls back to English (see content/localized.ts). */
export const INTRODUCTION_TEXT_ES: IntroductionText | undefined = INTRODUCTION_TEXT;
export const RIVER_TEXT_ES: Partial<Record<RiverNumber, RiverText>> = {
  1: RIVER1_TEXT,
  2: RIVER2_TEXT,
  3: RIVER3_TEXT,
  4: RIVER4_TEXT,
};
