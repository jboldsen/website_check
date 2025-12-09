export interface Issue {
    category: 'Performance' | 'Responsiveness & Layout' | 'Accessibility' | 'SEO' | 'Errors & Reliability' | 'Best Practices';
    severity: 'Critical' | 'Major' | 'Minor' | 'Suggestion';
    title: string;
    description: string;
    affectedUrl: string;
}

export interface PageReport {
    url: string;
    score: number;
    metrics: {
        lcp?: number;
        fcp?: number;
        cls?: number;
        duration?: number;
    };
    categoryScores: {
        Performance: number;
        'Responsiveness & Layout': number;
        Accessibility: number;
        SEO: number;
        'Errors & Reliability': number;
        'Best Practices': number;
    };
    issues: Issue[];
}

export interface ScoreReport {
    overallScore: number;
    categories: {
        Performance: number;
        'Responsiveness & Layout': number;
        Accessibility: number;
        SEO: number;
        'Errors & Reliability': number;
        'Best Practices': number;
    };
    details: Issue[];
    pages: PageReport[];
}
