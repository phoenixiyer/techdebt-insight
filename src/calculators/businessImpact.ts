/**
 * Business Impact Calculator
 * Translates technical debt into business metrics (cost, time, risk)
 */

export interface BusinessImpact {
    financialCost: number; // USD
    timeToFix: string; // Human readable
    riskScore: number; // 0-100
    productivityImpact: string; // High/Medium/Low
    customerImpact: string; // High/Medium/Low
    recommendations: string[];
}

// Average developer hourly rate (can be configured)
const DEVELOPER_HOURLY_RATE = 75; // USD

/**
 * Calculate SQALE Rating based on technical debt ratio
 * A: ≤5%, B: 5-10%, C: 10-20%, D: 20-50%, E: >50%
 */
export function calculateSQALERating(debtRatio: number): 'A' | 'B' | 'C' | 'D' | 'E' {
    if (debtRatio <= 5) return 'A';
    if (debtRatio <= 10) return 'B';
    if (debtRatio <= 20) return 'C';
    if (debtRatio <= 50) return 'D';
    return 'E';
}

/**
 * Calculate technical debt ratio
 * Formula: (Technical Debt / Development Cost) * 100
 */
export function calculateDebtRatio(totalDebtMinutes: number, linesOfCode: number): number {
    // Assume 30 minutes to develop 1 line of code (industry standard)
    const developmentCost = linesOfCode * 30;
    if (developmentCost === 0) return 0;
    return (totalDebtMinutes / developmentCost) * 100;
}

/**
 * Calculate Maintainability Index
 * Formula: 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
 * Where: HV = Halstead Volume, CC = Cyclomatic Complexity, LOC = Lines of Code
 * Simplified version using available metrics
 */
export function calculateMaintainabilityIndex(
    linesOfCode: number,
    cyclomaticComplexity: number,
    commentRatio: number
): number {
    // Simplified formula
    const baseScore = 100;
    const complexityPenalty = Math.min(cyclomaticComplexity / 10, 30);
    const sizePenalty = Math.min(Math.log(linesOfCode) * 2, 30);
    const commentBonus = commentRatio * 10;
    
    const index = baseScore - complexityPenalty - sizePenalty + commentBonus;
    return Math.max(0, Math.min(100, index));
}

/**
 * Convert minutes to human-readable time
 */
export function formatTime(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)} minutes`;
    if (minutes < 480) return `${(minutes / 60).toFixed(1)} hours`;
    if (minutes < 2400) return `${(minutes / 480).toFixed(1)} days`;
    if (minutes < 9600) return `${(minutes / 2400).toFixed(1)} weeks`;
    return `${(minutes / 9600).toFixed(1)} months`;
}

/**
 * Calculate risk score based on issue severity and count
 */
export function calculateRiskScore(issues: any[]): number {
    let score = 0;
    
    for (const issue of issues) {
        switch (issue.severity) {
            case 'blocker':
                score += 20;
                break;
            case 'critical':
                score += 15;
                break;
            case 'major':
                score += 10;
                break;
            case 'minor':
                score += 5;
                break;
            case 'info':
                score += 1;
                break;
        }
    }
    
    return Math.min(100, score);
}

/**
 * Assess productivity impact
 */
export function assessProductivityImpact(
    cyclomaticComplexity: number,
    codeSmells: number,
    debtRatio: number
): string {
    const complexityScore = cyclomaticComplexity / 100;
    const smellScore = codeSmells / 50;
    const debtScore = debtRatio / 20;
    
    const totalScore = complexityScore + smellScore + debtScore;
    
    if (totalScore > 2) return 'High - Development velocity significantly impacted';
    if (totalScore > 1) return 'Medium - Moderate slowdown in feature delivery';
    return 'Low - Minimal impact on development speed';
}

/**
 * Assess customer impact
 */
export function assessCustomerImpact(securityIssues: number, reliabilityIssues: number): string {
    if (securityIssues > 5 || reliabilityIssues > 10) {
        return 'High - Critical issues affecting user experience and security';
    }
    if (securityIssues > 2 || reliabilityIssues > 5) {
        return 'Medium - Some issues may affect user satisfaction';
    }
    return 'Low - Limited direct impact on end users';
}

/**
 * Generate actionable recommendations
 */
export function generateRecommendations(
    sqaleRating: string,
    securityIssues: number,
    complexityScore: number,
    testCoverage: number
): string[] {
    const recommendations: string[] = [];
    
    if (sqaleRating === 'E' || sqaleRating === 'D') {
        recommendations.push('🚨 URGENT: Schedule immediate technical debt reduction sprint');
        recommendations.push('Consider allocating 30-40% of sprint capacity to refactoring');
    }
    
    if (securityIssues > 0) {
        recommendations.push(`🔒 Address ${securityIssues} security vulnerabilities immediately`);
        recommendations.push('Implement security code review process');
    }
    
    if (complexityScore > 50) {
        recommendations.push('📊 Refactor high-complexity modules to improve maintainability');
        recommendations.push('Establish complexity thresholds in CI/CD pipeline');
    }
    
    if (testCoverage < 60) {
        recommendations.push('🧪 Increase test coverage to at least 80%');
        recommendations.push('Implement test-driven development (TDD) practices');
    }
    
    recommendations.push('📈 Track technical debt metrics in sprint retrospectives');
    recommendations.push('💰 Budget 15-20% of development time for technical debt reduction');
    
    return recommendations;
}

/**
 * Calculate comprehensive business impact
 */
export function calculateBusinessImpact(
    totalDebtMinutes: number,
    linesOfCode: number,
    issues: any[],
    cyclomaticComplexity: number,
    codeSmells: number,
    testCoverage: number
): BusinessImpact {
    const debtRatio = calculateDebtRatio(totalDebtMinutes, linesOfCode);
    const sqaleRating = calculateSQALERating(debtRatio);
    const riskScore = calculateRiskScore(issues);
    
    const securityIssues = issues.filter(i => i.category === 'security').length;
    const reliabilityIssues = issues.filter(i => i.category === 'reliability').length;
    
    const financialCost = (totalDebtMinutes / 60) * DEVELOPER_HOURLY_RATE;
    const timeToFix = formatTime(totalDebtMinutes);
    const productivityImpact = assessProductivityImpact(cyclomaticComplexity, codeSmells, debtRatio);
    const customerImpact = assessCustomerImpact(securityIssues, reliabilityIssues);
    const recommendations = generateRecommendations(sqaleRating, securityIssues, cyclomaticComplexity, testCoverage);
    
    return {
        financialCost,
        timeToFix,
        riskScore,
        productivityImpact,
        customerImpact,
        recommendations
    };
}
