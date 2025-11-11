## Tech Debt Insight

Enterprise-grade technical debt analysis for any codebase, delivered as a **Gemini CLI extension**.
Think of this as a **baseline, extensible framework** to *discover, visualize, and reason about* tech debt. It ships sensible defaults, but **every rule/threshold/weight is configurable**.

> **Not prescriptive.** Different orgs define tech debt differently. Use this as a **starting point**; fork/tune to your standards.


## ✨ What it does (quick)

* Scans code for hotspots (long files, complexity, duplication, missing tests), dependency drift, security smells.
* Generates **Exec ready reports** (Markdown + optional PDF) with prioritized actions, effort/impact, and a 2–4 week plan.
* Includes **AI Code Detection** to flag likely AI-generated patterns (heuristic, configurable).
* Works locally or in CI, across monorepos/services.

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


## 🔧 Installation

### Option A — Install from GitHub (recommended for users)

```bash
gemini extensions install https://github.com/phoenixiyer/techdebt-insight
```

### Option B — Local dev (for contributors)

```bash
git clone https://github.com/phoenixiyer/techdebt-insight.git
cd techdebt-insight
npm install
npm run build
gemini extensions link .
```

Now restart `gemini` and run `/mcp` — you should see the Node server connected. (Your repo already documents this flow.) ([GitHub][1])

---

## 🚀 Usage

Common commands:

```bash
# Full analysis (tech debt + AI detection) on current dir
gemini techdebt:scan .

# Dedicated AI code detection only
/techdebt:ai-scan .

# Dependency audit only
/techdebt:audit .

# Executive CTO report (Markdown + optional PDF)
/techdebt:report .
```

> Tip: You can also pass an absolute path instead of `.`


## ⚙️ Configuration (start here to de-opinionate)

Create a `.techdebt.json` in your repo root:

```json
{
  "ignorePatterns": ["**/node_modules/**", "**/dist/**", "**/*.generated.*"],
  "rules": {
    "maxFileLines": 600,
    "complexityTokens": ["if","for","while","case","catch","&&","||"],
    "dupLongLineLen": 120,
    "dupRatioThreshold": 2.0,
    "requireTests": true
  },
  "weights": {
    "impact": { "security": 4, "availability": 3, "velocity": 2, "quality": 1 },
    "effortPenaltyLarge": 1
  },
  "dependencies": {
    "auditNode": true,
    "auditPython": true,
    "ignore": ["devDependencies"]
  },
  "aiDetection": {
    "enabled": true,
    "riskThreshold": 0.6,
    "signals": ["boilerplate","generic-names","edge-case-gaps","style-uniformity","tool-signature"]
  },
  "report": {
    "pdf": true,
    "ctoReport": true
  }
}
```

Everything above is **overrideable**: thresholds, weights, signals, and even which audits to run. (You already reference this format later in the README; moving it earlier puts the “not opinionated” story front-and-center.) ([GitHub][1])


## 🧭 Positioning (useful when someone says “opinionated”)

> **Baseline, not verdict.**
> This extension provides **neutral primitives** (long files, complexity, duplication, test gaps, dependency drift) and a **pluggable scoring** layer.
>
> * Swap thresholds/weights to match your standards
> * Add your own detectors (ESLint, SonarQube, radon, gocyclo, etc.)
> * Replace the prioritization function if needed
> * Turn AI detection on/off or change signals

This is a **framework for visibility** that AI can reason over, not a maturity scorecard.


## 📊 Outputs

* `techdebt-report-YYYY-MM-DD.md` — developer-level findings
* `ai-code-analysis-YYYY-MM-DD.md` — AI detection details
* `techdebt-cto-report-YYYY-MM-DD.md` — exec summary with Top-10 actions
* `techdebt-cto-report-YYYY-MM-DD.pdf` — optional PDF (if enabled)


## 🧪 CI example (GitHub Actions)

Use the *install-from-GitHub* pattern (works well in CI):

```yaml
name: Tech Debt Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: gemini extensions install https://github.com/phoenixiyer/techdebt-insight
      - run: gemini techdebt:scan . --fail-on=high
```

That “install from URL” pattern is what the directory shows for Stripe/GitHub/Grafana extensions. ([Gemini CLI][2])

---

## 🔒 Privacy & Safety

* No code leaves your machine unless your Gemini model/provider is remote.
* External tools (`npm outdated`, `pip-audit`) are executed locally; failures degrade gracefully to warnings.
* You control which paths are scanned via `ignorePatterns`.
* AI detection is **heuristic** and **not a compliance mechanism** — use it as a conversation starter, not a gate.

---

## ⚠️ Limitations / Known trade-offs

**Tech Debt Insight** is designed as a conversational baseline for technical debt, not a replacement for specialized static analysis tools.

* **Heuristic Analysis:** The AI-based detection uses pattern matching and LLM inference to identify *likely* technical debt and AI-generated code. These are signals to prompt engineering discussions, not deterministic findings.
* **AI Detection Accuracy:** The AI detection module is based on empirical research (arXiv:2411.04299) which demonstrates an F1-score of ~82.5% in best-case scenarios. Results may vary based on model temperature, language, and code snippet length.
* **Language Support:**
    * **Deep Metrics (Complexity, SQALE):** Currently uses local AST parsing supported for `TypeScript`, `JavaScript`, and `Python`.
    * **AI & Pattern Analysis:** Uses Gemini 1.5 Pro, which supports generic analysis for almost any language (Go, Rust, Java, C++, etc.), but deep architectural metrics may be limited for non-native languages.
* **Security:** The security analyzer provides context-aware risk flags (e.g., "old code + missing validation"). It is **not** a substitute for dedicated SAST tools like CodeQL, Snyk, or the Gemini Security Command Center.

---

## 🧩 Extending

* Add detectors by calling them in the MCP tool and merging their JSON into the scoring step.
* Replace prioritization by editing the weights function.
* Create your own report templates (Markdown or PDF) - the command layer is just prompts.

---

## 🆘 Troubleshooting

* If `/mcp` shows **disconnected**: ensure `dist/example.js` exists and `gemini-extension.json` points to it; avoid `console.log` (stdout).
* Node ≥ 18.17 (prefer 20).
* Re-link after build: `gemini extensions link .`
* For debug logs, use `stderr`.

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

- Built by [Arun Kumar G](https://github.com/arunkg)
- Inspired by the need for better technical debt management
- Uses [Gemini CLI](https://geminicli.com) for the extension framework

---

<p align="center">
 By <a href="https://github.com/arunkg">Arun Kumar G</a>
</p>
