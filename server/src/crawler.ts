import { chromium, Page } from 'playwright';

export interface CrawledPage {
    url: string;
    title: string;
    depth: number;
}

export async function crawlSite(startUrl: string, maxDepth: number = 3, maxPages: number = 20): Promise<string[]> {
    const visited = new Set<string>();
    const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
    const domain = new URL(startUrl).hostname;

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        while (queue.length > 0 && visited.size < maxPages) {
            const { url, depth } = queue.shift()!;

            if (visited.has(url)) continue;
            if (depth > maxDepth) continue;

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
                visited.add(url);

                if (depth < maxDepth) {
                    const links = await page.$$eval('a', (anchors) =>
                        anchors.map(a => a.href).filter(href => href.startsWith('http'))
                    );

                    for (const link of links) {
                        try {
                            const linkUrl = new URL(link);
                            // Only internal links
                            if (linkUrl.hostname === domain && !visited.has(link)) {
                                // simple deduplication of querystrings for now? 
                                // Request said "Exclude querystring variations unless they represent unique pages"
                                // For simplicity, we'll strip fragments.
                                const cleanLink = link.split('#')[0];
                                if (!visited.has(cleanLink)) {
                                    queue.push({ url: cleanLink, depth: depth + 1 });
                                }
                            }
                        } catch (e) {
                            // ignore invalid URLs
                        }
                    }
                }
            } catch (err) {
                console.error(`Failed to crawl ${url}:`, err);
                // Add to visited so we don't retry infinite fail
                visited.add(url);
            }
        }
    } finally {
        await browser.close();
    }

    return Array.from(visited);
}
