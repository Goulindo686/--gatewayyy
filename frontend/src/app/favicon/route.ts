import { readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const file = await readFile(join(process.cwd(), 'public', 'favicon.png'));
    return new Response(file, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
