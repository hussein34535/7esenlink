import { readFile, writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

interface Channels {
  [key: string]: string
}

export async function processM3uFile() {
  try {
    const dataDir = join(process.cwd(), "data")

    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true })
    }

    const m3uFilePath = join(dataDir, "channels.m3u")
    const outputFilePath = join(dataDir, "streams.json")

    const m3uContent = await readFile(m3uFilePath, "utf8")
    const lines = m3uContent.split("\n")

    const streams: Channels = {}
    let index = 1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith("#EXTINF")) {
        // Extract channel name from the EXTINF line
        const nameMatch = line.match(/,(.+)$/)
        if (nameMatch && nameMatch[1] && i + 1 < lines.length) {
          const name = nameMatch[1].trim()
          const url = lines[i + 1].trim()

          if (url && !url.startsWith("#")) {
            // Create a URL-friendly channel ID
            const channelId = `channel${index}`
            streams[channelId] = url
            index++
          }
        }
      }
    }

    await writeFile(outputFilePath, JSON.stringify(streams, null, 2))
    console.log("✅ M3U file processed and streams.json updated successfully")

    return streams
  } catch (error) {
    console.error("Error processing M3U file:", error)
    throw error
  }
}

export async function getChannels(): Promise<Channels> {
  try {
    const dataDir = join(process.cwd(), "data")
    const filePath = join(dataDir, "streams.json")

    // Check if the file exists
    if (!existsSync(filePath)) {
      return {}
    }

    const fileContent = await readFile(filePath, "utf8")
    return JSON.parse(fileContent)
  } catch (error) {
    console.error("Error reading channels:", error)
    return {}
  }
}
function parseM3UContent(content: string): Channels {
  const lines = content.split('\n');
  const streams: Channels = {};
  let index = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF')) {
      const nameMatch = line.match(/,(.*)$/);
      if (nameMatch && nameMatch[1] && i + 1 < lines.length) {
        const name = nameMatch[1].trim();
        const url = lines[i + 1].trim();
        if (url && !url.startsWith('#')) {
          const channelId = `channel${index}`;
          streams[channelId] = url;
          index++;
        }
      }
    }
  }
  return streams;
}

async function saveChannelsToFile(streams: Channels): Promise<void> {
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
  const outputFilePath = join(dataDir, 'streams.json');
  return writeFile(outputFilePath, JSON.stringify(streams, null, 2));
}

export async function processPastedM3U(content: string): Promise<Channels> {
  const streams = parseM3UContent(content);
  await saveChannelsToFile(streams);
  return streams;
}

