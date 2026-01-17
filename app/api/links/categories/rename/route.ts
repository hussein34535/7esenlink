import { NextResponse } from 'next/server'
import { database } from '@/lib/firebase'
import { ref, get, set } from 'firebase/database'

export async function POST(request: Request) {
    try {
        const { oldName, newName } = await request.json()

        if (!oldName || !newName) {
            return NextResponse.json(
                { error: 'Old name and new name are required' },
                { status: 400 }
            )
        }

        if (oldName.trim().toLowerCase() === newName.trim().toLowerCase()) {
            return NextResponse.json({ message: 'Names are identical, no changes made' })
        }

        // 1. Fetch Categories
        const categoriesRef = ref(database, 'categories')
        const categoriesSnapshot = await get(categoriesRef)

        if (!categoriesSnapshot.exists()) {
            return NextResponse.json({ error: 'Categories not found' }, { status: 404 })
        }

        const rawCategories: any[] = Array.isArray(categoriesSnapshot.val())
            ? categoriesSnapshot.val()
            : []

        // 2. Fetch Links
        const linksRef = ref(database, 'links')
        const linksSnapshot = await get(linksRef)
        const rawLinks: any[] = linksSnapshot.exists() && Array.isArray(linksSnapshot.val())
            ? linksSnapshot.val()
            : Object.values(linksSnapshot.val() || {})


        // 3. Update Category List
        // Find the index of the old name (case-insensitive search, preserve case or normalize?)
        // Existing logic seems to imply lower-case storage for category ID but display might be mixed?
        // Let's look for exact match or case-insensitive match.
        // Assuming backend stores strings.

        const categoryIndex = rawCategories.findIndex(c => c.toLowerCase() === oldName.toLowerCase())
        if (categoryIndex === -1) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }

        const updatedCategories = [...rawCategories]
        updatedCategories[categoryIndex] = newName.trim()

        // 4. Update Links
        let updatedLinksCount = 0
        const updatedLinks = rawLinks.map((link: any) => {
            if (link && link.category && link.category.toLowerCase() === oldName.toLowerCase()) {
                updatedLinksCount++
                return {
                    ...link,
                    category: newName.toLowerCase(), // Normalize logic from before
                    converted: `/api/stream/${newName.toLowerCase()}/${link.id}` // Update converted URL
                }
            }
            return link
        })

        // 5. Save Both
        await set(categoriesRef, updatedCategories)
        if (updatedLinksCount > 0) {
            await set(linksRef, updatedLinks)
        }

        return NextResponse.json({
            message: 'Category renamed successfully',
            updatedLinks: updatedLinksCount
        })

    } catch (error) {
        console.error('Error renaming category:', error)
        return NextResponse.json(
            { error: 'Failed to rename category' },
            { status: 500 }
        )
    }
}
