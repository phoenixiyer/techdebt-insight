/**
 * Security Vulnerability Detection Module
 * Identifies common security issues and vulnerabilities
 */

export interface SecurityIssue {
    type: string;
    severity: 'blocker' | 'critical' | 'major';
    line?: number;
    message: string;
    cwe?: string; // Common Weakness Enumeration
    effort: number;
}

/**
 * Detect hardcoded secrets and credentials
 */
export function detectHardcodedSecrets(content: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = content.split('\n');
    
    const secretPatterns = [
        { pattern: /(password|passwd|pwd)\s*=\s*['"][^'"]+['"]/i, cwe: 'CWE-798', message: 'Hardcoded password detected' },
        { pattern: /(api[_-]?key|apikey)\s*=\s*['"][^'"]+['"]/i, cwe: 'CWE-798', message: 'Hardcoded API key detected' },
        { pattern: /(secret|token)\s*=\s*['"][^'"]+['"]/i, cwe: 'CWE-798', message: 'Hardcoded secret/token detected' },
        { pattern: /(['"][A-Za-z0-9]{32,}['"])/g, cwe: 'CWE-798', message: 'Potential hardcoded credential detected' }
    ];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { pattern, cwe, message } of secretPatterns) {
            if (pattern.test(line) && !line.includes('process.env') && !line.includes('config.')) {
                issues.push({
                    type: 'hardcoded_secret',
                    severity: 'blocker',
                    line: i + 1,
                    message: `${message}. Use environment variables or secure vaults.`,
                    cwe,
                    effort: 15
                });
                break;
            }
        }
    }
    
    return issues;
}

/**
 * Detect SQL injection vulnerabilities
 */
export function detectSQLInjection(content: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for string concatenation in SQL queries
        if ((line.includes('SELECT') || line.includes('INSERT') || line.includes('UPDATE') || line.includes('DELETE')) &&
            (line.includes('+') || line.includes('${') || line.includes('`'))) {
            issues.push({
                type: 'sql_injection',
                severity: 'blocker',
                line: i + 1,
                message: 'Potential SQL injection vulnerability. Use parameterized queries or ORM.',
                cwe: 'CWE-89',
                effort: 30
            });
        }
    }
    
    return issues;
}

/**
 * Detect XSS vulnerabilities
 */
export function detectXSS(content: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for dangerous HTML injection patterns
        if ((line.includes('innerHTML') || line.includes('outerHTML') || line.includes('document.write')) &&
            (line.includes('+') || line.includes('${') || line.includes('`'))) {
            issues.push({
                type: 'xss_vulnerability',
                severity: 'critical',
                line: i + 1,
                message: 'Potential XSS vulnerability. Sanitize user input before rendering.',
                cwe: 'CWE-79',
                effort: 25
            });
        }
    }
    
    return issues;
}

/**
 * Detect insecure random number generation
 */
export function detectInsecureRandom(content: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Math.random()') && 
            (line.includes('token') || line.includes('key') || line.includes('password') || line.includes('secret'))) {
            issues.push({
                type: 'insecure_random',
                severity: 'critical',
                line: i + 1,
                message: 'Math.random() is not cryptographically secure. Use crypto.randomBytes() instead.',
                cwe: 'CWE-338',
                effort: 10
            });
        }
    }
    
    return issues;
}

/**
 * Detect eval usage
 */
export function detectEvalUsage(content: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/\beval\s*\(/)) {
            issues.push({
                type: 'eval_usage',
                severity: 'critical',
                line: i + 1,
                message: 'eval() usage detected. This can lead to code injection vulnerabilities.',
                cwe: 'CWE-95',
                effort: 20
            });
        }
    }
    
    return issues;
}

/**
 * Detect insecure dependencies
 */
export function detectInsecureDependencies(content: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    // Check for known vulnerable patterns
    const vulnerablePatterns = [
        { pattern: /require\(['"]child_process['"]\)/, message: 'child_process usage can be dangerous if not properly sanitized' },
        { pattern: /require\(['"]fs['"]\)/, message: 'File system access should be carefully controlled' },
        { pattern: /exec\(|spawn\(/, message: 'Command execution can lead to command injection if not sanitized' }
    ];
    
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { pattern, message } of vulnerablePatterns) {
            if (pattern.test(line)) {
                issues.push({
                    type: 'insecure_dependency',
                    severity: 'major',
                    line: i + 1,
                    message,
                    cwe: 'CWE-78',
                    effort: 20
                });
                break;
            }
        }
    }
    
    return issues;
}

/**
 * Analyze all security issues in a file
 */
export function analyzeSecurityIssues(content: string): SecurityIssue[] {
    return [
        ...detectHardcodedSecrets(content),
        ...detectSQLInjection(content),
        ...detectXSS(content),
        ...detectInsecureRandom(content),
        ...detectEvalUsage(content),
        ...detectInsecureDependencies(content)
    ];
}
