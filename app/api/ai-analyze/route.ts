import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: 'لم يتم العثور على مفتاح GEMINI_API_KEY في ملفات البيئة للطرف الخلفي. يرجى إضافته في ملف .env.local لبدء الاستخدام.'
    }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { prompt, fileText, currentLinks, currentCategories } = body;

    const systemInstruction = `You are a data parsing assistant for IPTV Redirect admin dashboard. Your task is to process natural language instructions and user-uploaded text data (which can be lists of channels, M3U streams, or text blocks) and translate them into a structured sequence of database modification operations.

You have access to the current database state:
- Categories currently: ${JSON.stringify(currentCategories)}
- Links currently: ${JSON.stringify((currentLinks || []).map((l: any) => ({ id: l.id, name: l.name, category: l.category })))}

You MUST output a JSON response matching the schema details exactly.
Available operation types you can output:
1. CREATE_CATEGORY: Create a new category. Provide 'categoryName'.
2. CREATE_LINK: Create a new link. Provide 'linkName', 'originalUrl', and 'categoryName'.
3. UPDATE_LINK_URL: Update/replace the original URL of an existing link. Provide 'linkId' (number) or 'linkName' (string) and the new 'originalUrl'.
4. DELETE_LINK: Delete an existing link. Provide 'linkId' (number) or 'linkName' (string).
5. REPLACE_CATEGORY_LINKS: Replace all links inside a category with a new list of links. This deletes all links currently in this category and creates the new links. Provide 'categoryName' and 'links' (array of objects containing 'name' and 'originalUrl').

CRITICAL INSTRUCTIONS FOR QUALITIES AND CATEGORIES:
- PRESERVE STREAM QUALITIES: If a single channel has multiple links with different stream qualities (such as FHD, HD, SD, 4K, HEVC, Low, etc.), treat each quality stream as a separate distinct link. The 'linkName' MUST preserve the quality suffix (e.g. 'الجزيرة HD', 'الجزيرة SD', 'BeIN Sports 1 FHD', 'BeIN Sports 1 SD') so that they are created as separate entries and do not overwrite each other.
- AUTO-CATEGORIZATION: Group and classify channels into their corresponding categories based on their names (e.g., channels containing 'BeIN Sports', 'AD Sports', or 'SSC' go to 'Sports' or respective categories; channels with 'OSN', 'HBO', or 'Netflix' go to 'OSN' or 'Movies'; channels with 'MBC' go to 'MBC', etc.). If the user specifies a target category, place all channels there.

Make sure you map target link/category names to the ones already existing in the database context if there are slight spelling variations.`;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        actions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              type: {
                type: "STRING",
                enum: ["CREATE_CATEGORY", "CREATE_LINK", "UPDATE_LINK_URL", "DELETE_LINK", "REPLACE_CATEGORY_LINKS"]
              },
              categoryName: { type: "STRING" },
              linkName: { type: "STRING" },
              linkId: { type: "INTEGER" },
              originalUrl: { type: "STRING" },
              links: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    originalUrl: { type: "STRING" }
                  },
                  required: ["name", "originalUrl"]
                }
              }
            },
            required: ["type"]
          }
        }
      },
      required: ["actions"]
    };

    const userPrompt = `Instructions: ${prompt}\n\nInput Data / Files:\n${fileText}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: systemInstruction },
            { text: userPrompt }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return NextResponse.json({ error: `Gemini API Error: ${errBody}` }, { status: response.status });
    }

    const resData = await response.json();
    const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return NextResponse.json({ error: 'لم يقم النموذج بإرجاع استجابة صالحة.' }, { status: 500 });
    }

    const parsed = JSON.parse(responseText);
    return NextResponse.json({ actions: parsed.actions });

  } catch (error: any) {
    console.error('Error during AI analysis:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ غير متوقع أثناء تحليل البيانات.' }, { status: 500 });
  }
}
