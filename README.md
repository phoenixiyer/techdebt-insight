# Tech Debt Insight 🔍

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/arunkg/techdebt-insight?style=social)](https://github.com/arunkg/techdebt-insight/stargazers)

**Enterprise-grade technical debt analysis for any codebase.**

A comprehensive Gemini CLI extension that provides CTO-level technical debt insights with industry-standard KPIs, DORA metrics, and actionable business impact assessments. Generate detailed markdown reports that are saved locally and displayed in your terminal.

![Tech Debt Insight Demo](https://via.placeholder.com/800x400.png?text=Tech+Debt+Insight+Demo)

## ✨ Features

### 📊 Enterprise KPIs & Metrics

- **Technical Debt Ratio (TDR)** - Industry benchmark: <5% excellent, <25% acceptable
- **Defect Density** - Per 1000 lines of code with industry comparisons
- **Code Quality Score** - Composite 0-100 score based on multiple factors
- **Code Churn Rate** - Identifies unstable, frequently changing code
- **Cycle Time Analysis** - Average, median, and P95 fix times

### 🚀 DORA Metrics (DevOps Performance)

- **Deployment Frequency** - How often code is deployed
- **Lead Time for Changes** - Time from commit to production
- **Change Failure Rate** - Percentage of deployments causing failures
- **Time to Restore Service** - MTTR (Mean Time To Restore)
- **Performance Level Rating** - Elite, High, Medium, or Low

### 👥 Developer Productivity & Team Health

- **Velocity Impact Analysis** - Current vs previous sprint velocity
- **Focus Time Percentage** - Time spent in productive flow state
- **Interruption Rate** - Daily context switches and disruptions
- **Team Satisfaction Index** - Estimated from code quality metrics

### 📈 Code Quality Analysis

- **Cyclomatic & Cognitive Complexity** - McCabe and cognitive complexity metrics
- **Test Coverage Breakdown** - Unit, integration, and E2E test coverage
- **Code Smell Detection** - Long methods, god classes, deep nesting, magic numbers
- **Security Vulnerability Scanning** - SQL injection, XSS, hardcoded secrets
- **Duplication Rate** - Percentage of duplicated code

### 💰 Business Impact Assessment

- **Financial Cost Estimation** - Developer hours × hourly rate
- **Maintenance Cost Ratio** - Percentage of budget spent on maintenance
- **Feature Delivery Velocity** - Features delivered per sprint
- **Customer Impact Score** - Risk to customer experience (0-100)
- **Scalability Index** - Ability to scale and grow (0-100)

### 🛡️ Security & Compliance

- **Security Posture Score** - Overall security health (0-100)
- **Compliance Risk Assessment** - Regulatory compliance risk level
- **Critical Path Risk** - Risk to critical business functions
- **Vulnerability Tracking** - CVE/CWE identification with severity

### 🤖 AI Code Detection (Inspired by An Empirical Study on Automatically Detecting AI-Generated Source Code)

- **AI vs Human Code Classification** - Identifies AI-generated code patterns
- **Confidence Scoring** - 0-100% likelihood scores for each file
- **Pattern Detection** - Detects hallmarks of AI-generated code:
  - Generic comments and variable names
  - Boilerplate code patterns
  - Excessive style consistency
  - Missing edge case handling
  - AI tool signatures (Copilot, ChatGPT, etc.)
- **Risk Assessment** - Security, maintenance, and quality risks
- **Dedicated AI Report** - Detailed `ai-code-analysis-YYYY-MM-DD.md`

### 📄 Comprehensive Reporting

- **Markdown Reports** - Saved locally as `techdebt-report-YYYY-MM-DD.md`
- **AI Analysis Reports** - Saved as `ai-code-analysis-YYYY-MM-DD.md`
- **CTO Reports** - Executive-level `techdebt-cto-report-YYYY-MM-DD.md`
- **PDF Executive Reports** - Professional PDF reports with charts and metrics (NEW!)
- **Terminal Display** - Executive summary shown in terminal
- **Benchmark Comparisons** - Your metrics vs industry standards
- **ROI Projections** - Investment required and expected returns
- **Strategic Recommendations** - Short, medium, and long-term actions

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Gemini CLI (`npm install -g @gemini/cli`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arunkg/techdebt-insight.git
   cd techdebt-insight
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Test the server (optional)**
   ```bash
   node test-server.js
   ```
   You should see: ✅ Server started successfully!

5. **Link the extension to Gemini CLI**
   ```bash
   # If already installed, uninstall first
   gemini extensions uninstall techdebt-insight
   
   # Link the extension
   gemini extensions link .
   ```

6. **Verify the installation**
   ```bash
   gemini
   ```
   Then type `/mcp` to see the MCP servers. The `nodeServer` should show as connected (🟢).

## 🛠️ Usage

### Basic Commands

```bash
# Scan the current directory (includes AI detection)
gemini techdebt:scan .

# Scan a specific directory
gemini techdebt:scan /path/to/your/repo

# AI code detection only
/techdebt:ai-scan .

# Audit dependencies only
/techdebt:audit .

# Generate full CTO report
/techdebt:report .
```

### Command Details

| Command | Description | Report Generated |
|---------|-------------|------------------|
| `/techdebt:scan` | Complete technical debt analysis with AI detection | `techdebt-report-YYYY-MM-DD.md` |
| `/techdebt:ai-scan` | Dedicated AI code detection analysis | `ai-code-analysis-YYYY-MM-DD.md` |
| `/techdebt:audit` | Dependency security and version audit | Terminal output only |
| `/techdebt:report` | Executive CTO-level comprehensive report | `techdebt-cto-report-YYYY-MM-DD.md` + PDF |

## ⚙️ Configuration

Create a `.techdebt.json` file in your project root to customize the analysis:

```json
{
  "ignorePatterns": ["**/node_modules/**", "**/dist/**", "**/*.test.js"],
  "rules": {
    "maxFileLines": 500,
    "maxComplexity": 10,
    "requireTests": true
  },
  "dependencies": {
    "audit": true,
    "ignore": ["devDependencies"]
  }
}
```

## 🔄 CI/CD Integration

Add Tech Debt Insight to your GitHub Actions workflow:

```yaml
# .github/workflows/techdebt.yml
name: Tech Debt Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g @gemini/cli
      - run: gemini extensions install arunkg/techdebt-insight
      - run: gemini techdebt:scan . --fail-on=high
```

## 📊 Example Output

```
🔍 Tech Debt Analysis Report

📂 Scanned: /path/to/your/repo
📊 Found 42 issues (12 high, 18 medium, 12 low)

🚨 High Priority Issues:
- [CRIT] Security vulnerability in lodash@4.17.15
- [HIGH] Complex function in src/utils/helpers.js (complexity: 32)
- [HIGH] Missing tests for src/components/PaymentForm.jsx

✅ Recommendations:
1. Update lodash to latest version (4.17.21+)
2. Refactor complex function into smaller units
3. Add unit tests for PaymentForm component

📝 Full report saved to: ./techdebt-report-20231110.html
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ by [Arun Kumar G](https://github.com/arunkg)
- Inspired by the need for better technical debt management
- Uses [Gemini CLI](https://geminicli.com) for the extension framework

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/arunkg">Arun Kumar G</a>
</p>
