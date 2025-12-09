import { chromium, Page } from 'playwright';
import { Server } from 'socket.io';
import { crawlSite } from './crawler';
import { calculateScore, Issue } from './scorer';
// import lighthouse from 'lighthouse';
// import * as chromeLauncher from 'chrome-launcher';

// Mocking lighthouse for MVP speed/stability if needed, or implement partially
// We will focus on pure Playwright for now as per plan constraints and speed.

export async function runScan(startUrl: string, scanId: string, io: Server) {
    io.emit('scan:progress', { scanId, message: 'Starting crawler...', progress: 5 });

    let scanIssues: Issue[] = [];

    // 1. Crawl
    io.emit('scan:progress', { scanId, message: 'Discovering pages...', progress: 10 });
    const pages = await crawlSite(startUrl);
    io.emit('scan:progress', { scanId, message: `Found ${pages.length} pages.`, progress: 20 });

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });
    const context = await browser.newContext();

    const BREAKPOINTS = [
        { name: 'Mobile', width: 390, height: 844 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Desktop', width: 1440, height: 900 }
    ];

    let pagesProcessed = 0;

    for (const url of pages) {
        io.emit('scan:progress', {
            scanId,
            message: `Scanning ${url}...`,
            progress: 20 + Math.floor((pagesProcessed / pages.length) * 70)
        });

        const page = await context.newPage();

        // ERROR LISTENERS
        page.on('console', msg => {
            if (msg.type() === 'error') {
                scanIssues.push({
                    category: 'Error',
                    severity: 'Major',
                    title: 'Console Error',
                    description: msg.text(),
                    affectedUrl: url
                });
            }
        });

        page.on('pageerror', exception => {
            scanIssues.push({
                category: 'Error',
                severity: 'Critical',
                title: 'Uncaught Exception',
                description: exception.message,
                affectedUrl: url
            });
        });

        page.on('requestfailed', request => {
            scanIssues.push({
                category: 'Error',
                severity: 'Minor',
                title: 'Failed Request',
                description: `${request.url()} failed`,
                affectedUrl: url
            });
        });

        try {
            await page.goto(url, { waitUntil: 'networkidle' });

            // SEO CHECKS
            const title = await page.title();
            if (!title) {
                scanIssues.push({ category: 'SEO', severity: 'Minor', title: 'Missing Title', description: 'Page has no title tag', affectedUrl: url });
            }
            const metaDesc = await page.$('meta[name="description"]');
            if (!metaDesc) {
                scanIssues.push({ category: 'SEO', severity: 'Suggestion', title: 'Missing Meta Description', description: 'Page should have a meta description', affectedUrl: url });
            }

            // RESPONSIVENESS & INTERACTION CHECKS PER BREAKPOINT
            for (const bp of BREAKPOINTS) {
                await page.setViewportSize({ width: bp.width, height: bp.height });
                // Wait a bit for layout
                await page.waitForTimeout(500);

                // Check for horizontal scroll (overflow)
                const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
                const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
                if (scrollWidth > clientWidth) {
                    scanIssues.push({
                        category: 'Responsiveness',
                        severity: 'Major',
                        title: 'Horizontal Overflow',
                        description: `Content overflows width on ${bp.name} (${bp.width}px)`,
                        affectedUrl: url
                    });
                }

                // Simple Interaction Test: Check if buttons are visible and not covered?
                // This is hard to do generically without visual regression, but we can check for
                // e.g. hamburger menu on mobile
                if (bp.name === 'Mobile') {
                    // Check if nav is likely hidden behind a toggle
                    // Just a heuristic
                }
            }

            // PERFORMANCE (Simple Timing)
            const perf = await page.evaluate(() => {
                const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                return {
                    domComplete: nav?.domComplete,
                    loadEventEnd: nav?.loadEventEnd,
                    duration: nav?.duration
                };
            });

            if (perf.duration && perf.duration > 3000) {
                scanIssues.push({
                    category: 'Performance',
                    severity: 'Minor',
                    title: 'Slow Load Time',
                    description: `Page took ${Math.round(perf.duration)}ms to load`,
                    affectedUrl: url
                });
            }

        } catch (e) {
            scanIssues.push({
                category: 'Error',
                severity: 'Critical',
                title: 'Scan Failed',
                description: `Could not load page for scanning: ${(e as Error).message}`,
                affectedUrl: url
            });
        }

        await page.close();
        pagesProcessed++;
    }

    await browser.close();

    // Final Scoring
    const report = calculateScore(scanIssues);

    io.emit('scan:complete', { scanId, report });
}
