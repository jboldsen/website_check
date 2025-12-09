import { chromium, Page } from 'playwright';

export interface CrawledPage {
    url: string;
    title: string;
    depth: number;
}

export async function crawlSite(startUrl: string, maxDepth: number = 3, maxPages: number = 20): Promise<{ url: string; referrer: string | null }[]> {
    const visited = new Map<string, string | null>();
    const queue: { url: string; depth: number; referrer: string | null }[] = [{ url: startUrl, depth: 0, referrer: null }];
    const domain = new URL(startUrl).hostname;

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        while (queue.length > 0 && visited.size < maxPages) {
            const { url, depth, referrer } = queue.shift()!;

            if (visited.has(url)) continue;
            if (depth > maxDepth) continue;

            // Mark as visited before navigation to avoid loops, store referrer
            visited.set(url, referrer);

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

                if (depth < maxDepth) {
                    const links = await page.$$eval('a', (anchors) =>
                        anchors.map(a => a.href).filter(href => href.startsWith('http'))
                    );

                    for (const link of links) {
                        try {
                            const linkUrl = new URL(link);
                            // Only internal links
                            if (linkUrl.hostname === domain && !visited.has(link)) {
                                const cleanLink = link.split('#')[0];
                                if (!visited.has(cleanLink)) {
                                    // Use original cleanLink for queue to avoid reprocessing
                                    // Pass current 'url' as referrer for these new links
                                    queue.push({ url: cleanLink, depth: depth + 1, referrer: url });
                                }
                            }
                        } catch (e) {
                            // ignore invalid URLs
                        }
                    }
                }
            } catch (err) {
                console.error(`Failed to crawl ${url}:`, err);
                // Even if failed, we visited it (tried to). 
                // We keep it in map so we return it and runScan can detect the failure/404 itself
            }
        }
    } finally {
        await browser.close();
    }

    // Convert Map to array of objects
    return Array.from(visited.entries()).map(([url, referrer]) => ({ url, referrer }));
}
