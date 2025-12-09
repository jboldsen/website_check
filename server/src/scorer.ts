export interface Issue {
    category: 'Performance' | 'Responsiveness' | 'Interaction' | 'Accessibility' | 'Error' | 'SEO';
    severity: 'Critical' | 'Major' | 'Minor' | 'Suggestion';
    title: string;
    description: string;
    affectedUrl: string;
}

export interface ScoreReport {
    overallScore: number;
    categories: {
        Performance: number;
        Responsiveness: number;
        Interaction: number;
        Accessibility: number;
        Error: number;
        SEO: number;
    };
    details: Issue[];
}

const WEIGHTS = {
    Performance: 0.30,
    Responsiveness: 0.25,
    Interaction: 0.20,
    Accessibility: 0.10,
    Error: 0.10,
    SEO: 0.05
};

export function calculateScore(issues: Issue[]): ScoreReport {
    // Start with 100 for each category
    const scores = {
        Performance: 100,
        Responsiveness: 100,
        Interaction: 100,
        Accessibility: 100,
        Error: 100,
        SEO: 100
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
    totalWeighted += scores.Responsiveness * WEIGHTS.Responsiveness;
    totalWeighted += scores.Interaction * WEIGHTS.Interaction;
    totalWeighted += scores.Accessibility * WEIGHTS.Accessibility;
    totalWeighted += scores.Error * WEIGHTS.Error;
    totalWeighted += scores.SEO * WEIGHTS.SEO;

    return {
        overallScore: Math.round(totalWeighted),
        categories: scores,
        details: issues
    };
}
