import { notFound } from 'next/navigation';

import { CSEC_ROADMAP_MISSIONS } from '@/lib/brightos/csec-roadmap-missions';

import MissionClient from './MissionClient';

export default function CsecMissionRunnerPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const mission = CSEC_ROADMAP_MISSIONS.find((m) => m.id === id) || null;

  if (!mission) notFound();

  return <MissionClient mission={mission} />;
}
