'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { BrightHeading } from '@/components/system';
import { BusinessState, BusinessType } from '@/lib/economy';
import { useCinematic } from '@/components/cinematic';
import { BUSINESS_MEETINGS, MeetingDefinition } from '@/lib/cinematic/business-meeting-scenes';
import { getCharacter } from '@/lib/cinematic/character-registry';
import { getDicebearAvatarUrl } from '@/lib/avatars';

interface BusinessMeetingTabletProps {
    business: BusinessState;
    businessType: BusinessType | null;
}

const URGENCY_STYLES: Record<MeetingDefinition['urgency'], string> = {
    review: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    crisis: 'bg-red-500/10 text-red-500 border-red-500/20',
    conflict: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
};

type TabletApp = 'boom' | 'info' | 'reports' | 'phone';

const PASSCODE_LENGTH = 4;
const LOCK_CODE_KEY = 'brightos-tablet-passcode';

export default function BusinessMeetingTablet({ business, businessType }: BusinessMeetingTabletProps) {
    const { playScene, sceneHistory } = useCinematic();
    const [selectedId, setSelectedId] = useState(BUSINESS_MEETINGS[0]?.id || '');
    const [activeApp, setActiveApp] = useState<TabletApp>('boom');
    const [lockState, setLockState] = useState<'locked' | 'booting' | 'ready'>('locked');
    const [storedPasscode, setStoredPasscode] = useState<string | null>(null);
    const [setupMode, setSetupMode] = useState(false);
    const [setupCode, setSetupCode] = useState<string | null>(null);
    const [inputCode, setInputCode] = useState('');
    const [lockError, setLockError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
  }, []);
    const [speakerIndex, setSpeakerIndex] = useState(0);
    const [isAppOpen, setIsAppOpen] = useState(false);
    const [actionToast, setActionToast] = useState<string | null>(null);
    const [callControls, setCallControls] = useState({
        mute: false,
        video: true,
        share: false,
        people: false,
    });

    const selectedMeeting = useMemo(() => {
        return BUSINESS_MEETINGS.find((meeting) => meeting.id === selectedId) || BUSINESS_MEETINGS[0];
    }, [selectedId]);

    const participants = useMemo(() => {
        if (!selectedMeeting) return [];
        return selectedMeeting.participants.map((participantId) => getCharacter(participantId));
    }, [selectedMeeting]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = window.localStorage.getItem(LOCK_CODE_KEY);
        if (saved && saved.length === PASSCODE_LENGTH) {
            setStoredPasscode(saved);
            setSetupMode(false);
        } else {
            setStoredPasscode(null);
            setSetupMode(true);
        }
    }, []);

    useEffect(() => {
        if (lockState !== 'booting') return;
        const timer = setTimeout(() => {
            setLockState('ready');
        }, 1600);
        return () => clearTimeout(timer);
    }, [lockState]);

    useEffect(() => {
        if (inputCode.length !== PASSCODE_LENGTH) return;

        if (setupMode) {
            if (!setupCode) {
                setSetupCode(inputCode);
                setInputCode('');
                setLockError(null);
                return;
            }

            if (inputCode === setupCode) {
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(LOCK_CODE_KEY, inputCode);
                }
                setStoredPasscode(inputCode);
                setSetupMode(false);
                setSetupCode(null);
                setInputCode('');
                setLockError(null);
                setLockState('booting');
            } else {
                setLockError('Passcodes did not match. Try again.');
                setSetupCode(null);
                setInputCode('');
            }
            return;
        }

        if (storedPasscode && inputCode === storedPasscode) {
            setInputCode('');
            setLockError(null);
            setLockState('booting');
        } else {
            setLockError('Incorrect passcode.');
            setInputCode('');
        }
    }, [inputCode, setupMode, setupCode, storedPasscode]);

    const handleDigitPress = (digit: string) => {
        if (inputCode.length >= PASSCODE_LENGTH) return;
        setInputCode((prev) => `${prev}${digit}`);
        setLockError(null);
    };

    const handleDelete = () => {
        setInputCode((prev) => prev.slice(0, -1));
        setLockError(null);
    };

    const handleResetPasscode = () => {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(LOCK_CODE_KEY);
        }
        setStoredPasscode(null);
        setSetupMode(true);
        setSetupCode(null);
        setInputCode('');
        setLockError(null);
    };

    const handleClearInput = () => {
        setInputCode('');
        setSetupCode(null);
        setLockError(null);
    };

    useEffect(() => {
        if (!actionToast) return;
        const timer = setTimeout(() => setActionToast(null), 2400);
        return () => clearTimeout(timer);
    }, [actionToast]);

    const announceAction = (message: string) => {
        setActionToast(message);
    };

    const handleOpenApp = (appId: TabletApp, label: string) => {
        setActiveApp(appId);
        setIsAppOpen(true);
        announceAction(`${label} opened`);
    };

    useEffect(() => {
        if (participants.length === 0) return;
        setSpeakerIndex(0);
        if (participants.length === 1) return;
        const timer = setInterval(() => {
            setSpeakerIndex((prev) => (prev + 1) % participants.length);
        }, 2800);
        return () => clearInterval(timer);
    }, [participants]);

    const activeSpeakerId = participants[speakerIndex]?.id;
    const liveTranscript = selectedMeeting?.scene?.dialogue?.[0]?.text || selectedMeeting?.description || '';

    const timeLabel = useMemo(
        () => (currentTime ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'),
        [currentTime]
    );
    const dateLabel = useMemo(
        () => (currentTime ? currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : ''),
        [currentTime]
    );
    const lockPrompt = setupMode
        ? setupCode
            ? 'Confirm passcode'
            : 'Create passcode'
        : 'Enter passcode';
    const staffPreview = business.employees?.slice(0, 4) || [];
    const profit = business.totalRevenue - business.totalExpenses;
    const staffCount = business.staffCount || business.employees?.length || 0;
    const avgMorale = business.employees?.length
        ? Math.round(business.employees.reduce((sum, employee) => sum + employee.stats.morale, 0) / business.employees.length)
        : null;
    const reviewCount = business.reviewCount ?? business.reviews?.length ?? 0;
    const averageRating = business.reviews?.length
        ? Math.round((business.reviews.reduce((sum, review) => sum + review.rating, 0) / business.reviews.length) * 10) / 10
        : null;
    const mentor = getCharacter(businessType?.characterGuide ?? 'luka');
    const formatHour = (hour: number) => {
        const normalized = ((hour % 24) + 24) % 24;
        const suffix = normalized >= 12 ? 'PM' : 'AM';
        const display = normalized % 12 || 12;
        return `${display}${suffix}`;
    };
    const operatingHoursLabel = business.operatingHours
        ? `${formatHour(business.operatingHours.open)} - ${formatHour(business.operatingHours.close)}`
        : 'Always On';

    const nextMeetingTime = useMemo(
        () => (currentTime ? new Date(currentTime.getTime() + 1000 * 60 * 75) : new Date()),
        [currentTime]
    );
    const nextMeetingLabel = useMemo(
        () => nextMeetingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        [nextMeetingTime]
    );
    const worldClockData = useMemo(() => {
        const timeZones = [
            { city: 'California', tz: 'America/Los_Angeles' },
            { city: 'Chicago', tz: 'America/Chicago' },
            { city: 'New York', tz: 'America/New_York' },
            { city: 'Rome', tz: 'Europe/Rome' },
        ];

        return timeZones.map((zone) => ({
            city: zone.city,
            time: currentTime ? new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', timeZone: zone.tz }).format(currentTime) : '--:--',
        }));
    }, [currentTime]);
    const homeApps = [
        { id: 'settings', label: 'Settings', icon: '⚙️' },
        { id: 'tv', label: 'TV', icon: '📺' },
        { id: 'music', label: 'Music Harbor', icon: '🎵' },
        { id: 'giphy', label: 'Giphy', icon: '🎞️' },
        { id: 'reminders', label: 'When Did I?', icon: '✅' },
        { id: 'ferrite', label: 'Ferrite', icon: '🎙️' },
        { id: 'boom', label: 'Boom', icon: '📹', appId: 'boom' as TabletApp },
        { id: 'calendar', label: 'Calendar', icon: '📆', appId: 'info' as TabletApp },
        { id: 'mail', label: 'Mail', icon: '✉️', appId: 'phone' as TabletApp },
        { id: 'tube', label: 'Stream', icon: '▶️' },
        { id: 'news', label: 'News', icon: '📰', appId: 'reports' as TabletApp },
        { id: 'library', label: 'Library', icon: '📚' },
        { id: 'maps', label: 'Maps', icon: '🗺️' },
        { id: 'social', label: 'Social', icon: '🕊️' },
        { id: 'timer', label: 'Timery', icon: '⏱️', appId: 'boom' as TabletApp },
        { id: 'store', label: 'Store', icon: '🛍️' },
        { id: 'podcasts', label: 'Podcasts', icon: '🎧' },
        { id: 'noise', label: 'Dark Noise', icon: '🌙' },
        { id: 'arcade', label: 'Arcade', icon: '🕹️' },
        { id: 'week', label: 'Week', icon: '🗓️', appId: 'reports' as TabletApp },
        { id: 'logged', label: 'Logged', icon: '⏲️' },
        { id: 'music2', label: 'Music', icon: '🎼' },
        { id: 'play', label: 'Play', icon: '▶️', appId: 'boom' as TabletApp },
        { id: 'pause', label: 'Pause', icon: '⏸️' },
        { id: 'other', label: 'Other', icon: '🗂️' },
        { id: 'school', label: 'School', icon: '🏫' },
        { id: 'syllabi', label: 'Syllabi', icon: '📄', appId: 'info' as TabletApp },
        { id: 'homework', label: 'Homework', icon: '🎓' },
        { id: 'vocab', label: 'Vocab', icon: '🔤' },
        { id: 'workbook', label: 'Workbook', icon: '📖' },
    ];
    const dockApps = [
        { id: 'biometric', label: 'Bright ID', icon: '🧬' },
        { id: 'notes', label: 'Notes', icon: '🗒️', appId: 'info' as TabletApp },
        { id: 'analytics', label: 'Analytics', icon: '📈', appId: 'reports' as TabletApp },
        { id: 'messages', label: 'Messages', icon: '💬', appId: 'phone' as TabletApp },
        { id: 'calendar2', label: 'Calendar', icon: '📆', appId: 'info' as TabletApp },
        { id: 'mail2', label: 'Mail', icon: '✉️', appId: 'phone' as TabletApp },
        { id: 'store2', label: 'Store', icon: '🛍️' },
        { id: 'apps', label: 'Apps', icon: '🧩' },
        { id: 'boom2', label: 'Boom', icon: '📹', appId: 'boom' as TabletApp },
        { id: 'settings2', label: 'Settings', icon: '⚙️' },
    ];
    const appLabels: Record<TabletApp, string> = {
        boom: 'Boom Meetings',
        info: 'Business Info',
        reports: 'Reports',
        phone: 'Phone',
    };
    const timerLabel = '2:57:08';
    const weatherTemp = 44;
    const weatherHigh = 50;
    const weatherLow = 37;

    const recentCalls = useMemo(() => {
        if (sceneHistory.length > 0) {
            return [...sceneHistory]
                .slice(-4)
                .reverse()
                .map((entry, idx) => {
                    const meeting = BUSINESS_MEETINGS.find((item) => item.scene.id === entry.sceneId);
                    const title = meeting?.title || 'Boom Call';
                    const subtitle = meeting?.subtitle || 'Strategy Sync';
                    const date = new Date(entry.completedAt);
                    const when = Number.isNaN(date.getTime())
                        ? 'Recent'
                        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    const minutes = Math.max(5, Math.round(entry.duration / 60000));
                    return {
                        id: `${entry.sceneId}_${idx}`,
                        title,
                        subtitle,
                        when,
                        duration: `${minutes}m`,
                    };
                });
        }

        return BUSINESS_MEETINGS.slice(0, 4).map((meeting, idx) => ({
            id: meeting.id,
            title: meeting.title,
            subtitle: meeting.subtitle,
            when: idx === 0 ? 'Today' : idx === 1 ? 'Yesterday' : 'Recent',
            duration: `${18 + idx * 6}m`,
        }));
    }, [sceneHistory]);

    const handleJoin = () => {
        if (!selectedMeeting) return;
        announceAction('Joining Boom call');
        playScene(selectedMeeting.scene);
    };

    const renderAppMain = () => {
        switch (activeApp) {
            case 'boom':
                return (
                    <>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Boom Meetings</div>
                                <BrightHeading level={2} className="text-3xl m-0 text-white">{selectedMeeting.title}</BrightHeading>
                                <p className="text-[11px] text-white/60 font-semibold mt-2 max-w-xl">
                                    {selectedMeeting.description}
                                </p>
                            </div>
                            <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-right">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Net Worth</div>
                                <div className="text-xl font-black text-emerald-200">฿{(business.netWorth ?? business.cashBalance).toLocaleString()}</div>
                            </div>
                        </div>

                        <motion.div
                            className="rounded-[32px] border border-white/15 bg-[#0b1020]/90 p-5 shadow-[0_25px_60px_rgba(5,10,25,0.6)]"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <div className="flex items-center justify-between text-[10px] text-white/70 font-semibold">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="font-black tracking-widest">BOOM</span>
                                    <span className="text-white/50">{selectedMeeting.subtitle}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="uppercase tracking-widest rounded-full bg-white/10 px-2 py-1">HD</span>
                                    <span className="text-white/50">{timeLabel}</span>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {participants.map((character) => {
                                    const isActive = character.id === activeSpeakerId;
                                    return (
                                        <div
                                            key={character.id}
                                            className={`relative overflow-hidden rounded-2xl border ${isActive ? 'border-emerald-400/70 ring-2 ring-emerald-400/40' : 'border-white/10'} bg-gradient-to-br from-slate-800 to-slate-900 min-h-[150px]`}
                                        >
                                            {character.avatar ? (
                                                <Image
                                                    src={character.avatar}
                                                    alt={character.name}
                                                    fill
                                                    sizes="200px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-4xl text-white/80">
                                                    {character.emoji}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                            {isActive && (
                                                <div className="absolute top-3 left-3 flex items-end gap-1">
                                                    {[0, 1, 2, 3].map((bar) => (
                                                        <span
                                                            key={`${character.id}-wave-${bar}`}
                                                            className="boom-wave-bar w-1 rounded-full bg-emerald-300/90"
                                                            style={{
                                                                height: `${8 + bar * 4}px`,
                                                                animationDelay: `${bar * 0.12}s`
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {isActive && (
                                                <div className="absolute top-3 right-3 text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2 py-1 rounded-full">
                                                    Speaking
                                                </div>
                                            )}
                                            <div className="absolute bottom-3 left-3 right-3">
                                                <div className="text-sm font-black text-white">{character.name}</div>
                                                <div className="text-[9px] uppercase tracking-widest text-white/70">
                                                    {character.role.replace('_', ' ')}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 rounded-2xl bg-black/45 p-4">
                                <div className="text-[9px] font-black uppercase tracking-widest text-white/60">Live Transcript</div>
                                <p className="mt-2 text-[11px] text-white/80 font-semibold leading-relaxed">
                                    {liveTranscript}
                                </p>
                            </div>

                            <div className="mt-4 grid grid-cols-5 gap-2">
                                {[
                                    { id: 'mute', label: 'Mute', short: 'M', toggleKey: 'mute' },
                                    { id: 'video', label: 'Video', short: 'V', toggleKey: 'video' },
                                    { id: 'share', label: 'Share', short: 'S', toggleKey: 'share' },
                                    { id: 'people', label: 'People', short: 'P', toggleKey: 'people' },
                                    { id: 'end', label: 'End', short: 'X', danger: true }
                                ].map((control) => {
                                    const isActive = control.toggleKey
                                        ? callControls[control.toggleKey as keyof typeof callControls]
                                        : false;
                                    return (
                                        <button
                                            key={control.id}
                                            type="button"
                                            onClick={() => {
                                                if (control.danger) {
                                                    announceAction('Call ended');
                                                    setIsAppOpen(false);
                                                    return;
                                                }
                                                if (control.toggleKey) {
                                                    setCallControls((prev) => ({
                                                        ...prev,
                                                        [control.toggleKey as keyof typeof callControls]: !prev[control.toggleKey as keyof typeof callControls],
                                                    }));
                                                }
                                                announceAction(`${control.label} ${isActive ? 'off' : 'on'}`);
                                            }}
                                            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[9px] font-black uppercase tracking-widest ${control.danger
                                                ? 'bg-red-500 text-white'
                                                : isActive
                                                    ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/40'
                                                    : 'bg-white/10 text-white/80 border border-white/10'
                                                }`}
                                        >
                                            <span className="text-[11px] font-black">{control.short}</span>
                                            {control.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Cash</div>
                                <div className="text-2xl font-black text-white">฿{business.cashBalance.toLocaleString()}</div>
                            </div>
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Reputation</div>
                                <div className="text-2xl font-black text-emerald-200">{business.reputation}%</div>
                            </div>
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Orders Completed</div>
                                <div className="text-2xl font-black text-cyan-200">{business.ordersCompleted}</div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${URGENCY_STYLES[selectedMeeting.urgency]}`}>
                                {selectedMeeting.subtitle}
                            </div>
                            <motion.button
                                onClick={handleJoin}
                                className="duo-btn duo-btn-primary px-8 py-3 text-[10px]"
                                whileTap={{ scale: 0.98 }}
                            >
                                Join Boom Call
                            </motion.button>
                        </div>
                    </>
                );
            case 'info':
                return (
                    <>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Business Info</div>
                                <BrightHeading level={2} className="text-3xl m-0 text-white">{business.businessName}</BrightHeading>
                                <p className="text-[11px] text-white/60 font-semibold mt-2 max-w-xl">
                                    {businessType?.description || 'Business operations overview and team health.'}
                                </p>
                            </div>
                            <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-right">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Operating Hours</div>
                                <div className="text-lg font-black text-emerald-200">{operatingHoursLabel}</div>
                                <div className="text-[9px] uppercase tracking-widest text-white/40">{businessType?.category || 'General'}</div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Net Worth</div>
                                <div className="text-2xl font-black text-emerald-200">฿{(business.netWorth ?? business.cashBalance).toLocaleString()}</div>
                            </div>
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Cash Balance</div>
                                <div className="text-2xl font-black text-white">฿{business.cashBalance.toLocaleString()}</div>
                            </div>
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Profit</div>
                                <div className={`text-2xl font-black ${profit >= 0 ? 'text-emerald-200' : 'text-red-300'}`}>฿{profit.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Team Snapshot</div>
                            <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex -space-x-3">
                                    {staffPreview.map((employee) => (
                                        <div key={employee.id} className="h-10 w-10 rounded-full border border-white/20 bg-white/10 overflow-hidden">
                                            <Image
                                                src={getDicebearAvatarUrl(employee.id)}
                                                alt={employee.name}
                                                width={40}
                                                height={40}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ))}
                                    {staffPreview.length === 0 && (
                                        <div className="text-[10px] text-white/50">No staff yet</div>
                                    )}
                                </div>
                                <div className="text-[10px] text-white/60">
                                    {staffCount} staff • {avgMorale ?? '--'}% morale
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Mentor Channel</div>
                            <div className="mt-3 flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/20 bg-white/10">
                                    {mentor.avatar ? (
                                        <Image
                                            src={mentor.avatar}
                                            alt={mentor.name}
                                            width={48}
                                            height={48}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-2xl">{mentor.emoji}</div>
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm font-black text-white">{mentor.name}</div>
                                    <div className="text-[10px] text-white/60">{mentor.voiceTone.split('.')[0]}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => announceAction(`Message sent to ${mentor.name}`)}
                                    className="ml-auto rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/70"
                                >
                                    Message
                                </button>
                            </div>
                        </div>
                    </>
                );
            case 'reports':
                return (
                    <>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Business Reports</div>
                                <BrightHeading level={2} className="text-3xl m-0 text-white">Performance Brief</BrightHeading>
                                <p className="text-[11px] text-white/60 font-semibold mt-2 max-w-xl">
                                    Track cash flow, customer health, and growth performance in one glance.
                                </p>
                            </div>
                            <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-right">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">This Week</div>
                                <div className="text-lg font-black text-cyan-200">{dateLabel}</div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Total Revenue</div>
                                <div className="text-2xl font-black text-emerald-200">฿{business.totalRevenue.toLocaleString()}</div>
                            </div>
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Total Expenses</div>
                                <div className="text-2xl font-black text-orange-200">฿{business.totalExpenses.toLocaleString()}</div>
                            </div>
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Net Profit</div>
                                <div className={`text-2xl font-black ${profit >= 0 ? 'text-emerald-200' : 'text-red-300'}`}>฿{profit.toLocaleString()}</div>
                            </div>
                            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Orders Completed</div>
                                <div className="text-2xl font-black text-cyan-200">{business.ordersCompleted}</div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Customer Health</div>
                            <div className="mt-3 space-y-3">
                                <div>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
                                        <span>Reputation</span>
                                        <span>{business.reputation}%</span>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div className="h-full bg-emerald-400" style={{ width: `${business.reputation}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
                                        <span>Customer Pulse</span>
                                        <span>{business.customerSatisfaction ?? 70}%</span>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div className="h-full bg-cyan-400" style={{ width: `${business.customerSatisfaction ?? 70}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/60">
                                <span>Reviews</span>
                                <span className="text-white/40">{reviewCount} total</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="text-2xl font-black text-white">
                                    {averageRating ? `${averageRating}★` : '—'}
                                </div>
                                <div className="text-[10px] text-white/50">
                                    {averageRating ? 'Average Rating' : 'No reviews yet'}
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 'phone':
                return (
                    <>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Boom Phone</div>
                                <BrightHeading level={2} className="text-3xl m-0 text-white">Recent Calls</BrightHeading>
                                <p className="text-[11px] text-white/60 font-semibold mt-2 max-w-xl">
                                    Review your latest Boom conversations and reconnect with mentors.
                                </p>
                            </div>
                            <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-right">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Today</div>
                                <div className="text-lg font-black text-emerald-200">{dateLabel}</div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Call Log</div>
                            <div className="mt-3 space-y-2">
                                {recentCalls.map((call) => (
                                    <div key={call.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                                        <div>
                                            <div className="text-[11px] font-black text-white">{call.title}</div>
                                            <div className="text-[9px] uppercase tracking-widest text-white/50">
                                                {call.subtitle}
                                            </div>
                                        </div>
                                        <div className="text-[9px] text-white/50 text-right">
                                            <div>{call.when}</div>
                                            <div>{call.duration}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Mentor Hotline</div>
                                <div className="mt-3 flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/20 bg-white/10">
                                        {mentor.avatar ? (
                                            <Image
                                                src={mentor.avatar}
                                                alt={mentor.name}
                                                width={48}
                                                height={48}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-2xl">{mentor.emoji}</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-white">{mentor.name}</div>
                                        <div className="text-[9px] uppercase tracking-widest text-white/50">Mentor</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => announceAction(`Calling ${mentor.name}`)}
                                        className="ml-auto rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-200"
                                    >
                                        Call
                                    </button>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Team Hotlines</div>
                                <div className="mt-3 flex -space-x-3">
                                    {staffPreview.map((employee) => (
                                        <div key={employee.id} className="h-10 w-10 rounded-full border border-white/20 bg-white/10 overflow-hidden">
                                            <Image
                                                src={getDicebearAvatarUrl(employee.id)}
                                                alt={employee.name}
                                                width={40}
                                                height={40}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ))}
                                    {staffPreview.length === 0 && (
                                        <div className="text-[10px] text-white/50">No staff yet</div>
                                    )}
                                </div>
                                <div className="mt-2 text-[10px] text-white/50">{staffCount} staff on deck</div>
                            </div>
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    const renderAppAside = () => {
        switch (activeApp) {
            case 'boom':
                return (
                    <>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Business Info</div>
                            <div className="mt-3 space-y-3">
                                <div className="rounded-xl bg-black/30 p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-white/50">Net Worth</div>
                                    <div className="text-lg font-black text-emerald-200">฿{(business.netWorth ?? business.cashBalance).toLocaleString()}</div>
                                </div>
                                <div className="rounded-xl bg-black/30 p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-white/50">Active Team</div>
                                    <div className="text-lg font-black text-white">{staffCount} members</div>
                                </div>
                                <div className="rounded-xl bg-black/30 p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-white/50">Customer Pulse</div>
                                    <div className="text-lg font-black text-cyan-200">{business.customerSatisfaction ?? 70}%</div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Meeting Queue</div>
                            <div className="mt-3 space-y-2">
                                {BUSINESS_MEETINGS.map((meeting) => {
                                    const isActive = meeting.id === selectedMeeting.id;
                                    return (
                                        <button
                                            key={meeting.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedId(meeting.id);
                                                announceAction(`${meeting.title} selected`);
                                            }}
                                            className={`w-full rounded-xl border px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest ${isActive
                                                ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-100'
                                                : 'border-white/10 bg-white/5 text-white/70'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span>{meeting.title}</span>
                                                <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest border ${URGENCY_STYLES[meeting.urgency]}`}>
                                                    {meeting.urgency}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-[8px] font-semibold text-white/50">{meeting.subtitle}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="rounded-[28px] border border-white/10 bg-[#0a0f1a] p-4">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/60">
                                <span>Boom Phone</span>
                                <span className="text-white/40">Recent</span>
                            </div>
                            <div className="mt-3 space-y-2">
                                {recentCalls.map((call) => (
                                    <div key={call.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                        <div>
                                            <div className="text-[11px] font-black text-white">{call.title}</div>
                                            <div className="text-[9px] uppercase tracking-widest text-white/50">
                                                {call.subtitle}
                                            </div>
                                        </div>
                                        <div className="text-[9px] text-white/50 text-right">
                                            <div>{call.when}</div>
                                            <div>{call.duration}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                );
            case 'info':
                return (
                    <>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Operations Status</div>
                            <div className="mt-3 space-y-3">
                                <div className="rounded-xl bg-black/30 p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-white/50">Operating Hours</div>
                                    <div className="text-lg font-black text-emerald-200">{operatingHoursLabel}</div>
                                </div>
                                <div className="rounded-xl bg-black/30 p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-white/50">Active Staff</div>
                                    <div className="text-lg font-black text-white">{staffCount}</div>
                                </div>
                                <div className="rounded-xl bg-black/30 p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-white/50">Team Morale</div>
                                    <div className="text-lg font-black text-cyan-200">{avgMorale ?? '--'}%</div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Customer Pulse</div>
                            <div className="mt-3 space-y-3">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
                                    <span>Reputation</span>
                                    <span>{business.reputation}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full bg-emerald-400" style={{ width: `${business.reputation}%` }} />
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
                                    <span>Satisfaction</span>
                                    <span>{business.customerSatisfaction ?? 70}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full bg-cyan-400" style={{ width: `${business.customerSatisfaction ?? 70}%` }} />
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 'reports':
                return (
                    <>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Trend Highlights</div>
                            <div className="mt-3 space-y-2 text-[10px] text-white/60">
                                <div className="flex items-center justify-between">
                                    <span>Revenue</span>
                                    <span className="text-emerald-200">฿{business.totalRevenue.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Expenses</span>
                                    <span className="text-orange-200">฿{business.totalExpenses.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Net Profit</span>
                                    <span className={profit >= 0 ? 'text-emerald-200' : 'text-red-300'}>฿{profit.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Team Performance</div>
                            <div className="mt-3 space-y-3">
                                <div className="flex items-center justify-between text-[10px] text-white/50">
                                    <span>Average Morale</span>
                                    <span className="text-white">{avgMorale ?? '--'}%</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-white/50">
                                    <span>Orders Completed</span>
                                    <span className="text-white">{business.ordersCompleted}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-white/50">
                                    <span>Reviews</span>
                                    <span className="text-white">{reviewCount}</span>
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 'phone':
                return (
                    <>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Quick Dial</div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {['Call', 'Voicemail', 'New Contact'].map((label) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => announceAction(`${label} queued`)}
                                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/70"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">On Call Team</div>
                            <div className="mt-3 flex -space-x-3">
                                {staffPreview.map((employee) => (
                                    <div key={employee.id} className="h-10 w-10 rounded-full border border-white/20 bg-white/10 overflow-hidden">
                                        <Image
                                            src={getDicebearAvatarUrl(employee.id)}
                                            alt={employee.name}
                                            width={40}
                                            height={40}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ))}
                                {staffPreview.length === 0 && (
                                    <div className="text-[10px] text-white/50">No staff yet</div>
                                )}
                            </div>
                            <div className="mt-2 text-[10px] text-white/50">{staffCount} staff available</div>
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    if (!selectedMeeting) {
        return (
            <div className="duo-card p-10 text-center">
                <div className="text-4xl mb-4">📲</div>
                <p className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">No meetings scheduled</p>
            </div>
        );
    }

    return (
        <div className="relative max-w-6xl mx-auto">
            <div className="relative rounded-[42px] border-[6px] border-[#101523] bg-[#0a0e19] shadow-[0_35px_120px_rgba(2,6,23,0.65)]">
                <div className="absolute top-3 left-1/2 h-2 w-24 -translate-x-1/2 rounded-full bg-black/60 border border-white/10" />
                <div className="relative overflow-hidden rounded-[34px] min-h-[720px] bg-[#8ec6e8]">
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage:
                                'linear-gradient(135deg, rgba(84, 169, 214, 0.95) 0%, rgba(118, 196, 230, 0.95) 30%, rgba(134, 204, 142, 0.95) 47%, rgba(248, 197, 99, 0.95) 60%, rgba(232, 138, 85, 0.95) 70%, rgba(189, 105, 165, 0.95) 82%, rgba(99, 151, 204, 0.95) 100%)'
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-white/20" />

                    <div className="relative z-10 p-6 md:p-8 text-white">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-5xl font-light tracking-tight drop-shadow-md">{timeLabel}</div>
                                <div className="mt-1 text-sm text-white/80 drop-shadow">{dateLabel}</div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
                                <span className="rounded-full bg-white/30 px-2 py-1 backdrop-blur">AT&T</span>
                                <span className="rounded-full bg-white/30 px-2 py-1 backdrop-blur">WiFi</span>
                                <span className="rounded-full bg-white/30 px-2 py-1 backdrop-blur">96%</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLockState('locked');
                                        handleClearInput();
                                    }}
                                    className="rounded-full bg-white/30 px-2 py-1 text-[10px] font-black text-white/90 backdrop-blur hover:text-white"
                                >
                                    🔒
                                </button>
                            </div>
                        </div>

                        {actionToast && (
                            <div className="mt-4 inline-flex items-center rounded-full bg-white/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-lg backdrop-blur">
                                {actionToast}
                            </div>
                        )}

                        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                            <div className="space-y-4">
                                <div className="rounded-2xl bg-white/40 p-4 text-slate-900 shadow-xl backdrop-blur">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-700">
                                        <span>Up Next</span>
                                        <span className="rounded-full bg-white/60 px-2 py-1 text-[9px] font-black text-slate-700">Meeting</span>
                                    </div>
                                    <div className="mt-3 text-sm font-black text-slate-900">{selectedMeeting.title}</div>
                                    <div className="mt-1 text-[10px] font-semibold text-slate-600">{selectedMeeting.subtitle}</div>
                                    <div className="mt-2 text-[11px] font-bold text-slate-700">{nextMeetingLabel}</div>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenApp('boom', 'Boom')}
                                        className="mt-3 w-full rounded-xl bg-slate-900/90 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                                    >
                                        Join Boom Call
                                    </button>
                                </div>

                                <div className="rounded-2xl bg-white/40 p-4 text-slate-900 shadow-xl backdrop-blur">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-700">
                                        <span>Timery</span>
                                        <span className="text-slate-500">Focus Sprint</span>
                                    </div>
                                    <div className="mt-3 text-lg font-black text-slate-900">{timerLabel}</div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] font-semibold text-slate-600">
                                        <div className="rounded-xl bg-white/60 px-2 py-2">MacStories Writing</div>
                                        <div className="rounded-xl bg-white/60 px-2 py-2">Club Timer</div>
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-white/40 p-4 text-slate-900 shadow-xl backdrop-blur">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-700">World Clock</div>
                                    <div className="mt-3 grid grid-cols-2 gap-3 text-[10px] font-semibold text-slate-700">
                                        {worldClockData.map((clock) => (
                                            <div key={clock.city} className="rounded-xl bg-white/60 px-2 py-2">
                                                <div className="text-[9px] uppercase tracking-widest text-slate-500">{clock.city}</div>
                                                <div className="mt-1 text-sm font-black text-slate-900">{clock.time}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-white/40 p-4 text-slate-900 shadow-xl backdrop-blur">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-700">Carrot Weather</div>
                                    <div className="mt-3 flex items-end justify-between">
                                        <div>
                                            <div className="text-3xl font-black text-slate-900">{weatherTemp}°</div>
                                            <div className="text-[10px] font-semibold text-slate-600">Feels like {weatherTemp}°</div>
                                        </div>
                                        <div className="text-[10px] font-semibold text-slate-600">
                                            High {weatherHigh}° • Low {weatherLow}°
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-1 text-[8px] font-semibold uppercase tracking-widest text-slate-500">
                                        {['10AM', '1PM', '4PM', '7PM', '10PM'].map((label) => (
                                            <span key={label} className="rounded-full bg-white/60 px-2 py-1">{label}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
                                    {homeApps.map((app) => (
                                        <button
                                            key={app.id}
                                            type="button"
                                            onClick={() =>
                                                app.appId
                                                    ? handleOpenApp(app.appId, app.label)
                                                    : announceAction(`${app.label} opened`)
                                            }
                                            className="group flex flex-col items-center gap-2 text-white"
                                        >
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-lg backdrop-blur transition group-hover:-translate-y-1">
                                                {app.icon}
                                            </div>
                                            <span className="text-[10px] font-semibold drop-shadow">{app.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 rounded-[28px] bg-white/35 px-6 py-3 shadow-2xl backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                                {dockApps.map((app) => (
                                    <button
                                        key={app.id}
                                        type="button"
                                        onClick={() =>
                                            app.appId
                                                ? handleOpenApp(app.appId, app.label)
                                                : announceAction(`${app.label} opened`)
                                        }
                                        className="flex flex-col items-center gap-1 text-white"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-xl shadow-md">
                                            {app.icon}
                                        </div>
                                        <span className="text-[9px] font-semibold drop-shadow">{app.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {isAppOpen && (
                            <motion.div
                                className="absolute inset-4 z-20 rounded-[32px] border border-white/20 bg-[#0b1020]/95 p-6 text-white shadow-[0_40px_120px_rgba(2,6,23,0.75)] backdrop-blur"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">{appLabels[activeApp]}</div>
                                        <div className="text-sm text-white/70">BrightOS Meeting Tablet</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAppOpen(false);
                                            announceAction('Closed app');
                                        }}
                                        className="rounded-full bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white"
                                    >
                                        Close
                                    </button>
                                </div>
                                <div className="mt-4 max-h-[62vh] overflow-y-auto pr-2">
                                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                                        <div className="space-y-5">{renderAppMain()}</div>
                                        <aside className="space-y-4">{renderAppAside()}</aside>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {lockState === 'locked' && (
                            <motion.div
                                className="absolute inset-0 z-30 flex items-center justify-center bg-[#05070f]/95"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <motion.div
                                    className="relative z-10 flex w-full max-w-md flex-col items-center px-6 text-center"
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.03 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <div className="text-xs uppercase tracking-[0.6em] text-emerald-200/80">Bright OS</div>
                                    <div className="mt-4 text-4xl font-black text-white">{timeLabel}</div>
                                    <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-white/50">{dateLabel}</div>
                                    <div className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/60">{lockPrompt}</div>
                                    <div className="mt-4 flex items-center justify-center gap-3">
                                        {Array.from({ length: PASSCODE_LENGTH }).map((_, idx) => (
                                            <span
                                                key={`passcode-dot-${idx}`}
                                                className={`h-3 w-3 rounded-full border ${inputCode.length > idx ? 'bg-emerald-400 border-emerald-400' : 'border-white/20'}`}
                                            />
                                        ))}
                                    </div>
                                    {lockError && (
                                        <div className="mt-3 text-[9px] font-black uppercase tracking-[0.3em] text-red-300">{lockError}</div>
                                    )}
                                    {setupMode && setupCode && !lockError && (
                                        <div className="mt-2 text-[9px] uppercase tracking-[0.25em] text-white/40">Confirm your new passcode</div>
                                    )}
                                    <div className="mt-8 grid w-full grid-cols-3 gap-3">
                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                                            <button
                                                key={`digit-${digit}`}
                                                type="button"
                                                onClick={() => handleDigitPress(digit)}
                                                className="rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-black text-white/90"
                                            >
                                                {digit}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={handleClearInput}
                                            className="rounded-2xl border border-white/10 bg-white/5 py-3 text-[9px] font-black uppercase tracking-widest text-white/60"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDigitPress('0')}
                                            className="rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-black text-white/90"
                                        >
                                            0
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="rounded-2xl border border-white/10 bg-white/5 py-3 text-[9px] font-black uppercase tracking-widest text-white/60"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                    {storedPasscode && (
                                        <button
                                            type="button"
                                            onClick={handleResetPasscode}
                                            className="mt-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-white"
                                        >
                                            Reset passcode
                                        </button>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {lockState === 'booting' && (
                            <motion.div
                                className="absolute inset-0 z-20 flex items-center justify-center bg-[#05070f]"
                                initial={{ opacity: 1 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <motion.div
                                    className="text-center"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.02 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <div className="text-xs uppercase tracking-[0.6em] text-emerald-200/80">Bright OS</div>
                                    <div className="mt-3 text-3xl font-black text-white">Powering On</div>
                                    <div className="mt-4 flex items-center justify-center gap-2">
                                        {[0, 1, 2].map((dot) => (
                                            <span
                                                key={`boot-dot-${dot}`}
                                                className="brightos-boot-dot h-2 w-2 rounded-full bg-emerald-400/80"
                                                style={{ animationDelay: `${dot * 0.2}s` }}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );

}