'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import NextImage from 'next/image'
import { db, isFirebaseReady } from '@/lib/firebase'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

type PdfJsLegacy = any
let pdfjsLegacyPromise: Promise<PdfJsLegacy> | null = null

async function loadPdfjsLegacy(): Promise<PdfJsLegacy> {
  if (!pdfjsLegacyPromise) {
    pdfjsLegacyPromise = import('pdfjs-dist/legacy/build/pdf.mjs') as any
  }
  return pdfjsLegacyPromise
}

type Tool =
  | 'move'
  | 'pen'
  | 'rect'
  | 'circle'
  | 'arrow'
  | 'text'
  | 'laser'

type PenColor = 'white' | 'red' | 'cyan' | 'yellow'

type WhiteboardElement =
  | {
      id: string
      type: 'path'
      points: Array<{ x: number; y: number }>
      color: PenColor
      width: number
      createdAt: number
      isLaser?: boolean
    }
  | {
      id: string
      type: 'rect'
      x: number
      y: number
      w: number
      h: number
      color: PenColor
      width: number
      createdAt: number
    }
  | {
      id: string
      type: 'circle'
      x: number
      y: number
      r: number
      color: PenColor
      width: number
      createdAt: number
    }
  | {
      id: string
      type: 'arrow'
      x1: number
      y1: number
      x2: number
      y2: number
      color: PenColor
      width: number
      createdAt: number
    }
  | {
      id: string
      type: 'text'
      x: number
      y: number
      text: string
      color: PenColor
      fontSize: number
      createdAt: number
    }
  | {
      id: string
      type: 'image'
      x: number
      y: number
      w: number
      h: number
      url: string
      createdAt: number
    }

export type WhiteboardSaveMode = 'discard' | 'save' | 'post'

export interface WhiteboardSessionResult {
  mode: WhiteboardSaveMode
  binderItemId?: string
  thumbnailUrl?: string
  boardName?: string
}

export interface WhiteboardSessionProps {
  isOpen: boolean
  uid: string
  initialBoardId?: string
  initialBoardName?: string
  roomId?: string | null
  activeRoomIdForPosting?: string | null
  onPostToHub?: (payload: {
    whiteboardId: string
    whiteboardName: string
    whiteboardThumbnailUrl?: string
  }) => Promise<void>
  onClose: (result: WhiteboardSessionResult) => void
}

function getColorHex(color: PenColor) {
  switch (color) {
    case 'white':
      return '#FFFFFF'
    case 'red':
      return '#EF4444'
    case 'cyan':
      return '#22D3EE'
    case 'yellow':
      return '#FACC15'
  }
}

function safeUuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

type StoredWhiteboardDraft = {
  id: string
  name: string
  elements: WhiteboardElement[]
  panX: number
  panY: number
  zoom: number
  updatedAt: number
}

function draftKey(boardId: string) {
  return `brighted_whiteboard_draft_${boardId}`
}

function worldFromClient(opts: {
  clientX: number
  clientY: number
  rect: DOMRect
  panX: number
  panY: number
  zoom: number
}) {
  const x = (opts.clientX - opts.rect.left - opts.panX) / opts.zoom
  const y = (opts.clientY - opts.rect.top - opts.panY) / opts.zoom
  return { x, y }
}

function clientFromWorld(opts: {
  x: number
  y: number
  rect: DOMRect
  panX: number
  panY: number
  zoom: number
}) {
  const cx = opts.x * opts.zoom + opts.panX + opts.rect.left
  const cy = opts.y * opts.zoom + opts.panY + opts.rect.top
  return { cx, cy }
}

async function renderPdfToImages(file: File, maxPages: number) {
  const arrayBuffer = await file.arrayBuffer()

  const pdfjs = await loadPdfjsLegacy()
  const version = (pdfjs as any).version as string | undefined
  if ((pdfjs as any).GlobalWorkerOptions && version) {
    ;(pdfjs as any).GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`
  }

  const docRef = await (pdfjs as any).getDocument({ data: arrayBuffer }).promise
  const pageCount = Math.min(docRef.numPages || 0, maxPages)

  const pages: Array<{ pageNumber: number; dataUrl: string; width: number; height: number }> = []

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await docRef.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1.25 })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    await page.render({ canvasContext: ctx, viewport }).promise
    const dataUrl = canvas.toDataURL('image/png')

    pages.push({ pageNumber, dataUrl, width: canvas.width, height: canvas.height })
  }

  return pages
}

export function WhiteboardSession(props: WhiteboardSessionProps) {
  const {
    isOpen,
    uid,
    initialBoardId,
    initialBoardName,
    roomId,
    activeRoomIdForPosting,
    onPostToHub,
    onClose,
  } = props

  const [isMounted, setIsMounted] = useState(false)
  const [boardId, setBoardId] = useState<string>(initialBoardId || safeUuid())
  const [boardName, setBoardName] = useState<string>(initialBoardName || 'Untitled Board')

  const [tool, setTool] = useState<Tool>('pen')
  const [penColor, setPenColor] = useState<PenColor>('white')
  const [elements, setElements] = useState<WhiteboardElement[]>([])

  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [zoom, setZoom] = useState(1)

  const [isExitModalOpen, setIsExitModalOpen] = useState(false)
  const [isResourceSidebarOpen, setIsResourceSidebarOpen] = useState(true)

  const [pdfPages, setPdfPages] = useState<Array<{ pageNumber: number; dataUrl: string; width: number; height: number }> | null>(null)
  const [imageTick, setImageTick] = useState(0)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imageCacheRef = useRef<Map<string, { img: HTMLImageElement; loaded: boolean }>>(new Map())

  const pointerStateRef = useRef<
    | null
    | {
        mode: 'panning' | 'drawing'
        pointerId: number
        startClientX: number
        startClientY: number
        startPanX: number
        startPanY: number
        startWorldX: number
        startWorldY: number
        activeElementId: string
      }
  >(null)

  const textDraftRef = useRef<
    | null
    | {
        x: number
        y: number
        clientX: number
        clientY: number
      }
  >(null)

  const [isTextDraftOpen, setIsTextDraftOpen] = useState(false)
  const [textDraftValue, setTextDraftValue] = useState('')

  const fileInputImageRef = useRef<HTMLInputElement | null>(null)
  const fileInputPdfRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const initialId = initialBoardId || safeUuid()
    setBoardId(initialId)
    setBoardName(initialBoardName || 'Untitled Board')

    const stored = localStorage.getItem(draftKey(initialId))
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredWhiteboardDraft
        setBoardName(parsed.name || initialBoardName || 'Untitled Board')
        setElements(parsed.elements || [])
        setPanX(typeof parsed.panX === 'number' ? parsed.panX : 0)
        setPanY(typeof parsed.panY === 'number' ? parsed.panY : 0)
        setZoom(typeof parsed.zoom === 'number' ? parsed.zoom : 1)
      } catch {
      }
    } else {
      setElements([])
      setPanX(0)
      setPanY(0)
      setZoom(1)

      let cancelled = false
      ;(async () => {
        try {
          if (!isFirebaseReady || !db) return

          const refDoc = roomId
            ? doc(db, 'rooms', roomId, 'whiteboards', initialId)
            : doc(db, 'users', uid, 'binder', initialId)
          const snap = await getDoc(refDoc)
          if (!snap.exists() || cancelled) return

          const data: any = snap.data()
          const snapshot = data?.snapshot
          if (!snapshot) return

          setBoardName(data?.name || initialBoardName || 'Untitled Board')
          setElements(snapshot.elements || [])
          setPanX(typeof snapshot.panX === 'number' ? snapshot.panX : 0)
          setPanY(typeof snapshot.panY === 'number' ? snapshot.panY : 0)
          setZoom(typeof snapshot.zoom === 'number' ? snapshot.zoom : 1)
        } catch {
        }
      })()

      return () => {
        cancelled = true
      }
    }

    setIsExitModalOpen(false)
    setIsSaving(false)
    setSaveError(null)
    setPdfPages(null)
    setIsTextDraftOpen(false)
    setTextDraftValue('')
    textDraftRef.current = null

    localStorage.setItem('brighted_whiteboard_last_open', initialId)
  }, [isOpen, initialBoardId, initialBoardName, roomId, uid])

  useEffect(() => {
    if (!isOpen) return

    const now = Date.now()
    setElements((prev) => prev.filter((el) => !(el.type === 'path' && el.isLaser && now - el.createdAt > 2000)))

    const t = window.setInterval(() => {
      const now2 = Date.now()
      setElements((prev) => prev.filter((el) => !(el.type === 'path' && el.isLaser && now2 - el.createdAt > 2000)))
    }, 350)

    return () => window.clearInterval(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onBeforeUnload = () => {
      try {
        const payload: StoredWhiteboardDraft = {
          id: boardId,
          name: boardName,
          elements,
          panX,
          panY,
          zoom,
          updatedAt: Date.now(),
        }
        localStorage.setItem(draftKey(boardId), JSON.stringify(payload))
      } catch {
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [boardId, boardName, elements, panX, panY, zoom, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const t = window.setTimeout(() => {
      try {
        const payload: StoredWhiteboardDraft = {
          id: boardId,
          name: boardName,
          elements,
          panX,
          panY,
          zoom,
          updatedAt: Date.now(),
        }
        localStorage.setItem(draftKey(boardId), JSON.stringify(payload))
      } catch {
      }
    }, 450)

    return () => window.clearTimeout(t)
  }, [boardId, boardName, elements, panX, panY, zoom, isOpen])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = container.getBoundingClientRect()

    const dpr = window.devicePixelRatio || 1
    const width = Math.floor(rect.width)
    const height = Math.floor(rect.height)

    if (width <= 0 || height <= 0) return

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)

    for (const el of elements) {
      if (el.type === 'path') {
        if (el.points.length < 2) continue
        ctx.strokeStyle = getColorHex(el.color)
        ctx.lineWidth = el.width
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(el.points[0].x, el.points[0].y)
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y)
        }
        ctx.stroke()
      }

      if (el.type === 'rect') {
        ctx.strokeStyle = getColorHex(el.color)
        ctx.lineWidth = el.width
        ctx.strokeRect(el.x, el.y, el.w, el.h)
      }

      if (el.type === 'circle') {
        ctx.strokeStyle = getColorHex(el.color)
        ctx.lineWidth = el.width
        ctx.beginPath()
        ctx.arc(el.x, el.y, el.r, 0, Math.PI * 2)
        ctx.stroke()
      }

      if (el.type === 'arrow') {
        ctx.strokeStyle = getColorHex(el.color)
        ctx.lineWidth = el.width
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(el.x1, el.y1)
        ctx.lineTo(el.x2, el.y2)
        ctx.stroke()

        const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1)
        const headLen = 12
        const hx1 = el.x2 - headLen * Math.cos(angle - Math.PI / 7)
        const hy1 = el.y2 - headLen * Math.sin(angle - Math.PI / 7)
        const hx2 = el.x2 - headLen * Math.cos(angle + Math.PI / 7)
        const hy2 = el.y2 - headLen * Math.sin(angle + Math.PI / 7)
        ctx.beginPath()
        ctx.moveTo(el.x2, el.y2)
        ctx.lineTo(hx1, hy1)
        ctx.moveTo(el.x2, el.y2)
        ctx.lineTo(hx2, hy2)
        ctx.stroke()
      }

      if (el.type === 'text') {
        ctx.fillStyle = getColorHex(el.color)
        ctx.font = `bold ${el.fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`
        ctx.fillText(el.text, el.x, el.y)
      }

      if (el.type === 'image') {
        const cached = imageCacheRef.current.get(el.url)
        if (cached?.loaded) {
          if (!cached.img.naturalWidth || !cached.img.naturalHeight) continue
          if (!el.w || !el.h) continue
          ctx.drawImage(cached.img, el.x, el.y, el.w, el.h)
          continue
        }

        if (!cached) {
          const img = new window.Image()
          imageCacheRef.current.set(el.url, { img, loaded: false })
          img.onload = () => {
            const existing = imageCacheRef.current.get(el.url)
            if (existing) {
              imageCacheRef.current.set(el.url, { img: existing.img, loaded: true })
              setImageTick((t) => t + 1)
            }
          }
          img.onerror = () => {
            imageCacheRef.current.delete(el.url)
          }
          img.src = el.url
        }
      }
    }

    ctx.restore()
  }, [elements, panX, panY, zoom])

  useEffect(() => {
    if (!isOpen) return
    render()
  }, [render, isOpen, imageTick])

  useEffect(() => {
    if (!isOpen) return

    const onResize = () => render()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [render, isOpen])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!containerRef.current) return
      e.preventDefault()

      const rect = containerRef.current.getBoundingClientRect()
      const { x: worldX, y: worldY } = worldFromClient({
        clientX: e.clientX,
        clientY: e.clientY,
        rect,
        panX,
        panY,
        zoom,
      })

      const delta = -e.deltaY
      const factor = delta > 0 ? 1.08 : 0.92
      const nextZoom = Math.max(0.2, Math.min(3.5, zoom * factor))

      const before = clientFromWorld({ x: worldX, y: worldY, rect, panX, panY, zoom })
      const after = clientFromWorld({ x: worldX, y: worldY, rect, panX, panY, zoom: nextZoom })

      setZoom(nextZoom)
      setPanX((prev) => prev + (before.cx - after.cx))
      setPanY((prev) => prev + (before.cy - after.cy))
    },
    [panX, panY, zoom]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!containerRef.current) return
      if (!canvasRef.current) return
      if (isExitModalOpen) return

      const rect = containerRef.current.getBoundingClientRect()
      const { x, y } = worldFromClient({
        clientX: e.clientX,
        clientY: e.clientY,
        rect,
        panX,
        panY,
        zoom,
      })

      if (tool === 'text') {
        textDraftRef.current = { x, y, clientX: e.clientX, clientY: e.clientY }
        setTextDraftValue('')
        setIsTextDraftOpen(true)
        return
      }

      if (tool === 'move') {
        pointerStateRef.current = {
          mode: 'panning',
          pointerId: e.pointerId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPanX: panX,
          startPanY: panY,
          startWorldX: x,
          startWorldY: y,
          activeElementId: '',
        }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        return
      }

      const id = safeUuid()
      const createdAt = Date.now()

      if (tool === 'pen' || tool === 'laser') {
        const width = tool === 'laser' ? 3 : 3
        const el: WhiteboardElement = {
          id,
          type: 'path',
          points: [{ x, y }],
          color: tool === 'laser' ? 'cyan' : penColor,
          width,
          createdAt,
          isLaser: tool === 'laser',
        }
        setElements((prev) => [...prev, el])
        pointerStateRef.current = {
          mode: 'drawing',
          pointerId: e.pointerId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPanX: panX,
          startPanY: panY,
          startWorldX: x,
          startWorldY: y,
          activeElementId: id,
        }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        return
      }

      if (tool === 'rect') {
        const el: WhiteboardElement = {
          id,
          type: 'rect',
          x,
          y,
          w: 0,
          h: 0,
          color: penColor,
          width: 3,
          createdAt,
        }
        setElements((prev) => [...prev, el])
        pointerStateRef.current = {
          mode: 'drawing',
          pointerId: e.pointerId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPanX: panX,
          startPanY: panY,
          startWorldX: x,
          startWorldY: y,
          activeElementId: id,
        }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        return
      }

      if (tool === 'circle') {
        const el: WhiteboardElement = {
          id,
          type: 'circle',
          x,
          y,
          r: 0,
          color: penColor,
          width: 3,
          createdAt,
        }
        setElements((prev) => [...prev, el])
        pointerStateRef.current = {
          mode: 'drawing',
          pointerId: e.pointerId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPanX: panX,
          startPanY: panY,
          startWorldX: x,
          startWorldY: y,
          activeElementId: id,
        }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        return
      }

      if (tool === 'arrow') {
        const el: WhiteboardElement = {
          id,
          type: 'arrow',
          x1: x,
          y1: y,
          x2: x,
          y2: y,
          color: penColor,
          width: 3,
          createdAt,
        }
        setElements((prev) => [...prev, el])
        pointerStateRef.current = {
          mode: 'drawing',
          pointerId: e.pointerId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPanX: panX,
          startPanY: panY,
          startWorldX: x,
          startWorldY: y,
          activeElementId: id,
        }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        return
      }
    },
    [isExitModalOpen, panX, panY, penColor, tool, zoom]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const st = pointerStateRef.current
      if (!st) return
      if (st.pointerId !== e.pointerId) return
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const { x, y } = worldFromClient({
        clientX: e.clientX,
        clientY: e.clientY,
        rect,
        panX,
        panY,
        zoom,
      })

      if (st.mode === 'panning') {
        setPanX(st.startPanX + (e.clientX - st.startClientX))
        setPanY(st.startPanY + (e.clientY - st.startClientY))
        return
      }

      setElements((prev) => {
        const idx = prev.findIndex((el) => el.id === st.activeElementId)
        if (idx < 0) return prev

        const copy = prev.slice()
        const el = copy[idx]

        if (el.type === 'path') {
          copy[idx] = { ...el, points: [...el.points, { x, y }] }
          return copy
        }

        if (el.type === 'rect') {
          copy[idx] = {
            ...el,
            w: x - st.startWorldX,
            h: y - st.startWorldY,
          }
          return copy
        }

        if (el.type === 'circle') {
          const dx = x - st.startWorldX
          const dy = y - st.startWorldY
          copy[idx] = {
            ...el,
            r: Math.sqrt(dx * dx + dy * dy),
          }
          return copy
        }

        if (el.type === 'arrow') {
          copy[idx] = { ...el, x2: x, y2: y }
          return copy
        }

        return prev
      })
    },
    [panX, panY, zoom]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const st = pointerStateRef.current
    if (!st) return
    if (st.pointerId !== e.pointerId) return
    pointerStateRef.current = null
  }, [])

  const handleDropSticker = useCallback(
    (e: React.DragEvent) => {
      if (!containerRef.current) return
      e.preventDefault()
      const payload = e.dataTransfer.getData('text/plain')
      if (!payload) return

      const rect = containerRef.current.getBoundingClientRect()
      const { x, y } = worldFromClient({
        clientX: e.clientX,
        clientY: e.clientY,
        rect,
        panX,
        panY,
        zoom,
      })

      setElements((prev) => [
        ...prev,
        {
          id: safeUuid(),
          type: 'text',
          x,
          y,
          text: payload,
          color: 'yellow',
          fontSize: 18,
          createdAt: Date.now(),
        },
      ])
    },
    [panX, panY, zoom]
  )

  const handleSaveTextDraft = useCallback(() => {
    if (!textDraftRef.current) return
    const { x, y } = textDraftRef.current
    const text = textDraftValue.trim()
    if (!text) {
      setIsTextDraftOpen(false)
      textDraftRef.current = null
      setTextDraftValue('')
      return
    }

    setElements((prev) => [
      ...prev,
      {
        id: safeUuid(),
        type: 'text',
        x,
        y,
        text,
        color: penColor,
        fontSize: 18,
        createdAt: Date.now(),
      },
    ])

    setIsTextDraftOpen(false)
    textDraftRef.current = null
    setTextDraftValue('')
  }, [penColor, textDraftValue])

  const addImageElementFromDataUrl = useCallback((dataUrl: string, w: number, h: number) => {
    const id = safeUuid()
    const x = 100
    const y = 100
    const maxW = 520
    const scale = Math.min(1, maxW / w)

    setElements((prev) => [
      ...prev,
      {
        id,
        type: 'image',
        x,
        y,
        w: Math.max(80, Math.floor(w * scale)),
        h: Math.max(80, Math.floor(h * scale)),
        url: dataUrl,
        createdAt: Date.now(),
      },
    ])
  }, [])

  const handleUploadImage = useCallback(async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      alert('File size must be less than 20MB')
      return
    }

    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Failed to read image'))
      reader.readAsDataURL(file)
    })

    const img = new window.Image()
    img.src = dataUrl
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
    })

    addImageElementFromDataUrl(dataUrl, img.width || 800, img.height || 600)
  }, [addImageElementFromDataUrl])

  const handleUploadPdf = useCallback(async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      alert('File size must be less than 20MB')
      return
    }

    try {
      const pages = await renderPdfToImages(file, 8)
      setPdfPages(pages)
    } catch (e) {
      console.error(e)
      alert('Failed to load PDF')
    }
  }, [])

  const captureThumbnailBlob = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return null
    if (canvas.width <= 0 || canvas.height <= 0) return null

    const output = document.createElement('canvas')
    const ctx = output.getContext('2d')
    if (!ctx) return null

    const size = 720
    output.width = size
    output.height = Math.floor(size * 0.6)

    ctx.fillStyle = '#020617'
    ctx.fillRect(0, 0, output.width, output.height)

    ctx.drawImage(canvas, 0, 0, output.width, output.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      output.toBlob((b) => resolve(b), 'image/png', 0.9)
    })

    return blob
  }, [])

  const uploadBlobToCloudinary = useCallback(
    async (opts: { blob: Blob; folder: string }) => {
      const cloudName = "dtsureq3d"
      const uploadPreset = "ml_default"

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary not configured')
      }

      const formData = new FormData()
      formData.append('file', opts.blob)
      formData.append('upload_preset', uploadPreset)
      formData.append('folder', opts.folder)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Cloudinary upload failed${text ? `: ${text}` : ''}`)
      }

      const data: any = await res.json()
      const url = data?.secure_url as string | undefined
      if (!url) {
        throw new Error('Cloudinary upload failed')
      }
      return url
    },
    []
  )

  const normalizeImageUrlsForSave = useCallback(async (uid: string, wbId: string) => {
    const toUpload = elements.filter((el): el is Extract<WhiteboardElement, { type: 'image' }> => el.type === 'image')

    if (toUpload.length === 0) {
      return { nextElements: elements, uploadedCount: 0 }
    }

    let uploaded = 0
    const next: WhiteboardElement[] = []

    for (const el of elements) {
      if (el.type !== 'image') {
        next.push(el)
        continue
      }

      if (el.url.startsWith('http://') || el.url.startsWith('https://')) {
        next.push(el)
        continue
      }

      try {
        const res = await fetch(el.url)
        const blob = await res.blob()
        const url = await uploadBlobToCloudinary({ blob, folder: `whiteboards/${uid}/${wbId}/assets` })
        next.push({ ...el, url })
        uploaded++
      } catch {
        next.push(el)
      }
    }

    return { nextElements: next, uploadedCount: uploaded }
  }, [elements, uploadBlobToCloudinary])

  const saveToBinder = useCallback(
    async (mode: 'save' | 'post') => {
      if (!isFirebaseReady || !db) {
        throw new Error('Database not ready')
      }

      if (!uid) {
        throw new Error('Not authenticated')
      }

      const wbId = boardId

      const { nextElements } = await normalizeImageUrlsForSave(uid, wbId)

      const thumbBlob = await captureThumbnailBlob()
      let thumbnailUrl: string | undefined
      if (thumbBlob) {
        thumbnailUrl = await uploadBlobToCloudinary({ blob: thumbBlob, folder: `whiteboards/${uid}/${wbId}` })
      }

      const binderDoc = doc(db, 'users', uid, 'binder', wbId)
      await setDoc(
        binderDoc,
        {
          id: wbId,
          kind: 'whiteboard',
          name: boardName,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          snapshot: {
            elements: nextElements,
            panX,
            panY,
            zoom,
          },
          thumbnailUrl: thumbnailUrl || null,
          lastMode: mode,
        },
        { merge: true }
      )

      if (roomId) {
        const roomDoc = doc(db, 'rooms', roomId, 'whiteboards', wbId)
        await setDoc(
          roomDoc,
          {
            id: wbId,
            kind: 'whiteboard',
            name: boardName,
            ownerId: uid,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            snapshot: {
              elements: nextElements,
              panX,
              panY,
              zoom,
            },
            thumbnailUrl: thumbnailUrl || null,
            lastMode: mode,
          },
          { merge: true }
        )
      }

      const draft: StoredWhiteboardDraft = {
        id: wbId,
        name: boardName,
        elements: nextElements,
        panX,
        panY,
        zoom,
        updatedAt: Date.now(),
      }
      localStorage.setItem(draftKey(wbId), JSON.stringify(draft))

      return { binderItemId: wbId, thumbnailUrl }
    },
    [boardId, boardName, captureThumbnailBlob, normalizeImageUrlsForSave, panX, panY, roomId, uid, uploadBlobToCloudinary, zoom]
  )

  const handleCloseDiscard = useCallback(() => {
    try {
      localStorage.removeItem(draftKey(boardId))
    } catch {
    }
    onClose({ mode: 'discard' })
  }, [boardId, onClose])

  const handleExitWithMode = useCallback(
    async (mode: WhiteboardSaveMode) => {
      setSaveError(null)

      if (mode === 'discard') {
        setIsExitModalOpen(false)
        handleCloseDiscard()
        return
      }

      if (mode === 'save') {
        setIsSaving(true)
        try {
          const saved = await saveToBinder('save')
          setIsSaving(false)
          setIsExitModalOpen(false)
          onClose({ mode: 'save', binderItemId: saved.binderItemId, thumbnailUrl: saved.thumbnailUrl, boardName })
        } catch (e: any) {
          setIsSaving(false)
          setSaveError(e?.message || 'Failed to save')
        }
        return
      }

      if (mode === 'post') {
        setIsSaving(true)
        try {
          const saved = await saveToBinder('post')
          if (onPostToHub && activeRoomIdForPosting) {
            await onPostToHub({
              whiteboardId: saved.binderItemId,
              whiteboardName: boardName,
              whiteboardThumbnailUrl: saved.thumbnailUrl,
            })
          }

          setIsSaving(false)
          setIsExitModalOpen(false)
          onClose({ mode: 'post', binderItemId: saved.binderItemId, thumbnailUrl: saved.thumbnailUrl, boardName })
        } catch (e: any) {
          setIsSaving(false)
          setSaveError(e?.message || 'Failed to post')
        }
      }
    },
    [activeRoomIdForPosting, boardName, handleCloseDiscard, onClose, onPostToHub, saveToBinder]
  )

  const resourceStickers = useMemo(
    () => [
      { id: 'pythagoras', label: 'Pythagoras', text: 'a² + b² = c²' },
      { id: 'balance-sheet', label: 'Balance Sheet Template', text: 'ASSETS = LIABILITIES + EQUITY' },
      { id: 'and', label: 'AND Gate', text: 'AND' },
      { id: 'or', label: 'OR Gate', text: 'OR' },
      { id: 'not', label: 'NOT Gate', text: 'NOT' },
    ],
    []
  )

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExitModalOpen) {
          setIsExitModalOpen(false)
          return
        }
        setIsExitModalOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isExitModalOpen, isOpen])

  if (!isOpen || !isMounted) return null

  const root = document.body

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-950">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.22) 1px, transparent 0)',
        backgroundSize: '24px 24px',
      }} />

      <div className="absolute top-4 left-4 right-4 z-[110] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <input
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white font-black tracking-tight w-full max-w-[420px]"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExitModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-red-500 text-white font-black uppercase tracking-widest text-xs hover:bg-red-600"
          >
            Exit Session
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 bg-black/30 border border-white/10 rounded-2xl px-3 py-2 backdrop-blur-xl">
        <button
          onClick={() => setTool('move')}
          className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${tool === 'move' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
        >
          🖱️ Move
        </button>

        <div className="h-8 w-px bg-white/10" />

        <button
          onClick={() => setTool('pen')}
          className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${tool === 'pen' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
        >
          🖊️ Pen
        </button>

        <div className="flex items-center gap-1">
          {(['white', 'red', 'cyan', 'yellow'] as PenColor[]).map((c) => (
            <button
              key={c}
              onClick={() => setPenColor(c)}
              className={`w-7 h-7 rounded-lg border ${penColor === c ? 'border-white/60' : 'border-white/10'} hover:border-white/30`}
              style={{ backgroundColor: `${getColorHex(c)}22` }}
              aria-label={c}
            />
          ))}
        </div>

        <div className="h-8 w-px bg-white/10" />

        <button
          onClick={() => setTool('rect')}
          className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${tool === 'rect' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
        >
          🟧 Rect
        </button>
        <button
          onClick={() => setTool('circle')}
          className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${tool === 'circle' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
        >
          ⚪ Circle
        </button>
        <button
          onClick={() => setTool('arrow')}
          className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${tool === 'arrow' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
        >
          ➡️ Arrow
        </button>

        <div className="h-8 w-px bg-white/10" />

        <button
          onClick={() => setTool('text')}
          className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${tool === 'text' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
        >
          📝 Text
        </button>

        <button
          onClick={() => fileInputImageRef.current?.click()}
          className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-300 hover:bg-white/5"
        >
          📸 Image
        </button>
        <input
          ref={fileInputImageRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            handleUploadImage(f).catch(() => {})
            e.target.value = ''
          }}
        />

        <button
          onClick={() => fileInputPdfRef.current?.click()}
          className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-300 hover:bg-white/5"
        >
          PDF
        </button>
        <input
          ref={fileInputPdfRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            handleUploadPdf(f).catch(() => {})
            e.target.value = ''
          }}
        />

        <button
          onClick={() => setTool('laser')}
          className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${tool === 'laser' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
        >
          🔦 Laser
        </button>

        <div className="h-8 w-px bg-white/10" />

        <button
          onClick={() => setIsResourceSidebarOpen((p) => !p)}
          className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-300 hover:bg-white/5"
        >
          Resources
        </button>
      </div>

      <div className="absolute inset-0 w-full h-full">
        <div
          ref={containerRef}
          className="relative w-full h-full bg-slate-950 overflow-hidden select-none"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas ref={canvasRef} className="absolute inset-0" />

          {isTextDraftOpen && textDraftRef.current && containerRef.current && (
            <div
              className="absolute z-[120]"
              style={{
                left: (textDraftRef.current.x * zoom + panX) + 'px',
                top: (textDraftRef.current.y * zoom + panY) + 'px',
              }}
            >
              <div className="bg-black/50 border border-white/10 rounded-xl p-2 backdrop-blur-xl w-[280px]">
                <textarea
                  value={textDraftValue}
                  onChange={(e) => setTextDraftValue(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  rows={3}
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleSaveTextDraft}
                    className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-100 text-xs font-black uppercase tracking-widest"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsTextDraftOpen(false)
                      setTextDraftValue('')
                      textDraftRef.current = null
                    }}
                    className="px-3 py-2 rounded-lg bg-white/5 text-gray-200 text-xs font-black uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {isResourceSidebarOpen && (
          <div className="absolute top-24 bottom-4 left-4 w-72 z-[110] bg-black/30 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="text-white font-black">Resources</div>
              <button
                onClick={() => setIsResourceSidebarOpen(false)}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-200"
              >
                Close
              </button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto">
              {resourceStickers.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', s.text)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-grab"
                >
                  <div className="text-white font-bold text-sm">{s.label}</div>
                  <div className="text-xs text-gray-300 mt-1">{s.text}</div>
                </div>
              ))}
            </div>

            {pdfPages && (
              <div className="border-t border-white/10 p-3">
                <div className="text-white font-black text-sm mb-2">PDF Pages</div>
                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto">
                  {pdfPages.map((p) => (
                    <button
                      key={p.pageNumber}
                      onClick={() => addImageElementFromDataUrl(p.dataUrl, p.width, p.height)}
                      className="border border-white/10 rounded-lg overflow-hidden hover:border-cyan-400/40"
                      title={`Page ${p.pageNumber}`}
                    >
                      <NextImage src={p.dataUrl} alt={`Page ${p.pageNumber}`} width={240} height={320} className="w-full h-auto" unoptimized />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isExitModalOpen && (
          <div
            className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsExitModalOpen(false)}
          >
            <div
              className="w-full max-w-lg bg-slate-950 border border-white/10 rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-black text-xl">Save & Close</div>
              <div className="text-gray-300 text-sm mt-2">Post to chat before leaving?</div>

              {saveError && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                  {saveError}
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  disabled={isSaving}
                  onClick={() => handleExitWithMode('discard')}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 font-black text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  disabled={isSaving}
                  onClick={() => handleExitWithMode('save')}
                  className="px-4 py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 font-black text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  Save to Binder
                </button>
                <button
                  disabled={isSaving}
                  onClick={() => handleExitWithMode('post')}
                  className="px-4 py-3 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-100 font-black text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  Post to Hub
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setIsExitModalOpen(false)}
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  Keep working
                </button>
                {isSaving && (
                  <div className="text-xs text-gray-300 font-bold">Saving...</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    root
  )
}
