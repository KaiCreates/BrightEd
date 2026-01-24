'use client'

import { useEffect, useRef } from 'react'

interface MathDiagramProps {
  type: 'geometry' | 'graph' | 'equation'
  data?: {
    shape?: 'circle' | 'triangle' | 'rectangle'
    dimensions?: { width?: number; height?: number; radius?: number }
    equation?: string
    points?: Array<{ x: number; y: number; label?: string }>
  }
}

export default function MathDiagram({ type, data }: MathDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (type === 'geometry' && canvasRef.current && data) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Set up canvas
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      if (data.shape === 'circle' && data.dimensions?.radius) {
        // Draw circle
        ctx.beginPath()
        ctx.arc(centerX, centerY, data.dimensions.radius, 0, 2 * Math.PI)
        ctx.strokeStyle = '#3B82F6'
        ctx.lineWidth = 3
        ctx.stroke()
        
        // Draw radius line
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(centerX + data.dimensions.radius, centerY)
        ctx.strokeStyle = '#EF4444'
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Label radius
        ctx.fillStyle = '#1F2937'
        ctx.font = '14px Arial'
        ctx.fillText(`r = ${data.dimensions.radius}`, centerX + data.dimensions.radius / 2, centerY - 10)
      } else if (data.shape === 'triangle') {
        // Draw triangle
        const size = data.dimensions?.width || 100
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - size / 2)
        ctx.lineTo(centerX - size / 2, centerY + size / 2)
        ctx.lineTo(centerX + size / 2, centerY + size / 2)
        ctx.closePath()
        ctx.strokeStyle = '#3B82F6'
        ctx.lineWidth = 3
        ctx.stroke()
      } else if (data.shape === 'rectangle' && data.dimensions) {
        // Draw rectangle
        const width = data.dimensions.width || 150
        const height = data.dimensions.height || 100
        ctx.strokeStyle = '#3B82F6'
        ctx.lineWidth = 3
        ctx.strokeRect(centerX - width / 2, centerY - height / 2, width, height)
        
        // Label dimensions
        ctx.fillStyle = '#1F2937'
        ctx.font = '14px Arial'
        ctx.fillText(`w = ${width}`, centerX, centerY - height / 2 - 10)
        ctx.fillText(`h = ${height}`, centerX + width / 2 + 10, centerY)
      }
    }
  }, [type, data])

  if (type === 'geometry') {
    return (
      <div className="flex justify-center my-6">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="border-2 border-gray-200 rounded-xl bg-white shadow-md"
        />
      </div>
    )
  }

  if (type === 'graph') {
    return (
      <div className="flex justify-center my-6">
        <svg
          ref={svgRef}
          width={400}
          height={300}
          className="border-2 border-gray-200 rounded-xl bg-white shadow-md"
        >
          {/* Axes */}
          <line x1="50" y1="250" x2="350" y2="250" stroke="#1F2937" strokeWidth="2" />
          <line x1="50" y1="250" x2="50" y2="50" stroke="#1F2937" strokeWidth="2" />
          
          {/* Points */}
          {data?.points?.map((point, index) => (
            <g key={index}>
              <circle
                cx={50 + point.x * 10}
                cy={250 - point.y * 10}
                r="5"
                fill="#3B82F6"
              />
              {point.label && (
                <text
                  x={50 + point.x * 10}
                  y={250 - point.y * 10 - 15}
                  fill="#1F2937"
                  fontSize="12"
                  textAnchor="middle"
                >
                  {point.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    )
  }

  return null
}
