'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BUSINESS_MEETINGS } from '@/lib/cinematic/business-meeting-scenes';

export type IpadReplicaProps = {
  businessName?: string;
  businessHealth?: number;
  contactName?: string;
  variant?: 'business' | 'tech';
};

type AppId = 'home' | 'boom' | 'stocks' | 'mail';

type EmailItem = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  receivedAt: Date;
  unread: boolean;
};

type CallItem = {
  id: string;
  name: string;
  type: 'missed' | 'incoming' | 'outgoing';
  when: string;
};

type StockItem = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: string;
};

type Network = {
  id: string;
  name: string;
  secured: boolean;
  strength: 'full' | 'mid' | 'low';
};

const DEFAULT_NETWORKS: Network[] = [
  { id: 'digicel-tt', name: 'Digicel TT 5G', secured: true, strength: 'full' },
  { id: 'hq-guest', name: 'BrightEd HQ Guest', secured: false, strength: 'mid' },
  { id: 'studio', name: 'Studio Mesh', secured: true, strength: 'mid' },
  { id: 'lobby', name: 'Lobby Wi-Fi', secured: false, strength: 'low' },
];

const STOCK_TICKERS: StockItem[] = [
  { symbol: 'BRED', name: 'BrightEd Group', price: 128.42, change: 1.2, volume: '4.2M' },
  { symbol: 'CARB', name: 'Carib Retail', price: 82.12, change: -0.4, volume: '1.1M' },
  { symbol: 'TELX', name: 'TelX Mobile', price: 44.7, change: 0.9, volume: '620K' },
  { symbol: 'AGRH', name: 'AgriHub', price: 33.05, change: 2.1, volume: '2.8M' },
  { symbol: 'FLEX', name: 'Flex Logistics', price: 59.34, change: -1.3, volume: '980K' },
];

const POSITIVE_EMAILS = [
  {
    from: 'alerts@brighted-payments.com',
    subject: 'Sales spike confirmed',
    preview: 'Revenue jumped 14% in the last 24 hours.',
    body: 'Payments settled successfully. Your store recorded a 14% revenue spike in the last 24 hours. Inventory levels remain healthy. Recommend highlighting best sellers in the Boom Meetings recap.',
  },
  {
    from: 'community@brighted.com',
    subject: 'Five new reviews posted',
    preview: 'Customers love the new service bundle.',
    body: 'Five new reviews were posted in the last hour. Average rating: 4.8/5. Customers praised the turnaround time and clarity of communication.',
  },
  {
    from: 'partner@logistica.co',
    subject: 'Delivery performance: 98% on-time',
    preview: 'Quarterly metrics are trending up.',
    body: 'On-time delivery rate hit 98% this quarter. This helps the team qualify for the premium route program.',
  },
];

const NEUTRAL_EMAILS = [
  {
    from: 'ops@brighted.com',
    subject: 'Daily operations summary',
    preview: 'Staffing, inventory, and queue status inside.',
    body: 'Daily operations summary: staffing at 92%, inventory at 88%, customer queue stable. No urgent issues flagged.',
  },
  {
    from: 'it-help@brighted.com',
    subject: 'System maintenance window',
    preview: 'Software update scheduled for tonight.',
    body: 'Reminder: standard system maintenance begins at 11:30 PM. Expect a brief outage of non-critical services.',
  },
];

const NEGATIVE_EMAILS = [
  {
    from: 'support@brighted.com',
    subject: 'Customer escalation received',
    preview: 'One high-value client requested a follow-up.',
    body: 'A high-value client requested a follow-up regarding service delays. Recommend assigning a senior staff member and acknowledging within 30 minutes.',
  },
  {
    from: 'billing@brighted.com',
    subject: 'Invoice overdue alert',
    preview: 'Two invoices are now past due.',
    body: 'Two invoices are past due by 4 days. Collections workflow has been queued for review.',
  },
];

const DEFAULT_CALLS: CallItem[] = [
  { id: 'call-1', name: 'Operations Lead', type: 'incoming', when: '2m ago' },
  { id: 'call-2', name: 'Inventory Manager', type: 'outgoing', when: '24m ago' },
  { id: 'call-3', name: 'Customer Success', type: 'missed', when: '1h ago' },
  { id: 'call-4', name: 'Vendor Support', type: 'incoming', when: '2h ago' },
];

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function nextEmailId() {
  return `email_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function pickEmailPool(health: number) {
  if (health >= 72) return POSITIVE_EMAILS;
  if (health >= 45) return NEUTRAL_EMAILS;
  return NEGATIVE_EMAILS;
}

function pickWeightedEmail(health: number) {
  const pool = pickEmailPool(health);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: nextEmailId(),
    from: pick.from,
    subject: pick.subject,
    preview: pick.preview,
    body: pick.body,
    receivedAt: new Date(),
    unread: true,
  } as EmailItem;
}

export default function IpadReplica({
  businessName = 'BrightEd Studio',
  businessHealth = 78,
  contactName = 'Owner',
  variant = 'business',
}: IpadReplicaProps) {
  const [activeApp, setActiveApp] = useState<AppId>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState(DEFAULT_NETWORKS[0]);
  const [wallpaper, setWallpaper] = useState('ocean');
  const [accent, setAccent] = useState('emerald');
  const [autoUpdates, setAutoUpdates] = useState(true);
  const [brightness, setBrightness] = useState(0.82);
  const [stockItems, setStockItems] = useState<StockItem[]>(STOCK_TICKERS);
  const [emails, setEmails] = useState<EmailItem[]>(() => {
    return [pickWeightedEmail(businessHealth), pickWeightedEmail(businessHealth)].map((e, idx) => ({
      ...e,
      id: `${e.id}_${idx}`,
      unread: idx === 0,
    }));
  });
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [calls] = useState<CallItem[]>(DEFAULT_CALLS);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [tab, setTab] = useState<'mail' | 'calls'>('mail');
  const [now, setNow] = useState(() => new Date());
  const emailTimerRef = useRef<number | null>(null);

  const wallpaperClass = useMemo(() => {
    switch (wallpaper) {
      case 'sunrise':
        return 'from-orange-500 via-rose-500 to-indigo-600';
      case 'midnight':
        return 'from-slate-950 via-slate-900 to-indigo-900';
      case 'mint':
        return 'from-emerald-400 via-teal-400 to-cyan-500';
      default:
        return 'from-sky-500 via-blue-600 to-indigo-600';
    }
  }, [wallpaper]);

  const accentClass = useMemo(() => {
    switch (accent) {
      case 'amber':
        return 'text-amber-200 bg-amber-500/10 border-amber-300/30';
      case 'rose':
        return 'text-rose-200 bg-rose-500/10 border-rose-300/30';
      case 'cyan':
        return 'text-cyan-200 bg-cyan-500/10 border-cyan-300/30';
      default:
        return 'text-emerald-200 bg-emerald-500/10 border-emerald-300/30';
    }
  }, [accent]);

  const appIcons = [
    { id: 'boom' as const, label: 'Boom Meetings', icon: '🎥' },
    { id: 'stocks' as const, label: 'Stock Market', icon: '📈' },
    { id: 'mail' as const, label: 'Mails / Calls', icon: '✉️' },
  ];

  const meetings = useMemo(() => {
    if (variant === 'business') {
      return BUSINESS_MEETINGS.slice(0, 4).map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        subtitle: meeting.subtitle,
        time: meeting.urgency === 'crisis' ? 'Now' : 'Today · 2:30 PM',
      }));
    }
    return [
      { id: 'cyber-standup', title: 'Cyber Response Standup', subtitle: 'Incident status + next steps', time: 'Now' },
      { id: 'patch-review', title: 'Patch Review', subtitle: 'Maintenance priorities', time: 'Today · 3:45 PM' },
      { id: 'client-sync', title: 'Client Sync', subtitle: 'Service update', time: 'Tomorrow · 9:00 AM' },
    ];
  }, [variant]);

  const inbox = useMemo(() => {
    const sorted = [...emails].sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
    if (!selectedEmailId && sorted[0]) {
      setSelectedEmailId(sorted[0].id);
    }
    return sorted;
  }, [emails, selectedEmailId]);

  const selectedEmail = useMemo(() => {
    if (!selectedEmailId) return null;
    return emails.find((email) => email.id === selectedEmailId) || null;
  }, [emails, selectedEmailId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateStocks = () => {
      setStockItems((prev) =>
        prev.map((stock) => {
          const direction = businessHealth > 60 ? 1 : -1;
          const delta = (Math.random() * 1.4 + 0.2) * (Math.random() > 0.55 ? 1 : -1) * direction;
          const nextPrice = Math.max(5, stock.price + delta);
          return {
            ...stock,
            price: Number(nextPrice.toFixed(2)),
            change: Number((stock.change + delta / 2).toFixed(2)),
          };
        })
      );
    };

    const id = window.setInterval(updateStocks, 4200);
    return () => window.clearInterval(id);
  }, [businessHealth]);

  useEffect(() => {
    if (emailTimerRef.current) {
      window.clearInterval(emailTimerRef.current);
    }

    const cadence = businessHealth >= 75 ? 8000 : businessHealth >= 55 ? 12000 : 16000;
    emailTimerRef.current = window.setInterval(() => {
      setEmails((prev) => [pickWeightedEmail(businessHealth), ...prev].slice(0, 12));
    }, cadence);

    return () => {
      if (emailTimerRef.current) {
        window.clearInterval(emailTimerRef.current);
      }
    };
  }, [businessHealth]);

  useEffect(() => {
    if (!selectedEmail) return;
    if (!selectedEmail.unread) return;
    setEmails((prev) =>
      prev.map((email) => (email.id === selectedEmail.id ? { ...email, unread: false } : email))
    );
  }, [selectedEmail]);

  const handleCall = (name: string) => {
    setCallStatus(`Calling ${name}...`);
    window.setTimeout(() => setCallStatus(`${name} connected.`), 1200);
    window.setTimeout(() => setCallStatus(null), 4200);
  };

  return (
    <div className="w-full flex justify-center">
      <div className="relative w-full max-w-6xl">
        <div className="relative rounded-[44px] border-[6px] border-slate-900 bg-slate-950 shadow-[0_40px_120px_rgba(15,23,42,0.45)]">
          <div className="absolute top-3 left-1/2 h-2 w-24 -translate-x-1/2 rounded-full bg-black/60 border border-white/10" />
          <div className={`relative overflow-hidden rounded-[36px] min-h-[680px] bg-gradient-to-br ${wallpaperClass}`}>
            <div className="absolute inset-0 bg-black/30" style={{ opacity: 1 - brightness }} />
            <div className="relative z-10 p-6 text-white">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/70">
                <div className="flex items-center gap-2">
                  <span className="font-black">Digicel TT</span>
                  <span className="text-white/50">•</span>
                  <span>{formatTime(now)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold tracking-[0.25em] text-white/80"
                >
                  SETTINGS
                </button>
              </div>

              <div className="mt-10">
                {activeApp === 'home' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {appIcons.map((app) => (
                      <button
                        key={app.id}
                        onClick={() => setActiveApp(app.id)}
                        className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/10 py-6 hover:bg-white/15 transition"
                      >
                        <span className="text-3xl">{app.icon}</span>
                        <span className="text-sm font-semibold tracking-wide">{app.label}</span>
                      </button>
                    ))}
                    <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
                      <div className="text-xs uppercase tracking-[0.3em] text-white/60">Device</div>
                      <div className="mt-3 text-lg font-semibold">{businessName}</div>
                      <div className="mt-1 text-sm text-white/70">Owner: {contactName}</div>
                      <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${accentClass}`}>
                        Performance score: {Math.round(businessHealth)}
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeApp === 'boom' ? (
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.3em] text-emerald-200">Boom Meetings</div>
                        <div className="mt-2 text-2xl font-semibold">Live sessions ready</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveApp('home')}
                        className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/70"
                      >
                        Home
                      </button>
                    </div>
                    <div className="mt-6 space-y-4">
                      {meetings.map((meeting) => (
                        <div key={meeting.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold">{meeting.title}</div>
                            <div className="text-xs text-white/60">{meeting.subtitle}</div>
                            <div className="text-[11px] text-white/50 mt-1">{meeting.time}</div>
                          </div>
                          <button className="rounded-full bg-emerald-500/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em]">Join</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeApp === 'stocks' ? (
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.3em] text-cyan-200">Stock Market</div>
                        <div className="mt-2 text-2xl font-semibold">Live pricing</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveApp('home')}
                        className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/70"
                      >
                        Home
                      </button>
                    </div>
                    <div className="mt-6 space-y-3">
                      {stockItems.map((stock) => (
                        <div key={stock.symbol} className="rounded-2xl border border-white/10 bg-black/30 p-4 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold">{stock.symbol}</div>
                            <div className="text-xs text-white/60">{stock.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">${stock.price.toFixed(2)}</div>
                            <div className={`text-xs ${stock.change >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                            </div>
                            <div className="text-[10px] text-white/50">Vol {stock.volume}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeApp === 'mail' ? (
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.3em] text-white/60">Mails / Calls</div>
                        <div className="mt-2 text-2xl font-semibold">Always on with live updates</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTab('mail')}
                          className={`rounded-full px-4 py-1 text-[11px] uppercase tracking-[0.25em] ${tab === 'mail' ? 'bg-white/20' : 'border border-white/20'}`}
                        >
                          Mail
                        </button>
                        <button
                          type="button"
                          onClick={() => setTab('calls')}
                          className={`rounded-full px-4 py-1 text-[11px] uppercase tracking-[0.25em] ${tab === 'calls' ? 'bg-white/20' : 'border border-white/20'}`}
                        >
                          Calls
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveApp('home')}
                          className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/70"
                        >
                          Home
                        </button>
                      </div>
                    </div>

                    {tab === 'mail' ? (
                      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                          <div className="px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-white/60">Inbox</div>
                          <div className="max-h-[320px] overflow-auto">
                            {inbox.map((email) => (
                              <button
                                key={email.id}
                                onClick={() => setSelectedEmailId(email.id)}
                                className={`w-full text-left px-4 py-3 border-t border-white/5 hover:bg-white/10 ${selectedEmailId === email.id ? 'bg-white/15' : ''}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-semibold">{email.subject}</div>
                                  {email.unread ? <span className="h-2 w-2 rounded-full bg-emerald-300" /> : null}
                                </div>
                                <div className="text-[11px] text-white/60">{email.from}</div>
                                <div className="text-[11px] text-white/50 truncate">{email.preview}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          {selectedEmail ? (
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">From</div>
                              <div className="text-sm font-semibold mt-1">{selectedEmail.from}</div>
                              <div className="mt-3 text-[10px] uppercase tracking-[0.3em] text-white/50">Subject</div>
                              <div className="text-sm font-semibold mt-1">{selectedEmail.subject}</div>
                              <div className="mt-4 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{selectedEmail.body}</div>
                              <div className="mt-4 text-[11px] text-white/40">Received at {formatTime(selectedEmail.receivedAt)}</div>
                            </div>
                          ) : (
                            <div className="text-sm text-white/70">Select an email to read.</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 space-y-3">
                        {callStatus ? (
                          <div className="rounded-2xl border border-white/10 bg-emerald-500/20 px-4 py-3 text-sm font-semibold">{callStatus}</div>
                        ) : null}
                        {calls.map((call) => (
                          <div key={call.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold">{call.name}</div>
                              <div className="text-[11px] text-white/60">{call.type} · {call.when}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCall(call.name)}
                              className="rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em]"
                            >
                              Call
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mt-8 flex items-center justify-between rounded-3xl border border-white/10 bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/60">
                <div>Connected: {wifiEnabled ? selectedNetwork.name : 'Wi-Fi Off'}</div>
                <div>{formatDate(now)}</div>
                <div>Bluetooth: {bluetoothEnabled ? 'On' : 'Off'}</div>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {settingsOpen ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="absolute inset-0 z-30 flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-slate-950/70" onClick={() => setSettingsOpen(false)} />
              <div className="relative w-[90%] max-w-4xl rounded-3xl border border-white/10 bg-slate-950/95 p-6 text-white shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-white/50">Settings</div>
                    <div className="mt-2 text-2xl font-semibold">Customize your iPad</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/70"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-white/50">Connectivity</div>
                    <div className="mt-4 space-y-3 text-sm">
                      <label className="flex items-center justify-between">
                        <span>Wi-Fi</span>
                        <input type="checkbox" checked={wifiEnabled} onChange={() => setWifiEnabled((p) => !p)} />
                      </label>
                      <label className="flex items-center justify-between">
                        <span>Bluetooth</span>
                        <input type="checkbox" checked={bluetoothEnabled} onChange={() => setBluetoothEnabled((p) => !p)} />
                      </label>
                      <div className="text-[11px] uppercase tracking-[0.3em] text-white/50 mt-4">Connected Wi-Fi</div>
                      <div className="space-y-2">
                        {DEFAULT_NETWORKS.map((network) => (
                          <button
                            key={network.id}
                            type="button"
                            onClick={() => setSelectedNetwork(network)}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${selectedNetwork.id === network.id ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{network.name}</span>
                              <span className="text-[10px] text-white/50">{network.secured ? 'Secured' : 'Open'}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-white/50">System</div>
                    <div className="mt-4 space-y-4 text-sm">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">Software Update</div>
                        <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-sm font-semibold">iPadOS 18.4 ready</div>
                          <div className="text-xs text-white/60">Includes security fixes + performance upgrades.</div>
                          <button className="mt-3 rounded-full bg-white/20 px-4 py-1 text-[11px] uppercase tracking-[0.25em]">Install</button>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">Auto Updates</div>
                        <label className="flex items-center justify-between mt-2">
                          <span>Download updates automatically</span>
                          <input type="checkbox" checked={autoUpdates} onChange={() => setAutoUpdates((p) => !p)} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-white/50">Appearance</div>
                    <div className="mt-4 space-y-3">
                      <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">Wallpapers</div>
                      <div className="flex flex-wrap gap-2">
                        {['ocean', 'sunrise', 'midnight', 'mint'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setWallpaper(option)}
                            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.25em] ${wallpaper === option ? 'border-white/60 bg-white/20' : 'border-white/10'}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">Accent</div>
                      <div className="flex flex-wrap gap-2">
                        {['emerald', 'amber', 'rose', 'cyan'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setAccent(option)}
                            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.25em] ${accent === option ? 'border-white/60 bg-white/20' : 'border-white/10'}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-white/50">Display</div>
                    <div className="mt-4">
                      <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">Brightness</div>
                      <input
                        type="range"
                        min={0.4}
                        max={1}
                        step={0.02}
                        value={brightness}
                        onChange={(event) => setBrightness(Number(event.target.value))}
                        className="mt-2 w-full"
                      />
                      <div className="mt-2 text-xs text-white/60">Adjust screen brightness for comfort.</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
