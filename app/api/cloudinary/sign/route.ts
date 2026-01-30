import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { verifyAuth } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

function requireEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

function sha1(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyAuth(request)
    const uid = decoded.uid

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    if (!cloudName) return NextResponse.json({ error: 'Missing Cloudinary cloud name' }, { status: 500 })

    const apiKey = requireEnv('CLOUDINARY_API_KEY')
    const apiSecret = requireEnv('CLOUDINARY_API_SECRET')

    const timestamp = Math.floor(Date.now() / 1000)

    // Cost control: use a stable public_id so we overwrite instead of creating infinite assets.
    const folder = 'brighted/avatars'
    const publicId = `${folder}/${uid}`

    // Cloudinary signature is sha1 of sorted params joined with & plus api_secret.
    // We enforce folder/public_id/overwrite from the server so clients can't upload arbitrary assets.
    const paramsToSign = [`folder=${folder}`, `overwrite=true`, `public_id=${publicId}`, `timestamp=${timestamp}`].join('&')
    const signature = sha1(paramsToSign + apiSecret)

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      publicId,
      overwrite: true,
    })
  } catch (e: any) {
    const msg = e?.message || 'Failed to sign upload'
    const status = msg.startsWith('Unauthorized') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
