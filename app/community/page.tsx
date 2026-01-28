'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
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

  const { user } = useAuth()

  const [activeDistrictId, setActiveDistrictId] = useState<DistrictId>('lobby')
  const [activeChannelId, setActiveChannelId] = useState<string>(DISTRICTS[0].channels[0]?.id || 'announcements')

  const [messageText, setMessageText] = useState('')
  const [isOffline, setIsOffline] = useState(false)

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
      await sendMessage(messageText)
      setMessageText('')
    } catch (err: any) {
      alert(err?.message || 'Failed to send message')
    }
  }

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
    <div className="min-h-[calc(100vh-96px)] w-full bg-slate-950 text-gray-300 relative">
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
          fixed inset-y-0 left-0 z-50 flex h-full bg-slate-950 
          transition-transform duration-300 ease-in-out transform 
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:relative md:translate-x-0 md:bg-transparent
        `}>
          {/* LEFT SIDEBAR: DISTRICTS */}
          <aside className="w-20 bg-slate-950 border-r border-white/5 flex flex-col items-center py-4 gap-3 shrink-0">
            {DISTRICTS.map((d) => {
              const isActive = d.id === activeDistrictId
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setActiveDistrictId(d.id)
                    setActiveChannelId(d.channels[0]?.id || 'announcements')
                  }}
                  className="relative w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                  aria-pressed={isActive}
                  aria-label={d.name}
                >
                  {isActive && <span className="absolute -left-3 top-2 bottom-2 w-1.5 rounded-full bg-cyan-400" />}
                  <span className="text-2xl">{d.icon}</span>
                </button>
              )
            })}
          </aside>

          {/* SECONDARY SIDEBAR: CHANNELS */}
          <aside className="w-60 bg-gray-900 border-r border-white/5 flex flex-col">
            <div className="px-4 py-4 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-white font-black tracking-tight">{activeDistrict.name}</h2>
              {/* Close button for mobile inside drawer */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-2 text-gray-400 hover:text-white"
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
                  >
                    <span className="text-gray-400">#</span> {c.name}
                  </button>
                )
              })}
            </div>
          </aside>
        </div>

        {/* MAIN CHAT AREA */}
        <main className="flex-1 flex flex-col min-w-0 w-full">
          <div className="px-4 py-3 md:px-5 md:py-4 border-b border-white/5 flex items-center justify-between bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              {/* HAMBURGER BUTTON */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-gray-300 hover:text-white rounded-lg active:bg-white/10"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>

              <div className="min-w-0">
                <div className="text-white font-black truncate text-lg">{activeRoom?.name || '#channel'}</div>
                <div className="text-xs text-gray-500 hidden sm:block">{activeDistrict.name}</div>
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
                className="text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-red-200 whitespace-nowrap"
              >
                Report
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m) => {
              const isMine = m.senderId === user?.uid
              const isBounty = m.kind === 'bounty'
              const isWhiteboard = m.kind === 'whiteboard'

              return (
                <div
                  key={m.id}
                  className={`rounded-xl border p-4 bg-white/5 ${isBounty ? 'border-yellow-500/60' : 'border-white/10'
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-white font-bold truncate">{m.senderName || 'User'}</div>
                        <div className="text-xs text-gray-500">{m.timestamp?.toDate().toLocaleTimeString()}</div>
                        {isBounty && (
                          <div className="text-[10px] font-black uppercase tracking-widest text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 rounded">
                            Bounty {m.bountyPoints ? `${m.bountyPoints} RP` : ''}
                          </div>
                        )}
                      </div>

                      {editingId === m.id ? (
                        <div className="mt-2">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100"
                            rows={3}
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={handleCommitEdit}
                              className="text-xs px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null)
                                setEditingText('')
                              }}
                              className="text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">{m.text}</div>
                      )}

                      {m.fileUrl && (
                        <div className="mt-3">
                          <a
                            href={m.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-black/30 border border-white/10 hover:bg-black/40"
                          >
                            <span>📎</span>
                            <span className="text-cyan-300">{m.text.replace('📎 ', '')}</span>
                          </a>
                        </div>
                      )}

                      {isWhiteboard && (
                        <div className="mt-3 border border-white/10 rounded-lg p-3 bg-black/20">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-white font-bold truncate">{m.whiteboardName || 'Whiteboard'}</div>
                              <div className="text-xs text-gray-500">Whiteboard Preview</div>
                            </div>
                            <button
                              onClick={() => {
                                if (m.whiteboardId) {
                                  openExistingWhiteboard(m.whiteboardId, m.whiteboardName)
                                }
                              }}
                              className="text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10"
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
                                className="w-full max-w-[360px] h-auto rounded border border-white/10"
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
                              className={`text-sm px-2 py-1 rounded-lg border transition-colors ${hasReacted
                                ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100'
                                : 'border-white/10 bg-white/5 hover:bg-white/10'
                                }`}
                            >
                              {emoji} {count > 0 ? <span className="text-xs">{count}</span> : null}
                            </button>
                          )
                        })}

                        <button
                          onClick={() => setShowReactionsFor((prev) => (prev === m.id ? null : m.id))}
                          className="text-xs text-gray-400 hover:text-gray-200"
                        >
                          {showReactionsFor === m.id ? 'Done' : 'React'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDM(m.senderId, m.senderName || 'User')}
                          className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                        >
                          DM
                        </button>

                        {isMine ? (
                          <>
                            <button
                              onClick={() => handleStartEdit(m.id, m.text)}
                              className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                              disabled={editingId === m.id}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-200"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => reportMessage(m.id, 'Inappropriate content')}
                              className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-red-200"
                            >
                              Report
                            </button>
                          </>
                        )}
                      </div>

                      {!isMine && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMuteToggle(m.senderId)}
                            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                          >
                            {mutedUsers.includes(m.senderId) ? 'Unmute' : 'Mute'}
                          </button>
                          <button
                            onClick={() => handleBlockToggle(m.senderId)}
                            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                          >
                            {blockedUsers.includes(m.senderId) ? 'Unblock' : 'Block'}
                          </button>
                          <button
                            onClick={() => reportUser(m.senderId, 'User reported from message')}
                            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-red-200"
                          >
                            Report User
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-white/5 px-4 py-3">
            {fileUploading && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Uploading...</span>
                  <span className="text-xs font-bold text-cyan-300">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-cyan-400" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={fileUploading}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
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
                className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 text-xs font-black uppercase tracking-widest"
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
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-cyan-400 text-gray-100 placeholder:text-gray-500"
                rows={2}
              />

              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || fileUploading}
                className="px-4 py-3 rounded-xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </main>

        {/* RIGHT PANEL: ACTIVE BENCH */}
        <aside className="hidden lg:flex w-64 bg-slate-950 border-l border-white/5 p-4 flex-col gap-4">
          <button
            onClick={handleJoinStudyRoom}
            className="w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-widest"
          >
            Join Study Room
          </button>

          <div className="border border-white/10 rounded-xl p-4 bg-white/5">
            <div className="text-white font-black mb-2">In Simulation</div>
            <div className="text-sm text-gray-400">running Business Sim...</div>
          </div>

          <div className="border border-white/10 rounded-xl p-4 bg-white/5 flex-1 overflow-hidden">
            <div className="text-white font-black mb-3">Mentors</div>
            <div className="space-y-2 overflow-y-auto max-h-[320px]">
              {Object.entries(onlineUsers)
                .slice(0, 12)
                .map(([uid, data]) => (
                  <button
                    key={uid}
                    onClick={() => openDM(uid, data.name)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-black text-cyan-100">
                        {data.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="text-sm text-gray-200 truncate">{data.name}</div>
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
