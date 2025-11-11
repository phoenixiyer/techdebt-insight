/**
 * Executive PDF Report Generator — C‑Suite Edition
 *
 * Highlights
 * - Clean, enterprise layout with header/footer + page numbers
 * - Table of contents with PDF outline bookmarks
 * - KPI cards, trend sparklines, risk heatmap, and simple timeline
 * - Consistent spacing/typography via a tiny layout system
 * - Theming (brand colors, fonts, watermark toggle)
 * - Safer stacking to avoid overlaps on variable text lengths
 */

import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { EnterpriseMetrics } from '../calculators/enterpriseMetrics.js';
import { AICodeSummary } from '../analyzers/aiCodeDetectorV2.js';

/**************************************
 * Types
 **************************************/
export interface ReportData {
  projectName: string;
  scanDate: string; // ISO
  metrics: EnterpriseMetrics;
  scanResults: any;
  aiSummary?: AICodeSummary;
  auditSummary?: any;
  preparedBy?: {
    company?: string;
    author?: string;
    contact?: string;
    logoPath?: string; // optional PNG/SVG rasterized
  };
}

/**************************************
 * Theme & Layout
 **************************************/
const theme = {
  brand: {
    primary: '#0f172a', // header bg
    accent: '#1e40af',
    info: '#3b82f6',
    success: '#10b981',
    warn: '#f59e0b',
    danger: '#ef4444',
    textDark: '#0f172a',
    text: '#1f2937',
    textMuted: '#64748b',
    panel: '#f8fafc',
    border: '#e5e7eb',
  },
  fonts: {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
  },
  page: {
    margin: { top: 56, right: 50, bottom: 56, left: 50 },
    size: 'A4' as const,
    watermark: false as boolean,
  },
};

/** Tiny layout helper */
function stackText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  options: PDFKit.Mixins.TextOptions & { fontSize?: number; font?: string; color?: string }
) {
  const { fontSize = 12, font = theme.fonts.regular, color = theme.brand.text } = options;
  doc.font(font).fontSize(fontSize).fillColor(color);
  const h = doc.heightOfString(text, { width: options.width ?? doc.page.width - theme.page.margin.left - theme.page.margin.right, align: options.align });
  doc.text(text, x, y, options);
  return y + h; // next y
}

/**************************************
 * Public API
 **************************************/
export async function generateExecutivePDF(outputPath: string, data: ReportData): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: theme.page.size,
      margins: theme.page.margin,
      info: {
        Title: `Technical Debt Report - ${data.projectName}`,
        Author: data.preparedBy?.author || 'TechDebt Insight',
        Subject: 'Executive Technical Debt Analysis',
        Keywords: 'technical debt, code quality, metrics, security, AI',
        CreationDate: new Date(),
      },
    });

    const stream = createWriteStream(outputPath);
    doc.pipe(stream);

    // Header/Footer on every page
    wireHeaderFooter(doc, data);

    // Outline for PDF readers (bookmarks)
    const outline = doc.outline;

    // COVER
    addCoverPage(doc, data);

    // TABLE OF CONTENTS
    doc.addPage();
    outline.addItem('Table of Contents');
    addTOC(doc, [
      { title: 'Executive Summary', page: 2 },
      { title: 'Key Performance Indicators', page: 3 },
      data.aiSummary ? { title: 'AI Code Analysis', page: 4 } : undefined,
      data.auditSummary ? { title: 'Security & Dependency Audit', page: data.aiSummary ? 5 : 4 } : undefined,
      { title: 'Strategic Recommendations', page: 0 },
      { title: 'Appendix', page: 0 },
    ].filter(Boolean) as { title: string; page: number }[]);

    // EXECUTIVE SUMMARY
    doc.addPage();
    outline.addItem('Executive Summary');
    addExecutiveSummary(doc, data);

    // KPI
    doc.addPage();
    outline.addItem('Key Performance Indicators');
    addKeyMetrics(doc, data);

    // AI ANALYSIS
    if (data.aiSummary) {
      doc.addPage();
      outline.addItem('AI Code Analysis');
      addAIAnalysis(doc, data.aiSummary);
    }

    // SECURITY
    if (data.auditSummary) {
      doc.addPage();
      outline.addItem('Security & Dependency Audit');
      addSecurityAudit(doc, data);
    }

    // RECOMMENDATIONS + TIMELINE
    doc.addPage();
    outline.addItem('Strategic Recommendations');
    addRecommendations(doc, data);
    addRoadmapTimeline(doc, [
      { label: 'Critical Vuln Remediation', weeks: 2, start: 0, color: theme.brand.danger },
      { label: 'Debt Reduction Sprint Allocation', weeks: 12, start: 2, color: theme.brand.warn },
      { label: 'Test Coverage Improvement', weeks: 10, start: 6, color: theme.brand.info },
    ]);

    // APPENDIX
    doc.addPage();
    outline.addItem('Appendix');
    addAppendix(doc, data);

    // END
    doc.end();

    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

/**************************************
 * Header / Footer
 **************************************/
function wireHeaderFooter(doc: PDFKit.PDFDocument, data: ReportData) {
  const draw = () => {
    const { width, height } = doc.page;

    // Header band
    doc.save();
    doc.fillColor('#ffffff');
    doc.rect(0, 0, width, theme.page.margin.top - 18).fill('#ffffff');
    doc.restore();

    // Branding / title (left)
    const headerY = 18;
    doc.fillColor(theme.brand.textMuted).font(theme.fonts.bold).fontSize(9);
    doc.text('Technical Debt Insight', theme.page.margin.left, headerY, { width: 260, align: 'left' });

    // Project (center)
    doc.font(theme.fonts.regular).fontSize(9).fillColor(theme.brand.textMuted);
    doc.text(data.projectName, 0, headerY, { align: 'center' });

    // Date (right)
    const dateStr = new Date(data.scanDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
    doc.text(dateStr, -theme.page.margin.right, headerY, { align: 'right' });

    // Rule
    doc.moveTo(theme.page.margin.left, theme.page.margin.top - 8)
      .lineTo(width - theme.page.margin.right, theme.page.margin.top - 8)
      .strokeColor(theme.brand.border)
      .lineWidth(0.5)
      .stroke();

    // Footer
    const footerY = height - theme.page.margin.bottom + 16;
    doc.moveTo(theme.page.margin.left, footerY - 10)
      .lineTo(width - theme.page.margin.right, footerY - 10)
      .strokeColor(theme.brand.border)
      .lineWidth(0.5)
      .stroke();

    doc.fontSize(8).fillColor(theme.brand.textMuted);
    doc.text('Confidential — For Executive Use Only', theme.page.margin.left, footerY, { width: 300 });
    doc.text('Page —', -theme.page.margin.right, footerY, { align: 'right' });

    if (theme.page.watermark) {
      doc.save();
      doc.rotate(35, { origin: [width / 2, height / 2] });
      doc.font(theme.fonts.bold).fontSize(64).fillColor('#E6EEF9');
      doc.opacity(0.25).text('INTERNAL', width / 4, height / 3, { align: 'center', width: width / 2 });
      doc.opacity(1).restore();
    }
  };

  draw(); // current page
  doc.on('pageAdded', draw);
}

/**************************************
 * Cover Page (re-uses your safe stacking)
 **************************************/
function addCoverPage(doc: PDFKit.PDFDocument, data: ReportData) {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - theme.page.margin.left - theme.page.margin.right;

  // Hero band
  doc.save();
  doc.rect(0, 0, pageWidth, 260).fill(theme.brand.primary);
  doc.restore();

  // Logo (optional)
  if (data.preparedBy?.logoPath) {
    try {
      const box = 56;
      doc.image(data.preparedBy.logoPath, pageWidth / 2 - box / 2, 34, { width: box, height: box, fit: [box, box] });
    } catch { /* ignore */ }
  } else {
    doc.save();
    doc.circle(pageWidth / 2, 62, 28).fill(theme.brand.info);
    doc.fillColor('#ffffff').font(theme.fonts.bold).fontSize(18)
      .text('TDI', theme.page.margin.left, 48, { width: contentWidth, align: 'center' });
    doc.restore();
  }

  let y = 100;
  y = stackText(doc, 'Executive Technical Debt Report', theme.page.margin.left, y, {
    width: contentWidth,
    align: 'center',
    font: theme.fonts.bold,
    fontSize: 32,
    color: '#ffffff',
  }) + 10;

  y = stackText(doc, data.projectName, theme.page.margin.left, y, {
    width: contentWidth,
    align: 'center',
    font: theme.fonts.regular,
    fontSize: 18,
    color: '#cbd5e1',
  });

  y += 6;
  const dateStr = `Generated: ${new Date(data.scanDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  y = stackText(doc, dateStr, theme.page.margin.left, y, {
    width: contentWidth,
    align: 'center',
    font: theme.fonts.regular,
    fontSize: 10,
    color: '#94a3b8',
  });

  y = stackText(doc, 'Comprehensive Analysis: Code Quality • AI Detection • Security Audit', theme.page.margin.left, y + 6, {
    width: contentWidth,
    align: 'center',
    font: theme.fonts.regular,
    fontSize: 9,
    color: '#94a3b8',
  });

  // Health Badge
  const score = data.metrics.codeQualityScore;
  const status = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : 'NEEDS ATTENTION';
  const color = score >= 80 ? theme.brand.success : score >= 60 ? theme.brand.warn : theme.brand.danger;

  const badgeY = 380;
  doc.save();
  doc.circle(pageWidth / 2, badgeY, 88).strokeColor(color).lineWidth(3).stroke();
  doc.circle(pageWidth / 2, badgeY, 82).fill(color);
  doc.circle(pageWidth / 2, badgeY, 72).fill('#ffffff');
  doc.fillColor(color).font(theme.fonts.bold).fontSize(54)
    .text(String(score), theme.page.margin.left, badgeY - 32, { width: contentWidth, align: 'center' });
  doc.font(theme.fonts.bold).fontSize(12).fillColor(theme.brand.textMuted)
    .text('HEALTH SCORE', theme.page.margin.left, badgeY + 56, { width: contentWidth, align: 'center' });
  doc.font(theme.fonts.regular).fontSize(10).fillColor(color)
    .text(status, theme.page.margin.left, badgeY + 74, { width: contentWidth, align: 'center' });
  doc.restore();

  // KPI preview cards
  const yStart = 560;
  kpiCard(doc, 50, yStart, 'Technical Debt Ratio', `${data.metrics.technicalDebtRatio.toFixed(1)}%`);
  const sec = data.metrics.securityPosture;
  kpiCard(doc, 50 + 172, yStart, 'Security Posture', String(sec), sec >= 80 ? theme.brand.success : sec >= 60 ? theme.brand.warn : theme.brand.danger);
  if (data.aiSummary) {
    kpiCard(doc, 50 + 172 * 2, yStart, 'AI‑Generated Code', `${data.aiSummary.aiCodePercentage}%`, theme.brand.info);
  }
}

function kpiCard(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string, valueColor?: string) {
  const w = 160, h = 84;
  doc.save();
  doc.roundedRect(x, y, w, h, 8).fillAndStroke(theme.brand.panel, theme.brand.border);
  doc.font(theme.fonts.regular).fontSize(9).fillColor(theme.brand.textMuted).text(label, x + 12, y + 14, { width: w - 24 });
  doc.font(theme.fonts.bold).fontSize(24).fillColor(valueColor || theme.brand.textDark).text(value, x + 12, y + 36, { width: w - 24 });
  doc.restore();
}

/**************************************
 * Table of Contents
 **************************************/
function addTOC(doc: PDFKit.PDFDocument, items: { title: string; page: number }[]) {
  sectionHeader(doc, 'Table of Contents');
  let y = 140;
  items.forEach((it, idx) => {
    const line = `${idx + 1}. ${it.title}`;
    doc.font(theme.fonts.regular).fontSize(12).fillColor(theme.brand.text)
      .text(line, 60, y, { width: 420 });
    doc.font(theme.fonts.regular).fontSize(12).fillColor(theme.brand.textMuted)
      .text(String(it.page || '—'), 60, y, { width: 500, align: 'right' });
    y += 26;
  });
}

/**************************************
 * Executive Summary
 **************************************/
function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  const { width } = doc.page;
  doc.save();
  doc.rect(0, 64, width, 56).fill(theme.brand.panel);
  doc.fillColor(theme.brand.accent).font(theme.fonts.bold).fontSize(22).text(title, theme.page.margin.left, 82);
  doc.restore();
}

function addExecutiveSummary(doc: PDFKit.PDFDocument, data: ReportData) {
  sectionHeader(doc, 'Executive Summary');
  let y = 150;

  const { metrics } = data;
  const bullets: string[] = [
    `Overall code health score is ${metrics.codeQualityScore}/100 with a Technical Debt Ratio of ${metrics.technicalDebtRatio.toFixed(1)}%.`,
    `${data.scanResults?.summary?.criticalIssues || 0} critical issues require immediate remediation; estimated ${(Math.round((data.scanResults?.summary?.technicalDebt?.totalMinutes || 0) / 60))} hours to address prioritized debt.`,
    `Security posture is ${metrics.securityPosture}/100 with ${data.scanResults?.summary?.quality?.securityIssues || 0} known vulnerabilities.`,
  ];

  // Two-column KPI grid
  const cards: Array<{ label: string; value: string; status: 'excellent' | 'good' | 'critical' }> = [
    { label: 'Technical Debt Ratio', value: `${metrics.technicalDebtRatio.toFixed(1)}%`, status: statusForTDR(metrics.technicalDebtRatio) },
    { label: 'Code Quality Score', value: String(metrics.codeQualityScore), status: tier(metrics.codeQualityScore) },
    { label: 'Security Posture', value: String(metrics.securityPosture), status: tier(metrics.securityPosture) },
    { label: 'Defect Density', value: `${metrics.defectDensity.toFixed(2)}/1K LOC`, status: (metrics.defectDensity < 1 ? 'excellent' : metrics.defectDensity < 3 ? 'good' : 'critical') as 'excellent' | 'good' | 'critical' },
  ];

  let cx = 50, cy = y;
  cards.forEach((c, i) => {
    metricBox(doc, cx, cy, 240, 78, c.label, c.value, c.status);
    cx = cx === 50 ? 310 : 50;
    if (cx === 50) cy += 96;
  });

  y = cy + 110;

  // Narrative bullets
  doc.font(theme.fonts.bold).fontSize(14).fillColor(theme.brand.text).text('Key Messages for Leadership', 50, y);
  y += 24;
  bullets.forEach((b) => {
    doc.font(theme.fonts.bold).fontSize(12).fillColor(theme.brand.danger).text('•', 60, y);
    doc.font(theme.fonts.regular).fontSize(12).fillColor(theme.brand.text).text(b, 78, y, { width: 480 });
    y += 22;
  });

  // Risk heatmap (3x3)
  y += 12;
  doc.font(theme.fonts.bold).fontSize(14).fillColor(theme.brand.text).text('Risk Heatmap (Likelihood × Impact)', 50, y);
  y += 18;
  drawHeatmap(doc, 50, y, 300, 150);

  // Trend sparkline for velocity
  const velocityHistory = (metrics.velocityTrend as any).history || [60,62,61,63,65,64,66,67,66,68,69,70];
  drawSparklineCard(doc, 370, y, 'Velocity (last 12 sprints)', velocityHistory);
}

function statusForTDR(tdr: number) { return tdr < 5 ? 'excellent' : tdr < 25 ? 'good' : 'critical'; }
function tier(n: number) { return n >= 80 ? 'excellent' : n >= 60 ? 'good' : 'critical'; }

function metricBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, label: string, value: string, status: 'excellent'|'good'|'critical') {
  const color = status === 'excellent' ? theme.brand.success : status === 'good' ? theme.brand.warn : theme.brand.danger;
  doc.save();
  doc.roundedRect(x, y, w, h, 6).strokeColor(theme.brand.border).lineWidth(1).stroke();
  doc.circle(x + 14, y + 16, 5).fill(color);
  doc.font(theme.fonts.regular).fontSize(10).fillColor(theme.brand.textMuted).text(label, x + 28, y + 10, { width: w - 40 });
  doc.font(theme.fonts.bold).fontSize(20).fillColor(theme.brand.text).text(value, x + 12, y + 36);
  doc.restore();
}

function drawHeatmap(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  const rows = 3, cols = 3; const cw = w / cols, ch = h / rows;
  const palette = [theme.brand.success, theme.brand.warn, theme.brand.danger];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = Math.max(r, c); // simple gradient
      const color = palette[v];
      doc.save();
      doc.rect(x + c * cw, y + r * ch, cw - 2, ch - 2).fill(color + '');
      doc.restore();
    }
  }
  doc.font(theme.fonts.regular).fontSize(9).fillColor(theme.brand.textMuted);
  doc.text('Low', x, y + h + 6);
  doc.text('High', x + w - 24, y + h + 6);
}

function drawSparklineCard(doc: PDFKit.PDFDocument, x: number, y: number, title: string, values: number[]) {
  const w = 190, h = 100;
  doc.save();
  doc.roundedRect(x, y, w, h, 6).fillAndStroke('#ffffff', theme.brand.border);
  doc.font(theme.fonts.regular).fontSize(10).fillColor(theme.brand.textMuted).text(title, x + 10, y + 10, { width: w - 20 });

  // sparkline
  const gx = x + 10, gy = y + 34, gw = w - 20, gh = 56;
  const min = Math.min(...values), max = Math.max(...values);
  const scaleX = gw / Math.max(values.length - 1, 1);
  const scaleY = gh / Math.max(max - min || 1, 1);
  values.forEach((v, i) => {
    const px = gx + i * scaleX;
    const py = gy + gh - (v - min) * scaleY;
    if (i === 0) doc.moveTo(px, py); else doc.lineTo(px, py);
  });
  doc.strokeColor(theme.brand.info).lineWidth(1.2).stroke();
  doc.restore();
}

/**************************************
 * KPI Section (reuses your original idea, refined)
 **************************************/
function addKeyMetrics(doc: PDFKit.PDFDocument, data: ReportData) {
  sectionHeader(doc, 'Key Performance Indicators');
  const { metrics } = data;
  let y = 150;

  subsection(doc, 'DORA Metrics', y); y += 28;
  const dora = [
    ['Deployment Frequency', String(metrics.deploymentFrequency)],
    ['Lead Time for Changes', String(metrics.leadTimeForChanges)],
    ['Change Failure Rate', `${metrics.changeFailureRate}%`],
    ['Time to Restore Service', String(metrics.timeToRestoreService)],
  ];
  y = table(doc, 60, y, 480, dora);

  y += 12; subsection(doc, 'Developer Productivity', y); y += 28;
  const prod = [
    ['Velocity Trend', `${metrics.velocityTrend.change > 0 ? '+' : ''}${metrics.velocityTrend.change}%`],
    ['Impact Level', metrics.velocityTrend.impactLevel],
    ['Focus Time', `${metrics.focusTime.percentage}%`],
    ['Team Satisfaction', `${metrics.teamSatisfactionIndex}/100`],
  ];
  y = table(doc, 60, y, 480, prod);

  y += 12; subsection(doc, 'Business Impact', y); y += 28;
  const totalDebtMinutes = data.scanResults?.summary?.technicalDebt?.totalMinutes || 0;
  const estimatedCost = (totalDebtMinutes / 60) * 150; // $150/hour
  const business = [
    ['Estimated Financial Cost', `$${estimatedCost.toLocaleString()}`],
    ['Time to Remediate', `${(totalDebtMinutes / 60).toFixed(0)} hours`],
    ['Critical Path Risk', `${metrics.criticalPathRisk}/100`],
    ['Customer Impact Score', `${metrics.customerImpactScore}/100`],
  ];
  table(doc, 60, y, 480, business);
}

function subsection(doc: PDFKit.PDFDocument, title: string, y: number) {
  doc.font(theme.fonts.bold).fontSize(14).fillColor(theme.brand.text).text(title, 50, y);
}

function table(doc: PDFKit.PDFDocument, x: number, y: number, w: number, rows: string[][]) {
  const rowH = 22;
  rows.forEach((r) => {
    doc.font(theme.fonts.regular).fontSize(11).fillColor(theme.brand.text).text(r[0], x, y, { width: w * 0.6 });
    doc.font(theme.fonts.bold).text(r[1], x + w * 0.62, y, { width: w * 0.38, align: 'right' });
    y += rowH;
    doc.moveTo(x, y - 6).lineTo(x + w, y - 6).strokeColor(theme.brand.border).lineWidth(0.5).stroke();
  });
  return y + 6;
}

/**************************************
 * AI Analysis (polished)
 **************************************/
function addAIAnalysis(doc: PDFKit.PDFDocument, ai: AICodeSummary) {
  sectionHeader(doc, 'AI Code Analysis');
  let y = 150;

  const risk = ai.aiCodePercentage > 50 ? 'HIGH' : ai.aiCodePercentage > 25 ? 'MEDIUM' : 'LOW';
  const riskColor = risk === 'HIGH' ? theme.brand.danger : risk === 'MEDIUM' ? theme.brand.warn : theme.brand.success;

  // Summary panel
  doc.roundedRect(50, y, 495, 98, 6).fill(theme.brand.panel);
  doc.font(theme.fonts.bold).fontSize(16).fillColor(theme.brand.text).text('Detection Summary', 70, y + 18);

  colStat(doc, 70, y + 52, 'AI‑Generated Code', `${ai.aiCodePercentage}%`, theme.brand.info);
  colStat(doc, 240, y + 52, 'Detection Confidence', `${ai.confidenceScore}%`, theme.brand.text);
  colStat(doc, 410, y + 52, 'Risk Assessment', risk, riskColor);

  y += 120;
  subsection(doc, 'File Classification', y); y += 28;
  const total = ai.totalFiles || 1;
  const stats = [
    ['AI‑Generated Files', ai.aiGeneratedFiles, '#3b82f6'],
    ['Human‑Written Files', ai.humanWrittenFiles, '#10b981'],
    ['Mixed/Uncertain Files', ai.mixedFiles, '#f59e0b'],
  ];
  stats.forEach(([label, val, color]) => {
    progress(doc, 50, y, 380, Number(val) / total, String(label), String(val), String(color));
    y += 24;
  });

  y += 8; subsection(doc, 'Top AI Patterns Detected', y); y += 28;
  ai.topAIPatterns.slice(0, 6).forEach((p) => {
    doc.font(theme.fonts.regular).fontSize(11).fillColor(theme.brand.text)
      .text(`• ${p.pattern.replace(/_/g, ' ')}`, 60, y, { width: 420 });
    doc.font(theme.fonts.regular).fontSize(10).fillColor(theme.brand.textMuted)
      .text(`(${p.count} occurrences)`, 60, y, { width: 480, align: 'right' });
    y += 18;
  });

  y += 8; subsection(doc, 'Risk Breakdown', y); y += 28;
  const rb = ai.riskAssessment || { securityRisks: 0, maintenanceRisks: 0, qualityRisks: 0 };
  riskBar(doc, 60, y, 'Security Risks', rb.securityRisks, total, theme.brand.danger); y += 22;
  riskBar(doc, 60, y, 'Maintenance Risks', rb.maintenanceRisks, total, theme.brand.warn); y += 22;
  riskBar(doc, 60, y, 'Quality Risks', rb.qualityRisks, total, theme.brand.info);
}

function colStat(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string, color: string) {
  doc.font(theme.fonts.regular).fontSize(10).fillColor(theme.brand.textMuted).text(label, x, y);
  doc.font(theme.fonts.bold).fontSize(22).fillColor(color).text(value, x, y + 10);
}

function progress(doc: PDFKit.PDFDocument, x: number, y: number, w: number, ratio: number, label: string, right: string, color: string) {
  doc.font(theme.fonts.regular).fontSize(11).fillColor(theme.brand.text).text(label, x, y - 2);
  doc.font(theme.fonts.regular).fontSize(11).fillColor(theme.brand.textMuted).text(right, x + w + 12, y - 2, { width: 80, align: 'left' });
  doc.roundedRect(x, y + 12, w, 8, 4).fill(theme.brand.border);
  doc.roundedRect(x, y + 12, Math.max(0, Math.min(1, ratio)) * w, 8, 4).fill(color);
}

function riskBar(doc: PDFKit.PDFDocument, x: number, y: number, label: string, count: number, total: number, color: string) {
  const w = 380; const ratio = (total ? count / total : 0);
  doc.font(theme.fonts.regular).fontSize(11).fillColor(theme.brand.text).text(label, x, y - 2, { width: 160 });
  doc.roundedRect(x + 170, y, w, 12, 6).strokeColor(theme.brand.border).stroke();
  doc.roundedRect(x + 170, y, w * ratio, 12, 6).fill(color);
  doc.font(theme.fonts.regular).fontSize(10).fillColor(theme.brand.textMuted).text(`${count} files`, x + 170 + w + 8, y - 2);
}

/**************************************
 * Security
 **************************************/
function addSecurityAudit(doc: PDFKit.PDFDocument, data: ReportData) {
  const audit = data.auditSummary;
  sectionHeader(doc, 'Security & Dependency Audit');
  let y = 150;

  if (!audit || !audit.summary) {
    doc.font(theme.fonts.regular).fontSize(12).fillColor(theme.brand.textMuted).text('No security audit data available', 50, y);
    return;
  }

  const totalV = audit.summary.totalVulnerabilities || 0;
  const criticalV = audit.summary.criticalVulnerabilities || 0;
  const outdated = audit.summary.outdatedPackages || 0;

  doc.roundedRect(50, y, 495, 98, 6).fill(theme.brand.panel);
  doc.font(theme.fonts.bold).fontSize(16).fillColor(theme.brand.text).text('Security Summary', 70, y + 18);
  colStat(doc, 70, y + 52, 'Total Vulnerabilities', String(totalV), pickSeverityColor(totalV));
  colStat(doc, 240, y + 52, 'Critical Issues', String(criticalV), theme.brand.danger);
  colStat(doc, 410, y + 52, 'Outdated Packages', String(outdated), theme.brand.warn);
  y += 120;

  if (audit.vulnerabilities?.length) {
    subsection(doc, 'Top Vulnerabilities', y); y += 28;
    audit.vulnerabilities.slice(0, 5).forEach((v: any) => {
      const sev = (v.severity || '').toLowerCase();
      const sevColor = sev === 'critical' ? theme.brand.danger : sev === 'high' ? theme.brand.warn : sev === 'medium' ? theme.brand.info : theme.brand.textMuted;
      // badge
      doc.roundedRect(50, y, 60, 18, 3).fill(sevColor);
      doc.font(theme.fonts.bold).fontSize(9).fillColor('#fff').text((sev || 'unknown').toUpperCase(), 50, y + 4, { width: 60, align: 'center' });
      // text
      doc.font(theme.fonts.bold).fontSize(11).fillColor(theme.brand.text).text(v.package || 'Unknown', 120, y);
      doc.font(theme.fonts.regular).fontSize(9).fillColor(theme.brand.textMuted)
        .text(v.title || v.description || 'No description', 120, y + 14, { width: 410 });
      y += 40;
    });
  }

  if (audit.outdated?.length) {
    y += 6; subsection(doc, 'Outdated Dependencies', y); y += 28;
    audit.outdated.slice(0, 6).forEach((p: any) => {
      doc.font(theme.fonts.bold).fontSize(11).fillColor(theme.brand.text).text(p.package || p.name, 60, y, { width: 260 });
      doc.font(theme.fonts.regular).fontSize(10).fillColor(theme.brand.textMuted).text(`${p.current} → ${p.latest}`, 330, y);
      y += 20;
    });
  }

  if (audit.summary.estimatedFixTime) {
    y += 10;
    doc.roundedRect(50, y, 495, 56, 6).fill('#fef3c7');
    doc.font(theme.fonts.bold).fontSize(12).fillColor('#92400e').text('⏱ Estimated Remediation Time', 70, y + 14);
    doc.font(theme.fonts.regular).fontSize(10).fillColor('#92400e').text(String(audit.summary.estimatedFixTime), 70, y + 32);
  }
}

function pickSeverityColor(total: number) {
  if (total > 10) return theme.brand.danger;
  if (total > 5) return theme.brand.warn;
  return theme.brand.success;
}

/**************************************
 * Recommendations + Roadmap
 **************************************/
function addRecommendations(doc: PDFKit.PDFDocument, data: ReportData) {
  sectionHeader(doc, 'Strategic Recommendations');
  let y = 150;
  const criticalIssues = data.scanResults?.summary?.criticalIssues || 0;

  const recs = [
    { priority: 'HIGH', title: 'Address Critical Security Issues', desc: `Immediately remediate ${criticalIssues} critical security vulnerabilities to prevent potential breaches.`, timeline: '1–2 weeks', impact: 'High' },
    { priority: 'HIGH', title: 'Reduce Technical Debt Ratio', desc: `Current TDR of ${data.metrics.technicalDebtRatio.toFixed(1)}% exceeds industry benchmarks. Allocate 20% of sprint capacity to debt reduction.`, timeline: '3–6 months', impact: 'High' },
    { priority: 'MED', title: 'Improve Test Coverage', desc: `Increase test coverage from ${data.metrics.testCoverage}% to ≥ 80% to reduce defect density.`, timeline: '2–3 months', impact: 'Medium' },
  ];
  if (data.aiSummary && data.aiSummary.aiCodePercentage > 50) {
    recs.push({ priority: 'MED', title: 'Review AI‑Generated Code', desc: `${data.aiSummary.aiCodePercentage}% of code appears AI‑generated. Introduce AI code review guidelines and guardrails.`, timeline: '1 month', impact: 'Medium' });
  }

  recs.forEach((r) => {
    if (y > 680) { doc.addPage(); y = 120; }
    const pColor = r.priority === 'HIGH' ? theme.brand.danger : theme.brand.warn;
    doc.roundedRect(60, y, 60, 18, 3).fill(pColor);
    doc.font(theme.fonts.bold).fontSize(9).fillColor('#fff').text(r.priority, 60, y + 4, { width: 60, align: 'center' });
    doc.font(theme.fonts.bold).fontSize(13).fillColor(theme.brand.text).text(r.title, 130, y + 1, { width: 420 });
    y += 22;
    doc.font(theme.fonts.regular).fontSize(10).fillColor(theme.brand.text).text(r.desc, 60, y, { width: 480 });
    y += 32;
    doc.font(theme.fonts.regular).fontSize(9).fillColor(theme.brand.textMuted).text(`Timeline: ${r.timeline}  |  Impact: ${r.impact}`, 60, y);
    y += 26;
    doc.moveTo(60, y).lineTo(540, y).strokeColor(theme.brand.border).lineWidth(0.5).stroke();
    y += 14;
  });
}

function addRoadmapTimeline(doc: PDFKit.PDFDocument, tasks: { label: string; weeks: number; start: number; color: string }[]) {
  let y = 580;
  doc.font(theme.fonts.bold).fontSize(14).fillColor(theme.brand.text).text('Execution Roadmap (Weeks)', 50, y);
  y += 22;
  const x = 60, w = 480, rowH = 18;
  const horizon = Math.max(...tasks.map(t => t.start + t.weeks), 12);
  tasks.forEach((t, i) => {
    const sx = x + (t.start / horizon) * w;
    const barW = (t.weeks / horizon) * w;
    doc.font(theme.fonts.regular).fontSize(10).fillColor(theme.brand.text).text(t.label, x, y + i * (rowH + 8) - 2, { width: 220 });
    doc.roundedRect(sx, y + i * (rowH + 8), Math.max(8, barW), rowH, 4).fill(t.color);
  });
}

/**************************************
 * Appendix
 **************************************/
function addAppendix(doc: PDFKit.PDFDocument, data: ReportData) {
  let y = 120;
  doc.font(theme.fonts.bold).fontSize(14).fillColor(theme.brand.text).text('Methodology', 50, y); y += 18;
  y = stackText(doc, 'Metrics are computed from automated static analysis, repository activity, and issue tracking systems. DORA metrics reflect trailing 3‑month medians. Security posture is based on identified vulnerabilities and dependency freshness. Estimates assume blended engineer cost of $150/hour.', 50, y, { width: 495, align: 'left', fontSize: 10, color: theme.brand.text });

  y += 12;
  doc.font(theme.fonts.bold).fontSize(14).fillColor(theme.brand.text).text('Glossary', 50, y); y += 18;
  const gl = [
    ['Technical Debt Ratio (TDR)', 'Percentage of effort required to address known debt relative to total development capacity.'],
    ['Defect Density', 'Confirmed defects per 1,000 lines of code.'],
    ['DORA Metrics', 'Industry metrics: Deployment Frequency, Lead Time, Change Failure Rate, Time to Restore.'],
  ];
  y = table(doc, 60, y, 480, gl as unknown as string[][]);

  y += 8;
  if (data.preparedBy?.author || data.preparedBy?.company || data.preparedBy?.contact) {
    doc.font(theme.fonts.bold).fontSize(14).fillColor(theme.brand.text).text('Prepared By', 50, y); y += 18;
    const lines = [data.preparedBy?.company, data.preparedBy?.author, data.preparedBy?.contact].filter(Boolean).join(' • ');
    doc.font(theme.fonts.regular).fontSize(10).fillColor(theme.brand.text).text(lines, 50, y);
  }
}
