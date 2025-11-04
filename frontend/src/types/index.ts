export type Feature = {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
};

export type BattleStep = {
  title: string;
  description: string;
  cta?: string;
};

export type StatMetric = {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type WalletSummary = {
  address: string | null;
  balance: number | null;
  cluster: string;
};
