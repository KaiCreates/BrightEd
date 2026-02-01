'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { SocialHubProvider, useSocialHub } from '@/lib/social-hub-context'
import { useAuth } from '@/lib/auth-context'
import { DMWindow } from '@/components/social/DMWindow'
import { storage } from '@/lib/firebase'
import { getDownloadURL, ref } from 'firebase/storage'
import { WhiteboardSession } from '@/components/whiteboard/WhiteboardSession'
import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'

type DistrictId = 'lobby' | 'business' | 'tech' | 'science' | 'exam'

type DistrictChannel = {
  id: string
  name: string
}

type District = {
  id: DistrictId
  name: string
  icon: string
  accent: 'cyan' | 'gold'
  channels: DistrictChannel[]
  color: string
  shadow: string
}

const DISTRICTS: District[] = [
  {
    id: 'lobby',
    name: 'The Lobby',
    icon: '🏠',
    accent: 'cyan',
    channels: [{ id: 'announcements', name: 'announcements' }, { id: 'introductions', name: 'introductions' }],
    color: '#58CC02', // Duo Green
    shadow: '#46A302',
  },
  {
    id: 'business',
    name: 'Business District',
    icon: '💼',
    accent: 'gold',
    channels: [{ id: 'pob-help', name: 'pob-help' }, { id: 'poe-help', name: 'poe-help' }, { id: 'accounts-help', name: 'accounts-help' }],
    color: '#1CB0F6', // Duo Blue
    shadow: '#1899D6',
  },
  {
    id: 'tech',
    name: 'Tech Hub',
    icon: '🔌',
    accent: 'cyan',
    channels: [
      { id: 'network-help', name: 'network-help' },
      { id: 'programming-logic', name: 'programming-logic' },
      { id: 'hardware-repair', name: 'hardware-repair' },
    ],
    color: '#CE82FF', // Duo Purple
    shadow: '#A568CC',
  },
  {
    id: 'science',
    name: 'Science Lab',
    icon: '🧪',
    accent: 'cyan',
    channels: [{ id: 'chemistry', name: 'chemistry' }, { id: 'biology', name: 'biology' }, { id: 'physics', name: 'physics' }],
    color: '#FF9600', // Duo Orange
    shadow: '#CC7800',
  },
  {
    id: 'exam',
    name: 'Exam HQ',
    icon: '🎓',
    accent: 'cyan',
    channels: [{ id: 'past-paper-help', name: 'past-paper-help' }, { id: 'exam-strategy', name: 'exam-strategy' }],
    color: '#FF4B4B', // Duo Red
    shadow: '#D33131',
  },
]

function getRoomId(districtId: string, channelId: string) {
  return `community_${districtId}_${channelId}`
}

function isSameGroup(prev: any | null, cur: any) {
  if (!prev) return false
  if (prev.senderId !== cur.senderId) return false
  const prevTs = prev.timestamp?.toDate?.() as Date | undefined
  const curTs = cur.timestamp?.toDate?.() as Date | undefined
  if (!prevTs || !curTs) return false
  return curTs.getTime() - prevTs.getTime() < 2 * 60 * 1000
}

function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null
  const label = names.length === 1 ? `${names[0]} is typing` : `${names[0]} and ${names.length - 1} others are typing`
  return (
    <div className="px-6 pb-2">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/10 border border-white/5 backdrop-blur-md">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{label}</span>
        <span className="inline-flex items-end gap-1">
          <span className="w-1 h-1 rounded-full bg-[var(--brand-primary)]" style={{ animation: 'bounce 0.6s infinite', animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-[var(--brand-primary)]" style={{ animation: 'bounce 0.6s infinite', animationDelay: '100ms' }} />
          <span className="w-1 h-1 rounded-full bg-[var(--brand-primary)]" style={{ animation: 'bounce 0.6s infinite', animationDelay: '200ms' }} />
        </span>
      </div>
    </div>
  )
}

function RankPill({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-pill)] text-[10px] font-black uppercase tracking-widest text-black bg-gradient-to-r from-yellow-400 to-orange-400 shadow-[0_0_16px_rgba(255,191,0,0.20)]">
        <span aria-hidden="true">👑</span>
        #1 Scholar
      </span>
    )
  }
  if (rank <= 10) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-[var(--radius-pill)] text-[10px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-slate-300/30 to-indigo-400/30 border border-white/10">
        Top 10
      </span>
    )
  }
  return null
}

function CommunityHubInner() {
  const {
    activeRoom,
    setActiveRoom,
    messages,
    sendMessage,
    addReaction,
    editMessage,
    deleteMessage,
    openDM,
    dmWindows,
    closeDM,
    toggleDMMinimize,
    onlineUsers,
    typingUsers,
    setTyping,
    blockUser,
    unblockUser,
    muteUser,
    unmuteUser,
    reportMessage,
    reportUser,
    reportRoom,
    blockedUsers,
    mutedUsers,
    createPrivateRoom,
    joinRoom,
  } = useSocialHub()

  const { user, userData } = useAuth()

  const [activeDistrictId, setActiveDistrictId] = useState<DistrictId>('lobby')
  const [activeChannelId, setActiveChannelId] = useState<string>(DISTRICTS[0].channels[0]?.id || 'announcements')

  const [messageText, setMessageText] = useState('')
  const [isOffline, setIsOffline] = useState(false)

  const [rankByUserId, setRankByUserId] = useState<Record<string, number>>({})

  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false)
  const [whiteboardSeed, setWhiteboardSeed] = useState(0)
  const [whiteboardBoardId, setWhiteboardBoardId] = useState<string | null>(null)
  const [whiteboardBoardName, setWhiteboardBoardName] = useState<string>('Untitled Board')
  const [pendingWhiteboardAnnounce, setPendingWhiteboardAnnounce] = useState(false)

  const createBoardId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`
  }

  const openNewWhiteboard = () => {
    const id = createBoardId()
    setWhiteboardBoardId(id)
    setWhiteboardBoardName('Untitled Board')
    setWhiteboardSeed((s) => s + 1)
    setIsWhiteboardOpen(true)
    setPendingWhiteboardAnnounce(true)
  }

  const openExistingWhiteboard = (id: string, name?: string | null) => {
    setWhiteboardBoardId(id)
    setWhiteboardBoardName(name || 'Untitled Board')
    setWhiteboardSeed((s) => s + 1)
    setIsWhiteboardOpen(true)
    setPendingWhiteboardAnnounce(false)
  }

  useEffect(() => {
    if (!pendingWhiteboardAnnounce) return
    if (!isWhiteboardOpen) return
    if (!activeRoom?.id) return
    if (!whiteboardBoardId) return

    sendMessage(`🧠 Whiteboard session started: ${whiteboardBoardName}`, undefined, {
      kind: 'whiteboard',
      whiteboardId: whiteboardBoardId,
      whiteboardName: whiteboardBoardName,
    }).catch(() => { })

    setPendingWhiteboardAnnounce(false)
  }, [activeRoom?.id, isWhiteboardOpen, pendingWhiteboardAnnounce, sendMessage, whiteboardBoardId, whiteboardBoardName])

  const [fileUploading, setFileUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null)
  const [mobileActionsFor, setMobileActionsFor] = useState<string | null>(null)

  const xpPct = useMemo(() => {
    const xp = typeof userData?.xp === 'number' ? userData.xp : 0
    const levelSize = 1000
    const prev = Math.floor(xp / levelSize) * levelSize
    const next = prev + levelSize
    const pct = next === prev ? 0 : (xp - prev) / (next - prev)
    return Math.max(0, Math.min(1, pct))
  }, [userData?.xp])

  const activeDistrict = useMemo(() => DISTRICTS.find((d) => d.id === activeDistrictId) || DISTRICTS[0], [activeDistrictId])
  const channels = activeDistrict.channels

  useEffect(() => {
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)

    setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  useEffect(() => {
    let cancelled = false

    const fetchRanks = async () => {
      if (!user) return
      try {
        const cacheKey = 'brighted_rank_xp_top10'
        const cacheRaw = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null
        if (cacheRaw) {
          const cached = JSON.parse(cacheRaw)
          if (cached?.at && Date.now() - Number(cached.at) < 10 * 60 * 1000 && cached?.map) {
            if (!cancelled) setRankByUserId(cached.map)
            return
          }
        }

        const token = await user.getIdToken()
        const res = await fetch('/api/leaderboards?' + new URLSearchParams({ type: 'xp', limit: '10' }), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const payload = await res.json()
        const entries = Array.isArray(payload?.entries) ? payload.entries : []
        const map: Record<string, number> = {}
        entries.forEach((e: any) => {
          if (e?.id) map[String(e.id)] = Number(e.rank) || 0
        })
        if (!cancelled) setRankByUserId(map)
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), map }))
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    }

    fetchRanks()
    const t = window.setInterval(fetchRanks, 10 * 60_000)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [user])

  useEffect(() => {
    const channel = channels.find((c) => c.id === activeChannelId) || channels[0]
    if (!channel) return

    const roomId = getRoomId(activeDistrict.id, channel.id)
    const roomName = `#${channel.name}`

    setActiveRoom({
      id: roomId,
      name: roomName,
      type: 'public',
      subject: activeDistrict.name,
      members: [],
      createdAt: null,
    }).catch(() => { })
  }, [activeDistrict.id, activeDistrict.name, activeChannelId, channels, setActiveRoom])

  const handleSendMessage = async () => {
    if (!messageText.trim()) return

    try {
      await setTyping(false)
      await sendMessage(messageText)
      setMessageText('')
    } catch (err: any) {
      alert(err?.message || 'Failed to send message')
    }
  }

  useEffect(() => {
    if (!activeRoom?.id) return
    if (!user?.uid) return
    if (!messageText.trim()) {
      setTyping(false).catch(() => { })
      return
    }

    setTyping(true).catch(() => { })
    const t = window.setTimeout(() => {
      setTyping(false).catch(() => { })
    }, 2000)

    return () => window.clearTimeout(t)
  }, [activeRoom?.id, messageText, setTyping, user?.uid])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      alert('File size must be less than 20MB')
      return
    }

    const allowedTypes = ['.pdf', '.png', '.jpg', '.jpeg', '.docx']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedTypes.includes(fileExtension)) {
      alert('Only PDF, PNG, JPG, and DOCX files are allowed')
      return
    }

    setFileUploading(true)
    setUploadProgress(0)

    try {
      const fileRef = ref(storage, `community/${Date.now()}_${file.name}`)

      const { uploadBytesResumable } = await import('firebase/storage')
      const uploadTask = uploadBytesResumable(fileRef, file)

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploadProgress(Math.round(progress))
        },
        (error) => {
          console.error('Upload error:', error)
          alert('Failed to upload file')
          setFileUploading(false)
          setUploadProgress(0)
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          await sendMessage(`📎 ${file.name}`, downloadURL)
          setFileUploading(false)
          setUploadProgress(0)
        }
      )
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
      setFileUploading(false)
      setUploadProgress(0)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleStartEdit = (messageId: string, currentText: string) => {
    setEditingId(messageId)
    setEditingText(currentText)
  }

  const handleCommitEdit = async () => {
    if (!editingId) return
    try {
      await editMessage(editingId, editingText)
      setEditingId(null)
      setEditingText('')
    } catch (err: any) {
      alert(err?.message || 'Failed to edit message')
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!confirm('Delete this message?')) return
    try {
      await deleteMessage(messageId)
    } catch (err: any) {
      alert(err?.message || 'Failed to delete message')
    }
  }

  const handleBlockToggle = async (userId: string) => {
    if (!userId || userId === user?.uid) return

    try {
      if (blockedUsers.includes(userId)) {
        await unblockUser(userId)
      } else {
        await blockUser(userId)
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update block list')
    }
  }

  const handleMuteToggle = async (userId: string) => {
    if (!userId || userId === user?.uid) return

    try {
      if (mutedUsers.includes(userId)) {
        await unmuteUser(userId)
      } else {
        await muteUser(userId)
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update mute list')
    }
  }

  const handleJoinStudyRoom = async () => {
    try {
      const code = await createPrivateRoom()
      await joinRoom(code)
      alert(`Study room created. Share code: ${code}`)
      openNewWhiteboard()
    } catch (err: any) {
      alert(err?.message || 'Failed to create study room')
    }
  }

  const reactionsPalette = ['🔥', '💯', '👏', '💡']

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-[calc(100vh-96px)] w-full text-[var(--text-primary)] relative">
      {isOffline && (
        <div className="w-full bg-red-500/10 border-b border-red-500/20 text-red-200 text-xs font-bold uppercase tracking-widest px-4 py-2">
          Offline. Trying to reconnect...
        </div>
      )}

      <div className="flex w-full h-[calc(100vh-96px)] overflow-hidden">

        {/* MOBILE OVERLAY */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* DRAWER CONTAINER (Districts + Channels) */}
        <div className={`
          fixed inset-y-0 left-0 z-[60] flex h-full
          transition-transform duration-300 ease-in-out transform 
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:relative md:translate-x-0
        `}>
          {/* LEFT SIDEBAR: DISTRICTS */}
          <aside className="w-20 bg-[var(--bg-primary)] border-r border-white/5 flex flex-col items-center py-6 gap-5 shrink-0 relative z-20">
            {DISTRICTS.map((d) => {
              const isActive = d.id === activeDistrictId
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setActiveDistrictId(d.id)
                    setActiveChannelId(d.channels[0]?.id || 'announcements')
                  }}
                  className={`
                    relative w-12 h-12 rounded-2xl transition-all duration-150 group
                    ${isActive
                      ? 'translate-y-[2px]'
                      : 'hover:translate-y-[-2px] active:translate-y-[4px]'}
                  `}
                  style={{
                    backgroundColor: isActive ? d.color : 'rgba(255,255,255,0.03)',
                    boxShadow: isActive
                      ? `0 4px 0 ${d.shadow}`
                      : `0 4px 0 rgba(0,0,0,0.2)`,
                    border: '2px solid rgba(255,255,255,0.05)'
                  }}
                  aria-pressed={isActive}
                  aria-label={d.name}
                >
                  {/* Tooltip-like highlight */}
                  <div className={`
                    absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-8 rounded-r-xl transition-transform
                    ${isActive ? 'scale-y-100 bg-white' : 'scale-y-0 group-hover:scale-y-50 bg-white/20'}
                  `} />

                  <span className={`text-2xl transition-transform ${isActive ? 'scale-110 drop-shadow-md' : 'grayscale group-hover:grayscale-0'}`}>
                    {d.icon}
                  </span>
                </button>
              )
            })}
          </aside>

          {/* SECONDARY SIDEBAR: CHANNELS */}
          <aside className="w-60 bg-[var(--bg-glass)] backdrop-blur-xl border-r border-white/5 flex flex-col relative z-10">
            <div className="px-6 py-8 border-b border-white/5 flex justify-between items-center bg-black/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">District</span>
                <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">{activeDistrict.name}</h2>
              </div>
              {/* Close button for mobile inside drawer */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
              <div className="px-3 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-50">
                Study Channels
              </div>
              {channels.map((c) => {
                const isActive = c.id === activeChannelId
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveChannelId(c.id)
                      setIsMobileMenuOpen(false) // Auto-close on mobile selection
                    }}
                    className={`
                      w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all relative group
                      ${isActive
                        ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-white/[0.03] hover:text-[var(--text-primary)]'}
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeChannel"
                        className="absolute inset-0 bg-white/[0.03] rounded-xl border-l-[3px] border-[var(--brand-primary)]"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <span className={`text-lg transition-transform ${isActive ? 'scale-110' : 'opacity-40 group-hover:opacity-100'}`}>
                        {isActive ? '🌟' : '#'}
                      </span>
                      {c.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>
        </div>

        {/* MAIN CHAT AREA */}
        <main className="flex-1 flex flex-col min-w-0 w-full">
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-[var(--bg-primary)]/40 backdrop-blur-xl sticky top-0 z-30">
            <div className="flex items-center gap-4 min-w-0">
              {/* HAMBURGER BUTTON */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl active:bg-white/[0.06]"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌟</span>
                  <div className="text-[var(--text-primary)] font-black truncate text-xl tracking-tight">{activeRoom?.name || '#channel'}</div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1">{activeDistrict.name} District</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                  {Object.keys(onlineUsers).length} Online
                </span>
              </div>
              <button
                onClick={() => {
                  const should = confirm('Report this channel?')
                  if (should && activeRoom?.id) {
                    reportRoom(activeRoom.id, 'User reported channel from header').catch(() => { })
                    alert('Thanks. Our moderation team will review.')
                  }
                }}
                className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
              >
                Report
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: '184px' }}>
            <div className="space-y-3">
              {messages.map((m, idx) => {
                const prev = idx > 0 ? messages[idx - 1] : null
                const groupStart = !isSameGroup(prev, m)
                const isMine = m.senderId === user?.uid
                const isBounty = m.kind === 'bounty'
                const isWhiteboard = m.kind === 'whiteboard'
                const rank = rankByUserId[m.senderId] || 0

                const auraClass = rank === 1 ? 'aura-glow aura-gold' : rank === 2 ? 'aura-glow aura-silver' : rank === 3 ? 'aura-glow aura-bronze' : ''

                const bubbleBase = `nebula-stroke bg-white/[0.04] border border-white/10 ${auraClass}`
                const bubbleCornersMine = 'rounded-[var(--radius-bubble)] rounded-tr-md'
                const bubbleCornersOther = 'rounded-[var(--radius-bubble)] rounded-tl-md'

                const wrapperJustify = isMine ? 'justify-end' : 'justify-start'

                return (
                  <div key={m.id} className={`flex ${wrapperJustify} px-2`}>
                    <div className={`flex items-end gap-3 max-w-full ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="w-10 shrink-0">
                        {groupStart ? (
                          <div className={`
                            relative w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border-b-[3px] border-black/20 overflow-hidden flex items-center justify-center text-sm font-black transition-transform hover:scale-110 active:scale-95
                            ${rank === 1 ? 'ring-2 ring-yellow-400 shadow-[0_0_10px_rgba(255,191,0,0.3)]' : ''}
                          `}>
                            {m.senderAvatarCustomization ? (
                              <AvatarRenderer
                                customization={m.senderAvatarCustomization}
                                username={m.senderName || 'User'}
                              />
                            ) : m.senderAvatarUrl ? (
                              <Image
                                src={m.senderAvatarUrl}
                                alt="Avatar"
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              (m.senderName || 'U').charAt(0).toUpperCase()
                            )}
                            {m.senderId === user?.uid ? (
                              <div className="absolute left-1 right-1 -bottom-0.5 h-[2px] rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full bg-[var(--hero)]" style={{ width: `${Math.round(xpPct * 100)}%` }} />
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="w-10 h-10" />
                        )}
                      </div>

                      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        {groupStart ? (
                          <div className={`mb-1 flex items-center gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-black text-[var(--text-primary)] truncate">{m.senderName || 'User'}</div>
                              {rank > 0 ? <RankPill rank={rank} /> : null}
                              {isBounty && (
                                <div className="text-[10px] font-black uppercase tracking-widest text-[#1CB0F6] border border-[#1CB0F6]/30 bg-[#1CB0F6]/10 px-2 py-1 rounded-full">
                                  Bounty {m.bountyPoints ? `${m.bountyPoints} RP` : ''}
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{m.timestamp?.toDate().toLocaleTimeString()}</div>
                          </div>
                        ) : null}

                        <div className={`
                          group relative inline-block max-w-[85vw] sm:max-w-[70%] 
                          ${isMine
                            ? 'bg-[#1CB0F6] border-[#1899D6] border-b-[4px]'
                            : 'bg-[#37464F] border-[#202F36] border-b-[4px]'} 
                          ${isBounty ? 'border-yellow-500/40 bg-yellow-50/10' : ''}
                          ${groupStart ? (isMine ? 'rounded-[20px] rounded-tr-sm' : 'rounded-[20px] rounded-tl-sm') : 'rounded-[20px] mx-2'}
                          transition-all duration-200
                        `}>
                          <div className="px-5 py-4">
                            {editingId === m.id ? (
                              <div>
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="w-full bg-black/20 border border-white/10 rounded-[var(--radius-main)] px-3 py-2 text-sm text-[var(--text-primary)]"
                                  rows={3}
                                />
                                <div className="mt-2 flex gap-2 justify-end">
                                  <button
                                    onClick={handleCommitEdit}
                                    className="text-xs px-3 py-2 rounded-[var(--radius-pill)] bg-[var(--hero)]/10 text-[var(--hero)] nebula-stroke hover:bg-[var(--hero)]/15"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingId(null)
                                      setEditingText('')
                                    }}
                                    className="text-xs px-3 py-2 rounded-[var(--radius-pill)] bg-white/[0.03] nebula-stroke hover:bg-white/[0.06] text-[var(--text-secondary)]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className={`text-sm font-medium whitespace-pre-wrap text-white`}>
                                {m.text}
                              </div>
                            )}

                            {m.fileUrl && (
                              <div className="mt-3">
                                <a
                                  href={m.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-[var(--radius-pill)] bg-black/20 border border-white/10 hover:bg-black/30"
                                >
                                  <span>📎</span>
                                  <span className="text-[var(--hero)]">{m.text.replace('📎 ', '')}</span>
                                </a>
                              </div>
                            )}

                            {isWhiteboard && (
                              <div className="mt-3 border border-white/10 rounded-[var(--radius-main)] p-3 bg-black/10">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-black truncate text-white uppercase tracking-tight">{m.whiteboardName || 'Whiteboard'}</div>
                                    <div className="text-[10px] font-black uppercase text-white/50">Whiteboard Preview</div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (m.whiteboardId) {
                                        openExistingWhiteboard(m.whiteboardId, m.whiteboardName)
                                      }
                                    }}
                                    className="text-xs px-3 py-2 rounded-[var(--radius-pill)] bg-white/[0.03] nebula-stroke hover:bg-white/[0.06]"
                                  >
                                    Open
                                  </button>
                                </div>
                                {m.whiteboardThumbnailUrl ? (
                                  <div className="mt-3">
                                    <Image
                                      src={m.whiteboardThumbnailUrl}
                                      alt="Whiteboard thumbnail"
                                      width={360}
                                      height={240}
                                      className="w-full max-w-[360px] h-auto rounded-[var(--radius-main)] border border-white/10"
                                      unoptimized
                                    />
                                  </div>
                                ) : null}
                              </div>
                            )}

                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              {reactionsPalette.map((emoji) => {
                                const count = m.reactions?.[emoji]?.length || 0
                                const hasReacted = (m.reactions?.[emoji] || []).includes(user?.uid || '')
                                if (showReactionsFor !== m.id && count === 0) return null

                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => addReaction(m.id, emoji)}
                                    className={`text-sm px-2 py-1 rounded-xl border transition-all ${hasReacted
                                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/20 text-white'
                                      : isMine
                                        ? 'border-white/10 bg-black/20 text-white/60 hover:bg-black/40 hover:text-white'
                                        : 'border-white/10 bg-black/20 text-white/60 hover:bg-black/40 hover:text-white'
                                      }`}
                                  >
                                    {emoji} {count > 0 ? <span className="text-xs font-bold">{count}</span> : null}
                                  </button>
                                )
                              })}

                              <button
                                onClick={() => setShowReactionsFor((prevId) => (prevId === m.id ? null : m.id))}
                                className={`text-xs font-bold transition-opacity text-white/40 hover:text-white`}
                              >
                                {showReactionsFor === m.id ? 'Done' : 'React'}
                              </button>
                            </div>
                          </div>

                          <div className={`absolute -top-10 ${isMine ? 'right-0' : 'left-0'} hidden md:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:-translate-y-1`}>
                            <button
                              onClick={() => openDM(m.senderId, m.senderName || 'User')}
                              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${isMine ? 'bg-[#1CB0F6] text-white border-[#1899D6] border-b-[3px] active:border-b-0 active:translate-y-[2px]' : 'bg-white text-[#3C3C3C] border-[#E5E5E5] border-b-[3px] active:border-b-0 active:translate-y-[2px]'}`}
                            >
                              DM
                            </button>

                            {isMine ? (
                              <>
                                <button
                                  onClick={() => handleStartEdit(m.id, m.text)}
                                  className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-white text-[#3C3C3C] border-[#E5E5E5] border-b-[3px] active:border-b-0 active:translate-y-[2px] transition-all"
                                  disabled={editingId === m.id}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(m.id)}
                                  className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-red-100 text-red-500 border-red-200 border-b-[3px] active:border-b-0 active:translate-y-[2px] transition-all"
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => reportMessage(m.id, 'Inappropriate content')}
                                  className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-white text-red-500 border-[#E5E5E5] border-b-[3px] active:border-b-0 active:translate-y-[2px] transition-all"
                                >
                                  Report
                                </button>
                              </>
                            )}
                          </div>

                          <div className={`absolute top-2 ${isMine ? 'left-2' : 'right-2'} md:hidden`}>
                            <button
                              onClick={() => setMobileActionsFor((curId) => (curId === m.id ? null : m.id))}
                              className="w-8 h-8 rounded-[var(--radius-pill)] bg-white/[0.02] border border-white/10"
                              aria-label="Actions"
                            >
                              ⋯
                            </button>
                          </div>

                          {mobileActionsFor === m.id ? (
                            <div className={`md:hidden absolute top-12 ${isMine ? 'left-2' : 'right-2'} z-20 min-w-[160px] rounded-[var(--radius-main)] bg-[var(--bg-glass)] backdrop-blur-xl border border-white/10 nebula-stroke overflow-hidden`}>
                              <button
                                onClick={() => {
                                  openDM(m.senderId, m.senderName || 'User')
                                  setMobileActionsFor(null)
                                }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-white/[0.06]"
                              >
                                DM
                              </button>

                              {isMine ? (
                                <>
                                  <button
                                    onClick={() => {
                                      handleStartEdit(m.id, m.text)
                                      setMobileActionsFor(null)
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm hover:bg-white/[0.06]"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDelete(m.id)
                                      setMobileActionsFor(null)
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-red-200 hover:bg-red-500/10"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    reportMessage(m.id, 'Inappropriate content')
                                    setMobileActionsFor(null)
                                  }}
                                  className="w-full text-left px-4 py-3 text-sm text-red-200 hover:bg-red-500/10"
                                >
                                  Report
                                </button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div ref={messagesEndRef} />
          </div>

          <TypingIndicator names={typingUsers.map((u) => u.name)} />

          <div className="hidden md:block border-t border-white/5 px-6 py-5">
            {fileUploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Uploading...</span>
                  <span className="text-[10px] font-black text-[var(--brand-primary)]">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-[var(--brand-primary)] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-end gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={fileUploading}
                className="w-12 h-12 flex items-center justify-center bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.06] transition-all disabled:opacity-50"
                aria-label="Upload file"
              >
                📎
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.png,.jpg,.jpeg,.docx"
              />

              <button
                onClick={() => {
                  openNewWhiteboard()
                }}
                className="px-5 h-12 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 hover:bg-[var(--brand-primary)]/20 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
              >
                ✏️ Draw
              </button>

              <div className="flex-1 relative">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Type your message..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm resize-none focus:outline-none focus:border-[var(--brand-primary)]/50 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] min-h-[56px] transition-all"
                  rows={1}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || fileUploading}
                className="h-12 px-8 rounded-2xl bg-[var(--brand-primary)] border-b-[4px] border-[#1899D6] text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:brightness-110 active:border-b-0 active:translate-y-[4px] disabled:opacity-50 disabled:grayscale"
              >
                Send
              </button>
            </div>
          </div>

          <div className="md:hidden fixed left-0 right-0 bottom-[72px] px-4 z-40">
            {fileUploading ? (
              <div className="mb-2 px-3 py-2 rounded-[var(--radius-main)] bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Uploading...</span>
                  <span className="text-xs font-black text-[var(--hero)]">{uploadProgress}%</span>
                </div>
                <div className="mt-2 w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-[var(--hero)]" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : null}

            <div className="flex items-end gap-2 px-3 py-3 rounded-[var(--radius-main)] bg-white/[0.03] backdrop-blur-xl border border-white/10 nebula-stroke">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={fileUploading}
                className="w-10 h-10 rounded-[var(--radius-pill)] bg-white/[0.03] border border-white/10"
                aria-label="Open attachments"
              >
                +
              </button>

              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 bg-transparent text-sm resize-none focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] max-h-[96px]"
                rows={1}
              />

              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || fileUploading}
                className="w-10 h-10 rounded-[var(--radius-pill)] bg-[var(--hero)] text-black font-black disabled:opacity-50"
                aria-label="Send"
              >
                ➤
              </button>
            </div>
          </div>

          <div className="md:hidden fixed left-0 right-0 bottom-0 z-50 border-t border-white/10 bg-[var(--bg-primary)]/70 backdrop-blur-xl">
            <div className="grid grid-cols-4 px-2 py-2">
              <Link href="/community" className="flex flex-col items-center justify-center py-2 rounded-[var(--radius-main)] bg-white/[0.03] border border-white/10">
                <div className="text-lg">💬</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Chat</div>
              </Link>
              <Link href="/leaderboard" className="flex flex-col items-center justify-center py-2 rounded-[var(--radius-main)] hover:bg-white/[0.03]">
                <div className="text-lg">🏆</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Board</div>
              </Link>
              <Link href="/practicals" className="flex flex-col items-center justify-center py-2 rounded-[var(--radius-main)] hover:bg-white/[0.03]">
                <div className="text-lg">🎮</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sim</div>
              </Link>
              <Link href="/profile" className="flex flex-col items-center justify-center py-2 rounded-[var(--radius-main)] hover:bg-white/[0.03]">
                <div className="text-lg">👤</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Profile</div>
              </Link>
            </div>
          </div>
        </main>

        {/* RIGHT PANEL: ACTIVE SCHOLARS */}
        <aside className="hidden lg:flex w-72 bg-[var(--bg-primary)] border-l border-white/5 p-6 flex-col gap-8 relative z-10 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-primary)]/5 blur-3xl rounded-full" />

          <button
            onClick={handleJoinStudyRoom}
            className="w-full px-6 py-4 rounded-2xl bg-[#58cc02] border-b-[5px] border-[#46a302] text-white font-black text-xs uppercase tracking-[0.2em] transition-all hover:brightness-110 active:border-b-0 active:translate-y-[4px] shadow-lg shadow-green-500/10"
          >
            🚀 Launch Study Room
          </button>

          <div className="space-y-6">
            <div className="flex items-center justify-between pl-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Active Scholars</h3>
              <span className="text-[10px] font-black text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-2 py-0.5 rounded-full">
                {Object.keys(onlineUsers).length}
              </span>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-400px)] no-scrollbar">
              {Object.entries(onlineUsers).length > 0 ? (
                Object.entries(onlineUsers).map(([uid, data]) => (
                  <button
                    key={uid}
                    onClick={() => openDM(uid, data.name)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.03] transition-all group"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-[var(--text-primary)] shadow-sm overflow-hidden">
                        {data.avatarCustomization ? (
                          <AvatarRenderer customization={data.avatarCustomization} username={data.name} />
                        ) : data.avatarUrl ? (
                          <img src={data.avatarUrl} alt={data.name} className="w-full h-full object-cover" />
                        ) : (
                          data.name?.charAt(0)?.toUpperCase() || 'U'
                        )}
                      </div>
                      <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-green-500 border-[3px] border-[var(--bg-primary)] shadow-sm" />
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
                        {data.name}
                      </span>
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Learning...</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-10 opacity-50">
                  <span className="text-4xl block mb-2">🦉</span>
                  <p className="text-xs font-bold">Waiting for scholars...</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto border-t border-white/5 pt-6">
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--brand-accent)]/10 blur-2xl rounded-full" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Community Quest</h4>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <div className="flex-1">
                  <div className="text-sm font-black text-[var(--text-primary)]">{userData?.streak || 0}-Day Streak</div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, ((userData?.streak || 0) / 7) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Goal: 7 Days</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* DM WINDOWS */}
        {dmWindows.map((dm) => (
          <DMWindow
            key={dm.userId}
            userId={dm.userId}
            userName={dm.userName}
            roomId={dm.roomId}
            isMinimized={dm.isMinimized}
            onClose={() => closeDM(dm.userId)}
            onMinimize={() => toggleDMMinimize(dm.userId)}
          />
        ))}

        {user?.uid ? (
          <WhiteboardSession
            key={whiteboardSeed}
            uid={user.uid}
            isOpen={isWhiteboardOpen}
            initialBoardId={whiteboardBoardId || undefined}
            initialBoardName={whiteboardBoardName}
            roomId={activeRoom?.id || null}
            activeRoomIdForPosting={activeRoom?.id || null}
            onPostToHub={async ({ whiteboardId, whiteboardName, whiteboardThumbnailUrl }) => {
              if (!activeRoom?.id) return
              await sendMessage(`🧠 Whiteboard: ${whiteboardName}`, undefined, {
                kind: 'whiteboard',
                whiteboardId,
                whiteboardName,
                whiteboardThumbnailUrl,
              })
            }}
            onClose={() => {
              setIsWhiteboardOpen(false)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

function AvatarRenderer({ customization, username }: { customization: any, username: string }) {
  const svg = useMemo(() => {
    const c = customization;
    const avatar = createAvatar(avataaars, {
      seed: username,
      backgroundColor: [c.backgroundColor || 'FF8A8A'],
      top: [c.top || 'shortFlat'],
      hairColor: [c.hairColor || '2c1b18'],
      clothing: [c.clothing || 'blazerAndShirt'],
      clothesColor: [c.clothingColor || c.clothesColor || '262e33'],
      accessories: [c.accessories || 'blank'],
      eyes: [c.eyes || 'default'],
      mouth: [c.mouth || 'smile'],
      skinColor: [c.skinColor || 'ffdbb4'],
      facialHair: [c.facialHair || 'blank'],
      backgroundType: ['solid']
    });
    return avatar.toString();
  }, [customization, username]);

  return (
    <div
      className="w-full h-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function CommunityPage() {
  return (
    <SocialHubProvider>
      <CommunityHubInner />
    </SocialHubProvider>
  )
}
