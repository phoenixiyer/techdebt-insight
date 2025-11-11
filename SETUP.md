# Tech Debt Insight - Setup & Testing Guide

## ✅ Project Status

Your Tech Debt Insight extension is **fully working** and ready to use!

## 🎯 What's Been Fixed

1. **Import Issues**: Updated to use the correct MCP SDK imports from `@modelcontextprotocol/sdk/server/mcp.js`
2. **Tool Registration**: Converted from old `Tool` class to new `registerTool()` method
3. **Server Startup**: Implemented proper stdio transport connection
4. **Return Values**: Updated all tools to return proper MCP response format with `content` and `structuredContent`
5. **TypeScript Errors**: Resolved all compilation errors

## 📦 Project Structure

```
techdebt-insight/
├── dist/                      # Compiled JavaScript (generated)
├── commands/
│   └── techdebt/
│       └── scan.toml         # Custom command configuration
├── example.ts                # Main MCP server implementation
├── gemini-extension.json     # Extension manifest
├── GEMINI.md                 # Extension documentation
├── package.json              # Project configuration
├── tsconfig.json             # TypeScript configuration
├── README.md                 # User documentation
├── LICENSE                   # MIT License
├── .gitignore               # Git ignore rules
└── test-server.js           # Server test script
```

## 🚀 Quick Start

### 1. Build the Project
```bash
npm install
npm run build
```

### 2. Test the Server
```bash
node test-server.js
```
Expected output:
```
✅ Server started successfully!
✅ MCP tools are ready to use
```

### 3. Install the Extension
```bash
# Uninstall if already installed
gemini extensions uninstall techdebt-insight

# Link the extension
gemini extensions link .
```

### 4. Verify Installation
```bash
gemini
```
Then type `/mcp` and verify:
- `nodeServer` shows as **connected (🟢)**
- Three tools are available:
  - `scan_repo` - Repository Scanner
  - `dep_audit` - Dependency Auditor
  - `score_and_prioritize` - Issue Prioritizer

## 🔧 Available Tools

### 1. scan_repo
Scans a repository for technical debt indicators.

**Input:**
- `repoPath` (string): Path to the repository
- `includeGlobs` (array, optional): File patterns to include
- `maxLongFileLines` (number, optional): Threshold for long files

**Output:**
- List of issues (long files, high complexity, TODOs/FIXMEs, missing tests)
- Statistics (files scanned, issues found, test coverage)

### 2. dep_audit
Audits project dependencies for outdated or vulnerable packages.

**Input:**
- `repoPath` (string): Path to the repository

**Output:**
- npm outdated packages
- pip vulnerable packages (if pip-audit is installed)
- Warnings for any issues

### 3. score_and_prioritize
Scores and prioritizes technical debt issues.

**Input:**
- `scanJson` (string): JSON from scan_repo
- `auditJson` (string): JSON from dep_audit

**Output:**
- Top 10 prioritized issues
- Full backlog
- Statistics by impact and effort

## 🧪 Testing

### Manual Test
```bash
# Start the server manually
node dist/example.js
```
You should see: `Tech Debt Insight MCP Server started successfully`

### Test with Gemini CLI
```bash
gemini
```
Then try:
```
/mcp
```
Verify the server is connected.

## 🐛 Troubleshooting

### Server Shows as Disconnected (🔴)
1. Check if the build is up to date:
   ```bash
   npm run build
   ```

2. Verify the extension path in `gemini-extension.json`:
   ```json
   "args": ["${extensionPath}/dist/example.js"]
   ```

3. Check for errors:
   ```bash
   node dist/example.js
   ```

### Import Errors
If you see module not found errors:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### TypeScript Errors
Make sure your `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

## 📝 Usage Examples

### Example 1: Scan Current Directory
```bash
gemini
```
Then in Gemini:
```
Use the scan_repo tool to analyze the current directory for technical debt
```

### Example 2: Full Analysis
```bash
gemini
```
Then in Gemini:
```
1. Use scan_repo on /path/to/project
2. Use dep_audit on /path/to/project
3. Use score_and_prioritize with both results
4. Generate a summary report
```

## 🌐 Publishing to GitHub

### 1. Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit: Tech Debt Insight extension"
```

### 2. Create GitHub Repository
1. Go to https://github.com/new
2. Create repository: `techdebt-insight`
3. Don't initialize with README (you already have one)

### 3. Push to GitHub
```bash
git remote add origin https://github.com/arunkg/techdebt-insight.git
git branch -M main
git push -u origin main
```

### 4. Create a Release
1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Tag: `v0.1.0`
4. Title: `Tech Debt Insight v0.1.0`
5. Description: Copy from README.md
6. Publish release

## 📦 Installation from GitHub

Users can install directly from GitHub:
```bash
git clone https://github.com/arunkg/techdebt-insight.git
cd techdebt-insight
npm install
npm run build
gemini extensions link .
```

## 🎉 Success Checklist

- [x] TypeScript compiles without errors
- [x] Server starts successfully
- [x] All three tools are registered
- [x] MCP server connects via stdio
- [x] Extension manifest is configured
- [x] Documentation is complete
- [x] Test script works
- [x] Ready for GitHub publication

## 🔗 Useful Links

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Gemini CLI Extensions](https://geminicli.com/docs/extensions/getting-started-extensions/)
- [Your Repository](https://github.com/arunkg/techdebt-insight)

## 💡 Next Steps

1. **Test thoroughly**: Try the extension on different projects
2. **Add features**: Consider adding more analysis tools
3. **Improve reports**: Enhance the output formatting
4. **Add tests**: Create unit tests for the tools
5. **Documentation**: Add more usage examples
6. **Community**: Share with others and gather feedback

---

**Created by Arun Kumar G** | [GitHub](https://github.com/arunkg)
