'use client'

import { useState } from 'react'

export default function ImportChannels() {
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus({ type: null, message: '' })

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus({
          type: 'success',
          message: `Successfully imported ${data.added} channels!`,
        })
        setContent('')
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'Failed to import channels',
        })
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Failed to connect to server',
      })
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Import M3U8 Channels</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Paste M3U8 Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-40 p-2 border rounded-md font-mono text-sm"
            placeholder="#EXTINF:-1,Channel Name&#10;http://example.com/stream.m3u8"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Import Channels
        </button>
      </form>

      {status.type && (
        <div
          className={`mt-4 p-3 rounded-md ${
            status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  )
} 