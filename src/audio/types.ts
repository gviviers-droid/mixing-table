export type DeckId = "A" | "B";

export interface LocalTrack {
  kind: "local-file";
  id: string;
  title: string;
  file: File;
}

export interface EQSettings {
  /** dB, range roughly -24..+24 */
  low: number;
  mid: number;
  high: number;
}

export type FilterType = "none" | "lowpass" | "highpass";

export interface FilterSettings {
  type: FilterType;
  /** Hz */
  frequency: number;
}

export const FLAT_EQ: EQSettings = { low: 0, mid: 0, high: 0 };
export const NO_FILTER: FilterSettings = { type: "none", frequency: 1000 };
