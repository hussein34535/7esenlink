import { NextResponse } from 'next/server'
import { database } from '@/lib/firebase'
import { ref, get, set } from 'firebase/database'

interface Link {
    id: number
    name: string
    original: string
    converted: string
    category: string
    createdAt: string
}

export async function POST(request: Request) {
    try {
        const { findText, replaceText, category } = await request.json()

        if (!findText) {
            return NextResponse.json(
                { error: 'Find text is required' },
                { status: 400 }
            )
        }

        // fetch all links
        const linksRef = ref(database, 'links')
        const snapshot = await get(linksRef)

        if (!snapshot.exists()) {
            return NextResponse.json({ message: 'No links found to update' })
        }

        const rawLinks: any[] = Array.isArray(snapshot.val())
            ? snapshot.val()
            : Object.values(snapshot.val())

        let updatedCount = 0

        const updatedLinks = rawLinks.map((link: any) => {
            // Check if it's a valid link object
            if (
                !link ||
                typeof link.name !== 'string' ||
                typeof link.original !== 'string'
            ) {
                return link
            }

            // Category Filter Check
            if (category && category !== 'all' && link.category.toLowerCase() !== category.toLowerCase()) {
                return link; // Skip if category provided but doesn't match
            }

            let hasChanges = false
            let newName = link.name
            let newOriginal = link.original

            // detailed logging could go here

            // Perform replacement in Name
            if (newName.includes(findText)) {
                newName = newName.replaceAll(findText, replaceText || '')
                hasChanges = true
            }

            // Perform replacement in Original URL
            if (newOriginal.includes(findText)) {
                newOriginal = newOriginal.replaceAll(findText, replaceText || '')
                hasChanges = true
            }

            if (hasChanges) {
                updatedCount++
                return {
                    ...link,
                    name: newName,
                    original: newOriginal,
                }
            }

            return link
        })

        if (updatedCount > 0) {
            // Save back to Firebase
            // Preserving the structure as array
            await set(linksRef, updatedLinks)
        }

        return NextResponse.json({
            message: `Updated ${updatedCount} links successfully`,
            updatedCount
        })

    } catch (error) {
        console.error('Error replacing link text:', error)
        return NextResponse.json(
            { error: 'Failed to replace link text' },
            { status: 500 }
        )
    }
}
