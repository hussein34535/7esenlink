import { NextResponse } from 'next/server'
import { database } from '@/lib/firebase'
import { ref, get, update } from 'firebase/database'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const { name, category, originalCategory, newCategory } = await request.json()

    // If updating category (moving logic), reuse existing logic or improve it
    // The existing code for moving categories was likely in a different route or handled differently.
    // The UI now sends PATCH to /api/links/[id] for name updates too.

    const linksRef = ref(database, 'links')
    const snapshot = await get(linksRef)

    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    const links = snapshot.val() as any[]
    const linkIndex = links.findIndex((l: any) => l.id === parseInt(id))

    if (linkIndex === -1) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    const linkToUpdate = links[linkIndex]
    const updates: any = {}

    if (name !== undefined) {
      updates[`links/${linkIndex}/name`] = name
    }

    if (category !== undefined) {
      updates[`links/${linkIndex}/category`] = category.toLowerCase()
      // Also verify if we need to update 'converted' URL to reflect new category if that was the logic
      // The original code in page.tsx client-side updated it: `/api/stream/${newCategory.toLowerCase()}/${link.id}`
      // We should update it here too for consistency if we want backend to be authoritative, 
      // BUT the client-side optimistic update did it. Let's do it here too.
      updates[`links/${linkIndex}/converted`] = `/api/stream/${category.toLowerCase()}/${linkToUpdate.id}`
    }

    await update(ref(database), updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating link:', error)
    return NextResponse.json(
      { error: 'Failed to update link' },
      { status: 500 }
    )
  }
}