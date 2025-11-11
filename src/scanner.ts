/**
 * Main Technical Debt Scanner
 * Orchestrates all analysis modules and generates comprehensive reports
 */

import { createHash } from 'crypto';
import { analyzeComplexity, ComplexityMetrics } from './analyzers/complexity.js';
import { analyzeCodeSmells, CodeSmell } from './analyzers/codeSmells.js';
import { analyzeSecurityIssues, SecurityIssue } from './analyzers/security.js';
import {
    calculateBusinessImpact,
    calculateDebtRatio,
    calculateSQALERating,
    calculateMaintainabilityIndex,
    BusinessImpact
} from './calculators/businessImpact.js';

export interface ScanResult {
    summary: {
        totalFiles: number;
        totalLines: number;
        totalIssues: number;
        criticalIssues: number;
        technicalDebt: {
            totalMinutes: number;
            debtRatio: number;
            sqaleRating: 'A' | 'B' | 'C' | 'D' | 'E';
            maintainabilityIndex: number;
        };
        complexity: {
            avgCyclomatic: number;
            avgCognitive: number;
            highComplexityFiles: number;
        };
        quality: {
            codeSmells: number;
            securityIssues: number;
            testCoverage: number;
        };
    };
    businessImpact: BusinessImpact;
    issues: Array<{
        id: string;
        type: string;
        severity: string;
        category: string;
        file: string;
        line?: number;
        message: string;
        effort: number;
        businessImpact: string;
    }>;
    fileMetrics: Array<{
        file: string;
        lines: number;
        complexity: ComplexityMetrics;
        issues: number;
        debtMinutes: number;
    }>;
    trends: {
        worstFiles: Array<{ file: string; score: number; reason: string }>;
        quickWins: Array<{ file: string; effort: number; impact: string }>;
        criticalPath: string[];
    };
}

/**
 * Scan a single file for technical debt
 */
export async function scanFile(
    content: string,
    filePath: string
): Promise<{
    complexity: ComplexityMetrics;
    codeSmells: CodeSmell[];
    securityIssues: SecurityIssue[];
    lines: number;
    commentLines: number;
}> {
    const lines = content.split('\n');
    const commentLines = lines.filter(l => 
        l.trim().startsWith('//') || 
        l.trim().startsWith('#') || 
        l.trim().startsWith('*')
    ).length;
    
    const complexity = analyzeComplexity(content, filePath);
    const codeSmells = analyzeCodeSmells(content, filePath);
    const securityIssues = analyzeSecurityIssues(content);
    
    return {
        complexity,
        codeSmells,
        securityIssues,
        lines: lines.length,
        commentLines
    };
}

/**
 * Calculate file quality score (0-100, higher is better)
 */
function calculateFileScore(
    complexity: ComplexityMetrics,
    issues: number,
    lines: number
): number {
    let score = 100;
    
    // Penalize high complexity
    score -= Math.min(complexity.cyclomatic / 10, 30);
    score -= Math.min(complexity.cognitive / 10, 20);
    
    // Penalize issues
    score -= Math.min(issues * 2, 30);
    
    // Penalize large files
    if (lines > 500) score -= 10;
    if (lines > 1000) score -= 10;
    
    return Math.max(0, score);
}

/**
 * Generate issue ID
 */
function generateIssueId(type: string, file: string, line?: number): string {
    return createHash('sha256')
        .update(`${type}:${file}:${line || 0}`)
        .digest('hex')
        .substring(0, 8);
}

/**
 * Map severity to business impact
 */
function mapSeverityToBusinessImpact(severity: string): string {
    const impactMap: Record<string, string> = {
        blocker: 'CRITICAL - Immediate production risk, potential data breach or system failure',
        critical: 'HIGH - Significant impact on reliability, security, or performance',
        major: 'MEDIUM - Affects maintainability and development velocity',
        minor: 'LOW - Minor quality improvement, technical excellence',
        info: 'MINIMAL - Informational, best practice suggestion'
    };
    return impactMap[severity] || 'UNKNOWN';
}

/**
 * Aggregate scan results and calculate metrics
 */
export function aggregateResults(
    fileResults: Array<{
        file: string;
        complexity: ComplexityMetrics;
        codeSmells: CodeSmell[];
        securityIssues: SecurityIssue[];
        lines: number;
        commentLines: number;
    }>,
    testCoverage: number = 0
): ScanResult {
    const allIssues: any[] = [];
    const fileMetrics: any[] = [];
    
    let totalLines = 0;
    let totalCommentLines = 0;
    let totalCyclomatic = 0;
    let totalCognitive = 0;
    let totalDebtMinutes = 0;
    let highComplexityFiles = 0;
    
    // Process each file
    for (const result of fileResults) {
        totalLines += result.lines;
        totalCommentLines += result.commentLines;
        totalCyclomatic += result.complexity.cyclomatic;
        totalCognitive += result.complexity.cognitive;
        
        if (result.complexity.cyclomatic > 50 || result.complexity.cognitive > 50) {
            highComplexityFiles++;
        }
        
        let fileDebt = 0;
        
        // Process code smells
        for (const smell of result.codeSmells) {
            const issue = {
                id: generateIssueId(smell.type, result.file, smell.line),
                type: smell.type,
                severity: smell.severity,
                category: 'maintainability',
                file: result.file,
                line: smell.line,
                message: smell.message,
                effort: smell.effort,
                businessImpact: mapSeverityToBusinessImpact(smell.severity)
            };
            allIssues.push(issue);
            fileDebt += smell.effort;
        }
        
        // Process security issues
        for (const secIssue of result.securityIssues) {
            const issue = {
                id: generateIssueId(secIssue.type, result.file, secIssue.line),
                type: secIssue.type,
                severity: secIssue.severity,
                category: 'security',
                file: result.file,
                line: secIssue.line,
                message: secIssue.message,
                effort: secIssue.effort,
                businessImpact: mapSeverityToBusinessImpact(secIssue.severity),
                cwe: secIssue.cwe
            };
            allIssues.push(issue);
            fileDebt += secIssue.effort;
        }
        
        totalDebtMinutes += fileDebt;
        
        fileMetrics.push({
            file: result.file,
            lines: result.lines,
            complexity: result.complexity,
            issues: result.codeSmells.length + result.securityIssues.length,
            debtMinutes: fileDebt
        });
    }
    
    // Calculate metrics
    const avgCyclomatic = fileResults.length > 0 ? totalCyclomatic / fileResults.length : 0;
    const avgCognitive = fileResults.length > 0 ? totalCognitive / fileResults.length : 0;
    const commentRatio = totalLines > 0 ? totalCommentLines / totalLines : 0;
    
    const debtRatio = calculateDebtRatio(totalDebtMinutes, totalLines);
    const sqaleRating = calculateSQALERating(debtRatio);
    const maintainabilityIndex = calculateMaintainabilityIndex(
        totalLines,
        totalCyclomatic,
        commentRatio
    );
    
    const criticalIssues = allIssues.filter(i => 
        i.severity === 'blocker' || i.severity === 'critical'
    ).length;
    
    const securityIssues = allIssues.filter(i => i.category === 'security').length;
    const codeSmells = allIssues.filter(i => i.category === 'maintainability').length;
    
    // Calculate business impact
    const businessImpact = calculateBusinessImpact(
        totalDebtMinutes,
        totalLines,
        allIssues,
        totalCyclomatic,
        codeSmells,
        testCoverage
    );
    
    // Identify worst files
    const worstFiles = fileMetrics
        .map(fm => ({
            file: fm.file,
            score: calculateFileScore(fm.complexity, fm.issues, fm.lines),
            reason: fm.issues > 5 ? 'High issue count' : 
                    fm.complexity.cyclomatic > 50 ? 'High complexity' :
                    fm.lines > 1000 ? 'Large file size' : 'Multiple factors'
        }))
        .sort((a, b) => a.score - b.score)
        .slice(0, 10);
    
    // Identify quick wins (low effort, high impact)
    const quickWins = allIssues
        .filter(i => i.effort < 30 && (i.severity === 'critical' || i.severity === 'major'))
        .map(i => ({
            file: i.file,
            effort: i.effort,
            impact: i.businessImpact
        }))
        .slice(0, 10);
    
    // Critical path (files that need immediate attention)
    const criticalPath = fileMetrics
        .filter(fm => fm.issues > 0)
        .sort((a, b) => b.debtMinutes - a.debtMinutes)
        .slice(0, 5)
        .map(fm => fm.file);
    
    return {
        summary: {
            totalFiles: fileResults.length,
            totalLines,
            totalIssues: allIssues.length,
            criticalIssues,
            technicalDebt: {
                totalMinutes: totalDebtMinutes,
                debtRatio,
                sqaleRating,
                maintainabilityIndex
            },
            complexity: {
                avgCyclomatic,
                avgCognitive,
                highComplexityFiles
            },
            quality: {
                codeSmells,
                securityIssues,
                testCoverage
            }
        },
        businessImpact,
        issues: allIssues,
        fileMetrics,
        trends: {
            worstFiles,
            quickWins,
            criticalPath
        }
    };
}
