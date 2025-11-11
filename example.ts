#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Arun Kumar G
 * SPDX-License-Identifier: MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { glob } from 'glob';
import { readFile, stat, writeFile } from 'fs/promises';
import { join, relative } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Import analyzers
import { scanFile, aggregateResults, ScanResult } from './src/scanner.js';
import { calculateEnterpriseMetrics, generateBenchmarks, EnterpriseMetrics, BenchmarkComparison } from './src/calculators/enterpriseMetrics.js';
import { analyzeAICode, generateAISummary, AICodeAnalysis, AICodeSummary } from './src/analyzers/aiCodeDetectorV2.js';
import { generateExecutivePDF } from './src/reports/pdfGenerator.js';
const execAsync = promisify(exec);

// Create MCP server
const server = new McpServer({
    name: 'techdebt-insight',
    version: '0.1.0'
});

// Helper functions
async function findFiles(dir: string, patterns: string[]): Promise<string[]> {
    const files = await Promise.all(
        patterns.map(pattern => 
            glob(pattern, { 
                cwd: dir, 
                absolute: true,
                ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/build/**', '**/.next/**']
            })
        )
    );
    return [...new Set(files.flat())];
}

async function calculateTestCoverage(repoPath: string): Promise<number> {
    const allFiles = await findFiles(repoPath, ['**/*.{js,ts,jsx,tsx,py,java,go,rs}']);
    const testFiles = await findFiles(repoPath, [
        '**/test/**/*',
        '**/__tests__/**/*',
        '**/*.{spec,test}.{js,ts,jsx,tsx,py}'
    ]);
    
    const srcFiles = allFiles.filter(f => 
        !f.includes('/test/') && 
        !f.includes('/__tests__/') &&
        !f.endsWith('.test.') && 
        !f.endsWith('.spec.')
    );
    
    if (srcFiles.length === 0) return 0;
    return (testFiles.length / srcFiles.length) * 100;
}

function generateMarkdownReport(scanResult: ScanResult, repoPath: string, aiSummary?: AICodeSummary): string {
    const timestamp = new Date().toISOString();
    const enterpriseMetrics = calculateEnterpriseMetrics(scanResult);
    const benchmarks = generateBenchmarks(enterpriseMetrics);
    
    // Determine overall health status
    let healthStatus = '🟢 Excellent';
    let healthColor = 'green';
    if (enterpriseMetrics.technicalDebtRatio > 40 || enterpriseMetrics.codeQualityScore < 50) {
        healthStatus = '🔴 Critical';
        healthColor = 'red';
    } else if (enterpriseMetrics.technicalDebtRatio > 25 || enterpriseMetrics.codeQualityScore < 65) {
        healthStatus = '🟠 Needs Attention';
        healthColor = 'orange';
    } else if (enterpriseMetrics.technicalDebtRatio > 10 || enterpriseMetrics.codeQualityScore < 75) {
        healthStatus = '🟡 Good';
        healthColor = 'yellow';
    }
    
    return `# 📊 Enterprise Technical Debt Analysis Report

**Repository:** \`${repoPath}\`  
**Generated:** ${new Date(timestamp).toLocaleString()}  
**Overall Health:** ${healthStatus}  
**SQALE Rating:** ${scanResult.summary.technicalDebt.sqaleRating}

---

## 🎯 Executive Summary

### Health Status Dashboard

| Metric | Value | Status | Industry Benchmark |
|--------|-------|--------|-------------------|
| **Technical Debt Ratio** | ${enterpriseMetrics.technicalDebtRatio.toFixed(1)}% | ${benchmarks[0].status} | ${benchmarks[0].industry}% |
| **Code Quality Score** | ${enterpriseMetrics.codeQualityScore}/100 | ${benchmarks[3].status} | ${benchmarks[3].industry}/100 |
| **Defect Density** | ${enterpriseMetrics.defectDensity.toFixed(2)}/1K LOC | ${benchmarks[1].status} | ${benchmarks[1].industry}/1K LOC |
| **Test Coverage** | ${enterpriseMetrics.testCoverage.overall.toFixed(1)}% | ${benchmarks[2].status} | ${benchmarks[2].industry}% |
| **Maintenance Cost Ratio** | ${enterpriseMetrics.maintenanceCostRatio.toFixed(1)}% | ${benchmarks[4].status} | ${benchmarks[4].industry}% |

### 💰 Financial Impact

- **Estimated Remediation Cost:** $${scanResult.businessImpact.financialCost.toLocaleString()}
- **Time to Fix:** ${scanResult.businessImpact.timeToFix}
- **Monthly Maintenance Burden:** $${(scanResult.businessImpact.financialCost * (enterpriseMetrics.maintenanceCostRatio / 100)).toLocaleString()}
- **Annual Technical Debt Cost:** $${(scanResult.businessImpact.financialCost * 12 * (enterpriseMetrics.maintenanceCostRatio / 100)).toLocaleString()}

### 📈 Key Performance Indicators

| Category | Metric | Value |
|----------|--------|-------|
| **Codebase** | Total Files | ${scanResult.summary.totalFiles.toLocaleString()} |
| | Lines of Code | ${scanResult.summary.totalLines.toLocaleString()} |
| | Code Churn Rate | ${enterpriseMetrics.codeChurnRate.toFixed(1)}% |
| **Quality** | Total Issues | ${scanResult.summary.totalIssues.toLocaleString()} |
| | Critical Issues | ${scanResult.summary.criticalIssues} |
| | Security Vulnerabilities | ${scanResult.summary.quality.securityIssues} |
| | Code Smells | ${scanResult.summary.quality.codeSmells} |
| **Complexity** | Avg Cyclomatic | ${scanResult.summary.complexity.avgCyclomatic.toFixed(1)} |
| | Avg Cognitive | ${scanResult.summary.complexity.avgCognitive.toFixed(1)} |
| | High Complexity Files | ${scanResult.summary.complexity.highComplexityFiles} |

---

## 🚀 DORA Metrics (DevOps Performance)

| Metric | Current Value | Industry Target |
|--------|---------------|-----------------|
| **Deployment Frequency** | ${enterpriseMetrics.deploymentFrequency} | Multiple per day |
| **Lead Time for Changes** | ${enterpriseMetrics.leadTimeForChanges} | <1 day |
| **Change Failure Rate** | ${enterpriseMetrics.changeFailureRate.toFixed(1)}% | <15% |
| **Time to Restore Service** | ${enterpriseMetrics.timeToRestoreService} | <1 hour |

**Performance Level:** ${
    enterpriseMetrics.deploymentFrequency === 'Multiple per day' && 
    enterpriseMetrics.changeFailureRate < 15 ? '🏆 Elite' :
    enterpriseMetrics.deploymentFrequency === 'Weekly' ? '⭐ High' :
    enterpriseMetrics.deploymentFrequency === 'Monthly' ? '📊 Medium' : '⚠️ Low'
}

---

## 👥 Developer Productivity & Team Health

### Velocity Impact Analysis

- **Current Velocity:** ${enterpriseMetrics.velocityTrend.current}/100
- **Previous Velocity:** ${enterpriseMetrics.velocityTrend.previous.toFixed(1)}/100
- **Velocity Change:** ${enterpriseMetrics.velocityTrend.change.toFixed(1)}%
- **Impact Level:** ${enterpriseMetrics.velocityTrend.impactLevel}

### Focus Time & Interruptions

- **Focus Time Percentage:** ${enterpriseMetrics.focusTime.percentage.toFixed(1)}%
- **Daily Interruptions:** ~${enterpriseMetrics.focusTime.interruptionRate} per day
- **Team Satisfaction Index:** ${enterpriseMetrics.teamSatisfactionIndex}/100

**Productivity Assessment:** ${
    enterpriseMetrics.velocityTrend.impactLevel === 'Low' ? '✅ Team is highly productive' :
    enterpriseMetrics.velocityTrend.impactLevel === 'Medium' ? '⚠️ Moderate productivity concerns' :
    enterpriseMetrics.velocityTrend.impactLevel === 'High' ? '🔶 Significant productivity impact' :
    '🔴 Critical productivity degradation'
}

---

## 📊 Detailed Code Quality Analysis

### Test Coverage Breakdown

| Type | Coverage | Target | Status |
|------|----------|--------|--------|
| **Overall** | ${enterpriseMetrics.testCoverage.overall.toFixed(1)}% | 80% | ${enterpriseMetrics.testCoverage.overall >= 80 ? '✅' : '❌'} |
| **Unit Tests** | ${enterpriseMetrics.testCoverage.unit.toFixed(1)}% | 70% | ${enterpriseMetrics.testCoverage.unit >= 70 ? '✅' : '❌'} |
| **Integration Tests** | ${enterpriseMetrics.testCoverage.integration.toFixed(1)}% | 20% | ${enterpriseMetrics.testCoverage.integration >= 20 ? '✅' : '❌'} |
| **E2E Tests** | ${enterpriseMetrics.testCoverage.e2e.toFixed(1)}% | 10% | ${enterpriseMetrics.testCoverage.e2e >= 10 ? '✅' : '❌'} |

### Complexity Distribution

- **Average Cyclomatic Complexity:** ${scanResult.summary.complexity.avgCyclomatic.toFixed(1)} ${scanResult.summary.complexity.avgCyclomatic > 15 ? '⚠️ High' : scanResult.summary.complexity.avgCyclomatic > 10 ? '⚡ Moderate' : '✅ Good'}
- **Average Cognitive Complexity:** ${scanResult.summary.complexity.avgCognitive.toFixed(1)}
- **Files Needing Refactoring:** ${scanResult.summary.complexity.highComplexityFiles}
- **Code Duplication Rate:** ${enterpriseMetrics.duplicationRate.toFixed(1)}%

---

## 🎯 Business Impact Assessment

### Customer Impact

- **Customer Impact Score:** ${enterpriseMetrics.customerImpactScore}/100
- **Risk to Customer Experience:** ${enterpriseMetrics.customerImpactScore < 50 ? '🔴 High Risk' : enterpriseMetrics.customerImpactScore < 70 ? '🟡 Moderate Risk' : '🟢 Low Risk'}

**Analysis:** ${scanResult.businessImpact.customerImpact}

### Productivity Impact

**Analysis:** ${scanResult.businessImpact.productivityImpact}

### Scalability & Growth

- **Scalability Index:** ${enterpriseMetrics.scalabilityIndex}/100
- **Feature Delivery Velocity:** ${enterpriseMetrics.featureDeliveryVelocity} features/sprint
- **Ability to Scale:** ${enterpriseMetrics.scalabilityIndex >= 70 ? '✅ Good' : enterpriseMetrics.scalabilityIndex >= 50 ? '⚠️ Limited' : '🔴 Constrained'}

---

## 🛡️ Security & Compliance Posture

| Metric | Score | Status |
|--------|-------|--------|
| **Security Posture** | ${enterpriseMetrics.securityPosture}/100 | ${enterpriseMetrics.securityPosture >= 80 ? '🟢 Strong' : enterpriseMetrics.securityPosture >= 60 ? '🟡 Moderate' : '🔴 Weak'} |
| **Compliance Risk** | ${enterpriseMetrics.complianceRisk}/100 | ${enterpriseMetrics.complianceRisk < 30 ? '🟢 Low' : enterpriseMetrics.complianceRisk < 60 ? '🟡 Moderate' : '🔴 High'} |
| **Critical Path Risk** | ${enterpriseMetrics.criticalPathRisk}/100 | ${enterpriseMetrics.criticalPathRisk < 30 ? '🟢 Low' : enterpriseMetrics.criticalPathRisk < 60 ? '🟡 Moderate' : '🔴 High'} |

**Security Issues Found:** ${scanResult.summary.quality.securityIssues}

---

## 🚨 Critical Actions Required

${scanResult.summary.criticalIssues > 0 ? `
### Immediate Actions (Next 24-48 Hours)

${scanResult.issues.filter((i: any) => i.severity === 'critical').slice(0, 5).map((issue: any, idx: number) => 
    `${idx + 1}. **[CRITICAL]** ${issue.message} in \`${issue.file}:${issue.line}\``
).join('\n')}
` : '✅ No critical issues requiring immediate attention'}

### High Priority (This Sprint)

${scanResult.issues.filter((i: any) => i.severity === 'high').slice(0, 10).map((issue: any, idx: number) => 
    `${idx + 1}. **[HIGH]** ${issue.message} in \`${issue.file}:${issue.line}\``
).join('\n') || '✅ No high priority issues'}

---

## 🔥 Top 10 Files Requiring Immediate Attention

${scanResult.trends.worstFiles.slice(0, 10).map((f: any, i: number) => 
    `### ${i + 1}. \`${f.file}\`
- **Health Score:** ${f.score.toFixed(1)}/100
- **Reason:** ${f.reason}
- **Estimated Fix Time:** ${Math.ceil((100 - f.score) / 10)} hours
`
).join('\n')}

---

## ⚡ Quick Wins (High ROI, Low Effort)

${scanResult.trends.quickWins.slice(0, 15).map((qw: any, i: number) => 
    `${i + 1}. **\`${qw.file}\`** - ${qw.impact} (${qw.effort} minutes)`
).join('\n')}

**Total Quick Win Time:** ${scanResult.trends.quickWins.slice(0, 15).reduce((sum: number, qw: any) => sum + qw.effort, 0)} minutes (~${Math.ceil(scanResult.trends.quickWins.slice(0, 15).reduce((sum: number, qw: any) => sum + qw.effort, 0) / 60)} hours)

---

## 📋 Benchmark Comparison

| Metric | Your Value | Target | Industry Avg | Gap | Status |
|--------|------------|--------|--------------|-----|--------|
${benchmarks.map(b => 
    `| **${b.metric}** | ${b.current.toFixed(1)} | ${b.target.toFixed(1)} | ${b.industry.toFixed(1)} | ${b.gap > 0 ? '+' : ''}${b.gap.toFixed(1)} | ${b.status} |`
).join('\n')}

---

## 💡 Strategic Recommendations

### Short Term (1-2 Sprints)

${scanResult.businessImpact.recommendations.slice(0, 3).map((rec: string, i: number) => 
    `${i + 1}. ${rec}`
).join('\n')}

### Medium Term (1-2 Quarters)

${scanResult.businessImpact.recommendations.slice(3, 6).map((rec: string, i: number) => 
    `${i + 1}. ${rec}`
).join('\n') || '- Continue monitoring and maintaining current quality levels'}

### Long Term (6-12 Months)

- Establish automated quality gates in CI/CD pipeline
- Implement continuous technical debt monitoring
- Set up developer productivity dashboards
- Create technical debt budget allocation process

---

## 📈 ROI Projection

### Investment Required

- **Immediate Fixes:** $${(scanResult.businessImpact.financialCost * 0.3).toLocaleString()} (Critical + High priority)
- **Complete Remediation:** $${scanResult.businessImpact.financialCost.toLocaleString()}
- **Estimated Timeline:** ${scanResult.businessImpact.timeToFix}

### Expected Returns

- **Velocity Improvement:** +${Math.abs(enterpriseMetrics.velocityTrend.change).toFixed(0)}% to +40%
- **Defect Reduction:** -50% to -70%
- **Maintenance Cost Savings:** $${(scanResult.businessImpact.financialCost * 0.4).toLocaleString()}/year
- **Developer Satisfaction:** +${(100 - enterpriseMetrics.teamSatisfactionIndex).toFixed(0)} points

**Break-Even Point:** ${enterpriseMetrics.maintenanceCostRatio > 30 ? '3-6 months' : '6-12 months'}

---

## 📊 Detailed Issue Breakdown

### By Severity

| Severity | Count | % of Total |
|----------|-------|------------|
| Critical | ${scanResult.issues.filter((i: any) => i.severity === 'critical').length} | ${((scanResult.issues.filter((i: any) => i.severity === 'critical').length / scanResult.summary.totalIssues) * 100).toFixed(1)}% |
| High | ${scanResult.issues.filter((i: any) => i.severity === 'high').length} | ${((scanResult.issues.filter((i: any) => i.severity === 'high').length / scanResult.summary.totalIssues) * 100).toFixed(1)}% |
| Medium | ${scanResult.issues.filter((i: any) => i.severity === 'medium').length} | ${((scanResult.issues.filter((i: any) => i.severity === 'medium').length / scanResult.summary.totalIssues) * 100).toFixed(1)}% |
| Low | ${scanResult.issues.filter((i: any) => i.severity === 'low').length} | ${((scanResult.issues.filter((i: any) => i.severity === 'low').length / scanResult.summary.totalIssues) * 100).toFixed(1)}% |

### By Type

| Type | Count |
|------|-------|
| Complexity | ${scanResult.issues.filter((i: any) => i.type === 'complexity').length} |
| Code Smell | ${scanResult.issues.filter((i: any) => i.type === 'code_smell').length} |
| Security | ${scanResult.issues.filter((i: any) => i.type === 'security').length} |
| Best Practice | ${scanResult.issues.filter((i: any) => i.type === 'best_practice').length} |

---

${aiSummary ? `
## 🤖 AI Code Detection Analysis

### Overview
- **Total Files Analyzed:** ${aiSummary.totalFiles}
- **AI-Generated Files:** ${aiSummary.aiGeneratedFiles} (${((aiSummary.aiGeneratedFiles / aiSummary.totalFiles) * 100).toFixed(1)}%)
- **Human-Written Files:** ${aiSummary.humanWrittenFiles} (${((aiSummary.humanWrittenFiles / aiSummary.totalFiles) * 100).toFixed(1)}%)
- **Mixed/Uncertain:** ${aiSummary.mixedFiles}

### AI Code Metrics
- **AI Code Percentage:** ${aiSummary.aiCodePercentage}%
- **Detection Confidence:** ${aiSummary.confidenceScore}%
- **Classification:** ${aiSummary.aiCodePercentage > 70 ? '🔴 HIGH - Majority AI-generated' : aiSummary.aiCodePercentage > 40 ? '🟡 MEDIUM - Significant AI code' : '🟢 LOW - Mostly human-written'}

### Top AI Patterns Detected
${aiSummary.topAIPatterns.slice(0, 5).map((p, i) => `${i + 1}. **${p.pattern.replace(/_/g, ' ').toUpperCase()}**: ${p.count} occurrences`).join('\n')}

### Risk Assessment
- 🛡️ **Security Risks:** ${aiSummary.riskAssessment.securityRisks} files
- 🔧 **Maintenance Risks:** ${aiSummary.riskAssessment.maintenanceRisks} files
- 📊 **Quality Risks:** ${aiSummary.riskAssessment.qualityRisks} files

### AI Code Recommendations
${aiSummary.recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n')}

> 💡 **Note:** Run \`/techdebt:ai-scan\` for a detailed AI code analysis report.

---
` : ''}

## 📝 Appendix: Methodology

This report uses industry-standard methodologies:

- **SQALE Method:** Software Quality Assessment based on Lifecycle Expectations
- **DORA Metrics:** DevOps Research and Assessment performance indicators
- **Cyclomatic Complexity:** McCabe complexity measurement
- **Technical Debt Ratio:** (Remediation Time / Development Time) × 100

**Benchmarks based on:**
- Industry research from 2024-2025
- 1000+ enterprise codebases analysis
- DORA State of DevOps reports

---

*Report generated by **Tech Debt Insight** v0.1.0*  
*Timestamp: ${timestamp}*  
*For questions or support, visit: https://github.com/arunkg/techdebt-insight*
`;
}

// Register comprehensive scan_repo tool
server.registerTool(
    'scan_repo',
    {
        description: 'Performs deep analysis of code quality, complexity, security, and business impact',
        inputSchema: z.object({
            repoPath: z.string().describe('Path to the repository to scan'),
            includeGlobs: z.array(z.string())
                .default(['**/*.{js,ts,jsx,tsx,py,java,go,rs}'])
                .describe('File patterns to include in the scan')
        }).shape
    },
    async (input) => {
        const { repoPath, includeGlobs = ['**/*.{js,ts,jsx,tsx,py,java,go,rs}'] } = input;
        
        console.error(`[TechDebt] Scanning repository: ${repoPath}`);
        
        // Find all files to scan
        const files = await findFiles(repoPath, includeGlobs);
        console.error(`[TechDebt] Found ${files.length} files to analyze`);
        
        if (files.length === 0) {
            const emptyResult = {
                summary: {
                    totalFiles: 0,
                    totalLines: 0,
                    totalIssues: 0,
                    criticalIssues: 0,
                    technicalDebt: {
                        totalMinutes: 0,
                        debtRatio: 0,
                        sqaleRating: 'A',
                        maintainabilityIndex: 100
                    },
                    complexity: {
                        avgCyclomatic: 0,
                        avgCognitive: 0,
                        highComplexityFiles: 0
                    },
                    quality: {
                        codeSmells: 0,
                        securityIssues: 0,
                        testCoverage: 0
                    }
                },
                businessImpact: {
                    financialCost: 0,
                    timeToFix: '0 minutes',
                    riskScore: 0,
                    productivityImpact: 'Low',
                    customerImpact: 'Low',
                    recommendations: ['No files found to analyze']
                },
                issues: [],
                trends: {
                    worstFiles: [],
                    quickWins: [],
                    criticalPath: []
                }
            };
            
            return {
                content: [{ type: 'text', text: JSON.stringify(emptyResult, null, 2) }]
            } as any;
        }
        
        // Scan each file (including AI detection)
        const fileResults = [];
        const aiAnalyses: AICodeAnalysis[] = [];
        let scannedCount = 0;
        
        for (const file of files) {
            try {
                const content = await readFile(file, 'utf-8');
                const relativePath = relative(repoPath, file);
                
                const result = await scanFile(content, relativePath);
                fileResults.push({
                    file: relativePath,
                    ...result
                });
                
                // Also run AI detection
                const aiAnalysis = analyzeAICode(content, relativePath);
                aiAnalyses.push(aiAnalysis);
                
                scannedCount++;
                if (scannedCount % 10 === 0) {
                    console.error(`[TechDebt] Progress: ${scannedCount}/${files.length} files analyzed`);
                }
            } catch (error: any) {
                console.error(`[TechDebt] Error scanning ${file}: ${error.message}`);
            }
        }
        
        console.error(`[TechDebt] Calculating test coverage...`);
        const testCoverage = await calculateTestCoverage(repoPath);
        
        console.error(`[TechDebt] Aggregating results and calculating business impact...`);
        const scanResult: ScanResult = aggregateResults(fileResults, testCoverage);
        
        console.error(`[TechDebt] Scan complete! Found ${scanResult.summary.totalIssues} issues`);
        console.error(`[TechDebt] SQALE Rating: ${scanResult.summary.technicalDebt.sqaleRating}`);
        console.error(`[TechDebt] Estimated Cost: $${scanResult.businessImpact.financialCost.toFixed(2)}`);
        
        // Generate AI summary
        const aiSummary = generateAISummary(aiAnalyses);
        console.error(`[TechDebt] AI Code Detection: ${aiSummary.aiCodePercentage}% AI-generated`);
        
        // Generate markdown report
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const reportPath = join(repoPath, `techdebt-report-${timestamp}.md`);
        
        const markdownReport = generateMarkdownReport(scanResult, repoPath, aiSummary);
        const enterpriseMetrics = calculateEnterpriseMetrics(scanResult);
        
        try {
            await writeFile(reportPath, markdownReport, 'utf-8');
            console.error(`[TechDebt] ✅ Report saved to: ${reportPath}`);
        } catch (error: any) {
            console.error(`[TechDebt] ❌ Failed to save report: ${error.message}`);
        }
        
        // Generate executive summary for terminal display
        const executiveSummary = `
# 📊 Technical Debt Scan Complete

**Repository:** ${repoPath}
**Report File:** ${reportPath}

## 🎯 Executive Summary

- **Overall Health:** ${enterpriseMetrics.technicalDebtRatio < 5 ? '🟢 Excellent' : enterpriseMetrics.technicalDebtRatio < 15 ? '🟡 Good' : enterpriseMetrics.technicalDebtRatio < 25 ? '🟠 Fair' : '🔴 Critical'}
- **SQALE Rating:** ${scanResult.summary.technicalDebt.sqaleRating}
- **Code Quality Score:** ${enterpriseMetrics.codeQualityScore}/100
- **Technical Debt Ratio:** ${enterpriseMetrics.technicalDebtRatio.toFixed(1)}%

## 📈 Key Metrics

- **Total Files:** ${scanResult.summary.totalFiles}
- **Lines of Code:** ${scanResult.summary.totalLines.toLocaleString()}
- **Total Issues:** ${scanResult.summary.totalIssues} (${scanResult.summary.criticalIssues} critical)
- **Test Coverage:** ${scanResult.summary.quality.testCoverage.toFixed(1)}%
- **Defect Density:** ${enterpriseMetrics.defectDensity.toFixed(2)} per 1K LOC

## 💰 Business Impact

- **Estimated Cost:** $${scanResult.businessImpact.financialCost.toLocaleString()}
- **Time to Fix:** ${scanResult.businessImpact.timeToFix}
- **Velocity Impact:** ${enterpriseMetrics.velocityTrend.impactLevel}
- **Team Satisfaction:** ${enterpriseMetrics.teamSatisfactionIndex}/100

## 🚨 Top Priority Actions

${scanResult.issues.filter((i: any) => i.severity === 'critical').slice(0, 3).map((issue: any, idx: number) => 
    `${idx + 1}. [CRITICAL] ${issue.message} (${issue.file}:${issue.line})`
).join('\n') || 'No critical issues found ✅'}

---

📄 **Full detailed report saved to:** \`${reportPath}\`
`;
        
        return {
            content: [
                { type: 'text', text: executiveSummary },
                { type: 'text', text: '\n\n---\n\n**Full Scan Results (JSON):**\n\n' + JSON.stringify(scanResult, null, 2) }
            ]
        } as any;
    }
);

// Register dep_audit tool
server.registerTool(
    'dep_audit',
    {
        description: 'Audits project dependencies for outdated packages and security vulnerabilities',
        inputSchema: z.object({
            repoPath: z.string().describe('Path to the repository to audit')
        }).shape
    },
    async (input) => {
        const { repoPath } = input;
        const warnings: string[] = [];
        const vulnerabilities: any[] = [];
        const outdated: any[] = [];
        
        let npmData = null;
        let pipData = null;
        
        // Check for package.json (Node.js)
        try {
            await stat(join(repoPath, 'package.json'));
            
            // Run npm outdated
            try {
                const { stdout } = await execAsync('npm outdated --json', { cwd: repoPath });
                npmData = JSON.parse(stdout);
                
                Object.entries(npmData).forEach(([pkg, data]: [string, any]) => {
                    outdated.push({
                        package: pkg,
                        current: data.current,
                        wanted: data.wanted,
                        latest: data.latest,
                        type: data.type,
                        ecosystem: 'npm'
                    });
                });
            } catch (error: any) {
                if (error.stdout) {
                    npmData = JSON.parse(error.stdout);
                    Object.entries(npmData).forEach(([pkg, data]: [string, any]) => {
                        outdated.push({
                            package: pkg,
                            current: data.current,
                            wanted: data.wanted,
                            latest: data.latest,
                            type: data.type,
                            ecosystem: 'npm'
                        });
                    });
                }
            }
            
            // Run npm audit
            try {
                const { stdout } = await execAsync('npm audit --json', { cwd: repoPath });
                const auditData = JSON.parse(stdout);
                
                if (auditData.vulnerabilities) {
                    Object.entries(auditData.vulnerabilities).forEach(([pkg, vuln]: [string, any]) => {
                        vulnerabilities.push({
                            package: pkg,
                            severity: vuln.severity,
                            via: vuln.via,
                            ecosystem: 'npm',
                            fixAvailable: vuln.fixAvailable
                        });
                    });
                }
            } catch (error: any) {
                if (error.stdout) {
                    const auditData = JSON.parse(error.stdout);
                    if (auditData.vulnerabilities) {
                        Object.entries(auditData.vulnerabilities).forEach(([pkg, vuln]: [string, any]) => {
                            vulnerabilities.push({
                                package: pkg,
                                severity: vuln.severity,
                                via: vuln.via,
                                ecosystem: 'npm',
                                fixAvailable: vuln.fixAvailable
                            });
                        });
                    }
                }
            }
        } catch {
            // No package.json
        }
        
        // Check for requirements.txt (Python)
        try {
            await stat(join(repoPath, 'requirements.txt'));
            
            try {
                const { stdout } = await execAsync('pip-audit -r requirements.txt --format json', { cwd: repoPath });
                pipData = JSON.parse(stdout);
                
                if (pipData.dependencies) {
                    pipData.dependencies.forEach((dep: any) => {
                        if (dep.vulns && dep.vulns.length > 0) {
                            dep.vulns.forEach((vuln: any) => {
                                vulnerabilities.push({
                                    package: dep.name,
                                    version: dep.version,
                                    severity: vuln.severity || 'unknown',
                                    description: vuln.description,
                                    ecosystem: 'pip',
                                    cve: vuln.id
                                });
                            });
                        }
                    });
                }
            } catch (error: any) {
                warnings.push('pip-audit not available. Install with: pip install pip-audit');
            }
        } catch {
            // No requirements.txt
        }
        
        // Calculate summary
        const criticalVulns = vulnerabilities.filter(v => 
            v.severity === 'critical' || v.severity === 'high'
        ).length;
        
        const estimatedMinutes = (vulnerabilities.length * 30) + (outdated.length * 15);
        const estimatedTime = estimatedMinutes < 60 ? 
            `${estimatedMinutes} minutes` : 
            `${(estimatedMinutes / 60).toFixed(1)} hours`;
        
        const result = {
            npm: npmData,
            pip: pipData,
            vulnerabilities,
            outdated,
            warnings,
            summary: {
                totalVulnerabilities: vulnerabilities.length,
                criticalVulnerabilities: criticalVulns,
                outdatedPackages: outdated.length,
                estimatedFixTime: estimatedTime
            }
        };
        
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        } as any;
    }
);

// Register generate_report tool
server.registerTool(
    'generate_report',
    {
        description: 'Generates executive-level technical debt report with business impact analysis and saves to file',
        inputSchema: z.object({
            scanResults: z.string().describe('JSON string from scan_repo'),
            auditResults: z.string().describe('JSON string from dep_audit'),
            repoPath: z.string().describe('Path to the repository where report will be saved'),
            projectName: z.string().default('Project').describe('Name of the project')
        }).shape
    },
    async (input) => {
        const { scanResults, auditResults, repoPath, projectName } = input;
        const scan = JSON.parse(scanResults);
        const audit = JSON.parse(auditResults);
        
        // Run AI code detection
        console.error('[TechDebt] 🤖 Running AI code detection...');
        const files = await findFiles(repoPath, ['**/*.{js,ts,jsx,tsx,py,java,go,rs,c,cpp,cs,php,rb,swift,kt}']);
        
        const aiAnalyses: AICodeAnalysis[] = [];
        for (const file of files) {
            try {
                const content = await readFile(file, 'utf-8');
                const analysis = analyzeAICode(content, file);
                aiAnalyses.push(analysis);
            } catch (error) {
                // Skip files that can't be read
            }
        }
        
        const aiSummary = generateAISummary(aiAnalyses);
        console.error(`[TechDebt] ✅ AI Detection: ${aiSummary.aiCodePercentage}% AI-generated (${aiSummary.confidenceScore}% confidence)`);
        
        // Determine overall health
        let overallHealth = 'Excellent';
        if (scan.summary.technicalDebt.sqaleRating === 'E' || scan.summary.technicalDebt.sqaleRating === 'D') {
            overallHealth = 'Critical';
        } else if (scan.summary.technicalDebt.sqaleRating === 'C') {
            overallHealth = 'Needs Attention';
        } else if (scan.summary.technicalDebt.sqaleRating === 'B') {
            overallHealth = 'Good';
        }
        
        // Generate critical actions
        const criticalActions = [];
        if (audit.summary.criticalVulnerabilities > 0) {
            criticalActions.push(`🚨 Fix ${audit.summary.criticalVulnerabilities} critical security vulnerabilities immediately`);
        }
        if (scan.summary.criticalIssues > 10) {
            criticalActions.push(`⚠️ Address ${scan.summary.criticalIssues} critical code quality issues`);
        }
        if (scan.summary.quality.testCoverage < 60) {
            criticalActions.push(`🧪 Increase test coverage from ${scan.summary.quality.testCoverage.toFixed(1)}% to at least 80%`);
        }
        if (scan.summary.technicalDebt.debtRatio > 20) {
            criticalActions.push(`💰 Reduce technical debt ratio from ${scan.summary.technicalDebt.debtRatio.toFixed(1)}% to below 10%`);
        }
        
        // Calculate ROI
        const monthlyCost = scan.businessImpact.financialCost;
        const productivityGain = scan.summary.technicalDebt.debtRatio > 20 ? '25-40%' : '10-20%';
        const roi = `Fixing technical debt can improve development velocity by ${productivityGain}, reducing monthly costs by $${(monthlyCost * 0.3).toFixed(0)}-$${(monthlyCost * 0.5).toFixed(0)}`;
        
        // Generate markdown report
        const report = `# 📊 Technical Debt Analysis Report
## ${projectName}

---

## 🎯 Executive Summary

**Overall Health:** ${overallHealth} (SQALE Rating: ${scan.summary.technicalDebt.sqaleRating})
**Maintainability Index:** ${scan.summary.technicalDebt.maintainabilityIndex.toFixed(1)}/100
**Risk Score:** ${scan.businessImpact.riskScore}/100

### 💰 Financial Impact
- **Estimated Cost to Fix:** $${scan.businessImpact.financialCost.toFixed(2)}
- **Time Required:** ${scan.businessImpact.timeToFix}
- **Technical Debt Ratio:** ${scan.summary.technicalDebt.debtRatio.toFixed(2)}%

### 📈 Key Metrics
- **Total Files Analyzed:** ${scan.summary.totalFiles}
- **Lines of Code:** ${scan.summary.totalLines.toLocaleString()}
- **Total Issues:** ${scan.summary.totalIssues}
- **Critical Issues:** ${scan.summary.criticalIssues}
- **Security Vulnerabilities:** ${audit.summary.totalVulnerabilities} (${audit.summary.criticalVulnerabilities} critical)
- **Test Coverage:** ${scan.summary.quality.testCoverage.toFixed(1)}%

---

## 🚨 Critical Actions Required

${criticalActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

---

## 📊 Code Quality Analysis

### Complexity Metrics
- **Average Cyclomatic Complexity:** ${scan.summary.complexity.avgCyclomatic.toFixed(1)}
- **Average Cognitive Complexity:** ${scan.summary.complexity.avgCognitive.toFixed(1)}
- **High Complexity Files:** ${scan.summary.complexity.highComplexityFiles}

### Quality Issues
- **Code Smells:** ${scan.summary.quality.codeSmells}
- **Security Issues:** ${scan.summary.quality.securityIssues}

---

## 🎯 Business Impact Assessment

### Productivity Impact
${scan.businessImpact.productivityImpact}

### Customer Impact
${scan.businessImpact.customerImpact}

### Return on Investment (ROI)
${roi}

---

## 🔥 Top 10 Worst Files (Immediate Attention Required)

${scan.trends.worstFiles.slice(0, 10).map((f: any, i: number) => 
    `${i + 1}. **${f.file}** (Score: ${f.score.toFixed(1)}/100) - ${f.reason}`
).join('\n')}

---

## ⚡ Quick Wins (Low Effort, High Impact)

${scan.trends.quickWins.slice(0, 10).map((qw: any, i: number) => 
    `${i + 1}. **${qw.file}** - ${qw.effort} minutes - ${qw.impact}`
).join('\n')}

---

## 🛡️ Security Vulnerabilities

${audit.vulnerabilities.length > 0 ? 
    audit.vulnerabilities.slice(0, 10).map((v: any, i: number) => 
        `${i + 1}. **${v.package}** (${v.severity}) - ${v.ecosystem} - ${v.description || v.via || 'Security issue detected'}`
    ).join('\n') : 
    'No vulnerabilities detected ✅'
}

---

## 📦 Outdated Dependencies

${audit.outdated.length > 0 ? 
    audit.outdated.slice(0, 10).map((d: any, i: number) => 
        `${i + 1}. **${d.package}**: ${d.current} → ${d.latest}`
    ).join('\n') : 
    'All dependencies are up to date ✅'
}

---

## 💡 Recommendations

${scan.businessImpact.recommendations.map((rec: string, i: number) => 
    `${i + 1}. ${rec}`
).join('\n')}

---

## 📅 Suggested Remediation Timeline

### Week 1-2: Critical Issues
- Fix all security vulnerabilities
- Address blocker-level code issues
- Set up automated security scanning

### Week 3-4: High Priority
- Refactor high-complexity modules
- Increase test coverage to 70%
- Update critical dependencies

### Month 2: Medium Priority
- Address code smells in critical paths
- Improve documentation
- Establish code quality gates

### Month 3+: Continuous Improvement
- Maintain 80%+ test coverage
- Regular dependency updates
- Technical debt tracking in sprints

---

## 📈 Success Metrics

Track these KPIs monthly:
- Technical Debt Ratio (Target: < 10%)
- SQALE Rating (Target: A or B)
- Test Coverage (Target: > 80%)
- Security Vulnerabilities (Target: 0 critical)
- Maintainability Index (Target: > 70)

---

*Report generated by Tech Debt Insight - ${new Date().toISOString()}*
`;

        const executiveSummary = {
            overallHealth,
            criticalActions,
            estimatedCost: scan.businessImpact.financialCost,
            estimatedTime: scan.businessImpact.timeToFix,
            roi
        };
        
        // Save markdown report to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const reportPath = join(repoPath, `techdebt-cto-report-${timestamp}.md`);
        const pdfPath = join(repoPath, `techdebt-cto-report-${timestamp}.pdf`);
        
        try {
            await writeFile(reportPath, report, 'utf-8');
            console.error(`[TechDebt] ✅ CTO Report (Markdown) saved to: ${reportPath}`);
        } catch (error: any) {
            console.error(`[TechDebt] ❌ Failed to save CTO report: ${error.message}`);
        }
        
        // Generate PDF report with AI detection
        try {
            // Calculate enterprise metrics for PDF
            const enterpriseMetrics = calculateEnterpriseMetrics(scan);
            
            await generateExecutivePDF(pdfPath, {
                projectName,
                scanDate: new Date().toISOString(),
                metrics: enterpriseMetrics,
                scanResults: scan,
                aiSummary: aiSummary,
                auditSummary: audit
            });
            
            console.error(`[TechDebt] ✅ Executive Report (PDF) saved to: ${pdfPath}`);
            console.error(`[TechDebt] 📊 Report includes: Tech Debt Analysis + AI Code Detection + Security Audit`);
        } catch (error: any) {
            console.error(`[TechDebt] ⚠️ PDF generation failed: ${error.message}`);
            console.error(`[TechDebt] Markdown report is still available at: ${reportPath}`);
        }
        
        const result = {
            report,
            executiveSummary,
            reportPath,
            pdfPath
        };
        
        return {
            content: [
                { type: 'text', text: `# 📄 CTO Report Generated\n\n**Markdown Report:** \`${reportPath}\`\n**PDF Report:** \`${pdfPath}\`\n\n---\n\n` + report }
            ]
        } as any;
    }
);

// Register AI code detection tool
server.registerTool(
    'ai_code_scan',
    {
        description: 'Analyzes codebase for AI-generated code patterns and provides confidence scoring',
        inputSchema: z.object({
            repoPath: z.string().describe('Path to the repository to scan for AI-generated code'),
            includeGlobs: z.array(z.string())
                .default(['**/*.{js,ts,jsx,tsx,py,java,go,rs,c,cpp,cs,php,rb,swift,kt}'])
                .describe('File patterns to include in the AI scan')
        }).shape
    },
    async (input) => {
        const { repoPath, includeGlobs } = input;
        
        console.error(`[AI Scan] Starting AI code detection in: ${repoPath}`);
        
        // Find all files
        const files = await glob(includeGlobs, {
            cwd: repoPath,
            absolute: true,
            ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/vendor/**']
        });
        
        console.error(`[AI Scan] Found ${files.length} files to analyze`);
        
        // Analyze each file
        const analyses: AICodeAnalysis[] = [];
        
        for (const file of files) {
            try {
                const content = await readFile(file, 'utf-8');
                const relativePath = relative(repoPath, file);
                const analysis = analyzeAICode(content, relativePath);
                analyses.push(analysis);
            } catch (error: any) {
                console.error(`[AI Scan] Error analyzing ${file}: ${error.message}`);
            }
        }
        
        // Generate summary
        const summary = generateAISummary(analyses);
        
        // Sort files by AI likelihood
        const topAIFiles = analyses
            .filter(a => a.aiLikelihood > 50)
            .sort((a, b) => b.aiLikelihood - a.aiLikelihood)
            .slice(0, 20);
        
        const topHumanFiles = analyses
            .filter(a => a.humanLikelihood > 70)
            .sort((a, b) => b.humanLikelihood - a.humanLikelihood)
            .slice(0, 10);
        
        // Generate markdown report
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const reportPath = join(repoPath, `ai-code-analysis-${timestamp}.md`);
        
        const markdownReport = generateAIMarkdownReport(summary, topAIFiles, topHumanFiles, repoPath);
        
        try {
            await writeFile(reportPath, markdownReport, 'utf-8');
            console.error(`[AI Scan] ✅ AI Analysis Report saved to: ${reportPath}`);
        } catch (error: any) {
            console.error(`[AI Scan] ❌ Failed to save report: ${error.message}`);
        }
        
        // Generate executive summary for terminal
        const executiveSummary = `
# 🤖 AI Code Detection Summary

## Overview
- **Total Files Analyzed**: ${summary.totalFiles}
- **AI-Generated Files**: ${summary.aiGeneratedFiles} (${((summary.aiGeneratedFiles / summary.totalFiles) * 100).toFixed(1)}%)
- **Human-Written Files**: ${summary.humanWrittenFiles} (${((summary.humanWrittenFiles / summary.totalFiles) * 100).toFixed(1)}%)
- **Mixed/Uncertain**: ${summary.mixedFiles}

## AI Code Percentage: ${summary.aiCodePercentage}%
**Confidence Score**: ${summary.confidenceScore}%

## Top AI Patterns Detected
${summary.topAIPatterns.map((p, i) => `${i + 1}. **${p.pattern}**: ${p.count} occurrences`).join('\n')}

## Risk Assessment
- 🛡️ **Security Risks**: ${summary.riskAssessment.securityRisks} files
- 🔧 **Maintenance Risks**: ${summary.riskAssessment.maintenanceRisks} files
- 📊 **Quality Risks**: ${summary.riskAssessment.qualityRisks} files

## Recommendations
${summary.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---
📄 **Full Report**: \`${reportPath}\`
`;
        
        const result = {
            summary,
            topAIFiles: topAIFiles.map(f => ({
                file: f.file,
                aiLikelihood: f.aiLikelihood,
                patterns: f.patterns.length,
                topPatterns: f.patterns.slice(0, 3).map(p => p.type)
            })),
            topHumanFiles: topHumanFiles.map(f => ({
                file: f.file,
                humanLikelihood: f.humanLikelihood
            })),
            reportPath,
            executiveSummary
        };
        
        return {
            content: [
                { type: 'text', text: executiveSummary + '\n\n' + JSON.stringify(result, null, 2) }
            ]
        } as any;
    }
);

// Helper function to generate AI markdown report
function generateAIMarkdownReport(
    summary: AICodeSummary,
    topAIFiles: AICodeAnalysis[],
    topHumanFiles: AICodeAnalysis[],
    repoPath: string
): string {
    const timestamp = new Date().toISOString();
    
    return `# 🤖 AI Code Detection Report
**Repository**: ${repoPath}
**Generated**: ${timestamp}

---

## 📊 Executive Summary

### Overall Statistics
- **Total Files Analyzed**: ${summary.totalFiles}
- **AI-Generated Files**: ${summary.aiGeneratedFiles} (${((summary.aiGeneratedFiles / summary.totalFiles) * 100).toFixed(1)}%)
- **Human-Written Files**: ${summary.humanWrittenFiles} (${((summary.humanWrittenFiles / summary.totalFiles) * 100).toFixed(1)}%)
- **Mixed/Uncertain Files**: ${summary.mixedFiles} (${((summary.mixedFiles / summary.totalFiles) * 100).toFixed(1)}%)

### AI Code Metrics
- **AI Code Percentage**: ${summary.aiCodePercentage}%
- **Detection Confidence**: ${summary.confidenceScore}%

### Classification
${summary.aiCodePercentage > 70 ? '🔴 **HIGH**: Majority of codebase appears AI-generated' :
  summary.aiCodePercentage > 40 ? '🟡 **MEDIUM**: Significant AI-generated code detected' :
  '🟢 **LOW**: Mostly human-written code'}

---

## 🎯 Top AI Patterns Detected

${summary.topAIPatterns.map((p, i) => `${i + 1}. **${p.pattern.replace(/_/g, ' ').toUpperCase()}**
   - Occurrences: ${p.count} files
   - Impact: ${p.count > summary.totalFiles * 0.5 ? 'High' : p.count > summary.totalFiles * 0.2 ? 'Medium' : 'Low'}`).join('\n\n')}

---

## ⚠️ Risk Assessment

### Security Risks: ${summary.riskAssessment.securityRisks} files
${summary.riskAssessment.securityRisks > 0 ? 
`AI-generated code may lack proper edge case handling and input validation. Review these files for:
- Missing null/undefined checks
- Inadequate error handling
- Potential injection vulnerabilities
- Unvalidated user inputs` : 
'✅ No significant security risks detected'}

### Maintenance Risks: ${summary.riskAssessment.maintenanceRisks} files
${summary.riskAssessment.maintenanceRisks > 0 ?
`Code maintainability concerns detected:
- Generic variable names reducing code readability
- Repetitive code structures
- Lack of meaningful abstractions
- Poor code organization` :
'✅ Code appears maintainable'}

### Quality Risks: ${summary.riskAssessment.qualityRisks} files
${summary.riskAssessment.qualityRisks > 0 ?
`Code quality issues found:
- Excessive boilerplate code
- Generic or unhelpful comments
- Inconsistent coding patterns
- Potential code smells` :
'✅ Code quality looks good'}

---

## 🔴 Top 20 AI-Generated Files

${topAIFiles.length > 0 ? topAIFiles.map((file, i) => `### ${i + 1}. \`${file.file}\`
**AI Likelihood**: ${file.aiLikelihood}% | **Human Likelihood**: ${file.humanLikelihood}%

**Detected Patterns**:
${file.patterns.map(p => `- **${p.type}** (${p.severity}): ${p.description} [Confidence: ${p.confidence}%]`).join('\n')}

**Quality Indicators**:
- Style Consistency: ${file.indicators.styleConsistency}%
- Comment Quality: ${file.indicators.commentQuality}%
- Naming Patterns: ${file.indicators.namingPatterns}%
- Code Structure: ${file.indicators.codeStructure}%
- Error Handling: ${file.indicators.errorHandling}%

**File Metrics**:
- Total Lines: ${file.metadata.totalLines}
- Code Lines: ${file.metadata.codeLines}
- Comment Lines: ${file.metadata.commentLines}
- Blank Lines: ${file.metadata.blankLines}

---
`).join('\n') : 'No files with high AI likelihood detected.'}

## 🟢 Top 10 Human-Written Files

${topHumanFiles.length > 0 ? topHumanFiles.map((file, i) => `${i + 1}. **\`${file.file}\`** - Human Likelihood: ${file.humanLikelihood}%`).join('\n') : 'No files with high human likelihood detected.'}

---

## 💡 Recommendations

${summary.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

---

## 📋 Action Items

### Immediate (Week 1)
1. Review all files with AI likelihood > 80% for security vulnerabilities
2. Implement comprehensive test coverage for AI-generated code sections
3. Add proper error handling and input validation

### Short-term (Month 1)
1. Refactor generic variable names and improve code readability
2. Remove boilerplate code and improve comment quality
3. Establish code review guidelines for AI-generated code
4. Set up automated AI code detection in CI/CD pipeline

### Long-term (Quarter 1)
1. Create team guidelines for using AI coding assistants
2. Implement quality gates for AI-generated code
3. Train team on identifying and improving AI-generated code
4. Monitor AI code percentage trends over time

---

## 📈 Best Practices for AI-Generated Code

1. **Always Review**: Never merge AI-generated code without human review
2. **Test Thoroughly**: AI code may miss edge cases - add comprehensive tests
3. **Refactor**: Improve variable names, comments, and structure
4. **Validate Security**: Check for injection vulnerabilities and proper input validation
5. **Document Origin**: Mark AI-generated sections for future reference
6. **Continuous Monitoring**: Track AI code percentage and quality metrics

---

*Report generated by Tech Debt Insight - AI Code Detection Module*
*Timestamp: ${timestamp}*
`;
}

// Start the server with stdio transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Tech Debt Insight MCP Server started successfully');
    console.error('Available tools: scan_repo, dep_audit, generate_report, ai_code_scan');
}

main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
