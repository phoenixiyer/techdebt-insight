/**
 * Professional PDF Report Generator for Executive Reports
 * Creates beautifully formatted PDF reports with charts and metrics
 */

import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { EnterpriseMetrics } from '../calculators/enterpriseMetrics.js';
import { AICodeSummary } from '../analyzers/aiCodeDetectorV2.js';

interface ReportData {
    projectName: string;
    scanDate: string;
    metrics: EnterpriseMetrics;
    scanResults: any; // Raw scan results with issue counts
    aiSummary?: AICodeSummary;
    auditSummary?: any;
}

export async function generateExecutivePDF(
    outputPath: string,
    data: ReportData
): Promise<void> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            info: {
                Title: `Technical Debt Report - ${data.projectName}`,
                Author: 'TechDebt Insight',
                Subject: 'Executive Technical Debt Analysis',
                Keywords: 'technical debt, code quality, metrics'
            }
        });

        const stream = createWriteStream(outputPath);
        doc.pipe(stream);

        // === COVER PAGE ===
        addCoverPage(doc, data);
        doc.addPage();

        // === EXECUTIVE SUMMARY ===
        addExecutiveSummary(doc, data);
        doc.addPage();

        // === KEY METRICS ===
        addKeyMetrics(doc, data);
        doc.addPage();

        // === AI CODE ANALYSIS ===
        if (data.aiSummary) {
            addAIAnalysis(doc, data.aiSummary);
            doc.addPage();
        }

        // === RECOMMENDATIONS ===
        addRecommendations(doc, data);

        doc.end();

        stream.on('finish', () => resolve());
        stream.on('error', reject);
    });
}

function addCoverPage(doc: PDFKit.PDFDocument, data: ReportData) {
    // Header with gradient effect (simulated with rectangles)
    doc.rect(0, 0, 595, 200).fill('#1a365d');
    
    // Title
    doc.fillColor('#ffffff')
       .fontSize(36)
       .font('Helvetica-Bold')
       .text('Technical Debt Report', 50, 80, { align: 'center' });
    
    doc.fontSize(18)
       .font('Helvetica')
       .text(data.projectName, 50, 130, { align: 'center' });
    
    // Date
    doc.fontSize(12)
       .text(`Generated: ${new Date(data.scanDate).toLocaleDateString('en-US', {
           year: 'numeric',
           month: 'long',
           day: 'numeric'
       })}`, 50, 250, { align: 'center' });
    
    // Health Score Badge
    const healthScore = data.metrics.codeQualityScore;
    const color = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444';
    
    doc.circle(297.5, 400, 80).fill(color);
    doc.fillColor('#ffffff')
       .fontSize(48)
       .font('Helvetica-Bold')
       .text(healthScore.toString(), 50, 380, { align: 'center', width: 495 });
    
    doc.fontSize(16)
       .font('Helvetica')
       .text('Health Score', 50, 450, { align: 'center', width: 495 });
    
    // Footer
    doc.fillColor('#64748b')
       .fontSize(10)
       .text('Confidential - Executive Use Only', 50, 750, { align: 'center' });
}

function addExecutiveSummary(doc: PDFKit.PDFDocument, data: ReportData) {
    addSectionHeader(doc, 'Executive Summary');
    
    const { metrics } = data;
    
    // Key findings boxes
    const findings = [
        {
            label: 'Technical Debt Ratio',
            value: `${metrics.technicalDebtRatio.toFixed(1)}%`,
            status: metrics.technicalDebtRatio < 5 ? 'excellent' : metrics.technicalDebtRatio < 25 ? 'good' : 'critical'
        },
        {
            label: 'Code Quality Score',
            value: metrics.codeQualityScore.toString(),
            status: metrics.codeQualityScore >= 80 ? 'excellent' : metrics.codeQualityScore >= 60 ? 'good' : 'critical'
        },
        {
            label: 'Security Posture',
            value: metrics.securityPosture.toString(),
            status: metrics.securityPosture >= 80 ? 'excellent' : metrics.securityPosture >= 60 ? 'good' : 'critical'
        },
        {
            label: 'Defect Density',
            value: `${metrics.defectDensity.toFixed(2)}/1K LOC`,
            status: metrics.defectDensity < 1 ? 'excellent' : metrics.defectDensity < 3 ? 'good' : 'critical'
        }
    ];
    
    let yPos = 150;
    findings.forEach((finding, idx) => {
        const xPos = 50 + (idx % 2) * 260;
        if (idx % 2 === 0 && idx > 0) yPos += 100;
        
        addMetricBox(doc, xPos, yPos, 240, 80, finding);
    });
    
    // Critical Issues
    yPos += 120;
    doc.fillColor('#1f2937')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Critical Actions Required', 50, yPos);
    
    yPos += 30;
    const criticalIssues = data.scanResults?.summary?.criticalIssues || 0;
    const totalDebtMinutes = data.scanResults?.summary?.technicalDebt?.totalMinutes || 0;
    const securityIssues = data.scanResults?.summary?.quality?.securityIssues || 0;
    
    const criticalActions = [
        `${criticalIssues} critical issues need immediate attention`,
        `Estimated ${(totalDebtMinutes / 60).toFixed(0)} hours to address technical debt`,
        `${securityIssues} security vulnerabilities identified`
    ];
    
    criticalActions.forEach(action => {
        doc.fillColor('#ef4444')
           .fontSize(12)
           .font('Helvetica')
           .text('•', 60, yPos)
           .fillColor('#374151')
           .text(action, 80, yPos);
        yPos += 25;
    });
}

function addKeyMetrics(doc: PDFKit.PDFDocument, data: ReportData) {
    addSectionHeader(doc, 'Key Performance Indicators');
    
    const { metrics } = data;
    const totalDebtMinutes = data.scanResults?.summary?.technicalDebt?.totalMinutes || 0;
    let yPos = 150;
    
    // DORA Metrics
    addSubsection(doc, 'DORA Metrics', yPos);
    yPos += 40;
    
    const doraMetrics = [
        { label: 'Deployment Frequency', value: metrics.deploymentFrequency, unit: '' },
        { label: 'Lead Time for Changes', value: metrics.leadTimeForChanges, unit: '' },
        { label: 'Change Failure Rate', value: `${metrics.changeFailureRate}%`, unit: '' },
        { label: 'Time to Restore Service', value: metrics.timeToRestoreService, unit: '' }
    ];
    
    doraMetrics.forEach(metric => {
        addMetricRow(doc, yPos, metric.label, `${metric.value} ${metric.unit}`.trim());
        yPos += 25;
    });
    
    // Developer Productivity
    yPos += 20;
    addSubsection(doc, 'Developer Productivity', yPos);
    yPos += 40;
    
    const prodMetrics = [
        { label: 'Velocity Trend', value: `${metrics.velocityTrend.change > 0 ? '+' : ''}${metrics.velocityTrend.change}%` },
        { label: 'Impact Level', value: metrics.velocityTrend.impactLevel },
        { label: 'Focus Time', value: `${metrics.focusTime.percentage}%` },
        { label: 'Team Satisfaction', value: `${metrics.teamSatisfactionIndex}/100` }
    ];
    
    prodMetrics.forEach(metric => {
        addMetricRow(doc, yPos, metric.label, metric.value);
        yPos += 25;
    });
    
    // Business Impact
    yPos += 20;
    addSubsection(doc, 'Business Impact', yPos);
    yPos += 40;
    
    const estimatedCost = (totalDebtMinutes / 60) * 150; // $150/hour average
    const businessMetrics = [
        { label: 'Estimated Financial Cost', value: `$${estimatedCost.toLocaleString()}` },
        { label: 'Time to Remediate', value: `${(totalDebtMinutes / 60).toFixed(0)} hours` },
        { label: 'Critical Path Risk', value: `${metrics.criticalPathRisk}/100` },
        { label: 'Customer Impact Score', value: `${metrics.customerImpactScore}/100` }
    ];
    
    businessMetrics.forEach(metric => {
        addMetricRow(doc, yPos, metric.label, metric.value);
        yPos += 25;
    });
}

function addAIAnalysis(doc: PDFKit.PDFDocument, aiSummary: AICodeSummary) {
    addSectionHeader(doc, 'AI Code Detection Analysis');
    
    let yPos = 150;
    
    // AI Code Statistics
    const aiStats = [
        { label: 'Total Files Analyzed', value: aiSummary.totalFiles.toString() },
        { label: 'AI-Generated Files', value: `${aiSummary.aiGeneratedFiles} (${((aiSummary.aiGeneratedFiles / aiSummary.totalFiles) * 100).toFixed(1)}%)` },
        { label: 'Human-Written Files', value: `${aiSummary.humanWrittenFiles} (${((aiSummary.humanWrittenFiles / aiSummary.totalFiles) * 100).toFixed(1)}%)` },
        { label: 'Mixed/Uncertain Files', value: aiSummary.mixedFiles.toString() },
        { label: 'AI Code Percentage', value: `${aiSummary.aiCodePercentage}%` },
        { label: 'Detection Confidence', value: `${aiSummary.confidenceScore}%` }
    ];
    
    aiStats.forEach(stat => {
        addMetricRow(doc, yPos, stat.label, stat.value);
        yPos += 25;
    });
    
    // Top AI Patterns
    yPos += 20;
    addSubsection(doc, 'Top AI Patterns Detected', yPos);
    yPos += 40;
    
    aiSummary.topAIPatterns.slice(0, 5).forEach(pattern => {
        doc.fillColor('#374151')
           .fontSize(11)
           .font('Helvetica')
           .text(`• ${pattern.pattern.replace(/_/g, ' ')}`, 60, yPos)
           .fillColor('#6b7280')
           .text(`(${pattern.count} occurrences)`, 350, yPos);
        yPos += 20;
    });
    
    // Risk Assessment
    yPos += 20;
    addSubsection(doc, 'Risk Assessment', yPos);
    yPos += 40;
    
    const risks = [
        { label: 'Security Risks', value: aiSummary.riskAssessment.securityRisks, color: '#ef4444' },
        { label: 'Maintenance Risks', value: aiSummary.riskAssessment.maintenanceRisks, color: '#f59e0b' },
        { label: 'Quality Risks', value: aiSummary.riskAssessment.qualityRisks, color: '#3b82f6' }
    ];
    
    risks.forEach(risk => {
        doc.fillColor('#374151')
           .fontSize(11)
           .font('Helvetica')
           .text(risk.label, 60, yPos);
        
        // Risk bar
        const barWidth = (risk.value / aiSummary.totalFiles) * 400;
        doc.rect(200, yPos, barWidth, 15).fill(risk.color);
        doc.rect(200, yPos, 400, 15).stroke('#e5e7eb');
        
        doc.fillColor('#374151')
           .text(`${risk.value} files`, 610, yPos, { width: 100, align: 'right' });
        
        yPos += 30;
    });
}

function addRecommendations(doc: PDFKit.PDFDocument, data: ReportData) {
    addSectionHeader(doc, 'Strategic Recommendations');
    
    const criticalIssues = data.scanResults?.summary?.criticalIssues || 0;
    let yPos = 150;
    
    const recommendations = [
        {
            priority: 'HIGH',
            title: 'Address Critical Security Issues',
            description: `Immediately remediate ${criticalIssues} critical security vulnerabilities to prevent potential breaches.`,
            timeline: '1-2 weeks',
            impact: 'High'
        },
        {
            priority: 'HIGH',
            title: 'Reduce Technical Debt Ratio',
            description: `Current TDR of ${data.metrics.technicalDebtRatio.toFixed(1)}% exceeds industry standards. Allocate 20% of sprint capacity to debt reduction.`,
            timeline: '3-6 months',
            impact: 'High'
        },
        {
            priority: 'MEDIUM',
            title: 'Improve Test Coverage',
            description: `Increase test coverage from ${data.metrics.testCoverage}% to at least 80% to reduce defect density.`,
            timeline: '2-3 months',
            impact: 'Medium'
        }
    ];
    
    if (data.aiSummary && data.aiSummary.aiCodePercentage > 50) {
        recommendations.push({
            priority: 'MEDIUM',
            title: 'Review AI-Generated Code',
            description: `${data.aiSummary.aiCodePercentage}% of code appears AI-generated. Implement code review guidelines for AI-assisted development.`,
            timeline: '1 month',
            impact: 'Medium'
        });
    }
    
    recommendations.forEach((rec, idx) => {
        if (yPos > 650) {
            doc.addPage();
            yPos = 100;
        }
        
        // Priority badge
        const priorityColor = rec.priority === 'HIGH' ? '#ef4444' : '#f59e0b';
        doc.roundedRect(60, yPos, 60, 20, 3).fill(priorityColor);
        doc.fillColor('#ffffff')
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(rec.priority, 60, yPos + 5, { width: 60, align: 'center' });
        
        // Title
        doc.fillColor('#1f2937')
           .fontSize(13)
           .font('Helvetica-Bold')
           .text(rec.title, 130, yPos + 2);
        
        yPos += 25;
        
        // Description
        doc.fillColor('#374151')
           .fontSize(10)
           .font('Helvetica')
           .text(rec.description, 60, yPos, { width: 480 });
        
        yPos += 40;
        
        // Timeline and Impact
        doc.fillColor('#6b7280')
           .fontSize(9)
           .text(`Timeline: ${rec.timeline}  |  Impact: ${rec.impact}`, 60, yPos);
        
        yPos += 40;
        
        // Separator
        doc.moveTo(60, yPos).lineTo(540, yPos).stroke('#e5e7eb');
        yPos += 20;
    });
}

// Helper functions
function addSectionHeader(doc: PDFKit.PDFDocument, title: string) {
    doc.rect(0, 50, 595, 60).fill('#f8fafc');
    doc.fillColor('#1e40af')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text(title, 50, 70);
}

function addSubsection(doc: PDFKit.PDFDocument, title: string, yPos: number) {
    doc.fillColor('#1f2937')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(title, 50, yPos);
}

function addMetricBox(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, data: any) {
    const statusColors = {
        excellent: '#10b981',
        good: '#f59e0b',
        critical: '#ef4444'
    };
    
    // Box
    doc.roundedRect(x, y, width, height, 5)
       .stroke('#e5e7eb');
    
    // Status indicator
    doc.circle(x + 15, y + 15, 6)
       .fill(statusColors[data.status as keyof typeof statusColors]);
    
    // Label
    doc.fillColor('#6b7280')
       .fontSize(10)
       .font('Helvetica')
       .text(data.label, x + 30, y + 10);
    
    // Value
    doc.fillColor('#1f2937')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text(data.value, x + 15, y + 35);
}

function addMetricRow(doc: PDFKit.PDFDocument, yPos: number, label: string, value: string) {
    doc.fillColor('#374151')
       .fontSize(11)
       .font('Helvetica')
       .text(label, 60, yPos);
    
    doc.fillColor('#1f2937')
       .font('Helvetica-Bold')
       .text(value, 350, yPos);
}
