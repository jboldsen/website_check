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
