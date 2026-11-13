export const featureKeys = ['projects', 'prints', 'filaments', 'wallpapers', 'spotify'] as const;

export type FeatureKey = (typeof featureKeys)[number];
export type FeatureMap = Record<FeatureKey, boolean>;

export const defaultFeatures: FeatureMap = {
  projects: true,
  prints: true,
  filaments: true,
  wallpapers: true,
  spotify: true,
};
