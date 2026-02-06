'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';

import type { BrightOSMission } from '@/lib/brightos/csec-roadmap-missions';
import { getMissionCooldown, registerMissionCompletionAndMaybeCooldown } from '@/lib/brightos/mission-rewards';
import { awardFixedMissionXP } from '@/lib/brightos/mission-xp';
import { markMissionCompleted } from '@/lib/brightos/mission-progress';
import { endLiveSession, startLiveSession } from '@/lib/brightos/live-sessions';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

const MISSION_XP_REWARD = 100;
const MISSION_BCOIN_REWARD = 50;

type WindowId =
  | 'taskmgr'
  | 'terminal'
  | 'settings'
  | 'browser'
  | 'automation'
  | 'explorer'
  | 'stuck_app'
  | 'uninstall'
  | 'registry'
  | 'devmgr'
  | 'mail'
  | 'chat';

type WindowState = {
  id: WindowId;
  title: string;
  open: boolean;
  minimized: boolean;
  z: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type RuntimeState = {
  power: 'intro' | 'booting' | 'lock' | 'on' | 'reward' | 'shutting-down' | 'off';
  boot_phase: 0 | 1 | 2 | 3 | 4 | 5;
  cpu_load: number;
  network: {
    status: 'Connected' | 'Disconnected' | 'Slow';
    ip_renewed: boolean;
    ip: string;
    dns: { primary: string };
    suspicious_connection: { active: boolean };
  };
  window: { stuck_app: { open: boolean } };
  process: { high_cpu: { running: boolean } };
  disk: { free_space_mb: number; volumes: string[] };
  files: { tmp: { count: number }; restored: boolean; renamed_prefix: string; renamed_count: number; total: number };
  recycle_bin: { empty: boolean };
  file: { opened: string | null };
  terminal: { history: string[]; last_command: string | null; last_output: string };
  notifications: Array<{ id: string; kind: 'alert' | 'info'; title: string; body: string }>;
  apps: Record<string, { name: string; installed: boolean; malware: boolean; reinstall: boolean; process?: string; registryKeys?: string[] }>;
  registry: Record<string, string>;

  audio: { output: boolean };
  device: { audio: { driver_status: 'outdated' | 'updated' } };
  display: { resolution: string };
  power_settings: { screen_off_minutes_on_battery: number };
  keyboard: { filter_keys: { enabled: boolean } };
  specs: { checked: boolean };

  printer: { queue: { count: number }; ip: string; reachable: boolean };
  router: {
    admin_password_changed: boolean;
    wifi: { security: string };
    port_forwarding: string[];
    blocked_macs: string[];
  };
  unknown_device: { mac: string };
  browser: { redirects: boolean; extensions: { malicious: number } };
  mail: { flagged_phishing: boolean };
  defend: { threats: { active: number; quarantined: number } };
  account: { user: { password_reset: boolean } };
  system: { restore: { completed: boolean }; crash_rate: number };
  hardware: { ram_gb: number };
  firewall: { inbound: { blocked_ports: number[] } };
  folder: { encrypted_paths: string[] };
  forensics: { bruteforce_timestamp: string };
  web: { validation: { blocks_sql_injection: boolean } };
  ransomware: { lock_screen: boolean };
  incident: { pid_identified: boolean; resolved: boolean };
  ping: { packet_loss_percent: number };
  trace: { loss_hop_index: number };
  ftp: { uploaded: string[] };
  automation: { flow: { valid: boolean }; outputs: Record<string, any> };
  validation: { rejects_common_password: boolean; min_length: number };
  script: { output: number | null; terminates: boolean };
  vars: { A: number; B: number };
  list: { sorted: boolean };
};

type TerminalLine = { id: string; kind: 'in' | 'out' | 'sys'; text: string };

type StoryEmail = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  attachments?: string[];
  unread?: boolean;
};

type StoryChatMessage = {
  id: string;
  from: string;
  text: string;
  atOffsetMs: number;
};

type StoryEvent =
  | { kind: 'notify'; atOffsetMs: number; level: 'info' | 'alert'; title: string; body: string }
  | { kind: 'email'; atOffsetMs: number; emailId: string }
  | { kind: 'document'; atOffsetMs: number; path: string };

function PhoneMessageOutro({
  mission,
  userLabel,
  userAvatarUrl,
  npcLabel,
  npcAvatarUrl,
  xpReward,
  bCoinReward,
  onDone,
}: {
  mission: BrightOSMission;
  userLabel: string;
  userAvatarUrl: string;
  npcLabel: string;
  npcAvatarUrl: string;
  xpReward: number;
  bCoinReward: number;
  onDone: () => void;
}) {
  const script = useMemo(() => {
    const userLine = `All set, ${mission.client.name}. Your computer is fixed and running smoothly again.`;
    const thanks = mission.client.mood === 'Panic'
      ? 'Thank you so much! I thought it was done for.'
      : mission.client.mood === 'Angry'
        ? 'Alright, it finally works. Thanks for fixing it.'
        : mission.client.mood === 'Confused'
          ? 'Ohhh, I see it now. Thanks for sorting it out.'
          : 'Thanks! Everything looks perfect now.';

    return [
      { from: 'user' as const, text: userLine },
      { from: 'npc' as const, text: thanks },
      { from: 'npc' as const, text: `Reward sent: +${xpReward} XP and +${bCoinReward} B-Coins.` },
    ];
  }, [bCoinReward, mission.client.mood, mission.client.name, xpReward]);

  const [msgIndex, setMsgIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [closing, setClosing] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    if (closing || showRewards) return;
    const current = script[msgIndex];
    if (!current) return;

    if (charIndex < current.text.length) {
      const id = window.setTimeout(() => setCharIndex((p) => p + 1), current.from === 'npc' ? 30 : 24);
      return () => window.clearTimeout(id);
    }

    if (msgIndex < script.length - 1) {
      const id = window.setTimeout(() => {
        setMsgIndex((p) => p + 1);
        setCharIndex(0);
      }, 850);
      return () => window.clearTimeout(id);
    }

    const id = window.setTimeout(() => {
      setShowRewards(true);
    }, 800);
    return () => window.clearTimeout(id);
  }, [charIndex, closing, msgIndex, script, showRewards]);

  useEffect(() => {
    if (!showRewards) return;
    const id = window.setTimeout(() => {
      setClosing(true);
      window.setTimeout(() => onDone(), 800);
    }, 4200);
    return () => window.clearTimeout(id);
  }, [onDone, showRewards]);

  const visibleMessages = useMemo(() => {
    const out: Array<{ from: 'npc' | 'user'; text: string }> = [];
    script.forEach((m, i) => {
      if (i < msgIndex) out.push(m);
      if (i === msgIndex) out.push({ ...m, text: m.text.slice(0, charIndex) });
    });
    return out;
  }, [charIndex, msgIndex, script]);

  return (
    <div className="min-h-screen bg-[#050B14] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-black" />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {!closing ? (
            <motion.div
              key="phone-open"
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 18 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-[420px]"
            >
              <div className="rounded-[2.25rem] border border-white/15 bg-black/70 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5 overflow-hidden">
                      <Image src={npcAvatarUrl} alt={npcLabel} width={36} height={36} className="h-full w-full" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Mission Wrap-up</div>
                      <div className="mt-0.5 text-sm font-black text-white">{npcLabel}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setClosing(true);
                      window.setTimeout(() => onDone(), 350);
                    }}
                    className="h-9 px-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-[10px] font-black uppercase tracking-[0.25em] text-zinc-200 transition-colors"
                  >
                    {showRewards ? 'Continue' : 'Skip'}
                  </button>
                </div>

                <div className="p-5 h-[520px] overflow-auto sleek-scrollbar flex flex-col gap-3">
                  {visibleMessages.map((m, idx) => {
                    const mine = m.from === 'user';
                    const avatar = mine ? userAvatarUrl : npcAvatarUrl;
                    const label = mine ? userLabel : npcLabel;
                    return (
                      <div key={idx} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                        {!mine ? (
                          <div className="h-8 w-8 rounded-full border border-white/10 bg-white/5 overflow-hidden shrink-0">
                            <Image src={avatar} alt={label} width={32} height={32} className="h-full w-full" />
                          </div>
                        ) : null}
                        <div
                          className={`max-w-[78%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${mine
                            ? 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 text-white'
                            : 'border-white/10 bg-white/[0.03] text-zinc-200'
                            }`}
                        >
                          {m.text}
                        </div>
                        {mine ? (
                          <div className="h-8 w-8 rounded-full border border-white/10 bg-white/5 overflow-hidden shrink-0">
                            <Image src={avatar} alt={label} width={32} height={32} className="h-full w-full" />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {showRewards ? (
                    <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-200">Mission Rewards</div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">XP</div>
                          <div className="mt-2 text-2xl font-black text-white">+{xpReward}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">B-Coins</div>
                          <div className="mt-2 text-2xl font-black text-amber-300">+{bCoinReward}</div>
                        </div>
                      </div>
                      <div className="mt-4 text-xs text-emerald-100/80">Rewards have been added to your profile.</div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-zinc-500">Mission complete • rewards applied</div>
            </motion.div>
          ) : (
            <motion.div
              key="phone-close"
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-[420px]"
            >
              <div className="rounded-[2.25rem] border border-white/15 bg-black/70 h-[620px]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PhoneMessageIntro({
  mission,
  userLabel,
  userAvatarUrl,
  npcLabel,
  npcAvatarUrl,
  onDone,
}: {
  mission: BrightOSMission;
  userLabel: string;
  userAvatarUrl: string;
  npcLabel: string;
  npcAvatarUrl: string;
  onDone: () => void;
}) {
  const script = useMemo(() => {
    const opener = mission.client.dialogue_start;
    const userLine = mission.id === 'tech-5'
      ? 'Ok. I’m going to check your drivers and get the audio working again.'
      : mission.id === 'tech-6'
        ? 'Ok. I’ll adjust the display settings and fix the resolution.'
        : mission.id === 'tech-3'
          ? 'Ok. I’ll clean up storage and free up space.'
          : mission.id === 'tech-13'
            ? 'Ok. I’m going to run a deep scan and quarantine anything suspicious.'
            : 'Ok. I’m on it. I’ll troubleshoot and fix it.';
    const closer = 'Thanks. Please hurry, I really need it working.';

    return [
      { from: 'npc' as const, text: opener },
      { from: 'user' as const, text: userLine },
      { from: 'npc' as const, text: closer },
    ];
  }, [mission.client.dialogue_start, mission.id]);

  const [msgIndex, setMsgIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (closing) return;
    const current = script[msgIndex];
    if (!current) return;

    if (charIndex < current.text.length) {
      const id = window.setTimeout(() => setCharIndex((p) => p + 1), current.from === 'npc' ? 32 : 26);
      return () => window.clearTimeout(id);
    }

    if (msgIndex < script.length - 1) {
      const id = window.setTimeout(() => {
        setMsgIndex((p) => p + 1);
        setCharIndex(0);
      }, 900);
      return () => window.clearTimeout(id);
    }

    const id = window.setTimeout(() => {
      setClosing(true);
      window.setTimeout(() => onDone(), 800);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [charIndex, closing, msgIndex, onDone, script]);

  const visibleMessages = useMemo(() => {
    const out: Array<{ from: 'npc' | 'user'; text: string }> = [];
    script.forEach((m, i) => {
      if (i < msgIndex) out.push(m);
      if (i === msgIndex) out.push({ ...m, text: m.text.slice(0, charIndex) });
    });
    return out;
  }, [charIndex, msgIndex, script]);

  return (
    <div className="min-h-screen bg-[#050B14] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-primary)]/10 via-transparent to-black" />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {!closing ? (
            <motion.div
              key="phone-open"
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 18 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-[420px]"
            >
              <div className="rounded-[2.25rem] border border-white/15 bg-black/70 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5 overflow-hidden">
                      <Image src={npcAvatarUrl} alt={npcLabel} width={36} height={36} className="h-full w-full" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Messages</div>
                      <div className="mt-0.5 text-sm font-black text-white">{npcLabel}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setClosing(true);
                      window.setTimeout(() => onDone(), 350);
                    }}
                    className="h-9 px-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-[10px] font-black uppercase tracking-[0.25em] text-zinc-200 transition-colors"
                  >
                    Skip
                  </button>
                </div>

                <div className="p-5 h-[520px] overflow-auto sleek-scrollbar flex flex-col gap-3">
                  {visibleMessages.map((m, idx) => {
                    const mine = m.from === 'user';
                    const avatar = mine ? userAvatarUrl : npcAvatarUrl;
                    const label = mine ? userLabel : npcLabel;
                    return (
                      <div key={idx} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                        {!mine ? (
                          <div className="h-8 w-8 rounded-full border border-white/10 bg-white/5 overflow-hidden shrink-0">
                            <Image src={avatar} alt={label} width={32} height={32} className="h-full w-full" />
                          </div>
                        ) : null}
                        <div
                          className={`max-w-[78%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${mine
                            ? 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 text-white'
                            : 'border-white/10 bg-white/[0.03] text-zinc-200'
                            }`}
                        >
                          {m.text}
                          {idx === visibleMessages.length - 1 && msgIndex === script.length - 1 && charIndex >= script[msgIndex]?.text.length ? null : null}
                        </div>
                        {mine ? (
                          <div className="h-8 w-8 rounded-full border border-white/10 bg-white/5 overflow-hidden shrink-0">
                            <Image src={avatar} alt={label} width={32} height={32} className="h-full w-full" />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-zinc-500">Incoming support ticket…</div>
            </motion.div>
          ) : (
            <motion.div
              key="phone-close"
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-[420px]"
            >
              <div className="rounded-[2.25rem] border border-white/15 bg-black/70 h-[620px]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DeviceManagerWindow({
  state,
  onState,
  onNotify,
}: {
  state: RuntimeState;
  onState: (fn: (p: RuntimeState) => RuntimeState) => void;
  onNotify: (kind: 'alert' | 'info', title: string, body: string) => void;
}) {
  const driver = state.device.audio.driver_status;
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Device Manager (Drivers)</div>

      <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <div className="text-sm font-black text-white">Sound, video and game controllers</div>
          <div className="mt-1 text-xs text-zinc-400">Audio Device • Driver: <span className={driver === 'updated' ? 'text-emerald-300' : 'text-amber-200'}>{driver}</span></div>
        </div>
        <div className="p-4">
          <div className="text-xs text-zinc-400">Status</div>
          <div className="mt-2 text-sm text-zinc-200">
            {driver === 'updated'
              ? 'This device is working properly.'
              : 'Driver issue detected. Audio output may be unavailable.'}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (driver === 'updated') return;
                onState((p) => ({ ...p, device: { ...p.device, audio: { driver_status: 'updated' } }, audio: { output: true } }));
                onNotify('info', 'DEVICE MANAGER', 'Audio driver updated. Output restored.');
              }}
              disabled={driver === 'updated'}
              className={`h-10 px-4 rounded-2xl border text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${driver === 'updated'
                ? 'border-white/10 bg-white/[0.03] text-zinc-500'
                : 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-white'
                }`}
            >
              Update Driver
            </button>
            <button
              onClick={() => {
                onNotify('info', 'DEVICE MANAGER', 'Scan complete.');
              }}
              className="h-10 px-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
            >
              Scan for hardware changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Briefing = {
  ticketId: string;
  category: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  deviceOwner: { name: string; role: string; email: string };
  policyBanner: string;
  slaMinutes: number;
  summary: string;
  steps: string[];
  attachments: string[];
};

type StoryPack = {
  briefing: Briefing;
  emails: StoryEmail[];
  chat: StoryChatMessage[];
  events: StoryEvent[];
  pinnedApps: Array<'mail' | 'chat'>;
  accent: 'emerald' | 'amber' | 'sky' | 'red' | 'zinc';
};

type AllowedTool = BrightOSMission['tools_allowed'][number];

type AppId = AllowedTool;

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function pickAccent(preset: BrightOSMission['brightos_desktop']['ui_preset']): StoryPack['accent'] {
  if (preset === 'smallbiz_admin') return 'amber';
  if (preset === 'techfix_shop') return 'sky';
  if (preset === 'automation_lab') return 'emerald';
  if (preset === 'csec_soc') return 'red';
  return 'zinc';
}

function inferScenario(mission: BrightOSMission) {
  const s = mission.success_condition;
  if (s.includes('router.')) return 'router';
  if (s.includes('browser.redirects') || s.includes('browser.extensions')) return 'browser_cleanup';
  if (s.includes('mail.flagged_phishing')) return 'phishing';
  if (s.includes('defend.threats')) return 'malware_scan';
  if (s.includes('firewall.inbound')) return 'firewall';
  if (s.includes('ftp.uploaded')) return 'ftp';
  if (s.includes('forensics.bruteforce_timestamp')) return 'forensics';
  if (s.includes('folder.encrypted')) return 'encryption';
  if (s.includes('files.restored') || s.includes('ransomware.lock_screen')) return 'ransomware';
  if (s.includes('disk.free_space') || s.includes('files.tmp.count') || s.includes('recycle_bin')) return 'storage_cleanup';
  if (s.includes('terminal.last_command') || s.includes('ping.') || s.includes('trace.')) return 'terminal_network';
  if (s.includes('automation.') || s.includes('validation.') || s.includes('script.') || s.includes('vars.') || s.includes('list.')) return 'automation';
  if (s.includes('hardware.ram_gb')) return 'hardware';
  return 'general';
}

function buildStoryPack(mission: BrightOSMission, company: { name: string; dept: string; hostname: string }): StoryPack {
  const scenario = inferScenario(mission);
  const accent = pickAccent(mission.brightos_desktop.ui_preset);
  const ticketId = `${company.hostname}-${String(mission.rank).padStart(2, '0')}-${mission.id.toUpperCase()}`;

  const deviceOwner = {
    name: mission.client.name,
    role: mission.client.role,
    email: `${mission.client.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') || 'user'}@${company.name.toLowerCase().replace(/[^a-z]+/g, '')}.com`,
  };

  const baseSla = mission.rank <= 1 ? 45 : mission.rank === 2 ? 35 : mission.rank === 3 ? 25 : mission.rank === 4 ? 20 : 15;
  const slaMinutes = scenario === 'ransomware' || scenario === 'firewall' ? Math.min(20, baseSla) : baseSla;

  const policyBanner =
    scenario === 'ransomware' || scenario === 'forensics' || mission.brightos_desktop.ui_preset === 'csec_soc'
      ? 'POLICY: Incident Response — preserve evidence, document actions, and escalate critical events.'
      : scenario === 'phishing'
        ? 'POLICY: Email Security — never share credentials, report phishing immediately.'
        : scenario === 'encryption'
          ? 'POLICY: Data Protection — encrypt sensitive folders before transfer.'
          : 'POLICY: Acceptable Use — follow company IT guidelines and log all changes.';

  const summary =
    scenario === 'router'
      ? 'Secure the router configuration and remove unauthorized access.'
      : scenario === 'browser_cleanup'
        ? 'Stop browser redirects by removing the malicious extension.'
        : scenario === 'phishing'
          ? 'Identify and flag a suspicious email impersonating an admin.'
          : scenario === 'firewall'
            ? 'Block a risky inbound port to reduce the attack surface.'
            : scenario === 'ransomware'
              ? 'Restore from backup and bring the system back online safely.'
              : scenario === 'forensics'
                ? 'Review logs and extract the timestamp of the brute force attempt.'
                : scenario === 'ftp'
                  ? 'Upload the required file to the server and confirm transfer.'
                  : scenario === 'automation'
                    ? 'Apply the correct logic and run the test simulation.'
                    : 'Resolve the ticket using the allowed tools and confirm success.';

  const priority: Briefing['priority'] = scenario === 'ransomware' ? 'P1' : mission.rank >= 4 ? 'P2' : mission.rank >= 2 ? 'P3' : 'P4';
  const urgency: Briefing['urgency'] = priority === 'P1' ? 'Critical' : priority === 'P2' ? 'High' : priority === 'P3' ? 'Medium' : 'Low';

  const attachments: string[] = [];
  if (scenario === 'forensics') attachments.push('C:/Logs/access.log');
  if (scenario === 'ftp') attachments.push('C:/Users/Student/Desktop/index.html');
  if (scenario === 'encryption') attachments.push('C:/Users/Student/Documents/Clinic/Records/');
  if (scenario === 'ransomware') attachments.push('E:/Backup/');
  if (scenario === 'router') attachments.push('Router/Clients: 3 (one unknown)');

  const emails: StoryEmail[] = [];
  const chat: StoryChatMessage[] = [];
  const events: StoryEvent[] = [];

  const inboxBaseId = `${mission.id}-inbox-1`;
  if (scenario === 'phishing') {
    emails.push({
      id: inboxBaseId,
      from: 'admin@g00gle.com',
      subject: 'Urgent password reset required',
      preview: 'Your account will be disabled in 30 minutes…',
      body: 'We detected unusual activity. Click the link to reset your password immediately.\n\n— IT Admin',
      attachments: ['phishing_screenshot.png'],
      unread: true,
    });
    events.push({ kind: 'notify', atOffsetMs: 2500, level: 'alert', title: 'MAIL', body: 'New message received: Urgent password reset required' });
    events.push({ kind: 'email', atOffsetMs: 2500, emailId: inboxBaseId });
  }

  if (scenario === 'ransomware') {
    emails.push({
      id: inboxBaseId,
      from: 'ops@caribsec.local',
      subject: 'Ransomware outbreak - restore guidance',
      preview: 'Use backup drive E: to restore encrypted documents…',
      body: 'Do NOT pay ransom. Restore from E:/Backup/. Document every step. If you see unusual persistence, escalate to SOC.',
      attachments: ['restore_runbook.pdf'],
      unread: true,
    });
    events.push({ kind: 'notify', atOffsetMs: 3500, level: 'alert', title: 'SECURITY', body: 'Incident Severity: HIGH — follow IR policy.' });
  }

  if (scenario === 'router') {
    chat.push({ id: `${mission.id}-chat-1`, from: 'NetworkOps', text: 'Need the router hardened ASAP. Change admin creds + block unknown device.', atOffsetMs: 4000 });
  }

  if (scenario === 'forensics') {
    chat.push({ id: `${mission.id}-chat-1`, from: 'SOC Analyst', text: 'Please pull first brute force timestamp from access.log and reply with the exact value.', atOffsetMs: 3500 });
    events.push({ kind: 'document', atOffsetMs: 0, path: 'C:/Logs/access.log' });
  }

  if (scenario === 'automation') {
    chat.push({ id: `${mission.id}-chat-1`, from: 'Trainer', text: 'Open Automation App and run the test once your logic is correct.', atOffsetMs: 2500 });
  }

  if (scenario === 'ftp') {
    chat.push({ id: `${mission.id}-chat-1`, from: 'WebAdmin', text: 'Need index.html uploaded to /public_html via FTP. Use the sim command if needed.', atOffsetMs: 3000 });
  }

  if (scenario === 'firewall') {
    events.push({ kind: 'notify', atOffsetMs: 2000, level: 'alert', title: 'SECURITY', body: 'Inbound Telnet traffic detected — recommend blocking port 23.' });
  }

  return {
    briefing: {
      ticketId,
      category:
        scenario === 'router'
          ? 'Network / Router'
          : scenario === 'phishing'
            ? 'Security / Email'
            : scenario === 'firewall'
              ? 'Security / Firewall'
              : scenario === 'automation'
                ? 'Programming / Logic'
                : scenario === 'storage_cleanup'
                  ? 'System / Storage'
                  : 'IT Support',
      priority,
      urgency,
      deviceOwner,
      policyBanner,
      slaMinutes,
      summary,
      steps: mission.steps_to_solve,
      attachments,
    },
    emails,
    chat,
    events,
    pinnedApps: ['mail', 'chat'],
    accent,
  };
}

function MailApp({ emails }: { emails: StoryEmail[] }) {
  const [selected, setSelected] = useState<string | null>(emails[0]?.id ?? null);
  const current = emails.find((e) => e.id === selected) || null;
  return (
    <div className="h-full grid grid-cols-[260px_1fr] gap-4">
      <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Inbox</div>
        <div className="h-[calc(100%-2.5rem)] overflow-auto">
          {emails.length === 0 ? (
            <div className="p-4 text-sm text-zinc-400">No messages.</div>
          ) : (
            emails.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/[0.04] transition-colors ${selected === m.id ? 'bg-white/[0.06]' : ''}`}
              >
                <div className="text-xs font-bold text-white truncate">{m.subject}</div>
                <div className="mt-0.5 text-[11px] text-zinc-400 truncate">{m.from}</div>
                <div className="mt-1 text-[11px] text-zinc-400/80 truncate">{m.preview}</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 overflow-auto">
        {!current ? (
          <div className="text-sm text-zinc-300">Select a message.</div>
        ) : (
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">From</div>
            <div className="mt-1 text-sm text-white font-semibold">{current.from}</div>
            <div className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Subject</div>
            <div className="mt-1 text-sm text-white font-semibold">{current.subject}</div>
            <div className="mt-4 whitespace-pre-wrap text-sm text-zinc-200 leading-relaxed">{current.body}</div>
            {current.attachments?.length ? (
              <div className="mt-6">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Attachments</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {current.attachments.map((a) => (
                    <div key={a} className="px-3 py-2 rounded-xl border border-white/10 bg-black/20 text-xs text-zinc-200 font-mono">{a}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatApp({ messages }: { messages: Array<{ from: string; text: string }> }) {
  return (
    <div className="h-full rounded-2xl border border-white/10 bg-black/30 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-white/10 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Team Chat</div>
      <div className="flex-1 p-4 overflow-auto space-y-3">
        {messages.length === 0 ? (
          <div className="text-sm text-zinc-400">No messages.</div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] font-black text-white/80">{m.from}</div>
              <div className="mt-1 text-sm text-zinc-200">{m.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BriefingOverlay({
  briefing,
  now,
  startAt,
  accent,
  onAcknowledge,
}: {
  briefing: Briefing;
  now: Date;
  startAt: number;
  accent: StoryPack['accent'];
  onAcknowledge: () => void;
}) {
  const deadline = startAt + briefing.slaMinutes * 60_000;
  const remainingMs = Math.max(0, deadline - now.getTime());
  const mins = Math.floor(remainingMs / 60_000);
  const secs = Math.floor((remainingMs % 60_000) / 1000);
  const slaLabel = `${mins}:${String(secs).padStart(2, '0')}`;
  const accentClass =
    accent === 'emerald'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : accent === 'amber'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
        : accent === 'sky'
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
          : accent === 'red'
            ? 'border-red-500/30 bg-red-500/10 text-red-200'
            : 'border-white/10 bg-white/[0.03] text-zinc-200';

  return (
    <div className="absolute inset-0 z-[300]">
      <div className="absolute inset-0 bg-black/70" />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/20 bg-black/80 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-start justify-between gap-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Mission Briefing</div>
              <div className="mt-2 text-2xl font-black text-white">Ticket {briefing.ticketId}</div>
              <div className="mt-2 text-sm text-zinc-300/80">{briefing.category} • Priority {briefing.priority} • Urgency {briefing.urgency}</div>
            </div>
            <div className={`shrink-0 rounded-2xl border px-4 py-3 ${accentClass}`}>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80">SLA Remaining</div>
              <div className="mt-1 text-xl font-black">{slaLabel}</div>
            </div>
          </div>

          <div className="p-6 grid gap-5">
            <div className={`rounded-2xl border px-4 py-3 ${accentClass}`}>
              <div className="text-[10px] font-black uppercase tracking-[0.25em]">{briefing.policyBanner}</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Device Owner</div>
                <div className="mt-2 text-sm text-white font-black">{briefing.deviceOwner.name}</div>
                <div className="mt-1 text-xs text-zinc-300/80">{briefing.deviceOwner.role}</div>
                <div className="mt-2 text-xs text-zinc-300/80 font-mono">{briefing.deviceOwner.email}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Summary</div>
                <div className="mt-2 text-sm text-zinc-200 leading-relaxed">{briefing.summary}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Steps to Solve</div>
              <div className="mt-3 grid gap-1.5 text-sm text-zinc-200/90">
                {briefing.steps.slice(0, 8).map((s) => (
                  <div key={s}>- {s}</div>
                ))}
              </div>
            </div>

            {briefing.attachments.length ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Attachments / Context</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {briefing.attachments.slice(0, 8).map((a) => (
                    <div key={a} className="px-3 py-2 rounded-xl border border-white/10 bg-black/20 text-xs text-zinc-200 font-mono">{a}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="p-6 border-t border-white/10 flex items-center justify-between gap-4">
            <div className="text-xs text-zinc-400">Acknowledge the briefing to proceed to the lock screen.</div>
            <button
              onClick={onAcknowledge}
              className="h-12 px-6 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 transition-colors text-[10px] font-black uppercase tracking-[0.25em] text-white"
            >
              Acknowledge & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowserWindow({
  mission,
  state,
  onState,
  onNotify,
}: {
  mission: BrightOSMission;
  state: RuntimeState;
  onState: (fn: (p: RuntimeState) => RuntimeState) => void;
  onNotify: (kind: 'alert' | 'info', title: string, body: string) => void;
}) {
  const wantsRouter = mission.success_condition.includes('router.');
  const wantsRedirectFix = mission.success_condition.includes('browser.redirects') || mission.success_condition.includes('browser.extensions');
  const wantsPhishing = mission.success_condition.includes('mail.flagged_phishing');

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Browser</div>

      {wantsRouter && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-sm font-black text-white">Router Admin (192.168.0.1)</div>
          <div className="mt-2 text-xs text-zinc-400">Device: {state.unknown_device.mac} • Wi‑Fi Security: {state.router.wifi.security}</div>
          <div className="mt-4 grid gap-2">
            <button
              onClick={() => {
                onState((p) => ({ ...p, router: { ...p.router, admin_password_changed: true } }));
                onNotify('info', 'ROUTER', 'Admin password updated.');
              }}
              className="h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
            >
              Change Admin Password
            </button>
            <button
              onClick={() => {
                onState((p) => ({ ...p, router: { ...p.router, wifi: { security: 'WPA2' } } }));
                onNotify('info', 'ROUTER', 'Wi‑Fi security set to WPA2.');
              }}
              className="h-10 px-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
            >
              Set Wi‑Fi Security: WPA2
            </button>
            <button
              onClick={() => {
                onState((p) => ({ ...p, router: { ...p.router, port_forwarding: Array.from(new Set([...(p.router.port_forwarding || []), '80'])) } }));
                onNotify('info', 'ROUTER', 'Port forwarding rule added: 80.');
              }}
              className="h-10 px-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
            >
              Add Port Forward: 80
            </button>
            <button
              onClick={() => {
                onState((p) => ({ ...p, router: { ...p.router, blocked_macs: Array.from(new Set([...(p.router.blocked_macs || []), p.unknown_device.mac])) } }));
                onNotify('info', 'ROUTER', 'Unknown device blocked.');
              }}
              className="h-10 px-4 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-[10px] font-black uppercase tracking-[0.25em] text-red-100 transition-colors"
            >
              Block MAC
            </button>
          </div>
        </div>
      )}

      {wantsRedirectFix && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-sm font-black text-white">Extensions</div>
          <div className="mt-2 text-xs text-zinc-400">Malicious: {state.browser.extensions.malicious}</div>
          <button
            onClick={() => {
              onState((p) => ({ ...p, browser: { redirects: false, extensions: { malicious: 0 } } }));
              onNotify('info', 'BROWSER', 'Malicious extension removed. Redirects stopped.');
            }}
            className="mt-3 h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
          >
            Remove Malicious Extension
          </button>
        </div>
      )}

      {wantsPhishing && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-sm font-black text-white">Inbox</div>
          <div className="mt-2 text-xs text-zinc-400">From: admin@g00gle.com</div>
          <div className="mt-2 text-sm text-zinc-200">Subject: Urgent password reset required</div>
          <button
            onClick={() => {
              onState((p) => ({ ...p, mail: { flagged_phishing: true } }));
              onNotify('alert', 'MAIL', 'Email flagged as phishing.');
            }}
            className="mt-3 h-10 px-4 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-[10px] font-black uppercase tracking-[0.25em] text-red-100 transition-colors"
          >
            Flag as Phishing
          </button>
        </div>
      )}
    </div>
  );
}

function AutomationWindow({
  mission,
  state,
  onState,
  onNotify,
}: {
  mission: BrightOSMission;
  state: RuntimeState;
  onState: (fn: (p: RuntimeState) => RuntimeState) => void;
  onNotify: (kind: 'alert' | 'info', title: string, body: string) => void;
}) {
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Automation App</div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="text-sm font-black text-white">Mission Lab</div>
        <div className="mt-2 text-xs text-zinc-400">Configure and run. Completion auto-checks.</div>

        <div className="mt-4 grid gap-2">
          <button
            onClick={() => {
              if (mission.id === 'tech-31') onState((p) => ({ ...p, automation: { ...p.automation, flow: { valid: true } } }));
              if (mission.id === 'tech-32') onState((p) => ({ ...p, automation: { ...p.automation, outputs: { ...p.automation.outputs, shutdown_triggered: true } } }));
              if (mission.id === 'tech-33') onState((p) => ({ ...p, automation: { ...p.automation, outputs: { ...p.automation.outputs, moved_to_spam: true } } }));
              if (mission.id === 'tech-34') onState((p) => ({ ...p, automation: { ...p.automation, outputs: { ...p.automation.outputs, fan_speed: 100 } } }));
              if (mission.id === 'tech-35') onState((p) => ({ ...p, validation: { rejects_common_password: true, min_length: 8 } }));
              if (mission.id === 'tech-36') onState((p) => ({ ...p, files: { ...p.files, renamed_prefix: 'img_', renamed_count: p.files.total } }));
              if (mission.id === 'tech-37') onState((p) => ({ ...p, script: { ...p.script, output: 15 } }));
              if (mission.id === 'tech-38') onState((p) => ({ ...p, script: { ...p.script, terminates: true }, cpu_load: 22 }));
              if (mission.id === 'tech-39') onState((p) => ({ ...p, vars: { A: 10, B: 5 } }));
              if (mission.id === 'tech-40') onState((p) => ({ ...p, list: { sorted: true } }));
              if (mission.id === 'tech-48') onState((p) => ({ ...p, web: { validation: { blocks_sql_injection: true } } }));
              onNotify('info', 'AUTOMATION', 'Simulation updated.');
            }}
            className="h-11 px-5 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 transition-colors text-[10px] font-black uppercase tracking-[0.25em] text-white"
          >
            Apply Fix / Run Test
          </button>
          <div className="text-xs text-zinc-400">
            Current: flow.valid={String(state.automation.flow.valid)} • outputs={JSON.stringify(state.automation.outputs)}
          </div>
        </div>
      </div>
    </div>
  );
}

function normPath(p: string) {
  return p.replace(/\\/g, '/');
}

function listByPrefix(entries: string[], prefix: string) {
  const base = prefix;
  return entries
    .map(normPath)
    .filter((p) => p.startsWith(base))
    .sort((a, b) => a.localeCompare(b));
}

function moveToRecycleBin(entries: string[], path: string) {
  const target = normPath(path);
  if (target.startsWith('RecycleBin:/')) return entries;
  return entries.map((entry) => {
    const normalized = normPath(entry);
    if (normalized !== target) return normalized;
    return `RecycleBin:/${normalized.replace(/^[A-Z]:\//i, '')}`;
  });
}

function DesktopIcon({
  title,
  subtitle,
  icon,
  onOpen,
  disabled,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onOpen: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onDoubleClick={() => {
        if (disabled) return;
        onOpen();
      }}
      onClick={(e) => e.currentTarget.focus()}
      className={`w-24 select-none text-center rounded border px-2 py-2 transition-colors ${disabled
        ? 'border-white/20 bg-black/20 text-zinc-500 cursor-not-allowed'
        : 'border-white/20 bg-black/25 hover:bg-black/35'
        }`}
      aria-disabled={disabled}
    >
      <div className="mx-auto h-10 w-10 rounded bg-white/10 border border-white/10 flex items-center justify-center text-xl text-white">
        {icon}
      </div>
      <div className="mt-2 text-[11px] leading-tight font-semibold text-white">{title}</div>
      <div className="mt-1 text-[10px] leading-tight text-zinc-300/80">{subtitle}</div>
    </button>
  );
}

function UninstallPrograms({
  apps,
  onUninstall,
}: {
  apps: RuntimeState['apps'];
  onUninstall: (appId: string) => void;
}) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(apps)
      .map(([id, a]) => ({ id, ...a }))
      .filter((a) => (q ? a.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [apps, query]);

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Installed Programs</div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search programs"
        className="h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none focus:border-[var(--brand-primary)]/60"
      />

      <div className="flex-1 rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_160px] gap-2 px-4 py-3 border-b border-white/10 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
          <div>Name</div>
          <div>Status</div>
          <div>Action</div>
        </div>
        <div className="h-[calc(100%-2.75rem)] overflow-auto">
          {rows.map((a) => (
            <div key={a.id} className={`grid grid-cols-[1fr_140px_160px] gap-2 px-4 py-3 border-b border-white/5 text-sm ${a.malware && a.installed ? 'bg-red-500/5 text-zinc-100' : 'text-zinc-200'}`}>
              <div className="font-semibold">
                {a.name}{' '}
                {a.malware ? <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200">MALWARE</span> : null}
              </div>
              <div className="font-mono text-xs">
                {a.installed ? 'Installed' : 'Uninstalled'}
              </div>
              <div>
                <button
                  disabled={!a.installed}
                  onClick={() => onUninstall(a.id)}
                  className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${a.installed
                    ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-red-100'
                    : 'border-white/10 bg-white/[0.03] text-zinc-500'
                    }`}
                >
                  Uninstall
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RegistryEditor({
  registry,
  onSet,
  onDelete,
}: {
  registry: RuntimeState['registry'];
  onSet: (fullKey: string, value: string) => void;
  onDelete: (prefix: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const keys = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return Object.keys(registry)
      .filter((k) => (q ? k.toLowerCase().includes(q) : true))
      .sort((a, b) => a.localeCompare(b));
  }, [filter, registry]);

  useEffect(() => {
    if (!selected) return;
    setEditValue(registry[selected] ?? '');
  }, [registry, selected]);

  return (
    <div className="h-full grid grid-cols-[320px_1fr] gap-4">
      <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
        <div className="p-3 border-b border-white/10">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Registry</div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter keys"
            className="mt-3 h-10 w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-xs text-white outline-none focus:border-[var(--brand-primary)]/60"
          />
        </div>
        <div className="h-[calc(100%-4.5rem)] overflow-auto">
          {keys.slice(0, 240).map((k) => (
            <button
              key={k}
              onClick={() => setSelected(k)}
              className={`w-full text-left px-3 py-2 border-b border-white/5 text-xs font-mono transition-colors ${selected === k ? 'bg-white/[0.06] text-white' : 'hover:bg-white/[0.04] text-zinc-200'
                }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Key Editor</div>

        {!selected ? (
          <div className="mt-3 text-sm text-zinc-300">Select a key from the left.</div>
        ) : (
          <div className="mt-3">
            <div className="text-xs text-zinc-400">Selected</div>
            <div className="mt-1 text-xs font-mono text-white break-all">{selected}</div>

            <div className="mt-4 text-xs text-zinc-400">Value</div>
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-mono text-white outline-none focus:border-[var(--brand-primary)]/60"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => onSet(selected, editValue)}
                className="h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  onDelete(selected);
                  setSelected(null);
                }}
                className="h-10 px-4 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-[10px] font-black uppercase tracking-[0.25em] text-red-100 transition-colors"
              >
                Delete Key
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Notifications({
  items,
  onDismiss,
}: {
  items: Array<{ id: string; kind: 'alert' | 'info'; title: string; body: string }>;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="absolute top-16 right-4 z-[260] w-[360px] max-w-[92vw]">
      <div className="grid gap-3">
        {items.slice(-4).map((n) => (
          <div
            key={n.id}
            className={`border p-4 ${n.kind === 'alert' ? 'border-red-500/40 bg-red-950/60' : 'border-white/20 bg-zinc-900/90'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">{n.title}</div>
                <div className="mt-1 text-sm text-zinc-100/90">{n.body}</div>
              </div>
              <button
                onClick={() => onDismiss(n.id)}
                className="h-7 w-10 border border-white/20 bg-black/20 hover:bg-black/30 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-200"
              >
                X
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickBestActiveWindow(wins: Record<WindowId, WindowState>): WindowId {
  const open = Object.values(wins)
    .filter((w) => w.open && !w.minimized)
    .sort((a, b) => b.z - a.z);
  return (open[0]?.id ?? 'terminal') as WindowId;
}

function fanLevel(cpu: number) {
  if (cpu > 85) return 3;
  if (cpu > 60) return 2;
  if (cpu > 35) return 1;
  return 0;
}

function pickFromPool(pool: string[]) {
  if (!pool.length) return '';
  return pool[Math.floor(Math.random() * pool.length)] || pool[0] || '';
}

function normalizeConditionPath(path: string) {
  const p = path.trim();
  if (p === 'network_status') return 'network.status';
  if (p.startsWith('power.')) return p.replace(/^power\./, 'power_settings.');
  return p;
}

function fileExistsInState(state: RuntimeState, needleRaw: string) {
  const needle = normPath(String(needleRaw));
  const opened = state.file.opened ? normPath(state.file.opened) : '';
  if (opened && (opened === needle || opened.endsWith(`/${needle}`) || opened.endsWith(needle))) return true;
  return false;
}

function fileExistsInFs(fs: string[], needleRaw: string) {
  const needle = normPath(String(needleRaw));
  return fs.some((p) => {
    const n = normPath(p);
    return n === needle || n.endsWith(`/${needle}`) || n.endsWith(needle);
  });
}

function evalLeft(state: RuntimeState, left: string, fsEntries: string[]) {
  const raw = left.trim();

  const funcMatch = raw.match(/^([a-zA-Z_][\w\.]*)\((.*)\)$/);
  if (funcMatch) {
    const fn = funcMatch[1];
    const argsRaw = funcMatch[2];
    const args = argsRaw
      ? argsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(parseValue)
      : [];

    if (fn === 'file.exists') {
      const needle = String(args[0] ?? '');
      return fileExistsInFs(fsEntries, needle) || fileExistsInState(state, needle);
    }
    if (fn === 'folder.encrypted') {
      const target = normPath(String(args[0] ?? ''));
      return state.folder.encrypted_paths.map(normPath).includes(target);
    }
    if (fn === 'app.installed') {
      const name = String(args[0] ?? '').toLowerCase();
      const found = Object.values(state.apps).find((a) => a.name.toLowerCase() === name);
      return Boolean(found?.installed);
    }
  }

  const methodMatch = raw.match(/^(.+?)\.(contains|startsWith)\((.*)\)$/);
  if (methodMatch) {
    const basePath = normalizeConditionPath(methodMatch[1] ?? '');
    const method = methodMatch[2];
    const parsedArg = parseValue(methodMatch[3] ?? '');
    const arg =
      typeof parsedArg === 'string' && parsedArg.includes('.') && getPath(state, normalizeConditionPath(parsedArg)) !== undefined
        ? getPath(state, normalizeConditionPath(parsedArg))
        : parsedArg;

    const baseVal = basePath.startsWith('drive.')
      ? fsEntries
        .map(normPath)
        .filter((p) => p.toUpperCase().startsWith(`${String(basePath.split('.')[1] ?? '').toUpperCase()}:\/`))
      : getPath(state, basePath);

    if (method === 'contains') {
      if (Array.isArray(baseVal)) {
        if (typeof arg === 'string') {
          const needle = String(arg);
          return baseVal.some((v) => String(v).includes(needle) || String(v).endsWith(needle));
        }
        return baseVal.includes(arg);
      }
      if (typeof baseVal === 'string') return baseVal.includes(String(arg));
      return false;
    }

    if (method === 'startsWith') {
      if (typeof baseVal === 'string') return baseVal.startsWith(String(arg));
      return false;
    }
  }

  const normalized = normalizeConditionPath(raw);
  return getPath(state, normalized);
}

function getPath(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function parseValue(raw: string) {
  const s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  const n = Number(s);
  if (!Number.isNaN(n)) return n;
  return s;
}

function evalCondition(state: RuntimeState, cond: string) {
  const ops = ['>=', '<=', '==', '!=', '>', '<'] as const;
  const op = ops.find((o) => cond.includes(o));
  if (!op) return false;

  const [leftRaw, rightRaw] = cond.split(op);
  if (!leftRaw || rightRaw == null) return false;

  const leftPath = leftRaw.trim();
  const rightVal = parseValue(rightRaw);
  // fsEntries is not available here; evalSuccess wraps evalCondition with it
  const leftVal = getPath(state, normalizeConditionPath(leftPath));

  switch (op) {
    case '==':
      return leftVal === rightVal;
    case '!=':
      return leftVal !== rightVal;
    case '>':
      return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal > rightVal;
    case '<':
      return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal < rightVal;
    case '>=':
      return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal >= rightVal;
    case '<=':
      return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal <= rightVal;
    default:
      return false;
  }
}

function evalSuccess(state: RuntimeState, expr: string, fsEntries: string[]) {
  const orParts = expr.split('||').map((s) => s.trim()).filter(Boolean);
  if (orParts.length === 0) return false;

  return orParts.some((part) => {
    const andParts = part.split('&&').map((s) => s.trim()).filter(Boolean);
    if (andParts.length === 0) return false;
    return andParts.every((c) => {
      const ops = ['>=', '<=', '==', '!=', '>', '<'] as const;
      const op = ops.find((o) => c.includes(o));
      if (!op) return false;
      const [leftRaw, rightRaw] = c.split(op);
      if (!leftRaw || rightRaw == null) return false;
      const rightVal = parseValue(rightRaw);
      const leftVal = evalLeft(state, leftRaw, fsEntries);

      switch (op) {
        case '==':
          return leftVal === rightVal;
        case '!=':
          return leftVal !== rightVal;
        case '>':
          return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal > rightVal;
        case '<':
          return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal < rightVal;
        case '>=':
          return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal >= rightVal;
        case '<=':
          return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal <= rightVal;
        default:
          return false;
      }
    });
  });
}

function initRuntime(mission: BrightOSMission): RuntimeState {
  const tmpCount = mission.initial_state.file_system.filter((p) => p.toLowerCase().endsWith('.tmp')).length;
  const recycleHas = mission.initial_state.file_system.some((p) => p.startsWith('RecycleBin:/'));

  const storageLow = mission.id === 'tech-3' || tmpCount > 0 || recycleHas;

  const defaultApps: RuntimeState['apps'] = {
    photos: { name: 'Photos', installed: true, malware: false, reinstall: false, process: 'photos.exe', registryKeys: ['HKLM\\Software\\BrightOS\\Photos\\InstallPath'] },
    stickynotes: { name: 'Sticky Notes', installed: true, malware: false, reinstall: false, process: 'stickynotes.exe', registryKeys: ['HKCU\\Software\\BrightOS\\StickyNotes\\Enabled'] },
    notepad: { name: 'Notepad', installed: true, malware: false, reinstall: false, process: 'notepad.exe' },
    brightos365: { name: 'BrightOS 365', installed: true, malware: false, reinstall: false, process: 'brightos365.exe', registryKeys: ['HKLM\\Software\\BrightOS\\365\\Version'] },
    edulearner: { name: 'EduLearner', installed: true, malware: false, reinstall: false, process: 'edulearner.exe' },
    calculator: { name: 'Calculator', installed: true, malware: false, reinstall: false, process: 'calc.exe' },
    paint: { name: 'Paint', installed: true, malware: false, reinstall: false, process: 'mspaint.exe' },
    mediaplayer: { name: 'Media Player', installed: true, malware: false, reinstall: false, process: 'wmplayer.exe' },
    mail: { name: 'Mail', installed: true, malware: false, reinstall: false, process: 'mail.exe' },
    calendar: { name: 'Calendar', installed: true, malware: false, reinstall: false, process: 'calendar.exe' },
    camera: { name: 'Camera', installed: true, malware: false, reinstall: false, process: 'camera.exe' },
    weather: { name: 'Weather', installed: true, malware: false, reinstall: false, process: 'weather.exe' },
    maps: { name: 'Maps', installed: true, malware: false, reinstall: false, process: 'maps.exe' },
    voice: { name: 'Voice Recorder', installed: true, malware: false, reinstall: false, process: 'voice.exe' },
    scanner: { name: 'Scanner', installed: true, malware: false, reinstall: false, process: 'scanner.exe' },
    backup: { name: 'Backup Tool', installed: true, malware: false, reinstall: false, process: 'backup.exe' },
    security: { name: 'Security Center', installed: true, malware: false, reinstall: false, process: 'security.exe' },
    cleaner: { name: 'Disk Cleaner', installed: true, malware: false, reinstall: false, process: 'cleaner.exe' },
    updater: { name: 'Updater Service', installed: true, malware: false, reinstall: true, process: 'updater.exe', registryKeys: ['HKLM\\Software\\BrightOS\\Updater\\AutoStart'] },
    telemetry: { name: 'Telemetry', installed: true, malware: false, reinstall: true, process: 'telemetry.exe', registryKeys: ['HKLM\\Software\\BrightOS\\Telemetry\\Enabled'] },
    bloat1: { name: 'Coupon Companion', installed: true, malware: false, reinstall: true, process: 'coupon.exe', registryKeys: ['HKCU\\Software\\BrightOS\\CouponCompanion\\Enabled'] },
    bloat2: { name: 'Game Bar Overlay', installed: true, malware: false, reinstall: true, process: 'gamebar.exe', registryKeys: ['HKCU\\Software\\BrightOS\\GameBar\\Enabled'] },
    bloat3: { name: 'Smart Search', installed: true, malware: false, reinstall: true, process: 'smartsearch.exe', registryKeys: ['HKLM\\Software\\BrightOS\\SmartSearch\\Default'] },
    bloat4: { name: 'Quick Launch', installed: true, malware: false, reinstall: true, process: 'quicklaunch.exe', registryKeys: ['HKCU\\Software\\BrightOS\\QuickLaunch\\Pin'] },
    bloat5: { name: 'File Converter', installed: true, malware: false, reinstall: true, process: 'fileconv.exe', registryKeys: ['HKLM\\Software\\BrightOS\\FileConv\\Assoc'] },
    bloat6: { name: 'PDF Viewer', installed: true, malware: false, reinstall: true, process: 'pdfviewer.exe', registryKeys: ['HKLM\\Software\\BrightOS\\PDFViewer\\Default'] },
    bloat7: { name: 'Video Editor', installed: true, malware: false, reinstall: true, process: 'videoedit.exe', registryKeys: ['HKCU\\Software\\BrightOS\\VideoEditor\\LastProject'] },
    bloat8: { name: 'Music Stream', installed: true, malware: false, reinstall: true, process: 'musicstream.exe', registryKeys: ['HKLM\\Software\\BrightOS\\MusicStream\\Service'] },
    bloat9: { name: 'Cloud Sync', installed: true, malware: false, reinstall: true, process: 'cloudsync.exe', registryKeys: ['HKCU\\Software\\BrightOS\\CloudSync\\Folder'] },
    bloat10: { name: 'Remote Desktop', installed: true, malware: false, reinstall: true, process: 'rdp.exe', registryKeys: ['HKLM\\Software\\BrightOS\\RDP\\Enabled'] },
    bloat11: { name: 'Network Monitor', installed: true, malware: false, reinstall: true, process: 'netmon.exe', registryKeys: ['HKLM\\Software\\BrightOS\\NetMon\\Service'] },
    bloat12: { name: 'System Info', installed: true, malware: false, reinstall: true, process: 'sysinfo.exe', registryKeys: ['HKCU\\Software\\BrightOS\\SysInfo\\LastScan'] },
    bloat13: { name: 'Disk Defrag', installed: true, malware: false, reinstall: true, process: 'defrag.exe', registryKeys: ['HKLM\\Software\\BrightOS\\Defrag\\Schedule'] },
    bloat14: { name: 'Driver Updater', installed: true, malware: false, reinstall: true, process: 'driverup.exe', registryKeys: ['HKLM\\Software\\BrightOS\\DriverUpdater\\Auto'] },
    bloat15: { name: 'Browser Helper', installed: true, malware: false, reinstall: true, process: 'browserhelper.exe', registryKeys: ['HKLM\\Software\\BrightOS\\BrowserHelper\\Ext'] },
    bloat16: { name: 'Ad Blocker', installed: true, malware: false, reinstall: true, process: 'adblock.exe', registryKeys: ['HKCU\\Software\\BrightOS\\AdBlock\\Lists'] },
    bloat17: { name: 'Game Booster', installed: true, malware: false, reinstall: true, process: 'gameboost.exe', registryKeys: ['HKCU\\Software\\BrightOS\\GameBoost\\Profile'] },
    bloat18: { name: 'File Shredder', installed: true, malware: false, reinstall: true, process: 'shred.exe', registryKeys: ['HKLM\\Software\\BrightOS\\Shred\\Secure'] },
    bloat19: { name: 'VPN Client', installed: true, malware: false, reinstall: true, process: 'vpn.exe', registryKeys: ['HKLM\\Software\\BrightOS\\VPN\\Server'] },
    bloat20: { name: 'Password Manager', installed: true, malware: false, reinstall: true, process: 'pwdmgr.exe', registryKeys: ['HKCU\\Software\\BrightOS\\PwdMgr\\Vault'] },
    bloat21: { name: 'Screen Recorder', installed: true, malware: false, reinstall: true, process: 'screenrec.exe', registryKeys: ['HKCU\\Software\\BrightOS\\ScreenRec\\OutPath'] },
    bloat22: { name: 'Partition Manager', installed: true, malware: false, reinstall: true, process: 'partmgr.exe', registryKeys: ['HKLM\\Software\\BrightOS\\PartMgr\\Layout'] },
    bloat23: { name: 'Recovery Tool', installed: true, malware: false, reinstall: true, process: 'recovery.exe', registryKeys: ['HKLM\\Software\\BrightOS\\Recovery\\Point'] },
    bloat24: { name: 'Tweak Tool', installed: true, malware: false, reinstall: true, process: 'tweak.exe', registryKeys: ['HKCU\\Software\\BrightOS\\Tweak\\Profile'] },
    bloat25: { name: 'Font Manager', installed: true, malware: false, reinstall: true, process: 'fontmgr.exe', registryKeys: ['HKLM\\Software\\BrightOS\\FontMgr\\Cache'] },
    bloat26: { name: 'Icon Pack', installed: true, malware: false, reinstall: true, process: 'iconpack.exe', registryKeys: ['HKCU\\Software\\BrightOS\\IconPack\\Theme'] },
    bloat27: { name: 'Theme Engine', installed: true, malware: false, reinstall: true, process: 'theme.exe', registryKeys: ['HKLM\\Software\\BrightOS\\Theme\\Current'] },
    bloat28: { name: 'Startup Manager', installed: true, malware: false, reinstall: true, process: 'startupmgr.exe', registryKeys: ['HKLM\\Software\\BrightOS\\StartupMgr\\List'] },
    bloat29: { name: 'Service Manager', installed: true, malware: false, reinstall: true, process: 'svc.exe', registryKeys: ['HKLM\\Software\\BrightOS\\SvcMgr\\Services'] },
    bloat30: { name: 'Event Viewer', installed: true, malware: false, reinstall: true, process: 'eventvwr.exe', registryKeys: ['HKLM\\Software\\BrightOS\\EventViewer\\Log'] },
    malware1: { name: 'CryptoMiner', installed: true, malware: true, reinstall: true, process: 'cryptominer.exe', registryKeys: ['HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\CryptoMiner', 'HKCU\\Software\\CryptoMiner\\Wallet'] },
    malware2: { name: 'KeyLogger', installed: true, malware: true, reinstall: true, process: 'keylogger.exe', registryKeys: ['HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\KeyLogger', 'HKCU\\Software\\KeyLogger\\LogPath'] },
    malware3: { name: 'RansomWare', installed: true, malware: true, reinstall: true, process: 'ransom.exe', registryKeys: ['HKLM\\Software\\Ransom\\Key', 'HKCU\\Software\\Ransom\\Target'] },
    malware4: { name: 'Backdoor', installed: true, malware: true, reinstall: true, process: 'backdoor.exe', registryKeys: ['HKLM\\Software\\Backdoor\\C2', 'HKCU\\Software\\Backdoor\\Port'] },
    malware5: { name: 'TrojanDownloader', installed: true, malware: true, reinstall: true, process: 'trojandl.exe', registryKeys: ['HKLM\\Software\\TrojanDL\\URL', 'HKCU\\Software\\TrojanDL\\Path'] },
    malware6: { name: 'Spyware', installed: true, malware: true, reinstall: true, process: 'spyware.exe', registryKeys: ['HKLM\\Software\\Spyware\\Report', 'HKCU\\Software\\Spyware\\Exfil'] },
    malware7: { name: 'AdwareInjector', installed: true, malware: true, reinstall: true, process: 'adinject.exe', registryKeys: ['HKLM\\Software\\Adware\\Config', 'HKCU\\Software\\Adware\\Ads'] },
    malware8: { name: 'Rootkit', installed: true, malware: true, reinstall: true, process: 'rootkit.sys', registryKeys: ['HKLM\\System\\CurrentControlSet\\Services\\Rootkit', 'HKCU\\Software\\Rootkit\\Hide'] },
  };

  const defaultRegistry: RuntimeState['registry'] = {
    'HKLM\\Software\\BrightOS\\Version': '10.0',
    'HKLM\\Software\\BrightOS\\InstallPath': 'C:\\BrightOS',
    'HKLM\\Software\\BrightOS\\Language': 'en-US',
    'HKLM\\Software\\BrightOS\\TimeZone': 'UTC-04:00',
    'HKLM\\Software\\BrightOS\\AutoUpdate': '1',
    'HKLM\\Software\\BrightOS\\Telemetry\\Enabled': '1',
    'HKLM\\Software\\BrightOS\\Telemetry\\Level': 'Full',
    'HKLM\\Software\\BrightOS\\Security\\Firewall': '1',
    'HKLM\\Software\\BrightOS\\Security\\Defender': '1',
    'HKLM\\Software\\BrightOS\\Security\\RealTime': '1',
    'HKLM\\Software\\BrightOS\\Performance\\PowerPlan': 'Balanced',
    'HKLM\\Software\\BrightOS\\Performance\\Index': '7.8',
    'HKLM\\Software\\BrightOS\\Network\\Proxy': '',
    'HKLM\\Software\\BrightOS\\Network\\DNS': '8.8.8.8,8.8.4.4',
    'HKLM\\Software\\BrightOS\\UI\\Theme': 'Dark',
    'HKLM\\Software\\BrightOS\\UI\\Accent': '#0099FF',
    'HKLM\\Software\\BrightOS\\UI\\Transparency': '1',
    'HKLM\\Software\\BrightOS\\Explorer\\ShowHidden': '0',
    'HKLM\\Software\\BrightOS\\Explorer\\FileExt': '1',
    'HKLM\\Software\\BrightOS\\Explorer\\Compact': '0',
    'HKLM\\Software\\BrightOS\\System\\Restore': '1',
    'HKLM\\Software\\BrightOS\\System\\Defrag': 'Weekly',
    'HKLM\\Software\\BrightOS\\System\\Backup': 'Daily',
    'HKLM\\Software\\BrightOS\\Drivers\\Signed': '1',
    'HKLM\\Software\\BrightOS\\Drivers\\AutoUpdate': '1',
    'HKLM\\Software\\BrightOS\\Services\\Indexing': '1',
    'HKLM\\Software\\BrightOS\\Services\\Search': '1',
    'HKLM\\Software\\BrightOS\\Services\\Update': '1',
    'HKLM\\Software\\BrightOS\\Services\\Sync': '1',
    'HKLM\\Software\\BrightOS\\Apps\\Store': '1',
    'HKLM\\Software\\BrightOS\\Apps\\StoreURL': 'https://store.brightos.com',
    'HKLM\\Software\\BrightOS\\Apps\\DevMode': '0',
    'HKLM\\Software\\BrightOS\\Hardware\\CPU': 'Intel Core i7-12700K',
    'HKLM\\Software\\BrightOS\\Hardware\\GPU': 'NVIDIA RTX 4070',
    'HKLM\\Software\\BrightOS\\Hardware\\RAM': '16GB',
    'HKLM\\Software\\BrightOS\\Hardware\\Disk': '512GB SSD',
    'HKLM\\Software\\BrightOS\\Hardware\\Motherboard': 'BrightOS Z790',
    'HKLM\\Software\\BrightOS\\Licensing\\Key': 'XXXX-XXXX-XXXX-XXXX',
    'HKLM\\Software\\BrightOS\\Licensing\\Activated': '1',
    'HKLM\\Software\\BrightOS\\Licensing\\OEM': 'BrightOS Systems',
    'HKLM\\Software\\BrightOS\\Debug\\LogLevel': 'Info',
    'HKLM\\Software\\BrightOS\\Debug\\Dump': '0',
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\SecurityHealth': 'C:\\BrightOS\\System32\\securityhealth.exe',
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater': 'C:\\BrightOS\\System32\\updater.exe',
    'HKCU\\Software\\BrightOS\\User\\Name': 'Student',
    'HKCU\\Software\\BrightOS\\User\\Email': 'student@brighted.edu',
    'HKCU\\Software\\BrightOS\\User\\Theme': 'Dark',
    'HKCU\\Software\\BrightOS\\User\\Language': 'en-US',
    'HKCU\\Software\\BrightOS\\User\\Desktop\\Wallpaper': 'C:\\BrightOS\\Web\\Wallpaper\\default.jpg',
    'HKCU\\Software\\BrightOS\\User\\Desktop\\Icons': '1',
    'HKCU\\Software\\BrightOS\\User\\Desktop\\Gadgets': '0',
    'HKCU\\Software\\BrightOS\\User\\Privacy\\Telemetry': '1',
    'HKCU\\Software\\BrightOS\\User\\Privacy\\Location': '0',
    'HKCU\\Software\\BrightOS\\User\\Privacy\\Ads': '0',
    'HKCU\\Software\\BrightOS\\User\\Accessibility\\Narrator': '0',
    'HKCU\\Software\\BrightOS\\User\\Accessibility\\Magnifier': '0',
    'HKCU\\Software\\BrightOS\\User\\Accessibility\\HighContrast': '0',
    'HKCU\\Software\\BrightOS\\User\\Network\\WiFi': '1',
    'HKCU\\Software\\BrightOS\\User\\Network\\Ethernet': '1',
    'HKCU\\Software\\BrightOS\\User\\Network\\VPN': '0',
    'HKCU\\Software\\BrightOS\\User\\Power\\Battery': 'Balanced',
    'HKCU\\Software\\BrightOS\\User\\Power\\Sleep': '30',
    'HKCU\\Software\\BrightOS\\User\\Power\\Hibernate': '0',
    'HKCU\\Software\\BrightOS\\User\\Sound\\Volume': '75',
    'HKCU\\Software\\BrightOS\\User\\Sound\\Mute': '0',
    'HKCU\\Software\\BrightOS\\User\\Sound\\Notifications': '1',
    'HKCU\\Software\\BrightOS\\User\\Display\\Brightness': '80',
    'HKCU\\Software\\BrightOS\\User\\Display\\NightLight': '0',
    'HKCU\\Software\\BrightOS\\User\\Display\\Resolution': '1920x1080',
    'HKCU\\Software\\BrightOS\\User\\Input\\Keyboard': 'US',
    'HKCU\\Software\\BrightOS\\User\\Input\\MouseSpeed': '10',
    'HKCU\\Software\\BrightOS\\User\\Input\\Touchpad': '1',
  };

  const hasDriveE = mission.initial_state.file_system.some((p) => normPath(p).toUpperCase().startsWith('E:/'));
  const hasDriveD = mission.initial_state.file_system.some((p) => normPath(p).toUpperCase().startsWith('D:/'));

  const networkInitialIp = mission.initial_state.network_status === 'Disconnected' ? '169.254.22.10' : '192.168.1.101';
  const wantsPrinterQueue = mission.success_condition.includes('printer.queue.count');
  const wantsThreats = mission.success_condition.includes('defend.threats');
  const wantsBrowserFix = mission.success_condition.includes('browser.redirects') || mission.success_condition.includes('browser.extensions');
  const wantsRansomware = mission.success_condition.includes('ransomware.');
  const wantsFirewall = mission.success_condition.includes('firewall.');
  const wantsEncryption = mission.success_condition.includes('folder.encrypted');

  const baseVolumes = ['C:'];
  if (hasDriveD) baseVolumes.push('D:');
  if (hasDriveE) baseVolumes.push('E:');

  return {
    power: 'intro',
    boot_phase: 0,
    cpu_load: mission.initial_state.cpu_load,
    network: {
      status: mission.initial_state.network_status,
      ip_renewed: false,
      ip: networkInitialIp,
      dns: { primary: '1.1.1.1' },
      suspicious_connection: { active: mission.id === 'tech-41' },
    },
    window: { stuck_app: { open: mission.id === 'tech-1' } },
    process: { high_cpu: { running: mission.id === 'tech-2' } },
    disk: { free_space_mb: storageLow ? 120 : 850, volumes: baseVolumes },
    files: { tmp: { count: tmpCount }, restored: false, renamed_prefix: '', renamed_count: 0, total: Math.max(0, mission.initial_state.file_system.length) },
    recycle_bin: { empty: !recycleHas },
    file: { opened: null },
    terminal: { history: mission.initial_state.terminal_history, last_command: null, last_output: '' },
    notifications: [],
    apps: defaultApps,
    registry: defaultRegistry,

    audio: { output: mission.id !== 'tech-5' },
    device: { audio: { driver_status: mission.id === 'tech-5' ? 'outdated' : 'updated' } },
    display: { resolution: mission.id === 'tech-6' ? '800x600' : '1920x1080' },
    power_settings: { screen_off_minutes_on_battery: mission.id === 'tech-9' ? 10 : 5 },
    keyboard: { filter_keys: { enabled: mission.id === 'tech-12' } },
    specs: { checked: false },

    printer: { queue: { count: wantsPrinterQueue ? 6 : 0 }, ip: '192.168.0.50', reachable: false },
    router: {
      admin_password_changed: false,
      wifi: { security: mission.id === 'tech-26' ? 'WEP' : 'WPA2' },
      port_forwarding: [],
      blocked_macs: [],
    },
    unknown_device: { mac: 'A4:5E:60:1C:9B:21' },
    browser: { redirects: wantsBrowserFix, extensions: { malicious: wantsBrowserFix ? 1 : 0 } },
    mail: { flagged_phishing: false },
    defend: { threats: { active: wantsThreats ? 2 : 0, quarantined: 0 } },
    account: { user: { password_reset: false } },
    system: { restore: { completed: false }, crash_rate: 2 },
    hardware: { ram_gb: mission.id === 'tech-20' ? 4 : 8 },
    firewall: { inbound: { blocked_ports: wantsFirewall ? [] : [] } },
    folder: { encrypted_paths: wantsEncryption ? [] : [] },
    forensics: { bruteforce_timestamp: '' },
    web: { validation: { blocks_sql_injection: false } },
    ransomware: { lock_screen: wantsRansomware },
    incident: { pid_identified: false, resolved: false },
    ping: { packet_loss_percent: 0 },
    trace: { loss_hop_index: 0 },
    ftp: { uploaded: [] },
    automation: { flow: { valid: false }, outputs: {} },
    validation: { rejects_common_password: false, min_length: 0 },
    script: { output: null, terminates: false },
    vars: { A: 5, B: 10 },
    list: { sorted: false },
  } satisfies RuntimeState;
}

function initialWindows(mission: BrightOSMission): Record<WindowId, WindowState> {
  const wins: Record<WindowId, WindowState> = {
    taskmgr: { id: 'taskmgr', title: 'Task Manager', open: false, minimized: false, z: 4, x: 90, y: 120, w: 560, h: 420 },
    terminal: { id: 'terminal', title: 'Terminal', open: false, minimized: false, z: 3, x: 150, y: 140, w: 700, h: 420 },
    settings: { id: 'settings', title: 'Settings', open: false, minimized: false, z: 2, x: 120, y: 120, w: 620, h: 460 },
    browser: { id: 'browser', title: 'Browser', open: false, minimized: false, z: 1, x: 180, y: 120, w: 760, h: 480 },
    automation: { id: 'automation', title: 'Automation App', open: false, minimized: false, z: 1, x: 220, y: 130, w: 720, h: 440 },
    devmgr: { id: 'devmgr', title: 'Device Manager', open: false, minimized: false, z: 1, x: 210, y: 140, w: 720, h: 480 },
    mail: { id: 'mail', title: 'Mail', open: false, minimized: false, z: 1, x: 260, y: 140, w: 820, h: 520 },
    chat: { id: 'chat', title: 'Teams', open: false, minimized: false, z: 1, x: 300, y: 160, w: 760, h: 520 },
    explorer: { id: 'explorer', title: 'File Explorer', open: false, minimized: false, z: 1, x: 160, y: 120, w: 820, h: 520 },
    uninstall: { id: 'uninstall', title: 'Uninstall or change a program', open: false, minimized: false, z: 1, x: 200, y: 140, w: 740, h: 500 },
    registry: { id: 'registry', title: 'Registry Editor', open: false, minimized: false, z: 1, x: 240, y: 160, w: 680, h: 540 },
    stuck_app: { id: 'stuck_app', title: 'Stuck Window', open: mission.id === 'tech-1', minimized: false, z: 5, x: 210, y: 180, w: 460, h: 220 },
  };

  const allowed = new Set(mission.tools_allowed);
  // Default behavior: only Terminal starts open. Other tools are available via desktop icons / Start Menu.
  if (allowed.has('Terminal')) wins.terminal.open = true;

  return wins;
}

function toolToWindowId(tool: AppId): WindowId {
  if (tool === 'Task Manager') return 'taskmgr';
  if (tool === 'Terminal') return 'terminal';
  if (tool === 'Settings') return 'settings';
  if (tool === 'Browser') return 'browser';
  return 'automation';
}

function toolLabel(tool: AppId) {
  if (tool === 'Task Manager') return 'TaskMgr';
  if (tool === 'Automation App') return 'Automation';
  return tool;
}

function formatTime(now: Date) {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function StartMenu({
  open,
  query,
  setQuery,
  apps,
  onLaunch,
  onClose,
  onLock,
  onToggleTheme,
  theme,
}: {
  open: boolean;
  query: string;
  setQuery: (v: string) => void;
  apps: Array<{ id: WindowId; title: string; subtitle: string; disabled: boolean }>;
  onLaunch: (id: WindowId) => void;
  onClose: () => void;
  onLock: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
}) {
  if (!open) return null;
  const isLight = theme === 'light';
  const q = query.trim().toLowerCase();
  const filtered = q ? apps.filter((a) => `${a.title} ${a.subtitle}`.toLowerCase().includes(q)) : apps;

  return (
    <div className="absolute inset-0 z-[260]" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute left-2 bottom-12" onMouseDown={(e) => e.stopPropagation()}>
        <div className={`w-[420px] max-w-[92vw] border shadow-2xl overflow-hidden ${isLight ? 'border-black/30 bg-zinc-50' : 'border-white/20 bg-zinc-900'}`}>
          <div className={`px-3 py-3 border-b ${isLight ? 'border-black/20' : 'border-white/10'}`}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search programs and files"
              className={`w-full h-10 border px-3 text-sm outline-none ${isLight ? 'border-black/20 bg-white text-zinc-900' : 'border-white/20 bg-black/20 text-white'
                }`}
              autoFocus
            />
          </div>

          <div className="p-3 grid grid-cols-1 gap-2">
            {filtered.slice(0, 14).map((a) => (
              <button
                key={a.id}
                disabled={a.disabled}
                onClick={() => {
                  if (a.disabled) return;
                  onLaunch(a.id);
                }}
                className={`w-full border px-3 py-2 text-left transition-colors ${a.disabled
                  ? isLight
                    ? 'border-black/15 bg-black/[0.03] text-zinc-500 cursor-not-allowed'
                    : 'border-white/10 bg-white/[0.02] text-zinc-500 cursor-not-allowed'
                  : isLight
                    ? 'border-black/20 bg-white hover:bg-zinc-100 text-zinc-900'
                    : 'border-white/20 bg-black/20 hover:bg-black/30 text-white'
                  }`}
              >
                <div className="text-sm font-semibold">{a.title}</div>
                <div className={`mt-0.5 text-xs ${isLight ? 'text-zinc-600' : 'text-zinc-300/80'}`}>{a.subtitle}</div>
              </button>
            ))}
          </div>

          <div className={`px-3 py-3 border-t flex items-center justify-between gap-3 ${isLight ? 'border-black/20' : 'border-white/10'}`}>
            <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>BrightOS</div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleTheme}
                className={`h-9 px-3 border text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${isLight ? 'border-black/20 bg-white hover:bg-zinc-100 text-zinc-900' : 'border-white/20 bg-black/20 hover:bg-black/30 text-zinc-200'
                  }`}
              >
                Theme
              </button>
              <button
                onClick={onLock}
                className={`h-9 px-3 border text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${isLight ? 'border-black/20 bg-white hover:bg-zinc-100 text-zinc-900' : 'border-white/20 bg-black/20 hover:bg-black/30 text-zinc-200'
                  }`}
              >
                Lock
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Taskbar({
  now,
  tools,
  wins,
  onToggle,
  fan,
  cpu,
  securityPulse,
  lockedByStuck,
  theme,
  onStart,
  startOpen,
  batteryLabel,
  networkLabel,
}: {
  now: Date;
  tools: AppId[];
  wins: Record<WindowId, WindowState>;
  onToggle: (id: WindowId) => void;
  fan: number;
  cpu: number;
  securityPulse: boolean;
  lockedByStuck: boolean;
  theme: 'dark' | 'light';
  onStart: () => void;
  startOpen: boolean;
  batteryLabel: string;
  networkLabel: string;
}) {
  const isLight = theme === 'light';
  const pinned = (
    [
      { id: 'explorer' as const, label: 'Explorer' },
      { id: 'uninstall' as const, label: 'Apps' },
      { id: 'registry' as const, label: 'Reg' },
      ...tools.map((t) => ({ id: toolToWindowId(t) as WindowId, label: toolLabel(t) })),
    ] satisfies Array<{ id: WindowId; label: string }>
  ).filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i);

  return (
    <div className="h-12 border-t border-black/40 bg-zinc-900">
      <div className="h-full px-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onStart}
            className={`h-9 px-3 border text-[11px] font-semibold tracking-wide transition-colors ${startOpen
              ? 'border-[var(--brand-primary)]/50 bg-[var(--brand-primary)]/20 text-white'
              : 'border-white/20 bg-black/10 hover:bg-black/20 text-zinc-100'
              }`}
            aria-label="Start"
          >
            Start
          </button>
        </div>

        <div className="flex items-center gap-1 flex-1">
          {pinned.map((a) => {
            const w = wins[a.id];
            const active = w?.open && !w?.minimized;
            return (
              <button
                key={a.id}
                onClick={() => onToggle(a.id)}
                className={`h-9 px-3 border text-[11px] font-semibold transition-colors ${active
                  ? 'border-[var(--brand-primary)]/50 bg-[var(--brand-primary)]/20 text-white'
                  : 'border-white/20 bg-black/10 hover:bg-black/20 text-zinc-100'
                  }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${securityPulse ? 'bg-red-400' : 'bg-emerald-400'}`} />
          <div className="text-[11px] text-zinc-100">{networkLabel}</div>
          <div className="text-[11px] text-zinc-100">{batteryLabel}</div>
          <div className="text-[11px] text-zinc-100">CPU {Math.round(cpu)}%</div>
          <div className="text-[11px] text-zinc-300">FAN {fan}</div>
          <div className="text-[11px] text-zinc-100">{formatTime(now)}</div>
        </div>
      </div>
    </div>
  );
}

function Window({
  win,
  active,
  onDownMove,
  onDownResize,
  onFocus,
  onClose,
  theme,
  children,
}: {
  win: WindowState;
  active: boolean;
  onDownMove: (e: React.MouseEvent) => void;
  onDownResize: (e: React.MouseEvent) => void;
  onFocus: () => void;
  onClose: () => void;
  theme: 'dark' | 'light';
  children: ReactNode;
}) {
  const isLight = theme === 'light';
  if (!win.open || win.minimized) return null;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onMouseDown={onFocus}
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: active ? 100 : 50,
      }}
      className={`absolute flex flex-col overflow-hidden rounded-[1.25rem] shadow-[0_24px_64px_rgba(0,0,0,0.4)] border transition-shadow duration-300 ${isLight
        ? 'bg-white/80 backdrop-blur-3xl border-white/40 ring-1 ring-black/5'
        : 'bg-zinc-900/80 backdrop-blur-3xl border-white/10 ring-1 ring-white/5'
        } ${active ? 'shadow-[0_32px_80px_rgba(0,0,0,0.6)]' : ''}`}
    >
      {/* Title Bar */}
      <div
        onMouseDown={onDownMove}
        className={`h-11 flex items-center justify-between px-5 select-none ${isLight ? 'bg-white/40' : 'bg-black/20'}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{win.id === 'terminal' ? '🐚' : win.id === 'taskmgr' ? '📊' : win.id === 'settings' ? '⚙️' : '📁'}</span>
          <div className={`text-[11px] font-black uppercase tracking-[0.15em] ${isLight ? 'text-zinc-900/60' : 'text-white/40'}`}>{win.title}</div>
        </div>
        <div className="flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-10 h-7 flex items-center justify-center rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onDownResize(e);
        }}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50"
      >
        <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-white/10 rounded-br-sm" />
      </div>
    </motion.div>
  );
}

function Terminal({
  mission,
  state,
  fsEntries,
  onFsEntries,
  lines,
  input,
  setInput,
  push,
  onState,
}: {
  mission: BrightOSMission;
  state: RuntimeState;
  fsEntries: string[];
  onFsEntries: (fn: (prev: string[]) => string[]) => void;
  lines: TerminalLine[];
  input: string;
  setInput: (v: string) => void;
  push: (l: TerminalLine[]) => void;
  onState: (fn: (p: RuntimeState) => RuntimeState) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [sessionId, setSessionId] = useState<number>(100);

  useEffect(() => {
    setSessionId(Math.floor(Math.random() * 1000));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines.length]);

  function run(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;
    push([{ id: uid('in'), kind: 'in', text: cmd }]);

    const setTermMeta = (out: string, mut?: (p: RuntimeState) => RuntimeState) => {
      onState((p) => {
        const next = mut ? mut(p) : p;
        return {
          ...next,
          terminal: {
            ...next.terminal,
            history: [...next.terminal.history, cmd],
            last_command: cmd,
            last_output: out,
          },
        };
      });
    };

    const low = cmd.toLowerCase();

    if (low === 'help') {
      const out = 'Commands: dir, ipconfig /renew, ping google.com, tracert google.com, netstat -ano, tasklist, type <file>, del <file>, force-delete <file>, ftp upload <file>, apps, reg get/set/delete';
      push([{ id: uid('o'), kind: 'out', text: out }]);
      setTermMeta(out);
      return;
    }

    if (low === 'clear') {
      push([{ id: uid('sys'), kind: 'sys', text: 'Terminal cleared.' }]);
      return;
    }

    if (low === 'dir') {
      const items = fsEntries;
      const header = ` Directory of C:/`;
      const rows = items.slice(0, 60).map((p) => ` ${p}`);
      const out = [header, ...rows].join('\n');
      push([
        { id: uid('o'), kind: 'out', text: header },
        ...rows.map((t) => ({ id: uid('o'), kind: 'out' as const, text: t })),
      ]);
      setTermMeta(out);
      return;
    }

    if (low === 'ipconfig /renew') {
      const out = ['Windows IP Configuration', 'Renewing adapter… OK', 'IPv4 Address. . . . . . . . . . . : 192.168.0.101'].join('\n');
      push([
        { id: uid('o'), kind: 'out', text: 'Windows IP Configuration' },
        { id: uid('o'), kind: 'out', text: 'Renewing adapter… OK' },
      ]);
      setTermMeta(out, (p) => ({ ...p, network: { ...p.network, status: 'Connected', ip_renewed: true, ip: '192.168.0.101' } }));
      return;
    }

    if (low === 'netstat -ano') {
      const suspicious = state.network.suspicious_connection.active;
      const header = 'Proto  Local Address          Foreign Address        State           PID';
      const row1 = suspicious
        ? 'TCP    192.168.1.101:51322    203.0.113.66:4444       ESTABLISHED     1104   *FLAGGED*'
        : 'TCP    192.168.1.101:51322    13.107.6.171:443       ESTABLISHED     1104';
      const out = [header, row1].join('\n');
      push([
        { id: uid('o'), kind: 'out', text: header },
        { id: uid('o'), kind: 'out', text: row1 },
      ]);
      setTermMeta(out);
      return;
    }

    if (low === 'tracert google.com') {
      const header = 'Tracing route to google.com over a maximum of 30 hops:';
      const hop = state.network.status === 'Slow' ? 3 : 1;
      const out = [header, `Hop ${hop}: * * * Request timed out.`].join('\n');
      push([{ id: uid('o'), kind: 'out', text: header }, { id: uid('o'), kind: 'out', text: `Hop ${hop}: * * * Request timed out.` }]);
      setTermMeta(out, (p) => ({ ...p, trace: { ...p.trace, loss_hop_index: hop } }));
      return;
    }

    if (low === 'ping google.com') {
      const loss = state.network.status === 'Disconnected' ? 100 : state.network.status === 'Slow' ? 50 : 0;
      const out = loss === 100 ? 'Request timed out. (4/4 lost)' : loss === 50 ? 'Packets: Sent=4 Received=2 Lost=2 (50% loss)' : 'Packets: Sent=4 Received=4 Lost=0 (0% loss)';
      push([{ id: uid('o'), kind: 'out', text: out }]);
      setTermMeta(out, (p) => ({ ...p, ping: { ...p.ping, packet_loss_percent: loss } }));
      return;
    }

    if (low === 'tasklist') {
      const header = 'Image Name                     PID   Session Name        Mem Usage';
      const row = state.network.suspicious_connection.active
        ? 'stealth_conn.exe               1104  Console             12,512 K   *FLAGGED*'
        : 'explorer.exe                   1400  Console             42,120 K';
      const out = [header, row].join('\n');
      push([{ id: uid('o'), kind: 'out', text: header }, { id: uid('o'), kind: 'out', text: row }]);
      setTermMeta(out, (p) => ({ ...p, incident: { ...p.incident, pid_identified: true } }));
      return;
    }

    if (low.startsWith('type ')) {
      const target = cmd.slice(5).trim();
      if (target.toLowerCase().endsWith('access.log')) {
        const ts = '2026-01-27T03:12:44Z';
        const out = `... FAILED LOGIN ... ${ts} ...`;
        push([{ id: uid('o'), kind: 'out', text: out }]);
        setTermMeta(out, (p) => ({ ...p, forensics: { ...p.forensics, bruteforce_timestamp: ts } }));
        return;
      }
      const out = `Cannot open ${target}`;
      push([{ id: uid('o'), kind: 'out', text: out }]);
      setTermMeta(out);
      return;
    }

    if (low.startsWith('ftp upload')) {
      const target = cmd.slice('ftp upload'.length).trim().replace(/^"|"$/g, '');
      const base = normPath(target).split('/').pop() || target;
      const out = `Uploading ${base}... OK`;
      push([{ id: uid('o'), kind: 'out', text: out }]);
      setTermMeta(out, (p) => ({ ...p, ftp: { ...p.ftp, uploaded: Array.from(new Set([...(p.ftp.uploaded || []), base])) } }));
      return;
    }

    if (low.startsWith('del ') || low.startsWith('delete ') || low.startsWith('force-delete ')) {
      const target = cmd
        .replace(/^del\s+/i, '')
        .replace(/^delete\s+/i, '')
        .replace(/^force-delete\s+/i, '')
        .trim();
      const norm = normPath(target);
      onFsEntries((prev) => prev.map(normPath).filter((p) => p !== norm && !p.endsWith(`/${norm}`) && !p.endsWith(norm)));
      const out = `Deleted: ${target}`;
      push([{ id: uid('o'), kind: 'out', text: out }]);
      setTermMeta(out);
      return;
    }

    if (low === 'apps') {
      const apps = Object.entries(state.apps);
      push([
        ...apps.map(([id, a]) => ({
          id: uid('o'),
          kind: 'out' as const,
          text: `  ${a.installed ? '[+]' : '[ ]'} ${a.malware ? '[MALWARE]' : '[OK]'} ${a.name}`,
        })),
      ]);
      onState((p) => ({ ...p, terminal: { ...p.terminal, history: [...p.terminal.history, cmd] } }));
      return;
    }

    if (low.startsWith('apps uninstall')) {
      const name = cmd.slice('apps uninstall'.length).trim().replace(/^["']|["']$/g, '');
      const appEntry = Object.entries(state.apps).find(([, a]) => a.name.toLowerCase() === name.toLowerCase());
      if (!appEntry) {
        push([{ id: uid('o'), kind: 'out', text: `App not found: ${name}` }]);
        return;
      }
      const [appId, app] = appEntry;
      onState((p) => {
        const newApps = { ...p.apps };
        newApps[appId] = { ...app, installed: false };
        const newRegistry = { ...p.registry };
        if (app.registryKeys) app.registryKeys.forEach((k) => delete newRegistry[k]);
        return { ...p, apps: newApps, registry: newRegistry, terminal: { ...p.terminal, history: [...p.terminal.history, cmd] } };
      });
      push([{ id: uid('o'), kind: 'out', text: `Uninstalled ${app.name}.` }]);
      return;
    }

    // reg commands simplified for space
    if (low.startsWith('reg get')) {
      // ... existing logic ...
    }

    push([{ id: uid('o'), kind: 'out', text: 'Command not recognized.' }]);
    setTermMeta('Command not recognized.');
  }

  return (
    <div className="h-full flex flex-col bg-[#0c0c0c]/90 text-[#cccccc] font-mono selection:bg-white/20">
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-auto mb-4 sleek-scrollbar text-[13px] leading-relaxed">
          <div className="text-emerald-400 font-bold mb-4 opacity-60">Terminal Session #{sessionId} - Secure Shell</div>
          {lines.map((l) => (
            <div
              key={l.id}
              className={`mb-1.5 animate-in fade-in slide-in-from-left-1 duration-200 ${l.kind === 'in' ? 'text-blue-400 font-bold' :
                l.kind === 'sys' ? 'text-white/30 italic font-sans text-xs' :
                  'text-white/90'
                }`}
            >
              {l.kind === 'in' && <span className="mr-2">C:\&gt;</span>}
              {l.text}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 h-12 focus-within:border-[var(--brand-primary)]/50 transition-all shadow-inner">
          <span className="text-[var(--brand-primary)] text-sm font-black">&gt;</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = input;
                setInput('');
                run(v);
              }
            }}
            placeholder="Type command here..."
            className="flex-1 bg-transparent text-[13px] text-white outline-none caret-[var(--brand-primary)]"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

function TaskManager({ state, onEndHighCpu }: { state: RuntimeState; onEndHighCpu: () => void }) {
  const rows = useMemo(() => {
    type ProcRow = { pid: number; name: string; cpu: number; kind: 'system' | 'user' | 'malware' };

    const base: ProcRow[] = [
      { pid: 120, name: 'kernel_task', cpu: 3, kind: 'system' },
      { pid: 221, name: 'shell_ui', cpu: 5, kind: 'system' },
      { pid: 304, name: 'brightos_cloud_sync', cpu: 2, kind: 'system' },
      { pid: 388, name: 'coupon_tray', cpu: 1, kind: 'user' },
      { pid: 420, name: 'game_bar_overlay', cpu: 1, kind: 'user' },
      { pid: 512, name: 'auto_updater', cpu: 2, kind: 'system' },
      { pid: 603, name: 'search_indexer', cpu: 3, kind: 'system' },
    ];

    const appProcs: ProcRow[] = Object.values(state.apps)
      .filter((a) => a.installed && a.process)
      .slice(0, 18)
      .map((a, idx) => ({
        pid: 900 + idx,
        name: a.process as string,
        cpu: a.malware ? 2 : 1,
        kind: a.malware ? 'malware' : 'user',
      }));

    const cpuNoise = Math.max(0, Math.round((state.cpu_load - 10) / 20));
    const noisy: ProcRow[] = base.concat(appProcs).map((r) => {
      if (r.pid === 120) return r;
      if (r.pid === 221) return { ...r, cpu: clamp(r.cpu + cpuNoise, 1, 18) };
      return { ...r, cpu: clamp(r.cpu + Math.floor(cpuNoise / 2), 0, 12) };
    });

    if (state.process.high_cpu.running) {
      noisy.unshift({ pid: 777, name: 'mystery_app.exe', cpu: Math.round(state.cpu_load), kind: 'malware' });
    }
    return noisy.sort((a, b) => b.cpu - a.cpu);
  }, [state.apps, state.cpu_load, state.process.high_cpu.running]);

  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Processes</div>
      <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_120px] gap-2 px-4 py-3 border-b border-white/10 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
          <div>Name</div>
          <div>CPU</div>
          <div>Action</div>
        </div>
        {rows.map((r) => (
          <div
            key={r.pid}
            className={`grid grid-cols-[1fr_120px_120px] gap-2 px-4 py-3 border-b border-white/5 text-sm text-zinc-200 ${r.kind === 'malware' ? 'bg-red-500/5' : ''
              }`}
          >
            <div className="font-mono">
              {r.name}{' '}
              {r.kind === 'malware' ? <span className="text-red-200">(suspicious)</span> : null}
            </div>
            <div className="font-mono">{r.cpu}%</div>
            <div>
              {r.pid === 777 ? (
                <button
                  onClick={onEndHighCpu}
                  className="h-9 px-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-[10px] font-black uppercase tracking-[0.25em] text-red-100"
                >
                  End Task
                </button>
              ) : (
                <div className="text-xs text-zinc-500">—</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-zinc-400">
        CPU Load: <span className="text-zinc-200 font-semibold">{Math.round(state.cpu_load)}%</span>
      </div>
    </div>
  );
}

function Settings({
  mission,
  state,
  onCleanTmp,
  onEmptyRecycle,
  theme,
  onToggleTheme,
  onState,
  onNotify,
  onOpenWindow,
}: {
  mission: BrightOSMission;
  state: RuntimeState;
  onCleanTmp: () => void;
  onEmptyRecycle: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onState: (fn: (p: RuntimeState) => RuntimeState) => void;
  onNotify: (kind: 'alert' | 'info', title: string, body: string) => void;
  onOpenWindow: (id: WindowId) => void;
}) {
  const wantsResolution = mission.success_condition.includes('display.resolution');
  const wantsPower = mission.success_condition.includes('power.screen_off_minutes_on_battery');
  const wantsFilterKeys = mission.success_condition.includes('keyboard.filter_keys.enabled');
  const wantsSpecs = mission.success_condition.includes('specs.checked');
  const wantsPartition = mission.success_condition.includes('disk.volumes');
  const wantsRestore = mission.success_condition.includes('system.restore.');
  const wantsPasswordReset = mission.success_condition.includes('account.user.password_reset');
  const wantsPrinter = mission.success_condition.includes('printer.queue.count') || mission.success_condition.includes('printer.ip') || mission.success_condition.includes('printer.reachable');
  const wantsDns = mission.success_condition.includes('network.dns');
  const wantsThreats = mission.success_condition.includes('defend.threats');
  const wantsFirewall = mission.success_condition.includes('firewall.inbound');
  const wantsRam = mission.success_condition.includes('hardware.ram_gb');

  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Storage</div>
      <div className="mt-3 grid gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-sm font-black text-white">Disk Free Space</div>
          <div className="mt-1 text-2xl font-black text-[var(--brand-primary)]">{state.disk.free_space_mb} MB</div>
          <div className="mt-2 text-xs text-zinc-400">
            Temp files: <span className="text-zinc-200 font-semibold">{state.files.tmp.count}</span> • Recycle Bin:
            <span className="text-zinc-200 font-semibold"> {state.recycle_bin.empty ? 'Empty' : 'Not Empty'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-sm font-black text-white">Cleanup</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={onCleanTmp}
              disabled={state.files.tmp.count === 0}
              className={`h-10 px-4 rounded-2xl border text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${state.files.tmp.count === 0
                ? 'border-white/10 bg-white/[0.03] text-zinc-500'
                : 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-white'
                }`}
            >
              Delete .tmp
            </button>
            <button
              onClick={onEmptyRecycle}
              disabled={state.recycle_bin.empty}
              className={`h-10 px-4 rounded-2xl border text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${state.recycle_bin.empty
                ? 'border-white/10 bg-white/[0.03] text-zinc-500'
                : 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-white'
                }`}
            >
              Empty Recycle
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-sm font-black text-white">Appearance</div>
          <div className="mt-2 text-xs text-zinc-400">
            Theme: <span className="text-zinc-200 font-semibold">{theme === 'light' ? 'Light' : 'Dark'}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={onToggleTheme}
              className="h-10 px-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-[10px] font-black uppercase tracking-[0.25em] transition-colors text-white"
            >
              Toggle Theme
            </button>
          </div>
        </div>

        {(wantsResolution || wantsPower || wantsFilterKeys || wantsSpecs || wantsPartition || wantsRestore || wantsPasswordReset || wantsPrinter || wantsDns || wantsThreats || wantsFirewall || wantsRam || mission.id === 'tech-5') && (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-sm font-black text-white">System Tools</div>
            <div className="mt-2 text-xs text-zinc-400">Quick actions for this mission.</div>

            <div className="mt-4 grid gap-3">
              {(mission.id === 'tech-5' || mission.success_condition.includes('device.audio.driver_status') || mission.success_condition.includes('audio.output')) && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Device Manager</div>
                  <div className="mt-2 text-sm text-zinc-200">Audio output: <span className="font-mono">{String(state.audio.output)}</span> • Driver: <span className="font-mono">{state.device.audio.driver_status}</span></div>
                  <button
                    onClick={() => onOpenWindow('devmgr')}
                    className="mt-3 h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                  >
                    Open Device Manager
                  </button>
                </div>
              )}

              {wantsResolution && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Display</div>
                  <div className="mt-2 text-sm text-zinc-200">Resolution: <span className="font-mono">{state.display.resolution}</span></div>
                  <button
                    onClick={() => {
                      onState((p) => ({ ...p, display: { resolution: '1920x1080' } }));
                      onNotify('info', 'SETTINGS', 'Display resolution updated to 1920x1080.');
                    }}
                    className="mt-3 h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                  >
                    Set 1920x1080
                  </button>
                </div>
              )}

              {wantsPower && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Power</div>
                  <div className="mt-2 text-sm text-zinc-200">Screen off (battery): <span className="font-mono">{state.power_settings.screen_off_minutes_on_battery} min</span></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        onState((p) => ({ ...p, power_settings: { screen_off_minutes_on_battery: 2 } }));
                        onNotify('info', 'SETTINGS', 'Battery screen-off set to 2 minutes.');
                      }}
                      className="h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                    >
                      2 min
                    </button>
                    <button
                      onClick={() => {
                        onState((p) => ({ ...p, power_settings: { screen_off_minutes_on_battery: 5 } }));
                        onNotify('info', 'SETTINGS', 'Battery screen-off set to 5 minutes.');
                      }}
                      className="h-10 px-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                    >
                      5 min
                    </button>
                  </div>
                </div>
              )}

              {wantsFilterKeys && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Accessibility</div>
                  <div className="mt-2 text-sm text-zinc-200">Filter Keys: <span className="font-mono">{String(state.keyboard.filter_keys.enabled)}</span></div>
                  <button
                    onClick={() => {
                      onState((p) => ({ ...p, keyboard: { filter_keys: { enabled: true } } }));
                      onNotify('info', 'SETTINGS', 'Filter Keys enabled.');
                    }}
                    className="mt-3 h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                  >
                    Enable Filter Keys
                  </button>
                </div>
              )}

              {wantsSpecs && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">System Info</div>
                  <div className="mt-2 text-sm text-zinc-200">Specs checked: <span className="font-mono">{String(state.specs.checked)}</span></div>
                  <button
                    onClick={() => {
                      onState((p) => ({ ...p, specs: { checked: true } }));
                      onNotify('info', 'SETTINGS', 'System requirements checked.');
                    }}
                    className="mt-3 h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                  >
                    Mark Checked
                  </button>
                </div>
              )}

              {wantsPartition && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Disk Management</div>
                  <div className="mt-2 text-sm text-zinc-200">Volumes: <span className="font-mono">{state.disk.volumes.join(', ')}</span></div>
                  <button
                    onClick={() => {
                      onState((p) => {
                        const next = Array.from(new Set([...(p.disk.volumes || []), 'D:']));
                        return { ...p, disk: { ...p.disk, volumes: next } };
                      });
                      onNotify('info', 'SETTINGS', 'Created volume D:.');
                    }}
                    className="mt-3 h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                  >
                    Create D: Volume
                  </button>
                </div>
              )}

              {wantsRestore && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Recovery</div>
                  <div className="mt-2 text-sm text-zinc-200">Restore completed: <span className="font-mono">{String(state.system.restore.completed)}</span> • Crash rate: <span className="font-mono">{state.system.crash_rate}</span></div>
                  <button
                    onClick={() => {
                      onState((p) => ({ ...p, system: { restore: { completed: true }, crash_rate: 0 } }));
                      onNotify('info', 'SETTINGS', 'System Restore completed.');
                    }}
                    className="mt-3 h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                  >
                    Run System Restore
                  </button>
                </div>
              )}

              {wantsPasswordReset && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Accounts</div>
                  <div className="mt-2 text-sm text-zinc-200">Password reset: <span className="font-mono">{String(state.account.user.password_reset)}</span></div>
                  <button
                    onClick={() => {
                      onState((p) => ({ ...p, account: { user: { password_reset: true } } }));
                      onNotify('info', 'SETTINGS', 'User password reset completed.');
                    }}
                    className="mt-3 h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                  >
                    Reset Password
                  </button>
                </div>
              )}

              {wantsPrinter && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Printers</div>
                  <div className="mt-2 text-sm text-zinc-200">Queue: <span className="font-mono">{state.printer.queue.count}</span> • IP: <span className="font-mono">{state.printer.ip}</span> • Reachable: <span className="font-mono">{String(state.printer.reachable)}</span></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        onState((p) => ({ ...p, printer: { ...p.printer, queue: { count: 0 } } }));
                        onNotify('info', 'PRINTER', 'All print jobs cancelled.');
                      }}
                      className="h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                    >
                      Clear Queue
                    </button>
                    <button
                      onClick={() => {
                        onState((p) => ({ ...p, printer: { ...p.printer, ip: '192.168.0.50', reachable: true } }));
                        onNotify('info', 'PRINTER', 'Printer configured and reachable.');
                      }}
                      className="h-10 px-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                    >
                      Set IP 192.168.0.50
                    </button>
                  </div>
                </div>
              )}

              {wantsDns && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Network</div>
                  <div className="mt-2 text-sm text-zinc-200">DNS: <span className="font-mono">{state.network.dns.primary}</span> • Status: <span className="font-mono">{state.network.status}</span></div>
                  <button
                    onClick={() => {
                      onState((p) => ({ ...p, network: { ...p.network, status: 'Connected', dns: { primary: '8.8.8.8' } } }));
                      onNotify('info', 'NETWORK', 'DNS set to 8.8.8.8.');
                    }}
                    className="mt-3 h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                  >
                    Set DNS 8.8.8.8
                  </button>
                </div>
              )}

              {wantsThreats && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Defend</div>
                  <div className="mt-2 text-sm text-zinc-200">Active threats: <span className="font-mono">{state.defend.threats.active}</span> • Quarantined: <span className="font-mono">{state.defend.threats.quarantined}</span></div>
                  <button
                    onClick={() => {
                      onState((p) => ({
                        ...p,
                        defend: { threats: { active: 0, quarantined: Math.max(1, p.defend.threats.quarantined + Math.max(1, p.defend.threats.active)) } },
                      }));
                      onNotify('info', 'DEFEND', 'Deep scan complete. Threats quarantined.');
                    }}
                    className="mt-3 h-10 px-4 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-[10px] font-black uppercase tracking-[0.25em] text-red-100 transition-colors"
                  >
                    Deep Scan & Quarantine
                  </button>
                </div>
              )}

              {wantsFirewall && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Firewall</div>
                  <div className="mt-2 text-sm text-zinc-200">Blocked inbound ports: <span className="font-mono">{(state.firewall.inbound.blocked_ports || []).join(', ') || 'none'}</span></div>
                  <button
                    onClick={() => {
                      onState((p) => ({
                        ...p,
                        firewall: {
                          inbound: {
                            blocked_ports: Array.from(new Set([...(p.firewall.inbound.blocked_ports || []), 23])),
                          },
                        },
                      }));
                      onNotify('info', 'FIREWALL', 'Blocked inbound port 23.');
                    }}
                    className="mt-3 h-10 px-4 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-[10px] font-black uppercase tracking-[0.25em] text-red-100 transition-colors"
                  >
                    Block Port 23
                  </button>
                </div>
              )}

              {wantsRam && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Hardware</div>
                  <div className="mt-2 text-sm text-zinc-200">RAM: <span className="font-mono">{state.hardware.ram_gb}GB</span></div>
                  <button
                    onClick={() => {
                      onState((p) => ({ ...p, hardware: { ram_gb: 8 } }));
                      onNotify('info', 'HARDWARE', 'Installed 8GB RAM module.');
                    }}
                    className="mt-3 h-10 px-4 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors"
                  >
                    Install 8GB RAM
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FileExplorer({
  entries,
  location,
  onSetLocation,
  onOpen,
  onDeleteToRecycle,
  onEmptyRecycle,
  onCopyToDrive,
  onZipFolder,
  onEncryptFolder,
  theme,
}: {
  entries: string[];
  location: 'pc' | 'recycle';
  onSetLocation: (v: 'pc' | 'recycle') => void;
  onOpen: (path: string) => void;
  onDeleteToRecycle: (path: string) => void;
  onEmptyRecycle: () => void;
  onCopyToDrive: (path: string, drive: 'D' | 'E') => void;
  onZipFolder: (path: string) => void;
  onEncryptFolder: (path: string) => void;
  theme: 'dark' | 'light';
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('C:/');
  const isLight = theme === 'light';

  useEffect(() => {
    if (location === 'recycle') {
      setCurrentPath('RecycleBin:/');
      return;
    }
    setCurrentPath((prev) => (prev.startsWith('C:/') || prev.startsWith('D:/') ? prev : 'C:/'));
  }, [location]);

  const normalized = useMemo(() => entries.map(normPath).sort((a, b) => a.localeCompare(b)), [entries]);
  const driveRoots = useMemo(() => {
    const roots = new Set<string>();
    normalized.forEach((entry) => {
      const match = entry.match(/^([A-Z]:\/|[A-Z]:\/?)/i);
      if (match) roots.add(match[1].replace(/\\/g, '/').replace(/\/?$/, '/'));
    });
    return Array.from(roots).sort();
  }, [normalized]);

  const listItems = useMemo(() => {
    if (currentPath === 'ThisPC') {
      return driveRoots.map((drive) => ({
        path: drive,
        name: drive.replace('/', ''),
        type: 'drive' as const,
      }));
    }
    const base = normPath(currentPath);
    const prefix = base.endsWith('/') ? base : `${base}/`;
    const children = new Map<string, { path: string; name: string; type: 'folder' | 'file' }>();

    normalized.forEach((entry) => {
      if (!entry.startsWith(prefix)) return;
      const rest = entry.slice(prefix.length);
      if (!rest) return;
      const [first] = rest.split('/');
      const isFolder = rest.includes('/');
      const childPath = `${prefix}${first}${isFolder ? '/' : ''}`;
      children.set(childPath, { path: childPath, name: first, type: isFolder ? 'folder' : 'file' });
    });

    return Array.from(children.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [currentPath, driveRoots, normalized]);

  const crumbs = useMemo(() => {
    if (currentPath === 'ThisPC') return ['This PC'];
    const parts = normPath(currentPath).replace(/\/+$/, '').split('/');
    const out: string[] = [];
    for (let i = 0; i < parts.length; i += 1) {
      if (!parts[i]) continue;
      const val = parts[i];
      out.push(i === 0 ? `${val}/` : val);
    }
    return out.length ? out : ['This PC'];
  }, [currentPath]);

  return (
    <div className="h-full grid grid-cols-[240px_1fr] gap-4">
      <div className={`rounded-2xl border p-3 ${isLight ? 'border-black/10 bg-white/70' : 'border-white/10 bg-black/30'}`}>
        <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Quick Access</div>
        <div className="mt-3 grid gap-2">
          <button
            onClick={() => {
              setSelected(null);
              onSetLocation('pc');
              setCurrentPath('ThisPC');
            }}
            className={`h-10 px-3 rounded-2xl border text-xs font-bold text-left ${isLight
              ? 'border-black/10 bg-black/[0.03] hover:bg-black/[0.06] text-zinc-900'
              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white'
              }`}
          >
            This PC
          </button>
          <button
            onClick={() => {
              setSelected(null);
              onSetLocation('recycle');
            }}
            className={`h-10 px-3 rounded-2xl border text-xs font-bold text-left ${isLight
              ? 'border-black/10 bg-black/[0.03] hover:bg-black/[0.06] text-zinc-900'
              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white'
              }`}
          >
            Recycle Bin
          </button>
        </div>

        <div className="mt-6">
          <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>This PC</div>
          <div className="mt-3 grid gap-2">
            {driveRoots.length === 0 && (
              <div className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>No drives found.</div>
            )}
            {driveRoots.map((drive) => (
              <button
                key={drive}
                onClick={() => {
                  setSelected(null);
                  onSetLocation('pc');
                  setCurrentPath(drive);
                }}
                className={`h-10 px-3 rounded-2xl border text-xs font-bold text-left ${isLight
                  ? 'border-black/10 bg-black/[0.03] hover:bg-black/[0.06] text-zinc-900'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white'
                  }`}
              >
                {drive}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Actions</div>
          <div className="mt-3 grid gap-2">
            <button
              onClick={() => {
                if (!selected) return;
                onDeleteToRecycle(selected);
                setSelected(null);
              }}
              disabled={!selected || location === 'recycle'}
              className={`h-10 px-3 rounded-2xl border text-xs font-bold text-left transition-colors ${!selected || location === 'recycle'
                ? isLight
                  ? 'border-black/10 bg-black/[0.02] text-zinc-500'
                  : 'border-white/10 bg-white/[0.02] text-zinc-500'
                : isLight
                  ? 'border-black/10 bg-black/[0.03] hover:bg-black/[0.06] text-zinc-900'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white'
                }`}
            >
              Delete
            </button>
            <button
              onClick={() => {
                if (!selected) return;
                onZipFolder(selected);
              }}
              disabled={!selected}
              className={`h-10 px-3 rounded-2xl border text-xs font-bold text-left transition-colors ${!selected
                ? isLight
                  ? 'border-black/10 bg-black/[0.02] text-zinc-500'
                  : 'border-white/10 bg-white/[0.02] text-zinc-500'
                : isLight
                  ? 'border-black/10 bg-black/[0.03] hover:bg-black/[0.06] text-zinc-900'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white'
                }`}
            >
              Zip
            </button>
            <button
              onClick={() => {
                if (!selected) return;
                onCopyToDrive(selected, 'E');
              }}
              disabled={!selected}
              className={`h-10 px-3 rounded-2xl border text-xs font-bold text-left transition-colors ${!selected
                ? isLight
                  ? 'border-black/10 bg-black/[0.02] text-zinc-500'
                  : 'border-white/10 bg-white/[0.02] text-zinc-500'
                : isLight
                  ? 'border-black/10 bg-black/[0.03] hover:bg-black/[0.06] text-zinc-900'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white'
                }`}
            >
              Copy to E:
            </button>
            <button
              onClick={() => {
                if (!selected) return;
                onEncryptFolder(selected);
              }}
              disabled={!selected}
              className={`h-10 px-3 rounded-2xl border text-xs font-bold text-left transition-colors ${!selected
                ? isLight
                  ? 'border-black/10 bg-black/[0.02] text-zinc-500'
                  : 'border-white/10 bg-white/[0.02] text-zinc-500'
                : isLight
                  ? 'border-black/10 bg-black/[0.03] hover:bg-black/[0.06] text-zinc-900'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white'
                }`}
            >
              Encrypt
            </button>
            <button
              onClick={() => {
                if (location !== 'recycle') return;
                onEmptyRecycle();
                setSelected(null);
              }}
              disabled={location !== 'recycle'}
              className={`h-10 px-3 rounded-2xl border text-xs font-bold text-left transition-colors ${location !== 'recycle'
                ? isLight
                  ? 'border-black/10 bg-black/[0.02] text-zinc-500'
                  : 'border-white/10 bg-white/[0.02] text-zinc-500'
                : isLight
                  ? 'border-black/10 bg-black/[0.03] hover:bg-black/[0.06] text-zinc-900'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white'
                }`}
            >
              Empty Bin
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${isLight ? 'border-black/10 bg-white/70' : 'border-white/10 bg-black/30'}`}>
        <div className={`px-4 py-3 border-b ${isLight ? 'border-black/10' : 'border-white/10'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Address</div>
            <div className={`flex-1 rounded-xl border px-3 py-1.5 text-xs ${isLight ? 'border-black/10 bg-white/70 text-zinc-800' : 'border-white/10 bg-black/30 text-zinc-200'}`}>
              {crumbs.join(' / ')}
            </div>
            <button
              onClick={() => {
                if (currentPath === 'ThisPC') return;
                const parts = normPath(currentPath).replace(/\/+$/, '').split('/');
                if (parts.length <= 1) {
                  setCurrentPath('ThisPC');
                  return;
                }
                parts.pop();
                setCurrentPath(parts.join('/') + '/');
              }}
              className={`h-8 px-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.25em] ${isLight
                ? 'border-black/10 bg-black/[0.03] hover:bg-black/[0.06] text-zinc-800'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-200'
                }`}
            >
              Up
            </button>
          </div>
        </div>

        <div className="h-[360px] overflow-auto">
          {listItems.length === 0 ? (
            <div className={`p-4 text-sm ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>No items.</div>
          ) : (
            listItems.slice(0, 250).map((item) => (
              <button
                key={item.path}
                onClick={() => setSelected(item.path)}
                onDoubleClick={() => {
                  if (item.type === 'drive' || item.type === 'folder') {
                    setCurrentPath(item.path);
                    onSetLocation(item.path.startsWith('RecycleBin:/') ? 'recycle' : 'pc');
                    return;
                  }
                  onOpen(item.path);
                }}
                className={`w-full px-4 py-3 border-b text-left text-sm transition-colors ${isLight ? 'border-black/5' : 'border-white/5'
                  } ${selected === item.path ? (isLight ? 'bg-black/[0.06]' : 'bg-white/[0.06]') : isLight ? 'hover:bg-black/[0.04]' : 'hover:bg-white/[0.04]'}`}
              >
                <div className={`font-semibold ${isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>
                  {item.type === 'drive' ? '🖴' : item.type === 'folder' ? '📁' : '📄'} {item.name}
                </div>
                <div className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{item.path}</div>
              </button>
            ))
          )}
        </div>
        {selected && (
          <div className={`px-4 py-3 border-t text-xs ${isLight ? 'border-black/10 text-zinc-600' : 'border-white/10 text-zinc-400'}`}>
            Selected: <span className={`${isLight ? 'text-zinc-800' : 'text-zinc-200'} font-mono`}>{selected}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MissionClient({ mission }: { mission: BrightOSMission }) {
  const router = useRouter();
  const { user, userData } = useAuth();

  const [now, setNow] = useState(() => new Date());
  const [wallpaper, setWallpaper] = useState('');

  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const cooldownRemainingMs = cooldownUntil ? Math.max(0, cooldownUntil - now.getTime()) : 0;
  const cooldownActive = cooldownUntil !== null && cooldownRemainingMs > 0;
  const cooldownMins = Math.floor(cooldownRemainingMs / 60000);
  const cooldownSecs = Math.floor((cooldownRemainingMs % 60000) / 1000);
  const cooldownLabel = `${cooldownMins}:${String(cooldownSecs).padStart(2, '0')}`;

  const [state, setState] = useState<RuntimeState>(() => initRuntime(mission));
  const [wins, setWins] = useState<Record<WindowId, WindowState>>(() => initialWindows(mission));
  const [activeWin, setActiveWin] = useState<WindowId>(() => (mission.id === 'tech-1' ? 'stuck_app' : 'terminal'));

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fsEntries, setFsEntries] = useState<string[]>(() => mission.initial_state.file_system.map(normPath));
  const [explorerLocation, setExplorerLocation] = useState<'pc' | 'recycle'>('pc');

  const [startOpen, setStartOpen] = useState(false);
  const [startQuery, setStartQuery] = useState('');

  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [termLines, setTermLines] = useState<TerminalLine[]>(() => [
    { id: uid('sys'), kind: 'sys', text: `Mission loaded: ${mission.id} — ${mission.title}` },
    { id: uid('sys'), kind: 'sys', text: 'Terminal: try help, dir, ipconfig /renew, tracert, netstat -ano' },
  ]);
  const [termInput, setTermInput] = useState('');

  const [briefingAccepted, setBriefingAccepted] = useState(false);
  const briefingStartRef = useRef<number>(Date.now());
  const eventsStartedRef = useRef(false);
  const eventTimersRef = useRef<number[]>([]);
  const [inbox, setInbox] = useState<StoryEmail[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ from: string; text: string }>>([]);

  const npcSeedRef = useRef(String(Math.random()).slice(2));

  const rewardGrantedRef = useRef(false);
  const [missionComplete, setMissionComplete] = useState(false);

  const liveSessionIdRef = useRef<string | null>(null);
  const liveSessionEndedRef = useRef(false);

  const drag = useRef<{
    id: WindowId | null;
    mode: 'move' | 'resize' | null;
    sx: number;
    sy: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }>({ id: null, mode: null, sx: 0, sy: 0, x: 0, y: 0, w: 0, h: 0 });

  const dragRafRef = useRef<number | null>(null);
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    setWallpaper(pickFromPool(mission.brightos_desktop.wallpaper_pool));
    const cd = getMissionCooldown();
    setCooldownUntil(cd?.until ?? null);
  }, [mission.brightos_desktop.wallpaper_pool]);

  useEffect(() => {
    liveSessionEndedRef.current = false;
    const session = startLiveSession('csec', mission.id);
    liveSessionIdRef.current = session.id;

    return () => {
      const sid = liveSessionIdRef.current;
      if (!sid) return;
      if (liveSessionEndedRef.current) return;
      endLiveSession(sid, { status: 'abandoned' });
      liveSessionEndedRef.current = true;
    };
  }, [mission.id]);

  useEffect(() => {
    setTheme('dark');
    setState(initRuntime(mission));
    setWins(initialWindows(mission));
    setActiveWin(mission.id === 'tech-1' ? 'stuck_app' : 'terminal');
    setFsEntries(mission.initial_state.file_system.map(normPath));
    setExplorerLocation('pc');
    setStartOpen(false);
    setStartQuery('');
    setPassword('');
    setLoginBusy(false);
    setLoginError(null);
    setBriefingAccepted(false);
    briefingStartRef.current = Date.now();
    eventsStartedRef.current = false;
    npcSeedRef.current = String(Math.random()).slice(2);
    eventTimersRef.current.forEach((t) => window.clearTimeout(t));
    eventTimersRef.current = [];
    setInbox([]);
    setChatMessages([]);
  }, [mission]);

  const company = useMemo(() => {
    const preset = mission.brightos_desktop.ui_preset;
    if (preset === 'smallbiz_admin') return { name: 'IslandMart Ltd.', dept: 'IT / Operations', hostname: `IM-${mission.id.toUpperCase()}` };
    if (preset === 'techfix_shop') return { name: 'TechFix Service Desk', dept: 'Repairs & Support', hostname: `TFX-${mission.id.toUpperCase()}` };
    if (preset === 'automation_lab') return { name: 'BrightEd Automation Lab', dept: 'DevOps Training', hostname: `LAB-${mission.id.toUpperCase()}` };
    if (preset === 'csec_soc') return { name: 'CaribSec SOC', dept: 'Security Operations', hostname: `SOC-${mission.id.toUpperCase()}` };
    return { name: 'BrightEd Home Support', dept: 'Helpdesk', hostname: `BE-${mission.id.toUpperCase()}` };
  }, [mission.brightos_desktop.ui_preset, mission.id]);

  const story = useMemo(() => buildStoryPack(mission, company), [mission, company]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setState((p) => {
        if (p.power !== 'booting') return p;
        const next = (p.boot_phase + 1) as RuntimeState['boot_phase'];
        if (next >= 5) return { ...p, power: 'lock', boot_phase: 5 };
        return { ...p, boot_phase: next };
      });
    }, 850);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (state.power !== 'on') return;

    if (!eventsStartedRef.current) {
      eventsStartedRef.current = true;

      setInbox(story.emails);
      setChatMessages([]);

      story.chat.forEach((m) => {
        const t = window.setTimeout(() => {
          setChatMessages((prev) => [...prev, { from: m.from, text: m.text }]);
          notify('info', 'CHAT', `New message from ${m.from}`);
        }, m.atOffsetMs);
        eventTimersRef.current.push(t);
      });

      story.events.forEach((ev) => {
        const t = window.setTimeout(() => {
          if (ev.kind === 'notify') notify(ev.level, ev.title, ev.body);
          if (ev.kind === 'document') {
            setFsEntries((prev) => {
              const next = prev.map(normPath);
              const p = normPath(ev.path);
              if (!next.includes(p)) next.push(p);
              return next;
            });
          }
          if (ev.kind === 'email') {
            const msg = story.emails.find((m) => m.id === ev.emailId);
            if (msg) notify('alert', 'MAIL', `New email: ${msg.subject}`);
          }
        }, ev.atOffsetMs);
        eventTimersRef.current.push(t);
      });
    }

    const id = window.setInterval(() => {
      setState((p) => {
        const base = p.process.high_cpu.running ? 92 : p.cpu_load;
        const noise = Math.random() * 4 - 2;
        const nextCpu = clamp(base + noise, p.process.high_cpu.running ? 80 : 8, p.process.high_cpu.running ? 99 : 35);
        return { ...p, cpu_load: nextCpu };
      });
    }, 700);

    return () => window.clearInterval(id);
  }, [state.power, story]);

  useEffect(() => {
    if (state.power === 'shutting-down') {
      const id = window.setTimeout(() => {
        setState((p) => ({ ...p, power: 'off' }));
      }, 2500);
      return () => window.clearTimeout(id);
    }
  }, [state.power, mission]);

  useEffect(() => {
    if (state.power !== 'on') return;
    const id = window.setInterval(() => {
      const roll = Math.random();
      if (roll < 0.65) return;

      setState((p) => ({
        ...p,
        notifications: [
          ...p.notifications,
          {
            id: uid('n'),
            kind: roll > 0.92 ? 'alert' : 'info',
            title: roll > 0.92 ? 'SECURITY NOTICE' : 'SYSTEM',
            body:
              roll > 0.92
                ? 'Background service attempted an outbound connection.'
                : 'Try BrightOS Pro Trial — limited time offer.',
          },
        ],
      }));
    }, 9000);

    return () => window.clearInterval(id);
  }, [state.power, mission]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = drag.current;
      if (!d.id || !d.mode) return;

      dragPosRef.current = { x: e.clientX, y: e.clientY };
      if (dragRafRef.current !== null) return;

      dragRafRef.current = window.requestAnimationFrame(() => {
        dragRafRef.current = null;
        const p = dragPosRef.current;
        const dx = p.x - d.sx;
        const dy = p.y - d.sy;

        setWins((prev) => {
          const w = prev[d.id!];
          if (!w) return prev;
          if (d.mode === 'move') {
            return {
              ...prev,
              [d.id!]: {
                ...w,
                x: clamp(d.x + dx, 10, window.innerWidth - 260),
                y: clamp(d.y + dy, 10, window.innerHeight - 160),
              },
            };
          }
          return {
            ...prev,
            [d.id!]: {
              ...w,
              w: clamp(d.w + dx, 360, window.innerWidth - 40),
              h: clamp(d.h + dy, 240, window.innerHeight - 100),
            },
          };
        });
      });
    }

    function onUp() {
      drag.current = { id: null, mode: null, sx: 0, sy: 0, x: 0, y: 0, w: 0, h: 0 };
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const allowedTools = useMemo(() => mission.tools_allowed as AppId[], [mission.tools_allowed]);
  const stuckLock = state.window.stuck_app.open;

  const startApps = useMemo(() => {
    const allowed = new Set(mission.tools_allowed);
    return [
      { id: 'explorer' as const, title: 'File Explorer', subtitle: 'Browse files', disabled: false },
      { id: 'uninstall' as const, title: 'Uninstall Programs', subtitle: 'Installed apps', disabled: false },
      { id: 'registry' as const, title: 'Registry Editor', subtitle: 'System registry', disabled: false },
      { id: 'devmgr' as const, title: 'Device Manager', subtitle: 'Drivers', disabled: false },
      { id: 'mail' as const, title: 'Mail', subtitle: 'Inbox', disabled: false },
      { id: 'chat' as const, title: 'Teams', subtitle: 'Chat', disabled: false },
      { id: 'terminal' as const, title: 'Terminal', subtitle: 'Commands', disabled: !allowed.has('Terminal') },
      { id: 'settings' as const, title: 'Settings', subtitle: 'System', disabled: !allowed.has('Settings') },
      { id: 'taskmgr' as const, title: 'Task Manager', subtitle: 'Processes', disabled: !allowed.has('Task Manager') },
      { id: 'browser' as const, title: 'Browser', subtitle: 'Web', disabled: !allowed.has('Browser') },
      { id: 'automation' as const, title: 'Automation App', subtitle: 'Blocks & Scripts', disabled: !allowed.has('Automation App') },
    ];
  }, [mission.tools_allowed]);

  function push(lines: TerminalLine[]) {
    setTermLines((p) => {
      if (lines.length === 1 && lines[0]?.kind === 'sys' && lines[0]?.text === 'Terminal cleared.') {
        return lines;
      }
      return [...p, ...lines];
    });
  }

  function focus(id: WindowId) {
    if (stuckLock && id !== 'stuck_app') {
      notify('alert', 'SYSTEM', 'Close the stuck window before using other apps.');
      setActiveWin('stuck_app');
      setWins((prev) => {
        const w = prev.stuck_app;
        if (!w) return prev;
        const maxZ = Math.max(...Object.values(prev).map((x) => x.z));
        return { ...prev, stuck_app: { ...w, open: true, minimized: false, z: maxZ + 1 } };
      });
      return;
    }
    setActiveWin(id);
    setWins((prev) => {
      const w = prev[id];
      if (!w) return prev;
      const maxZ = Math.max(...Object.values(prev).map((x) => x.z));
      return { ...prev, [id]: { ...w, open: true, minimized: false, z: maxZ + 1 } };
    });
  }

  function close(id: WindowId) {
    setWins((prev) => {
      const w = prev[id];
      if (!w) return prev;
      const next = { ...prev, [id]: { ...w, open: false, minimized: false } };
      return next;
    });

    if (id === 'stuck_app') {
      setState((p) => ({ ...p, window: { ...p.window, stuck_app: { open: false } } }));
      notify('info', 'SYSTEM', 'Stuck window closed. Desktop responsive again.');
    }

    if (activeWin === id) {
      setWins((prev) => {
        const nextId = pickBestActiveWindow(prev);
        setActiveWin(nextId);
        return prev;
      });
    }
  }

  function notify(kind: 'alert' | 'info', title: string, body: string) {
    setState((p) => ({ ...p, notifications: [...p.notifications, { id: uid('n'), kind, title, body }] }));
  }

  function taskbarToggle(id: WindowId) {
    if (stuckLock) {
      notify('alert', 'SYSTEM', 'A stuck window is open. Some actions may be blocked until you close it.');
    }
    setWins((prev) => {
      const w = prev[id];
      if (!w) return prev;
      const maxZ = Math.max(...Object.values(prev).map((x) => x.z));

      if (!w.open) {
        setActiveWin(id);
        return { ...prev, [id]: { ...w, open: true, minimized: false, z: maxZ + 1 } };
      }
      if (w.minimized) {
        setActiveWin(id);
        return { ...prev, [id]: { ...w, minimized: false, z: maxZ + 1 } };
      }

      const next = { ...prev, [id]: { ...w, minimized: true } };
      const nextId = pickBestActiveWindow(next);
      setActiveWin(nextId);
      return next;
    });
  }

  const completeMissionOnce = useCallback(() => {
    if (missionComplete) return;
    setMissionComplete(true);

    if (!rewardGrantedRef.current) {
      rewardGrantedRef.current = true;
      awardFixedMissionXP(`brightos:csec:${mission.id}`, MISSION_XP_REWARD, 'Mission complete');
      markMissionCompleted(`brightos:csec:${mission.id}`, MISSION_XP_REWARD);

      if (user && db) {
        const todayKey = new Date().toISOString().slice(0, 10);
        const isNewDay = (userData?.lastLearningDay || '') !== todayKey;
        const updates: any = {
          xp: increment(MISSION_XP_REWARD),
          bCoins: increment(MISSION_BCOIN_REWARD),
          lastLearningDay: todayKey,
          lastLearningAt: serverTimestamp(),
          lastActive: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updates.xp_today = isNewDay ? MISSION_XP_REWARD : increment(MISSION_XP_REWARD);
        updateDoc(doc(db, 'users', user.uid), updates).catch(() => undefined);
      }

      const sid = liveSessionIdRef.current;
      if (sid && !liveSessionEndedRef.current) {
        endLiveSession(sid, { status: 'completed', xpEarned: MISSION_XP_REWARD });
        liveSessionEndedRef.current = true;
      }
      const { cooldown } = registerMissionCompletionAndMaybeCooldown(`brightos:csec:${mission.id}`);

      push([{
        id: uid('sys'),
        kind: 'sys',
        text: `Mission complete. +${MISSION_XP_REWARD} XP and +${MISSION_BCOIN_REWARD} B-Coins earned.`,
      }]);

      if (cooldown) {
        setCooldownUntil(cooldown.until);
        push([{ id: uid('sys'), kind: 'sys', text: `Cooldown active. Try again later.` }]);
      }

      window.setTimeout(() => {
        setState((p) => ({ ...p, power: 'reward' }));
      }, 900);
    }
  }, [mission.id, missionComplete, user, userData]);

  useEffect(() => {
    if (missionComplete) return;
    if (state.power !== 'on') return;
    const ok = evalSuccess(state, mission.success_condition, fsEntries);
    if (ok) completeMissionOnce();
  }, [mission.success_condition, state, state.power, missionComplete, completeMissionOnce, fsEntries]);

  if (cooldownActive) {
    return (
      <div className="min-h-screen bg-[#050B14] relative overflow-hidden">
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-red-500/10 via-transparent to-[#050B14]" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-20">
          <Link
            href="/practicals/technology-practicality/csec-roadmap"
            className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to CSEC Roadmap
          </Link>

          <div className="mt-10 rounded-[2rem] border border-red-500/30 bg-red-500/10 p-10">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200">Cooldown Active</div>
            <div className="mt-4 text-3xl font-black text-white">Try again in {cooldownLabel}</div>
            <div className="mt-3 text-zinc-200/80">You have completed 5 missions today. Your next mission run unlocks when the timer ends.</div>
          </div>
        </div>
      </div>
    );
  }

  if (state.power === 'intro') {
    const userLabel = (userData?.displayName || userData?.username || user?.displayName || 'Student').trim() || 'Student';
    const userSeed = encodeURIComponent(userLabel || 'student');
    const userAvatarUrl = userData?.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${userSeed}&backgroundType=solid&backgroundColor=2C3E50`;
    const npcSeed = encodeURIComponent(`${mission.client.name}-${mission.id}-${npcSeedRef.current}`);
    const npcAvatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${npcSeed}&backgroundType=solid&backgroundColor=FF8A8A`;
    return (
      <PhoneMessageIntro
        mission={mission}
        userLabel={userLabel}
        userAvatarUrl={userAvatarUrl}
        npcLabel={mission.client.name}
        npcAvatarUrl={npcAvatarUrl}
        onDone={() => {
          setBriefingAccepted(true);
          setState((p) => ({ ...p, power: 'booting', boot_phase: 0 }));
        }}
      />
    );
  }

  if (state.power === 'booting') {
    const pct = Math.round((state.boot_phase / 5) * 100);
    return (
      <div className="min-h-screen bg-[#050B14] relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="w-full max-w-lg border border-white/20 bg-black/75 p-10">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">BrightOS</div>
            <div className="mt-2 text-3xl font-black text-white">Booting…</div>
            <div className="mt-6 h-3 rounded-full border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="h-full bg-[var(--brand-primary)]/60" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-3 text-xs text-zinc-300/80">Loading system services ({pct}%)</div>
          </div>
        </div>
      </div>
    );
  }

  if (state.power === 'lock') {
    return (
      <div className="min-h-screen bg-[#050B14] relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="w-full max-w-lg border border-white/20 bg-black/75 p-10">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">BrightOS Account</div>
            <div className="mt-2 text-3xl font-black text-white">Student</div>

            <div className="mt-5">
              <input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (cooldownActive) {
                      setLoginBusy(false);
                      setLoginError(`Cooldown active. Try again in ${cooldownLabel}.`);
                      return;
                    }
                    const candidate = password.trim().toLowerCase();
                    setLoginBusy(true);
                    window.setTimeout(() => {
                      if (candidate === 'brightos') {
                        setState((p) => ({ ...p, power: 'on' }));
                        notify('info', 'SYSTEM', 'Welcome back. Mission environment loaded.');
                      } else {
                        setLoginBusy(false);
                        setLoginError('Incorrect password');
                      }
                    }, 450);
                  }
                }}
                placeholder="Password"
                className="w-full h-12 border border-white/20 bg-black/20 px-4 text-sm font-mono text-white outline-none focus:border-[var(--brand-primary)]/60"
              />
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="text-xs text-zinc-400">
                  {loginError ? <span className="text-red-300">{loginError}</span> : <span>Hint: <span className="font-mono text-zinc-200">brightos</span></span>}
                </div>
                <button
                  disabled={loginBusy}
                  onClick={() => {
                    if (cooldownActive) {
                      setLoginBusy(false);
                      setLoginError(`Cooldown active. Try again in ${cooldownLabel}.`);
                      return;
                    }
                    const candidate = password.trim().toLowerCase();
                    setLoginBusy(true);
                    window.setTimeout(() => {
                      if (candidate === 'brightos') {
                        setState((p) => ({ ...p, power: 'on' }));
                        notify('info', 'SYSTEM', 'Welcome back. Mission environment loaded.');
                      } else {
                        setLoginBusy(false);
                        setLoginError('Incorrect password');
                      }
                    }, 450);
                  }}
                  className="h-12 px-6 border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/20 hover:bg-[var(--brand-primary)]/30 transition-colors text-[10px] font-black uppercase tracking-[0.25em] text-white"
                >
                  {loginBusy ? 'Verifying…' : 'Unlock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.power === 'reward') {
    const userLabel = (userData?.displayName || userData?.username || user?.displayName || 'Student').trim() || 'Student';
    const userSeed = encodeURIComponent(userLabel || 'student');
    const userAvatarUrl = userData?.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${userSeed}&backgroundType=solid&backgroundColor=2C3E50`;
    const npcSeed = encodeURIComponent(`${mission.client.name}-${mission.id}-${npcSeedRef.current}`);
    const npcAvatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${npcSeed}&backgroundType=solid&backgroundColor=FF8A8A`;
    return (
      <PhoneMessageOutro
        mission={mission}
        userLabel={userLabel}
        userAvatarUrl={userAvatarUrl}
        npcLabel={mission.client.name}
        npcAvatarUrl={npcAvatarUrl}
        xpReward={MISSION_XP_REWARD}
        bCoinReward={MISSION_BCOIN_REWARD}
        onDone={() => {
          setState((p) => ({ ...p, power: 'shutting-down' }));
        }}
      />
    );
  }

  if (state.power === 'shutting-down') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">BrightOS</div>
          <div className="mt-2 text-2xl font-black text-white">Shutting down…</div>
        </div>
      </div>
    );
  }

  if (state.power === 'off') {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center p-6">
        <div className="w-full max-w-xl border border-white/10 bg-black/40 p-10 text-center rounded-[2rem]">
          <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center text-3xl mx-auto mb-8">
            ✅
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Mission Success</div>
          <h2 className="mt-4 text-3xl font-black text-white">System Safely Offline</h2>
          <p className="mt-4 text-zinc-400">Mission accomplishments have been synced. You are ready to proceed to the next research lab.</p>

          <div className="mt-10 pt-10 border-t border-white/5 flex flex-col gap-3">
            <button
              onClick={() => router.push('/practicals/technology-practicality/csec-roadmap')}
              className="h-14 rounded-2xl bg-white text-black font-black uppercase tracking-[0.1em] hover:bg-zinc-200 transition-colors"
            >
              Return to Roadmap
            </button>
            <button
              onClick={() => window.location.reload()}
              className="h-12 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 hover:text-white transition-colors"
            >
              Restart Environment
            </button>
          </div>
        </div>
      </div>
    );
  }

  const securityPulse = state.process.high_cpu.running || Object.values(state.apps).some((a) => a.malware && a.installed);
  const fan = fanLevel(state.cpu_load);
  const batteryLabel = '78%';
  const networkLabel = state.network.status === 'Connected' ? 'WiFi' : state.network.status;

  return (
    <div className="min-h-screen bg-[#050B14] relative overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 h-screen">
        <Notifications
          items={state.notifications}
          onDismiss={(id) => {
            setState((p) => ({ ...p, notifications: p.notifications.filter((n) => n.id !== id) }));
          }}
        />

        <StartMenu
          open={startOpen}
          query={startQuery}
          setQuery={setStartQuery}
          apps={startApps}
          onLaunch={(id) => {
            setStartOpen(false);
            setStartQuery('');
            taskbarToggle(id);
          }}
          onClose={() => {
            setStartOpen(false);
          }}
          onLock={() => {
            setStartOpen(false);
            setStartQuery('');
            setState((p) => ({ ...p, power: 'lock' }));
          }}
          onToggleTheme={() => {
            setTheme((p) => (p === 'light' ? 'dark' : 'light'));
            notify('info', 'SYSTEM', 'Theme updated.');
          }}
          theme={theme}
        />

        <div className="absolute top-4 left-4 z-[200] border border-white/20 bg-black/45 px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">BrightOS Live Mission</div>
          <div className="mt-1 text-white font-black">{mission.title}</div>
          <div className="mt-1 text-xs text-zinc-300/80">{company.name} • {company.dept} • {company.hostname}</div>
        </div>

        <div className="absolute top-4 right-4 z-[200] border border-white/20 bg-black/45 px-4 py-3 max-w-[460px]">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Client</div>
          <div className="mt-1 text-sm text-zinc-200">{mission.client.dialogue_start}</div>
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Objective</div>
          <div className="mt-1 text-xs text-zinc-200/90">Fix the issue and the system will auto-check completion.</div>
          <div className="mt-3 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Steps</div>
          <div className="mt-2 grid gap-1 text-xs text-zinc-300/80">
            {mission.steps_to_solve.slice(0, 6).map((s) => (
              <div key={s} className="leading-tight">- {s}</div>
            ))}
          </div>
        </div>

        <div className="absolute left-4 top-24 z-[180] grid grid-cols-1 gap-3">
          <DesktopIcon title="Device Manager" subtitle="Drivers" icon="🧰" onOpen={() => taskbarToggle('devmgr')} disabled={stuckLock} />
          <DesktopIcon
            title="This PC"
            subtitle="File Explorer"
            icon="🖥️"
            onOpen={() => {
              setExplorerLocation('pc');
              taskbarToggle('explorer');
            }}
            disabled={stuckLock}
          />
          <DesktopIcon
            title="Recycle Bin"
            subtitle="Deleted items"
            icon="🗑️"
            onOpen={() => {
              setExplorerLocation('recycle');
              taskbarToggle('explorer');
            }}
            disabled={stuckLock}
          />
          <DesktopIcon
            title="File Explorer"
            subtitle="Browse"
            icon="📁"
            onOpen={() => {
              taskbarToggle('explorer');
            }}
            disabled={stuckLock}
          />
          <DesktopIcon title="Apps" subtitle="Uninstall" icon="📦" onOpen={() => taskbarToggle('uninstall')} disabled={stuckLock} />
          <DesktopIcon title="Registry" subtitle="Edit keys" icon="🧩" onOpen={() => taskbarToggle('registry')} disabled={stuckLock} />
          {allowedTools.includes('Terminal') && (
            <DesktopIcon title="Terminal" subtitle="Commands" icon="⌨️" onOpen={() => taskbarToggle('terminal')} disabled={stuckLock} />
          )}
          {allowedTools.includes('Task Manager') && (
            <DesktopIcon title="Task Manager" subtitle="Processes" icon="📊" onOpen={() => taskbarToggle('taskmgr')} disabled={stuckLock} />
          )}
          {allowedTools.includes('Settings') && (
            <DesktopIcon title="Settings" subtitle="System" icon="⚙️" onOpen={() => taskbarToggle('settings')} disabled={stuckLock} />
          )}
          {allowedTools.includes('Browser') && (
            <DesktopIcon title="Browser" subtitle="Web" icon="🌐" onOpen={() => taskbarToggle('browser')} disabled={stuckLock} />
          )}
          {allowedTools.includes('Automation App') && (
            <DesktopIcon title="Automation" subtitle="Lab" icon="🧠" onOpen={() => taskbarToggle('automation')} disabled={stuckLock} />
          )}
        </div>

        <Window
          win={wins.stuck_app}
          active={activeWin === 'stuck_app'}
          onClose={() => close('stuck_app')}
          onFocus={() => focus('stuck_app')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.stuck_app;
            drag.current = { id: 'stuck_app', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('stuck_app');
          }}
          onDownResize={(e: any) => {
            const w = wins.stuck_app;
            drag.current = { id: 'stuck_app', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('stuck_app');
          }}
        >
          <div className="text-sm text-zinc-200 p-6">This window is blocking your work. Close it to continue.</div>
          <div className="mt-4 text-xs text-zinc-400 p-6">Tip: click ✕ in the top-right. (Simulates a stuck app on the desktop.)</div>
        </Window>

        <Window
          win={wins.uninstall}
          active={activeWin === 'uninstall'}
          onClose={() => close('uninstall')}
          onFocus={() => focus('uninstall')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.uninstall;
            drag.current = { id: 'uninstall', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('uninstall');
          }}
          onDownResize={(e: any) => {
            const w = wins.uninstall;
            drag.current = { id: 'uninstall', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('uninstall');
          }}
        >
          <div className="p-6 h-full overflow-auto sleek-scrollbar">
            <UninstallPrograms
              apps={state.apps}
              onUninstall={(appId) => {
                setState((p) => {
                  const app = p.apps[appId];
                  if (!app || !app.installed) return p;
                  const newApps = { ...p.apps, [appId]: { ...app, installed: false } };
                  const newRegistry = { ...p.registry };
                  if (app.registryKeys) app.registryKeys.forEach((k) => delete newRegistry[k]);
                  return { ...p, apps: newApps, registry: newRegistry };
                });
                notify('info', 'SYSTEM', `Uninstalled ${appId}.`);
              }}
            />
          </div>
        </Window>

        <Window
          win={wins.registry}
          active={activeWin === 'registry'}
          onClose={() => close('registry')}
          onFocus={() => focus('registry')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.registry;
            drag.current = { id: 'registry', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('registry');
          }}
          onDownResize={(e: any) => {
            const w = wins.registry;
            drag.current = { id: 'registry', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('registry');
          }}
        >
          <div className="p-6 h-full overflow-auto sleek-scrollbar">
            <RegistryEditor
              registry={state.registry}
              onSet={(fullKey, value) => {
                setState((p) => ({ ...p, registry: { ...p.registry, [fullKey]: value } }));
                notify('info', 'SYSTEM', `Registry updated: ${fullKey}`);
              }}
              onDelete={(prefix) => {
                setState((p) => {
                  const next = { ...p.registry };
                  Object.keys(next)
                    .filter((k) => k.startsWith(prefix))
                    .forEach((k) => delete next[k]);
                  return { ...p, registry: next };
                });
                notify('info', 'SYSTEM', `Registry key deleted: ${prefix}`);
              }}
            />
          </div>
        </Window>

        <Window
          win={wins.devmgr}
          active={activeWin === 'devmgr'}
          onClose={() => close('devmgr')}
          onFocus={() => focus('devmgr')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.devmgr;
            drag.current = { id: 'devmgr', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('devmgr');
          }}
          onDownResize={(e: any) => {
            const w = wins.devmgr;
            drag.current = { id: 'devmgr', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('devmgr');
          }}
        >
          <div className="p-6 h-full overflow-auto sleek-scrollbar">
            <DeviceManagerWindow state={state} onState={(fn) => setState(fn)} onNotify={notify} />
          </div>
        </Window>

        <Window
          win={wins.mail}
          active={activeWin === 'mail'}
          onClose={() => close('mail')}
          onFocus={() => focus('mail')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.mail;
            drag.current = { id: 'mail', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('mail');
          }}
          onDownResize={(e: any) => {
            const w = wins.mail;
            drag.current = { id: 'mail', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('mail');
          }}
        >
          <div className="p-6 h-full overflow-auto sleek-scrollbar">
            <MailApp emails={inbox} />
          </div>
        </Window>

        <Window
          win={wins.chat}
          active={activeWin === 'chat'}
          onClose={() => close('chat')}
          onFocus={() => focus('chat')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.chat;
            drag.current = { id: 'chat', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('chat');
          }}
          onDownResize={(e: any) => {
            const w = wins.chat;
            drag.current = { id: 'chat', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('chat');
          }}
        >
          <div className="p-6 h-full overflow-auto sleek-scrollbar">
            <ChatApp messages={chatMessages} />
          </div>
        </Window>

        <Window
          win={wins.terminal}
          active={activeWin === 'terminal'}
          onClose={() => close('terminal')}
          onFocus={() => focus('terminal')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.terminal;
            drag.current = { id: 'terminal', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('terminal');
          }}
          onDownResize={(e: any) => {
            const w = wins.terminal;
            drag.current = { id: 'terminal', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('terminal');
          }}
        >
          <Terminal
            mission={mission}
            state={state}
            fsEntries={fsEntries}
            onFsEntries={(fn) => setFsEntries(fn)}
            lines={termLines}
            input={termInput}
            setInput={setTermInput}
            push={push}
            onState={(fn) => setState(fn)}
          />
        </Window>

        <Window
          win={wins.explorer}
          active={activeWin === 'explorer'}
          onClose={() => close('explorer')}
          onFocus={() => focus('explorer')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.explorer;
            drag.current = { id: 'explorer', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('explorer');
          }}
          onDownResize={(e: any) => {
            const w = wins.explorer;
            drag.current = { id: 'explorer', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('explorer');
          }}
        >
          <div className="p-6 h-full overflow-auto sleek-scrollbar">
            <FileExplorer
              entries={fsEntries}
              location={explorerLocation}
              onSetLocation={setExplorerLocation}
              onOpen={(path) => {
                const name = normPath(path).split('/').filter(Boolean).pop() || path;
                setState((p) => ({ ...p, file: { opened: name } }));
                notify('info', 'SYSTEM', `Opened ${path}.`);
              }}
              onDeleteToRecycle={(path) => {
                setFsEntries((prev) => moveToRecycleBin(prev, path));
                setState((p) => ({ ...p, recycle_bin: { empty: false } }));
                notify('info', 'SYSTEM', `Moved ${path} to Recycle Bin.`);
              }}
              onEmptyRecycle={() => {
                setFsEntries((prev) => prev.filter((entry) => !normPath(entry).startsWith('RecycleBin:/')));
                setState((p) => ({ ...p, recycle_bin: { empty: true } }));
                notify('info', 'SYSTEM', 'Recycle Bin emptied.');
              }}
              onCopyToDrive={(path, drive) => {
                const base = normPath(path).split('/').filter(Boolean).pop() || path;
                setFsEntries((prev) => {
                  const next = prev.map(normPath);
                  const dest = `${drive}:/${base}`;
                  if (!next.includes(dest)) next.push(dest);
                  return next;
                });
                notify('info', 'SYSTEM', `Copied ${base} to ${drive}:/`);
              }}
              onZipFolder={(path) => {
                const norm = normPath(path);
                const base = norm.replace(/\/+$/, '').split('/').filter(Boolean).pop() || 'Archive';
                const zipName = `${base}.zip`;
                setFsEntries((prev) => {
                  const next = prev.map(normPath);
                  const inSameFolder = norm.includes('/') ? norm.split('/').slice(0, -1).join('/') : 'C:';
                  const dest = `${inSameFolder}/${zipName}`.replace(/\/+/, '/');
                  if (!next.includes(dest)) next.push(dest);
                  return next;
                });
                notify('info', 'SYSTEM', `Created ${zipName}`);
              }}
              onEncryptFolder={(path) => {
                const norm = normPath(path);
                setState((p) => {
                  const existing = p.folder.encrypted_paths.map(normPath);
                  if (existing.includes(norm)) return p;
                  return { ...p, folder: { encrypted_paths: [...p.folder.encrypted_paths, norm] } };
                });
                notify('info', 'SYSTEM', `Encrypted ${path}`);
              }}
              theme={theme}
            />
          </div>
        </Window>

        <Window
          win={wins.browser}
          active={activeWin === 'browser'}
          onClose={() => close('browser')}
          onFocus={() => focus('browser')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.browser;
            drag.current = { id: 'browser', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('browser');
          }}
          onDownResize={(e: any) => {
            const w = wins.browser;
            drag.current = { id: 'browser', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('browser');
          }}
        >
          <div className="p-6 h-full overflow-auto sleek-scrollbar">
            <BrowserWindow
              mission={mission}
              state={state}
              onState={(fn) => setState(fn)}
              onNotify={notify}
            />
          </div>
        </Window>

        <Window
          win={wins.automation}
          active={activeWin === 'automation'}
          onClose={() => close('automation')}
          onFocus={() => focus('automation')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.automation;
            drag.current = { id: 'automation', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('automation');
          }}
          onDownResize={(e: any) => {
            const w = wins.automation;
            drag.current = { id: 'automation', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('automation');
          }}
        >
          <div className="p-6 h-full overflow-auto sleek-scrollbar">
            <AutomationWindow
              mission={mission}
              state={state}
              onState={(fn) => setState(fn)}
              onNotify={notify}
            />
          </div>
        </Window>

        <Window
          win={wins.taskmgr}
          active={activeWin === 'taskmgr'}
          onClose={() => close('taskmgr')}
          onFocus={() => focus('taskmgr')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.taskmgr;
            drag.current = { id: 'taskmgr', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('taskmgr');
          }}
          onDownResize={(e: any) => {
            const w = wins.taskmgr;
            drag.current = { id: 'taskmgr', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('taskmgr');
          }}
        >
          <div className="p-6 h-full overflow-auto sleek-scrollbar">
            <TaskManager
              state={state}
              onEndHighCpu={() => {
                setState((p) => ({ ...p, cpu_load: 18, process: { ...p.process, high_cpu: { running: false } } }));
                push([{ id: uid('sys'), kind: 'sys', text: 'Process ended. CPU load stabilizing.' }]);
                notify('info', 'SYSTEM', 'Background process ended. Performance improved.');
              }}
            />
          </div>
        </Window>

        <Window
          win={wins.settings}
          active={activeWin === 'settings'}
          onClose={() => close('settings')}
          onFocus={() => focus('settings')}
          theme={theme}
          onDownMove={(e: any) => {
            const w = wins.settings;
            drag.current = { id: 'settings', mode: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('settings');
          }}
          onDownResize={(e: any) => {
            const w = wins.settings;
            drag.current = { id: 'settings', mode: 'resize', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
            focus('settings');
          }}
        >
          <div className="p-6 h-full overflow-auto sleek-scrollbar">
            <Settings
              mission={mission}
              state={state}
              onCleanTmp={() => {
                setFsEntries((prev) => prev.map(normPath).filter((p) => !p.toLowerCase().endsWith('.tmp')));
                setState((p) => ({
                  ...p,
                  files: { ...p.files, tmp: { count: 0 } },
                  disk: { ...p.disk, free_space_mb: p.disk.free_space_mb + 320 },
                }));
                push([{ id: uid('sys'), kind: 'sys', text: 'Temporary files deleted.' }]);
                notify('info', 'SYSTEM', 'Storage cleanup completed.');
              }}
              onEmptyRecycle={() => {
                setFsEntries((prev) => prev.map(normPath).filter((p) => !p.startsWith('RecycleBin:/')));
                setState((p) => ({
                  ...p,
                  recycle_bin: { empty: true },
                  disk: { ...p.disk, free_space_mb: p.disk.free_space_mb + 420 },
                }));
                push([{ id: uid('sys'), kind: 'sys', text: 'Recycle Bin emptied.' }]);
                notify('info', 'SYSTEM', 'Recycle Bin emptied.');
              }}
              theme={theme}
              onToggleTheme={() => {
                setTheme((p) => (p === 'light' ? 'dark' : 'light'));
                notify('info', 'SYSTEM', 'Theme updated.');
              }}
              onState={(fn) => setState(fn)}
              onNotify={notify}
              onOpenWindow={(id) => taskbarToggle(id)}
            />
          </div>
        </Window>

        <div className="absolute left-0 right-0 bottom-0 z-[250]">
          <Taskbar
            now={now}
            tools={allowedTools}
            wins={wins}
            onToggle={taskbarToggle}
            fan={fan}
            cpu={state.cpu_load}
            securityPulse={securityPulse}
            lockedByStuck={stuckLock}
            theme={theme}
            startOpen={startOpen}
            onStart={() => {
              setStartOpen((p) => !p);
            }}
            batteryLabel={batteryLabel}
            networkLabel={networkLabel}
          />
        </div>

        <div className="absolute bottom-14 left-4 z-[210] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 max-w-[520px]">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Free-Play Objective</div>
          <div className="mt-1 text-sm text-zinc-200">Resolve the client issue and the system will validate completion.</div>
          <div className="mt-2 text-xs text-zinc-400">Tools allowed: {mission.tools_allowed.join(', ')}</div>
        </div>
      </div>
    </div>
  );
}
