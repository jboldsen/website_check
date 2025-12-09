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

const WEIGHTS = {
    Performance: 0.25,
    'Responsiveness & Layout': 0.20,
    Accessibility: 0.15,
    SEO: 0.15,
    'Errors & Reliability': 0.15,
    'Best Practices': 0.10
};

export function calculateScore(issues: Issue[], pages: PageReport[] = []): ScoreReport {
    // Start with 100 for each category
    const scores = {
        Performance: 100,
        'Responsiveness & Layout': 100,
        Accessibility: 100,
        SEO: 100,
        'Errors & Reliability': 100,
        'Best Practices': 100
    };

    // Deduced points per severity
    const PENALTY = {
        Critical: 25,
        Major: 15,
        Minor: 5,
        Suggestion: 1
    };

    issues.forEach(issue => {
        scores[issue.category] = Math.max(0, scores[issue.category] - PENALTY[issue.severity]);
    });

    // Calculate weighted average
    let totalWeighted = 0;
    totalWeighted += scores.Performance * WEIGHTS.Performance;
    totalWeighted += scores['Responsiveness & Layout'] * WEIGHTS['Responsiveness & Layout'];
    totalWeighted += scores.Accessibility * WEIGHTS.Accessibility;
    totalWeighted += scores.SEO * WEIGHTS.SEO;
    totalWeighted += scores['Errors & Reliability'] * WEIGHTS['Errors & Reliability'];
    totalWeighted += scores['Best Practices'] * WEIGHTS['Best Practices'];

    return {
        overallScore: Math.round(totalWeighted),
        categories: scores,
        details: issues,
        pages
    };
}
