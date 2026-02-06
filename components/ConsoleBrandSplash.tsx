'use client'

import { useEffect } from 'react'

const ASCII = String.raw`











                                                                           ██
                                                                    ███   ████
                                                                          ████    ██
                                                             █        █  ██████   ██      ██
                                                           ████   ████████████████████   ████
                                                          ██████  ▓██████████████████▓
                                                       ██   ██      ▒░████████████▒█   █     ██     █
                                                       ███          ███████▓▒▓███████  █    █████
                                                ████         ████████████▓▓▓▒▒▒████████████  ██   ████
                                                ████████  ██     █   ▓█▓▒░░▒▒░░▒▒███ ██     █ ████████    █
                                                ███████████      ██  ▒▒▓█▓██▓▓▓▓▓░▒█ ██    ███████████    █  █
                                       ███████████████████████      ████████████████    ████████████████████████
                                       ██████████████████████████  ████▒    ░░░░▓███████████████████████████████
                                       █████▓██▓██████████████████▒         ░░░░░▒▒░░▓██████████████████████████
                                       █████▓██▓█████████████▒              ░░░░░░░░░▒▒▒░░██████████████████████
                                    ████████▓▓▓▓██████████▒                          ░░░░░█░ ██████████████████████
                                ██████▓▒██████▓▓██████████████              ░░░▒▒▒       ░▒███░▓███████████████▓███████
                                ███████▒█████▓▓▓▓██████▓▒█▒▓█████           ░░░▒▒▒     ███░█░░░███████████████████████
                                ▒██████▒▒████▓▓▓▓▓▓▓▓▓▓█░▒▓██▒░▒░░░░░░░      ░  ░░░░░░░░ ░█▓░  ███████████████▒███████▒
                               ░░░███▓▓▒░████▒▓▓▓▓▓▓▓▓▓▓▓░░░░▓████▓▓▒▒▓███░  ░░▒▒░░░░░░░░▒██  ▒▓▒▒▓▓█████▒▒███▒██████░░░
                               ░░░████▓▓░███▓▒▓▓▓▓▓▓▓▓▓▓▓▓  ░░█████████▓▒████▓░░▒███████████▒░▒▒▒▒████▓█▒▒▒██▓▓█████▒░▒▒ █
                                ░░░███▓▓▒░███▓▒▓▓▓▓▒▒▓▓▓▓  ░████▒   ░████▒▒▓░░████░░░░▒██▓███░░▒▒░░▒████░▒███░██████░░░
                                ░░░▒▓▓▒▒▒░███▓░▓▓▓▓▓▓▓▒   ░███▒░░  ▒██ ███▓░░███░░░░░██░░███▒░ ░░▒▒▓▓███▒▒██▓▒█████▒▒░░  █
                                ░░░░▓▓▓░░░▓██▓▒▓▓▓▓▓▓▒▒▒ ▒▓███▓▓░░░░▓▒░░███░███▒░░░░░░▒░░▓███▒░▒░░▒████░░▓██░░░░███░░▒       █
                                 ░░ ▓▒▒▒░░░▒▒▒▒░▓▓▓▓▓▓▒░ █████▓▓░░░░░░▒▒███▒████▒░░░░░░▒▒▓███▒░ ░▒▓▒░▓▓░▒░░▒░▒░▓███░░░
                                 ░░ ░▒▓▒░░░░▒▒░░▓▓▓▒▒▒▒░ █▓████▓▓▓▓▓▓▓▓███▒▓████▒▒▒▒▒▒▒▒▒███▒▒░ ░░▒▒▒▒░░░▒░░░░░▓▓█░▒░░
                                     ▒▒▒░░░░░░░░░░  ▒▒▒░ ▓█▒▓█████▓▓█████░▒▒███████▓▒▒█████░▒▒░ ░▒░░▒░▒░░░░▒░▒▓▓▓▒░░▒      █
                                     ░▒▒▒█████████▓    ░  ██▒░▒██████████▒░▒▓░███████████░░░▒░ ░░░▒░░▒████████▓▓▓░▒░░   ██   █
                                      ▓░            ▒█▓    █▒▓░▒██▓▓███████░░███████▓▓▓░░░░▒▒  ░░▒▒░░░░░░░░░▒░▒▒█░░░▒  █████
                                          ░░░░░░░░ ░        ▓▒▒░▒█████████████████████▒░░░▒░  ░ ░░▒▒▒░░▒░░▒░░░░░░▒░░░ █  █
                              █      ░░░         ░░░░░░░░░░   ░░░░███████████████████▒░░░░  ░▒▒▒▒▒▒▒▒▒▒░░░░░▒░▒░░░▒░
                                                            ░░  ░░░███████████████▓█░░░  ░▒▒            ░░░░░░░░░▒░
                                                                   ░▒███████████▓▓▒░░                   ░░░▒
                              █                             ░░        ▓████████▒▒        ░░░        ░              █
                                                                        ░█████▒              ░
                                   ███████             ██                  █                               █▓██
                                  ███████████         █████          ████         ███   ░░░░░░░░░░░░      ▒░░░░▒
                                   ████   ████         ██            ████       █████   ░░░░░░░░░░░▒█   ██▒░░░░▒
                                   ████▒██████ ███████████ █████████ ██████████████████ ░░░░░████████▒░░░░░░░░░░
                                   ██████████  █████████████████████ ██████████████████ ░░░░░░░░░░█▓░░░░░░░░░░░░
                                   ████   █████████   ████████  ████ ████  ████ ▒████   ░░░░░▒▒▒▒░█░░░░▒██▒░░░░░
                                   ████   █████████   ██████████████ ████  ████ ▒████   ░░░░░██████░░░░░██░░░░░░
                                   ███████████ ████   ████ █████████ ████  ████  ██████  ░░░░░░░░░░▒░░░░░░░░░░░░░░
                                   ▓▒▒▓▓▓▓▓▒▓  ▒▓▒▓   ▓▓▒▓   ▓▒▒▓███ ▓▓▓█  ▓█▓█   ████▓ ░░░░░░░░░░░█▒░░░░░▒▓░░░░░
                                                          ██████████
                                                          ▒▓▓▓▓▓▓▓▒              ██████████████████████████
                                              ▓▓▓▓▓                       ████████████████████████████████████████
                                                                                         ██ █████████████
                                                                                                    █       █











`

export function ConsoleBrandSplash() {
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const key = '__brighted_console_splash_v2'
      if (window.sessionStorage.getItem(key)) return
      window.sessionStorage.setItem(key, '1')

      const titleStyle = 'color: #00F2FF; font-weight: 900; letter-spacing: 0.12em; font-size: 11px;'
      const mutedStyle = 'color: rgba(255,255,255,0.66); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;'
      const linkStyle = 'color: rgba(0, 242, 255, 0.92); font-weight: 700;'

      const monoBase =
        'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 9px; line-height: 9px;'

      const hexToRgb = (hex: string) => {
        const v = hex.replace('#', '')
        const r = parseInt(v.slice(0, 2), 16)
        const g = parseInt(v.slice(2, 4), 16)
        const b = parseInt(v.slice(4, 6), 16)
        return { r, g, b }
      }

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t

      const mix3 = (a: string, b: string, c: string, t: number) => {
        const A = hexToRgb(a)
        const B = hexToRgb(b)
        const C = hexToRgb(c)
        if (t <= 0.5) {
          const tt = t / 0.5
          return {
            r: Math.round(lerp(A.r, B.r, tt)),
            g: Math.round(lerp(A.g, B.g, tt)),
            b: Math.round(lerp(A.b, B.b, tt)),
          }
        }
        const tt = (t - 0.5) / 0.5
        return {
          r: Math.round(lerp(B.r, C.r, tt)),
          g: Math.round(lerp(B.g, C.g, tt)),
          b: Math.round(lerp(B.b, C.b, tt)),
        }
      }

      const rawLines = ASCII.split('\n')
      const nonEmpty = rawLines.filter((l) => l.trim().length > 0)
      const minIndent = nonEmpty.reduce((min, line) => {
        const m = line.match(/^\s*/)?.[0]?.length ?? 0
        return Math.min(min, m)
      }, Number.POSITIVE_INFINITY)
      const lines = nonEmpty.map((l) => l.slice(Number.isFinite(minIndent) ? minIndent : 0).replace(/\s+$/, ''))

      const fmt = lines.map((l) => `%c${l}`).join('\n')
      const styles = lines.map((_, i) => {
        const t = lines.length <= 1 ? 0 : i / (lines.length - 1)
        const { r, g, b } = mix3('#00F2FF', '#6366F1', '#2DD4BF', t)
        return `color: rgba(${r}, ${g}, ${b}, 0.95); ${monoBase}`
      })

      // eslint-disable-next-line no-console
      console.log('%cBRIGHTED', titleStyle)
      // eslint-disable-next-line no-console
      console.log(fmt, ...styles)
      // eslint-disable-next-line no-console
      console.log('%cSimulation-first learning. Nebula Glass online.', mutedStyle)
      // eslint-disable-next-line no-console
      console.log('%chttps://brighted.app', linkStyle)
    } catch {
      // Ignore console failures (e.g. blocked storage)
    }
  }, [])

  return null
}
