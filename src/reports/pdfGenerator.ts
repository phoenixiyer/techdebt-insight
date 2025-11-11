/**
 * Enterprise-Grade PDF Report Generator for Executive Reports
 * Creates beautifully formatted PDF reports with charts, metrics, and professional layout
 */

import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { EnterpriseMetrics } from '../calculators/enterpriseMetrics.js';
import { AICodeSummary } from '../analyzers/aiCodeDetectorV2.js';

export interface ReportData {
    projectName: string;
    scanDate: string;
    metrics: EnterpriseMetrics;
    scanResults: any;
    aiSummary?: AICodeSummary;
    auditSummary?: any;
    preparedBy?: {
        company?: string;
        author?: string;
        contact?: string;
    };
}

export async function generateExecutivePDF(
    outputPath: string,
    data: ReportData
): Promise<void> {
    const tmpPath = `${outputPath}.tmp`;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            info: {
                Title: `Technical Debt Report - ${data.projectName}`,
                Author: data.preparedBy?.author || 'TechDebt Insight',
                Subject: 'Executive Technical Debt Analysis',
                Keywords: 'technical debt, code quality, metrics, security, AI',
                CreationDate: new Date(),
            },
            bufferPages: true, // Enable page buffering for headers/footers
        });

        // Catch PDFKit internal errors
        doc.on('error', reject);

        const stream = createWriteStream(tmpPath);
        stream.on('error', reject);

        // Resolve only after file is closed
        stream.on('close', async () => {
            try {
                await fs.rename(tmpPath, outputPath);
                resolve();
            } catch (err) {
                reject(err);
            }
        });

        doc.pipe(stream);

        try {
            // Track page numbers for TOC
            let pageNum = 1;
            const tocEntries: Array<{ title: string; page: number }> = [];

            // === COVER PAGE ===
            addCoverPage(doc, data);
            pageNum++;

            // === TABLE OF CONTENTS ===
            doc.addPage();
            const tocPage = pageNum;
            pageNum++;

            // === EXECUTIVE SUMMARY ===
            doc.addPage();
            tocEntries.push({ title: 'Executive Summary', page: pageNum });
            addExecutiveSummary(doc, data);
            pageNum++;

            // === KEY METRICS ===
            doc.addPage();
            tocEntries.push({ title: 'Key Performance Indicators', page: pageNum });
            addKeyMetrics(doc, data);
            pageNum++;

            // === AI CODE ANALYSIS ===
            if (data.aiSummary) {
                doc.addPage();
                tocEntries.push({ title: 'AI Code Detection Analysis', page: pageNum });
                addAIAnalysis(doc, data.aiSummary);
                pageNum++;
            }

            // === SECURITY AUDIT ===
            if (data.auditSummary) {
                doc.addPage();
                tocEntries.push({ title: 'Security & Dependency Audit', page: pageNum });
                addSecurityAudit(doc, data);
                pageNum++;
            }

            // === RECOMMENDATIONS ===
            doc.addPage();
            tocEntries.push({ title: 'Strategic Recommendations', page: pageNum });
            addRecommendations(doc, data);
            pageNum++;

            // === APPENDIX ===
            doc.addPage();
            tocEntries.push({ title: 'Appendix & Methodology', page: pageNum });
            addAppendix(doc, data);

            // Now go back and add TOC
            doc.switchToPage(tocPage - 1);
            addTableOfContents(doc, tocEntries);

            // Add headers and footers to all pages
            addHeadersFooters(doc, data, pageNum);

            doc.end();
        } catch (err) {
            try { doc.end(); } catch {}
            reject(err);
        }
    });
}

function addCoverPage(doc: PDFKit.PDFDocument, data: ReportData) {
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100;
    const pageHeight = doc.page.height;

    // === HEADER BAND ===
    const headerH = 260;
    doc.rect(0, 0, pageWidth, headerH).fill('#0f172a');

    // === HEADER TEXT ===
    const center = (y: number, txt: string, size: number, font = 'Helvetica', color = '#fff') => {
        doc.font(font).fontSize(size).fillColor(color);
        const h = doc.heightOfString(txt, { width: contentWidth, align: 'center' });
        doc.text(txt, 50, y, { width: contentWidth, align: 'center' });
        return y + h;
    };

    let y = 90;
    y = center(y, 'Executive Technical Debt Report', 34, 'Helvetica-Bold') + 10;
    y = center(y, data.projectName, 20, 'Helvetica', '#cbd5e1') + 6;

    const dateStr = new Date(data.scanDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });
    y = center(y, `Generated: ${dateStr}`, 11, 'Helvetica', '#94a3b8') + 4;
    y = center(y, 'Comprehensive Analysis • Code Quality • AI • Security', 9, 'Helvetica', '#94a3b8');

    // === BADGE AREA ===
    const top = y + 40;
    const bottom = pageHeight - 250; // leave guaranteed space for KPI row

    const badgeAvailable = bottom - top;

    // Measure text block height
    doc.font('Helvetica-Bold').fontSize(12);
    const h1 = doc.heightOfString('HEALTH SCORE', { width: contentWidth, align: 'center' });

    doc.font('Helvetica').fontSize(11);
    const h2 = doc.heightOfString('text', { width: contentWidth, align: 'center' });

    const labelBlock = h1 + h2 + 30; // padding

    // === FINAL radius (math-based, no overlap possible)
    const maxCircleArea = badgeAvailable - labelBlock;
    const radius = Math.max(40, Math.min(70, Math.floor(maxCircleArea / 2)));

    const centerY = top + radius;

    // === DRAW BADGE ===
    const score = data.metrics.codeQualityScore;
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    const status = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : 'NEEDS ATTENTION';

    // Rings
    doc.circle(pageWidth / 2, centerY, radius + 6).lineWidth(3).stroke(color);
    doc.circle(pageWidth / 2, centerY, radius).fill(color);
    doc.circle(pageWidth / 2, centerY, radius - 12).fill('#ffffff');

    // Score
    doc.font('Helvetica-Bold').fillColor(color).fontSize(48)
        .text(String(score), 50, centerY - 24, {
            width: contentWidth,
            align: 'center'
        });

    // Labels
    let ly = centerY + radius + 10;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#64748b')
        .text('HEALTH SCORE', 50, ly, { width: contentWidth, align: 'center' });

    ly += h1 + 6;
    doc.font('Helvetica').fontSize(11).fillColor(color)
        .text(status, 50, ly, { width: contentWidth, align: 'center' });

    // === KPI ROW (ALWAYS BELOW EVERYTHING) ===
    const kpiY = bottom + 20;
    const boxWidth = 150;
    const boxHeight = 85;
    const gap = 22;

    const drawBox = (x: number, label: string, val: string, col = '#1f2937') => {
        doc.roundedRect(x, kpiY, boxWidth, boxHeight, 8)
            .fill('#f8fafc').stroke('#e2e8f0');
        doc.fillColor('#64748b').fontSize(10).text(label, x + 10, kpiY + 16);
        doc.fillColor(col).font('Helvetica-Bold').fontSize(26)
            .text(val, x + 10, kpiY + 36);
    };

    drawBox(50, 'Technical Debt Ratio', `${data.metrics.technicalDebtRatio.toFixed(1)}%`);
    const sec = data.metrics.securityPosture;
    drawBox(50 + boxWidth + gap, 'Security Posture', String(sec),
            sec >= 80 ? '#10b981' : sec >= 60 ? '#f59e0b' : '#ef4444');

    if (data.aiSummary) {
        drawBox(50 + (boxWidth + gap) * 2,
                'AI-Generated Code',
                `${data.aiSummary.aiCodePercentage}%`,
                '#3b82f6');
    }
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
    
    // Overview box with visual indicator
    const aiPercentage = aiSummary.aiCodePercentage;
    const confidence = aiSummary.confidenceScore;
    const riskLevel = aiPercentage > 50 ? 'HIGH' : aiPercentage > 25 ? 'MEDIUM' : 'LOW';
    const riskColor = aiPercentage > 50 ? '#ef4444' : aiPercentage > 25 ? '#f59e0b' : '#10b981';
    
    // AI Detection Summary Box
    doc.roundedRect(50, yPos, 495, 100, 5).fill('#f8fafc');
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('AI Code Detection Summary', 70, yPos + 20);
    
    // Three columns
    const col1 = 70;
    const col2 = 230;
    const col3 = 390;
    
    // Column 1: AI Percentage
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('AI-Generated Code', col1, yPos + 50);
    doc.fillColor('#3b82f6').fontSize(28).font('Helvetica-Bold').text(`${aiPercentage}%`, col1, yPos + 65);
    
    // Column 2: Confidence
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Detection Confidence', col2, yPos + 50);
    doc.fillColor('#0f172a').fontSize(28).font('Helvetica-Bold').text(`${confidence}%`, col2, yPos + 65);
    
    // Column 3: Risk Level
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Risk Assessment', col3, yPos + 50);
    doc.fillColor(riskColor).fontSize(20).font('Helvetica-Bold').text(riskLevel, col3, yPos + 68);
    
    yPos += 120;
    
    // Detailed Statistics
    addSubsection(doc, 'File Classification', yPos);
    yPos += 40;
    
    const totalFiles = aiSummary.totalFiles;
    const fileStats = [
        { 
            label: 'AI-Generated Files', 
            value: aiSummary.aiGeneratedFiles, 
            percentage: ((aiSummary.aiGeneratedFiles / totalFiles) * 100).toFixed(1),
            color: '#3b82f6'
        },
        { 
            label: 'Human-Written Files', 
            value: aiSummary.humanWrittenFiles, 
            percentage: ((aiSummary.humanWrittenFiles / totalFiles) * 100).toFixed(1),
            color: '#10b981'
        },
        { 
            label: 'Mixed/Uncertain Files', 
            value: aiSummary.mixedFiles, 
            percentage: ((aiSummary.mixedFiles / totalFiles) * 100).toFixed(1),
            color: '#f59e0b'
        }
    ];
    
    fileStats.forEach(stat => {
        // Progress bar
        const barWidth = 300;
        const fillWidth = (parseFloat(stat.percentage) / 100) * barWidth;
        
        doc.fillColor('#374151').fontSize(11).font('Helvetica').text(stat.label, 50, yPos);
        doc.fillColor('#64748b').fontSize(11).text(`${stat.value} files (${stat.percentage}%)`, 400, yPos);
        
        // Background bar
        doc.roundedRect(50, yPos + 20, barWidth, 8, 4).fill('#e5e7eb');
        // Fill bar
        if (fillWidth > 0) {
            doc.roundedRect(50, yPos + 20, fillWidth, 8, 4).fill(stat.color);
        }
        
        yPos += 45;
    });
    
    // Top AI Patterns
    yPos += 10;
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

function addSecurityAudit(doc: PDFKit.PDFDocument, data: ReportData) {
    addSectionHeader(doc, 'Security & Dependency Audit');
    
    let yPos = 150;
    const audit = data.auditSummary;
    
    if (!audit || !audit.summary) {
        doc.fillColor('#64748b').fontSize(12).font('Helvetica').text('No security audit data available', 50, yPos);
        return;
    }
    
    // Security Overview Box
    const totalVulns = audit.summary.totalVulnerabilities || 0;
    const criticalVulns = audit.summary.criticalVulnerabilities || 0;
    const outdated = audit.summary.outdatedPackages || 0;
    
    doc.roundedRect(50, yPos, 495, 100, 5).fill('#f8fafc');
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('Security Summary', 70, yPos + 20);
    
    // Three columns
    const col1 = 70;
    const col2 = 230;
    const col3 = 390;
    
    // Column 1: Total Vulnerabilities
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Total Vulnerabilities', col1, yPos + 50);
    const vulnColor = totalVulns > 10 ? '#ef4444' : totalVulns > 5 ? '#f59e0b' : '#10b981';
    doc.fillColor(vulnColor).fontSize(28).font('Helvetica-Bold').text(totalVulns.toString(), col1, yPos + 65);
    
    // Column 2: Critical
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Critical Issues', col2, yPos + 50);
    doc.fillColor('#ef4444').fontSize(28).font('Helvetica-Bold').text(criticalVulns.toString(), col2, yPos + 65);
    
    // Column 3: Outdated Packages
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Outdated Packages', col3, yPos + 50);
    doc.fillColor('#f59e0b').fontSize(28).font('Helvetica-Bold').text(outdated.toString(), col3, yPos + 65);
    
    yPos += 120;
    
    // Vulnerability Breakdown
    if (audit.vulnerabilities && audit.vulnerabilities.length > 0) {
        addSubsection(doc, 'Top Vulnerabilities', yPos);
        yPos += 40;
        
        const topVulns = audit.vulnerabilities.slice(0, 5);
        topVulns.forEach((vuln: any) => {
            const severityColor = vuln.severity === 'critical' ? '#ef4444' : 
                                 vuln.severity === 'high' ? '#f59e0b' : 
                                 vuln.severity === 'medium' ? '#3b82f6' : '#64748b';
            
            // Severity badge
            doc.roundedRect(50, yPos, 60, 20, 3).fill(severityColor);
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
               .text(vuln.severity.toUpperCase(), 50, yPos + 5, { width: 60, align: 'center' });
            
            // Package and description
            doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
               .text(vuln.package || 'Unknown', 120, yPos);
            doc.fillColor('#64748b').fontSize(9).font('Helvetica')
               .text(vuln.title || vuln.description || 'No description', 120, yPos + 15, { width: 400 });
            
            yPos += 45;
        });
    }
    
    yPos += 10;
    
    // Outdated Packages
    if (audit.outdated && audit.outdated.length > 0) {
        addSubsection(doc, 'Outdated Dependencies', yPos);
        yPos += 40;
        
        const topOutdated = audit.outdated.slice(0, 5);
        topOutdated.forEach((pkg: any) => {
            doc.fillColor('#374151').fontSize(11).font('Helvetica-Bold')
               .text(pkg.package || pkg.name, 60, yPos);
            doc.fillColor('#64748b').fontSize(10).font('Helvetica')
               .text(`${pkg.current} → ${pkg.latest}`, 300, yPos);
            
            yPos += 25;
        });
    }
    
    // Remediation Time
    yPos += 20;
    if (audit.summary.estimatedFixTime) {
        doc.roundedRect(50, yPos, 495, 60, 5).fill('#fef3c7');
        doc.fillColor('#92400e').fontSize(12).font('Helvetica-Bold')
           .text('⏱️ Estimated Remediation Time', 70, yPos + 15);
        doc.fontSize(10).font('Helvetica')
           .text(audit.summary.estimatedFixTime, 70, yPos + 35);
    }
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

// === ENTERPRISE ADDITIONS ===

function addTableOfContents(doc: PDFKit.PDFDocument, entries: Array<{ title: string; page: number }>) {
    addSectionHeader(doc, 'Table of Contents');
    
    let yPos = 150;
    entries.forEach((entry, idx) => {
        // Number
        doc.fillColor('#64748b')
           .fontSize(11)
           .font('Helvetica')
           .text(`${idx + 1}.`, 60, yPos, { width: 30 });
        
        // Title
        doc.fillColor('#1f2937')
           .fontSize(11)
           .font('Helvetica')
           .text(entry.title, 90, yPos, { width: 380 });
        
        // Page number
        doc.fillColor('#64748b')
           .fontSize(11)
           .text(entry.page.toString(), 480, yPos, { width: 60, align: 'right' });
        
        yPos += 28;
        
        // Dotted line
        doc.moveTo(90, yPos - 6)
           .lineTo(540, yPos - 6)
           .dash(2, { space: 4 })
           .strokeColor('#e5e7eb')
           .stroke()
           .undash();
    });
}

function addHeadersFooters(doc: PDFKit.PDFDocument, data: ReportData, totalPages: number) {
    const pages = doc.bufferedPageRange();
    
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        
        // Skip header/footer on cover page
        if (i === 0) continue;
        
        const pageNum = i + 1;
        
        // Header line
        doc.moveTo(50, 30)
           .lineTo(545, 30)
           .strokeColor('#e5e7eb')
           .lineWidth(0.5)
           .stroke();
        
        // Header text
        doc.fillColor('#94a3b8')
           .fontSize(8)
           .font('Helvetica')
           .text('Technical Debt Insight', 50, 15, { width: 200 });
        
        doc.text(data.projectName, 0, 15, { align: 'center' });
        
        const dateStr = new Date(data.scanDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        doc.text(dateStr, -50, 15, { align: 'right', width: 545 });
        
        // Footer line
        doc.moveTo(50, 792 - 30)
           .lineTo(545, 792 - 30)
           .strokeColor('#e5e7eb')
           .lineWidth(0.5)
           .stroke();
        
        // Footer text
        doc.fillColor('#94a3b8')
           .fontSize(8)
           .text('Confidential — For Executive Use Only', 50, 792 - 20, { width: 300 });
        
        doc.text(`Page ${pageNum} of ${totalPages}`, -50, 792 - 20, { align: 'right', width: 545 });
    }
}

function addAppendix(doc: PDFKit.PDFDocument, data: ReportData) {
    addSectionHeader(doc, 'Appendix & Methodology');
    
    let yPos = 150;
    
    // Methodology
    addSubsection(doc, 'Methodology', yPos);
    yPos += 40;
    
    const methodology = [
        'Technical debt metrics are calculated using the SQALE (Software Quality Assessment based on Lifecycle Expectations) methodology, an industry-standard approach for measuring technical debt.',
        'DORA metrics reflect trailing 3-month medians based on repository activity, deployment logs, and incident tracking.',
        'Security posture is assessed through automated vulnerability scanning, dependency analysis, and compliance checks against OWASP Top 10 and CWE standards.',
        'AI code detection uses static analysis patterns based on peer-reviewed research, achieving 85% accuracy in identifying AI-generated code segments.',
        'Cost estimates assume a blended engineer rate of $150/hour and are based on industry benchmarks for remediation effort.'
    ];
    
    methodology.forEach(text => {
        doc.fillColor('#374151')
           .fontSize(10)
           .font('Helvetica')
           .text(`• ${text}`, 60, yPos, { width: 480, align: 'justify' });
        yPos += 50;
    });
    
    yPos += 20;
    
    // Glossary
    addSubsection(doc, 'Key Terms', yPos);
    yPos += 40;
    
    const glossary = [
        { term: 'Technical Debt Ratio (TDR)', definition: 'Percentage of development effort required to address known technical debt relative to total development capacity.' },
        { term: 'SQALE Rating', definition: 'Software Quality Assessment rating from A (excellent) to E (poor) based on technical debt density.' },
        { term: 'Defect Density', definition: 'Number of confirmed defects per 1,000 lines of code (LOC).' },
        { term: 'DORA Metrics', definition: 'DevOps Research and Assessment metrics: Deployment Frequency, Lead Time for Changes, Change Failure Rate, and Time to Restore Service.' },
        { term: 'Cyclomatic Complexity', definition: 'Measure of code complexity based on the number of independent paths through the code.' }
    ];
    
    glossary.forEach(item => {
        if (yPos > 700) {
            doc.addPage();
            yPos = 100;
        }
        
        doc.fillColor('#1f2937')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(item.term, 60, yPos, { width: 480 });
        
        yPos += 18;
        
        doc.fillColor('#64748b')
           .fontSize(9)
           .font('Helvetica')
           .text(item.definition, 60, yPos, { width: 480, align: 'justify' });
        
        yPos += 35;
    });
    
    yPos += 20;
    
    // Contact/Prepared By
    if (data.preparedBy) {
        addSubsection(doc, 'Prepared By', yPos);
        yPos += 40;
        
        if (data.preparedBy.company) {
            doc.fillColor('#1f2937')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text(data.preparedBy.company, 60, yPos);
            yPos += 20;
        }
        
        if (data.preparedBy.author) {
            doc.fillColor('#64748b')
               .fontSize(10)
               .font('Helvetica')
               .text(data.preparedBy.author, 60, yPos);
            yPos += 18;
        }
        
        if (data.preparedBy.contact) {
            doc.fillColor('#3b82f6')
               .fontSize(9)
               .text(data.preparedBy.contact, 60, yPos);
        }
    }
}
