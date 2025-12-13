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

async function getLinks(): Promise<Link[]> {
    const linksRef = ref(database, 'links');
    const snapshot = await get(linksRef);
    if (!snapshot.exists()) {
        return [];
    }
    const rawLinks: any[] = Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val());
    const validatedLinks = rawLinks.filter((link: any): link is Link =>
        link &&
        typeof link.id === 'number' &&
        typeof link.name === 'string' &&
        typeof link.original === 'string' &&
        typeof link.converted === 'string' &&
        typeof link.category === 'string' &&
        typeof link.createdAt === 'string'
    ).map(link => ({
        ...link,
        category: link.category.toLowerCase()
    }));
    return validatedLinks;
}

async function saveLinks(links: Link[]) {
    try {
        const linksRef = ref(database, 'links');
        await set(linksRef, links);
        console.log('Links saved successfully');
    } catch (error) {
        console.error('Error writing links to Firebase:', error);
        throw new Error('Failed to save links data to Firebase');
    }
}

export async function POST(request: Request) {
    try {
        const { searchText, replaceText } = await request.json()

        if (!searchText) {
            return NextResponse.json({ error: 'Search text is required' }, { status: 400 })
        }

        if (replaceText === undefined) {
            return NextResponse.json({ error: 'Replace text is required' }, { status: 400 })
        }

        // Get current links
        const currentLinks = await getLinks();

        let replacedCount = 0;

        // Replace text in all original URLs
        const updatedLinks = currentLinks.map(link => {
            if (link.original.includes(searchText)) {
                replacedCount++;
                return {
                    ...link,
                    original: link.original.replaceAll(searchText, replaceText)
                };
            }
            return link;
        });

        if (replacedCount === 0) {
            return NextResponse.json({
                message: 'No links were updated - search text not found in any URLs',
                replacedCount: 0
            });
        }

        // Save updated links
        await saveLinks(updatedLinks);

        return NextResponse.json({
            message: `Successfully replaced "${searchText}" with "${replaceText}" in ${replacedCount} link(s)`,
            replacedCount
        });
    } catch (error) {
        console.error('Error in POST /api/links/replace:', error)
        return NextResponse.json({ error: 'Failed to replace text in links' }, { status: 500 })
    }
}
