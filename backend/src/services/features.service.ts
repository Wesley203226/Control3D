import { prisma } from '../lib/prisma';
import { defaultFeatures, featureKeys, type FeatureKey, type FeatureMap } from '../lib/features';
import { AppError } from '../lib/errors';

export async function getFeatures(): Promise<FeatureMap> {
  const saved = await prisma.appFeature.findMany();
  const features = { ...defaultFeatures };

  for (const setting of saved) {
    const key = featureKeys.find((candidate) => candidate === setting.key);
    if (key) features[key] = setting.enabled;
  }

  if (!features.projects) {
    features.prints = false;
    features.filaments = false;
  }

  return features;
}

export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  if ((key === 'prints' || key === 'filaments') && !(await isFeatureEnabled('projects'))) return false;
  const setting = await prisma.appFeature.findUnique({ where: { key } });
  return setting?.enabled ?? defaultFeatures[key];
}

export async function updateFeatures(changes: Partial<FeatureMap>): Promise<FeatureMap> {
  const projectsEnabled = changes.projects ?? await isFeatureEnabled('projects');
  if (!projectsEnabled && (changes.prints === true || changes.filaments === true)) {
    throw new AppError(409, 'FEATURE_DEPENDENCY_REQUIRED', 'Ative Projetos antes de reativar impressões ou estoque de filamentos.');
  }

  const effectiveChanges = changes.projects === false
    ? { ...changes, prints: false, filaments: false }
    : changes;

  const updates = featureKeys.flatMap((key) => {
    const enabled = effectiveChanges[key];
    if (enabled === undefined) return [];
    return [
      prisma.appFeature.upsert({
        where: { key },
        create: { key, enabled },
        update: { enabled },
      }),
    ];
  });

  await prisma.$transaction(updates);
  return getFeatures();
}
