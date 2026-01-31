import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
    try {
        const data = await req.json()
        const { subjects, source, proficiencies, timestamp } = data

        const metadataDir = path.join(process.cwd(), 'metadata')

        // Ensure directory exists (just in case)
        if (!fs.existsSync(metadataDir)) {
            fs.mkdirSync(metadataDir, { recursive: true })
        }

        const fileName = `user_${Date.now()}.json`
        const filePath = path.join(metadataDir, fileName)

        const content = JSON.stringify({
            subjects,
            source,
            proficiencies,
            timestamp: timestamp || new Date().toISOString()
        }, null, 2)

        fs.writeFileSync(filePath, content)

        return NextResponse.json({ success: true, fileName })
    } catch (error) {
        console.error('Metadata API error:', error)
        return NextResponse.json({ success: false, error: 'Failed to save metadata' }, { status: 500 })
    }
}
