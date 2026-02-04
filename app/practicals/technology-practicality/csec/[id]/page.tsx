import IpadReplica from '@/components/ipad/IpadReplica';
import { CSEC_ROADMAP_MISSIONS } from '@/lib/brightos/csec-roadmap-missions';

export default function CsecMissionRunnerPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const mission = CSEC_ROADMAP_MISSIONS.find((m) => m.id === id) || null;

  if (!mission) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-semibold">Mission not found</h1>
          <p className="mt-2 text-sm text-white/70">Pick a mission from the CSEC roadmap to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6 text-white">
        <header>
          <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">CSEC iPad Mission</div>
          <h1 className="mt-3 text-3xl font-semibold">{mission.title}</h1>
          <p className="mt-2 text-sm text-white/70">{mission.summary}</p>
        </header>
        <IpadReplica variant="tech" businessName="BrightEd CSEC Lab" contactName="Mission Control" businessHealth={70} />
      </div>
    </div>
  );
}
