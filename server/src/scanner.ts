import { chromium, Page } from 'playwright';
import { Server } from 'socket.io';
import { crawlSite } from './crawler';
import { calculateScore, Issue } from './scorer';
// import lighthouse from 'lighthouse';
// import * as chromeLauncher from 'chrome-launcher';

// Mocking lighthouse for MVP speed/stability if needed, or implement partially
// We will focus on pure Playwright for now as per plan constraints and speed.

export async function runScan(
    startUrl: string,
    scanId: string,
    io: Server,
    updateState: (update: any) => void,
    selectedDevices: string[] = []
) {
    const emitProgress = (message: string, progress: number) => {
        io.to(scanId).emit('scan:progress', { scanId, message, progress });
        updateState({ message, progress, status: 'SCANNING' });
    };

    emitProgress('Starting crawler...', 5);

    let scanIssues: Issue[] = [];
    const pageReports: any[] = [];

    // 1. Crawl
    // 1. Crawl
    emitProgress('Discovering pages...', 10);
    const pages = await crawlSite(startUrl);
    emitProgress(`Found ${pages.length} pages.`, 20);

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

    // Device mapping
    const DEVICE_MAP: Record<string, { name: string; width: number; height: number }> = {
        'small-mobile': { name: 'Small Mobile', width: 375, height: 667 },
        'mobile': { name: 'Mobile', width: 390, height: 844 },
        'big-mobile': { name: 'Big Mobile', width: 430, height: 932 },
        'tablet-small': { name: 'Tablet Small', width: 768, height: 1024 },
        'tablet-normal': { name: 'Tablet Normal', width: 1024, height: 1366 },
        'desktop-small': { name: 'Desktop Small', width: 1280, height: 720 },
        'desktop-medium': { name: 'Desktop Medium', width: 1366, height: 768 },
        'desktop-normal': { name: 'Desktop Normal', width: 1920, height: 1080 }
    };

    // Create breakpoints from selected devices, fallback to default if none selected
    const BREAKPOINTS = selectedDevices.length > 0
        ? selectedDevices.map(deviceId => DEVICE_MAP[deviceId]).filter(Boolean)
        : [
            { name: 'Mobile', width: 390, height: 844 },
            { name: 'Tablet', width: 768, height: 1024 },
            { name: 'Desktop', width: 1440, height: 900 }
        ];

    let pagesProcessed = 0;

    for (const pageObj of pages) {
        const { url, referrer } = pageObj;

        emitProgress(
            `Scanning ${url}...`,
            20 + Math.floor((pagesProcessed / pages.length) * 70)
        );

        let pageMetrics: any = {};

        const page = await context.newPage();

        // ERROR LISTENERS
        page.on('console', msg => {
            if (msg.type() === 'error') {
                scanIssues.push({
                    category: 'Errors & Reliability',
                    severity: 'Major',
                    title: 'Console Error',
                    description: msg.text(),
                    affectedUrl: url
                });
            } else if (msg.type() === 'warning') {
                scanIssues.push({
                    category: 'Best Practices',
                    severity: 'Suggestion',
                    title: 'Console Warning',
                    description: msg.text(),
                    affectedUrl: url
                });
            }
        });

        page.on('pageerror', exception => {
            scanIssues.push({
                category: 'Errors & Reliability',
                severity: 'Critical',
                title: 'Uncaught Exception',
                description: exception.message,
                affectedUrl: url
            });
        });

        page.on('response', response => {
            if (response.status() >= 400) {
                // Ignore standard 404 for the page itself if handled elsewhere, but good to catch resources
                if (response.url() === url && response.status() === 404) {
                    // Main page 404
                    const description = referrer
                        ? `The page returned a 404 status. Found on: ${referrer}`
                        : 'The page returned a 404 status.';

                    scanIssues.push({ category: 'Errors & Reliability', severity: 'Critical', title: 'Page Not Found', description: description, affectedUrl: url });
                } else if (response.status() >= 500) {
                    scanIssues.push({ category: 'Errors & Reliability', severity: 'Major', title: 'Server Error', description: `${response.url()} returned status ${response.status()}`, affectedUrl: url });
                } else if (response.status() === 404) {
                    // Resource 404
                    scanIssues.push({ category: 'Errors & Reliability', severity: 'Minor', title: 'Broken Resource', description: `${response.url()} returned 404 Not Found on ${url}`, affectedUrl: url });
                }
            }
        });

        page.on('requestfailed', request => {
            const failedUrl = request.url();
            // Filter out known analytics/tracking domains
            const IGNORED_DOMAINS = [
                'google-analytics.com',
                'googletagmanager.com',
                'facebook.net',
                'connect.facebook.net',
                'doubleclick.net',
                'googleadservices.com',
                'hotjar.com',
                'segment.io',
                'linkedin.com',
                'twitter.com',
                't.co',
                'pinterest.com'
            ];

            if (IGNORED_DOMAINS.some(domain => failedUrl.includes(domain))) {
                return;
            }

            // Abort error corresponds to operation canceled e.g. by uBlock or browser, or navigation interrupted
            if (request.failure()?.errorText === 'net::ERR_ABORTED') return;

            scanIssues.push({
                category: 'Errors & Reliability',
                severity: 'Minor',
                title: 'Failed Request',
                description: `${failedUrl} failed: ${request.failure()?.errorText}`,
                affectedUrl: url
            });
        });

        // INJECT PERFORMANCE OBSERVERS (LCP, FCP, CLS)
        await page.addInitScript(() => {
            (window as any).__metrics = {
                lcp: 0,
                fcp: 0,
                cls: 0
            };

            // LCP
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                if (entries.length > 0) {
                    const lastEntry = entries[entries.length - 1];
                    (window as any).__metrics.lcp = lastEntry.startTime;
                }
            }).observe({ type: 'largest-contentful-paint', buffered: true });

            // FCP
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                if (entries.length > 0) {
                    (window as any).__metrics.fcp = entries[0].startTime;
                }
            }).observe({ type: 'paint', buffered: true });

            // CLS
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!(entry as any).hadRecentInput) {
                        (window as any).__metrics.cls += (entry as any).value;
                    }
                }
            }).observe({ type: 'layout-shift', buffered: true });
        });

        try {
            await page.goto(url, { waitUntil: 'networkidle' });

            // RUN COMPREHENSIVE ON-PAGE EVALUATION
            const analysis = await page.evaluate(() => {
                const issues: any[] = [];
                const metrics = (window as any).__metrics;

                // --- PERFORMANCE ---
                const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

                // --- ACCESSIBILITY ---
                // Images without alt text
                const images = Array.from(document.querySelectorAll('img'));
                const missingAlt = images.filter(img => !img.hasAttribute('alt') || img.getAttribute('alt') === '');
                if (missingAlt.length > 0) {
                    issues.push({
                        category: 'Accessibility',
                        severity: 'Major',
                        title: 'Images Missing Alt Text',
                        description: `${missingAlt.length} images are missing alt text.`
                    });
                }

                // Headings out of order
                const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
                let lastLevel = 0;
                for (const h of headings) {
                    const level = parseInt(h.tagName.substring(1));
                    if (level > lastLevel + 1 && lastLevel !== 0) {
                        issues.push({
                            category: 'Accessibility',
                            severity: 'Minor',
                            title: 'Skipped Heading Level',
                            description: `Heading structure jumps from H${lastLevel} to H${level}.`
                        });
                        break; // Report once per page
                    }
                    lastLevel = level;
                }

                // Invalid ARIA (basic check)
                const elements = document.querySelectorAll('*');
                for (const el of elements) {
                    const attrs = el.attributes;
                    for (let i = 0; i < attrs.length; i++) {
                        const name = attrs[i].name;
                        if (name.startsWith('aria-') && !name.match(/^aria-[a-z]+$/)) {
                            // Very basic regex check, could be improved
                        }
                    }
                }

                // --- SEO ---
                if (!document.title) {
                    issues.push({ category: 'SEO', severity: 'Minor', title: 'Missing Title', description: 'Page has no title tag.' });
                }
                const metaDesc = document.querySelector('meta[name="description"]');
                if (!metaDesc) {
                    issues.push({ category: 'SEO', severity: 'Suggestion', title: 'Missing Meta Description', description: 'Page should have a meta description.' });
                }
                const h1s = document.querySelectorAll('h1');
                if (h1s.length === 0) {
                    issues.push({ category: 'SEO', severity: 'Major', title: 'Missing H1', description: 'Page should have exactly one H1 tag.' });
                } else if (h1s.length > 1) {
                    issues.push({ category: 'SEO', severity: 'Minor', title: 'Multiple H1 Tags', description: 'Page should have exactly one H1 tag.' });
                }
                const canonical = document.querySelector('link[rel="canonical"]');
                if (!canonical) {
                    issues.push({ category: 'SEO', severity: 'Suggestion', title: 'Missing Canonical Tag', description: 'Canonical tag helps prevent duplicate content issues.' });
                }

                // --- BEST PRACTICES ---
                // Mixed Content (if page is HTTPS, check for HTTP resources)
                if (window.location.protocol === 'https:') {
                    const insecureResources = Array.from(document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"]'));
                    if (insecureResources.length > 0) {
                        issues.push({ category: 'Best Practices', severity: 'Major', title: 'Mixed Content', description: `${insecureResources.length} resources are loaded over insecure HTTP.` });
                    }
                }

                // Unsafe links to cross-origin destinations
                const unsafeLinks = Array.from(document.querySelectorAll('a[target="_blank"]:not([rel~="noopener"]):not([rel~="noreferrer"])'));
                if (unsafeLinks.length > 0) {
                    issues.push({ category: 'Best Practices', severity: 'Minor', title: 'Unsafe Cross-Origin Links', description: `${unsafeLinks.length} links use target="_blank" without rel="noopener noreferrer".` });
                }

                // --- RESPONSIVENESS (Static) ---
                const viewport = document.querySelector('meta[name="viewport"]');
                if (!viewport) {
                    issues.push({ category: 'Responsiveness & Layout', severity: 'Major', title: 'Missing Viewport Meta Tag', description: 'Page is missing viewport meta tag for mobile responsiveness.' });
                }

                return {
                    metrics: {
                        lcp: metrics.lcp,
                        fcp: metrics.fcp,
                        cls: metrics.cls,
                        duration: nav?.duration,
                        domComplete: nav?.domComplete
                    },
                    onPageIssues: issues
                };
            });

            // ADD EVALUATED ISSUES
            analysis.onPageIssues.forEach(i => scanIssues.push({ ...i, affectedUrl: url }));

            // ADD PERFORMANCE METRICS ISSUES
            const { lcp, fcp, cls, duration } = analysis.metrics;

            // LCP
            if (lcp > 2500) {
                scanIssues.push({ category: 'Performance', severity: 'Minor', title: 'Slow Largest Contentful Paint (LCP)', description: `LCP was ${Math.round(lcp)}ms (Target < 2.5s).`, affectedUrl: url });
            }

            // FCP
            if (fcp > 1800) {
                scanIssues.push({ category: 'Performance', severity: 'Suggestion', title: 'Slow First Contentful Paint (FCP)', description: `FCP was ${Math.round(fcp)}ms (Target < 1.8s).`, affectedUrl: url });
            }

            // CLS
            if (cls > 0.1) {
                scanIssues.push({ category: 'Performance', severity: 'Minor', title: 'Cumulative Layout Shift (CLS)', description: `CLS score was ${cls.toFixed(3)} (Target < 0.1).`, affectedUrl: url });
            }

            // Fallback Load Time
            if (!lcp && duration > 5000) {
                scanIssues.push({ category: 'Performance', severity: 'Suggestion', title: 'Slow Load Time', description: `Page took ${Math.round(duration)}ms to load.`, affectedUrl: url });
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
                        category: 'Responsiveness & Layout',
                        severity: 'Major',
                        title: 'Horizontal Overflow',
                        description: `Content overflows width on ${bp.name} (${bp.width}px)`,
                        affectedUrl: url
                    });
                }
            }

            pageMetrics = analysis.metrics;

        } catch (e) {
            scanIssues.push({
                category: 'Errors & Reliability',
                severity: 'Critical',
                title: 'Scan Failed',
                description: `Could not load page for scanning: ${(e as Error).message}`,
                affectedUrl: url
            });
        }

        // Calculate score for this specific page
        const pageIssues = scanIssues.filter(i => i.affectedUrl === url);
        const pageScoreReport = calculateScore(pageIssues);

        pageReports.push({
            url: url,
            score: pageScoreReport.overallScore,
            categoryScores: pageScoreReport.categories,
            metrics: pageMetrics || {},
            issues: pageIssues
        });

        await page.close();
        pagesProcessed++;
    }

    await browser.close();

    // Final Scoring
    const report = calculateScore(scanIssues, pageReports);

    io.to(scanId).emit('scan:complete', { scanId, report });
    updateState({ status: 'COMPLETE', report, progress: 100, message: 'Scan Complete' });
}
