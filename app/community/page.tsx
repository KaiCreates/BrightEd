'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { SocialHubProvider, useSocialHub } from '@/lib/social-hub-context'
import { useAuth } from '@/lib/auth-context'
import { DMWindow } from '@/components/social/DMWindow'
import { storage } from '@/lib/firebase'
import { getDownloadURL, ref } from 'firebase/storage'
import { WhiteboardSession } from '@/components/whiteboard/WhiteboardSession'

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
}

const DISTRICTS: District[] = [
  {
    id: 'lobby',
    name: 'The Lobby',
    icon: '🏢',
    accent: 'cyan',
    channels: [{ id: 'announcements', name: 'announcements' }, { id: 'introductions', name: 'introductions' }],
  },
  {
    id: 'business',
    name: 'Business District',
    icon: '💼',
    accent: 'gold',
    channels: [{ id: 'pob-help', name: 'pob-help' }, { id: 'poe-help', name: 'poe-help' }, { id: 'accounts-help', name: 'accounts-help' }],
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
  },
  {
    id: 'science',
    name: 'Science Lab',
    icon: '🧪',
    accent: 'cyan',
    channels: [{ id: 'chemistry', name: 'chemistry' }, { id: 'biology', name: 'biology' }, { id: 'physics', name: 'physics' }],
  },
  {
    id: 'exam',
    name: 'Exam HQ',
    icon: '🎓',
    accent: 'cyan',
    channels: [{ id: 'past-paper-help', name: 'past-paper-help' }, { id: 'exam-strategy', name: 'exam-strategy' }],
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
    <div className="px-4 pb-2">
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-pill)] bg-white/[0.03] nebula-stroke backdrop-blur-md">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
        <span className="inline-flex items-end gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--hero)]" style={{ animation: 'bounce 1s infinite', animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--hero)]" style={{ animation: 'bounce 1s infinite', animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--hero)]" style={{ animation: 'bounce 1s infinite', animationDelay: '300ms' }} />
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
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* DRAWER CONTAINER (Districts + Channels) */}
        <div className={`
          fixed inset-y-0 left-0 z-50 flex h-full
          transition-transform duration-300 ease-in-out transform 
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:relative md:translate-x-0
        `}>
          {/* LEFT SIDEBAR: DISTRICTS */}
          <aside className="w-20 bg-[var(--bg-glass)] backdrop-blur-xl border-r border-white/10 flex flex-col items-center py-4 gap-3 shrink-0 nebula-stroke">
            {DISTRICTS.map((d) => {
              const isActive = d.id === activeDistrictId
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setActiveDistrictId(d.id)
                    setActiveChannelId(d.channels[0]?.id || 'announcements')
                  }}
                  className="relative w-12 h-12 rounded-[var(--radius-main)] bg-white/[0.03] hover:bg-white/[0.06] transition-colors flex items-center justify-center"
                  aria-pressed={isActive}
                  aria-label={d.name}
                >
                  {isActive && <span className="absolute -left-3 top-2 bottom-2 w-1.5 rounded-full bg-[var(--hero)]" />}
                  <span className="text-2xl">{d.icon}</span>
                </button>
              )
            })}
          </aside>

          {/* SECONDARY SIDEBAR: CHANNELS */}
          <aside className="w-60 bg-[var(--bg-glass)] backdrop-blur-xl border-r border-white/10 flex flex-col nebula-stroke">
            <div className="px-4 py-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-[var(--text-primary)] font-black tracking-tight">{activeDistrict.name}</h2>
              {/* Close button for mobile inside drawer */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
              {channels.map((c) => {
                const isActive = c.id === activeChannelId
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveChannelId(c.id)
                      setIsMobileMenuOpen(false) // Auto-close on mobile selection
                    }}
                    className={`w-full text-left px-3 py-2 rounded-[var(--radius-main)] text-sm font-semibold transition-colors ${isActive ? 'bg-white/[0.06] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-white/[0.03]'}`}
                  >
                    <span className="text-[var(--text-muted)]">#</span> {c.name}
                  </button>
                )
              })}
            </div>
          </aside>
        </div>

        {/* MAIN CHAT AREA */}
        <main className="flex-1 flex flex-col min-w-0 w-full">
          <div className="px-4 py-3 md:px-5 md:py-4 border-b border-white/5 flex items-center justify-between bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              {/* HAMBURGER BUTTON */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[var(--radius-main)] active:bg-white/[0.06]"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>

              <div className="min-w-0">
                <div className="text-[var(--text-primary)] font-black truncate text-lg">{activeRoom?.name || '#channel'}</div>
                <div className="text-xs text-[var(--text-muted)] hidden sm:block">{activeDistrict.name}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const should = confirm('Report this channel?')
                  if (should && activeRoom?.id) {
                    reportRoom(activeRoom.id, 'User reported channel from header').catch(() => { })
                    alert('Thanks. Our moderation team will review.')
                  }
                }}
                className="text-xs px-3 py-2 rounded-[var(--radius-pill)] bg-white/[0.03] nebula-stroke hover:bg-white/[0.06] text-red-200 whitespace-nowrap"
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
                  <div key={m.id} className={`flex ${wrapperJustify}`}>
                    <div className={`flex items-end gap-2 max-w-full ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="w-10 shrink-0">
                        {groupStart ? (
                          <div className={`relative w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-sm font-black ${rank <= 3 && rank > 0 ? 'ring-2 ring-[var(--hero)]/20' : ''}`}>
                            {m.senderAvatarUrl ? (
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
                                <div className="text-[10px] font-black uppercase tracking-widest text-yellow-300 border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 rounded-[var(--radius-pill)]">
                                  Bounty {m.bountyPoints ? `${m.bountyPoints} RP` : ''}
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{m.timestamp?.toDate().toLocaleTimeString()}</div>
                          </div>
                        ) : null}

                        <div className={`group relative inline-block max-w-[85vw] sm:max-w-[70%] ${bubbleBase} ${isMine ? bubbleCornersMine : bubbleCornersOther} ${isBounty ? 'border-yellow-500/40' : ''} ${groupStart ? '' : 'mt-1'}`}>
                          <div className="px-4 py-3">
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
                              <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{m.text}</div>
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
                                    <div className="text-[var(--text-primary)] font-bold truncate">{m.whiteboardName || 'Whiteboard'}</div>
                                    <div className="text-xs text-[var(--text-muted)]">Whiteboard Preview</div>
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
                                    className={`text-sm px-2 py-1 rounded-[var(--radius-pill)] border transition-colors ${hasReacted
                                      ? 'border-[var(--hero)]/40 bg-[var(--hero)]/10 text-[var(--text-primary)]'
                                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06]'
                                      }`}
                                  >
                                    {emoji} {count > 0 ? <span className="text-xs">{count}</span> : null}
                                  </button>
                                )
                              })}

                              <button
                                onClick={() => setShowReactionsFor((prevId) => (prevId === m.id ? null : m.id))}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                              >
                                {showReactionsFor === m.id ? 'Done' : 'React'}
                              </button>
                            </div>
                          </div>

                          <div className={`absolute -top-8 ${isMine ? 'right-2' : 'left-2'} hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button
                              onClick={() => openDM(m.senderId, m.senderName || 'User')}
                              className="text-[10px] px-2 py-1 rounded-[var(--radius-pill)] bg-white/[0.03] nebula-stroke hover:bg-white/[0.06]"
                            >
                              DM
                            </button>

                            {isMine ? (
                              <>
                                <button
                                  onClick={() => handleStartEdit(m.id, m.text)}
                                  className="text-[10px] px-2 py-1 rounded-[var(--radius-pill)] bg-white/[0.03] nebula-stroke hover:bg-white/[0.06]"
                                  disabled={editingId === m.id}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(m.id)}
                                  className="text-[10px] px-2 py-1 rounded-[var(--radius-pill)] bg-red-500/10 hover:bg-red-500/20 text-red-200"
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => reportMessage(m.id, 'Inappropriate content')}
                                  className="text-[10px] px-2 py-1 rounded-[var(--radius-pill)] bg-white/[0.03] nebula-stroke hover:bg-white/[0.06] text-red-200"
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

          <div className="hidden md:block border-t border-white/5 px-4 py-3">
            {fileUploading && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--text-secondary)]">Uploading...</span>
                  <span className="text-xs font-bold text-[var(--hero)]">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-[var(--hero)]" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={fileUploading}
                className="p-2 bg-white/[0.03] nebula-stroke rounded-[var(--radius-pill)] hover:bg-white/[0.06] transition-colors disabled:opacity-50"
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
                className="px-3 py-2 rounded-[var(--radius-pill)] bg-[var(--hero)]/10 text-[var(--hero)] hover:bg-[var(--hero)]/15 text-xs font-black uppercase tracking-widest"
              >
                ✏️ Draw
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
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-[var(--radius-main)] px-4 py-3 text-sm resize-none focus:outline-none focus:border-[var(--hero)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                rows={2}
              />

              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || fileUploading}
                className="px-4 py-3 rounded-[var(--radius-pill)] bg-[var(--hero)] text-black font-black text-xs uppercase tracking-widest disabled:opacity-50"
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

        {/* RIGHT PANEL: ACTIVE BENCH */}
        <aside className="hidden lg:flex w-64 bg-[var(--bg-glass)] backdrop-blur-xl border-l border-white/10 p-4 flex-col gap-4 nebula-stroke">
          <button
            onClick={handleJoinStudyRoom}
            className="w-full px-4 py-3 rounded-[var(--radius-main)] bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-[var(--text-primary)] font-black text-xs uppercase tracking-widest"
          >
            Join Study Room
          </button>

          <div className="border border-white/10 rounded-[var(--radius-main)] p-4 bg-white/[0.03]">
            <div className="text-[var(--text-primary)] font-black mb-2">In Simulation</div>
            <div className="text-sm text-[var(--text-muted)]">running Business Sim...</div>
          </div>

          <div className="border border-white/10 rounded-[var(--radius-main)] p-4 bg-white/[0.03] flex-1 overflow-hidden">
            <div className="text-[var(--text-primary)] font-black mb-3">Mentors</div>
            <div className="space-y-2 overflow-y-auto max-h-[320px]">
              {Object.entries(onlineUsers)
                .slice(0, 12)
                .map(([uid, data]) => (
                  <button
                    key={uid}
                    onClick={() => openDM(uid, data.name)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-main)] hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative w-7 h-7 rounded-full bg-[var(--hero)]/10 border border-white/10 flex items-center justify-center text-xs font-black text-[var(--text-primary)]">
                        <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-green-400 pulse-breath border border-[var(--bg-primary)]" />
                        {data.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)] truncate">{data.name}</div>
                    </div>
                    <div className="text-xs text-green-400">Online</div>
                  </button>
                ))}
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

export default function CommunityPage() {
  return (
    <SocialHubProvider>
      <CommunityHubInner />
    </SocialHubProvider>
  )
}
