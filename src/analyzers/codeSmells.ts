/**
 * Code Smells Detection Module
 * Identifies common code quality issues and anti-patterns
 */

export interface CodeSmell {
    type: string;
    severity: 'blocker' | 'critical' | 'major' | 'minor' | 'info';
    line?: number;
    message: string;
    effort: number; // minutes to fix
}

/**
 * Detect long methods/functions (> 50 lines)
 */
export function detectLongMethods(content: string, filePath: string): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const lines = content.split('\n');
    const ext = filePath.split('.').pop() || 'js';
    
    let inFunction = false;
    let functionStart = 0;
    let braceCount = 0;
    let functionName = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect function start
        if (!inFunction && (line.match(/function\s+(\w+)/) || line.match(/def\s+(\w+)/) || line.match(/fn\s+(\w+)/))) {
            inFunction = true;
            functionStart = i;
            functionName = line.match(/(?:function|def|fn)\s+(\w+)/)?.[1] || 'anonymous';
            braceCount = 0;
        }
        
        if (inFunction) {
            if (line.includes('{')) braceCount++;
            if (line.includes('}')) braceCount--;
            
            if (braceCount === 0 && i > functionStart) {
                const functionLength = i - functionStart;
                if (functionLength > 50) {
                    smells.push({
                        type: 'long_method',
                        severity: functionLength > 100 ? 'critical' : 'major',
                        line: functionStart + 1,
                        message: `Function '${functionName}' is ${functionLength} lines long (recommended: < 50 lines)`,
                        effort: Math.ceil(functionLength / 10) * 15 // 15 min per 10 lines to refactor
                    });
                }
                inFunction = false;
            }
        }
    }
    
    return smells;
}

/**
 * Detect god classes/files (> 500 lines)
 */
export function detectGodClasses(content: string, filePath: string): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const fileName = filePath.split('/').pop() || 'unknown';
    
    if (lines.length > 500) {
        smells.push({
            type: 'god_class',
            severity: lines.length > 1000 ? 'blocker' : 'critical',
            message: `File '${fileName}' has ${lines.length} lines (recommended: < 500 lines). Consider splitting into smaller modules.`,
            effort: Math.ceil(lines.length / 100) * 60 // 1 hour per 100 lines to refactor
        });
    }
    
    return smells;
}

/**
 * Detect magic numbers (hardcoded values)
 */
export function detectMagicNumbers(content: string): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for numeric literals that aren't 0, 1, -1, or in variable declarations
        const magicNumberPattern = /(?<!const|let|var|=\s*)[^a-zA-Z0-9_]([2-9]|[1-9]\d+)(?![a-zA-Z0-9_])/g;
        const matches = line.match(magicNumberPattern);
        
        if (matches && !line.includes('//') && !line.trim().startsWith('*')) {
            smells.push({
                type: 'magic_number',
                severity: 'minor',
                line: i + 1,
                message: `Magic number detected. Consider using named constants for better readability.`,
                effort: 5
            });
        }
    }
    
    return smells.slice(0, 10); // Limit to top 10
}

/**
 * Detect deep nesting (> 4 levels)
 */
export function detectDeepNesting(content: string): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const lines = content.split('\n');
    let nestingLevel = 0;
    let maxNesting = 0;
    let maxNestingLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        
        nestingLevel += openBraces - closeBraces;
        
        if (nestingLevel > maxNesting) {
            maxNesting = nestingLevel;
            maxNestingLine = i + 1;
        }
    }
    
    if (maxNesting > 4) {
        smells.push({
            type: 'deep_nesting',
            severity: maxNesting > 6 ? 'major' : 'minor',
            line: maxNestingLine,
            message: `Deep nesting detected (${maxNesting} levels). Consider extracting methods or using early returns.`,
            effort: maxNesting * 10
        });
    }
    
    return smells;
}

/**
 * Detect commented code (potential dead code)
 */
export function detectCommentedCode(content: string): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const lines = content.split('\n');
    let commentedCodeLines = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Check if line is commented and contains code-like patterns
        if ((line.startsWith('//') || line.startsWith('#')) && 
            (line.includes('=') || line.includes('(') || line.includes('{'))) {
            commentedCodeLines++;
        }
    }
    
    if (commentedCodeLines > 10) {
        smells.push({
            type: 'commented_code',
            severity: 'minor',
            message: `${commentedCodeLines} lines of commented code detected. Remove dead code or use version control.`,
            effort: commentedCodeLines * 2
        });
    }
    
    return smells;
}

/**
 * Detect duplicate code blocks
 */
export function detectDuplication(content: string): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const lines = content.split('\n');
    const blockSize = 6; // Minimum lines to consider as duplicate
    const blocks = new Map<string, number[]>();
    
    for (let i = 0; i <= lines.length - blockSize; i++) {
        const block = lines.slice(i, i + blockSize)
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .join('\n');
        
        if (block.length > 50) { // Ignore very small blocks
            if (blocks.has(block)) {
                blocks.get(block)!.push(i);
            } else {
                blocks.set(block, [i]);
            }
        }
    }
    
    let duplicateBlocks = 0;
    blocks.forEach((occurrences, block) => {
        if (occurrences.length > 1) {
            duplicateBlocks++;
        }
    });
    
    if (duplicateBlocks > 0) {
        smells.push({
            type: 'code_duplication',
            severity: duplicateBlocks > 5 ? 'major' : 'minor',
            message: `${duplicateBlocks} duplicate code blocks detected. Consider extracting common functionality.`,
            effort: duplicateBlocks * 30
        });
    }
    
    return smells;
}

/**
 * Detect missing error handling
 */
export function detectMissingErrorHandling(content: string): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const lines = content.split('\n');
    
    let hasAsyncCalls = false;
    let hasTryCatch = false;
    let hasErrorHandling = false;
    
    for (const line of lines) {
        if (line.includes('async') || line.includes('await') || line.includes('Promise') || 
            line.includes('fetch') || line.includes('axios')) {
            hasAsyncCalls = true;
        }
        if (line.includes('try') || line.includes('catch')) {
            hasTryCatch = true;
        }
        if (line.includes('.catch(') || line.includes('.then(')) {
            hasErrorHandling = true;
        }
    }
    
    if (hasAsyncCalls && !hasTryCatch && !hasErrorHandling) {
        smells.push({
            type: 'missing_error_handling',
            severity: 'major',
            message: 'Async operations detected without proper error handling. Add try-catch or .catch() handlers.',
            effort: 20
        });
    }
    
    return smells;
}

/**
 * Analyze all code smells in a file
 */
export function analyzeCodeSmells(content: string, filePath: string): CodeSmell[] {
    return [
        ...detectLongMethods(content, filePath),
        ...detectGodClasses(content, filePath),
        ...detectMagicNumbers(content),
        ...detectDeepNesting(content),
        ...detectCommentedCode(content),
        ...detectDuplication(content),
        ...detectMissingErrorHandling(content)
    ];
}
