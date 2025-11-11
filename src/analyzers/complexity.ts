/**
 * Complexity Analysis Module
 * Calculates cyclomatic and cognitive complexity for code quality assessment
 */

export interface ComplexityMetrics {
    cyclomatic: number;
    cognitive: number;
    functions: number;
    avgComplexityPerFunction: number;
}

/**
 * Calculate cyclomatic complexity (McCabe complexity)
 * Counts the number of linearly independent paths through code
 */
export function calculateCyclomaticComplexity(content: string, fileExtension: string): number {
    let complexity = 1; // Base complexity
    
    // Control flow keywords that increase complexity
    const patterns = {
        js: /\b(if|else if|for|while|case|catch|&&|\|\||\\?(?!\.))/g,
        ts: /\b(if|else if|for|while|case|catch|&&|\|\||\\?(?!\.))/g,
        py: /\b(if|elif|for|while|except|and|or)\b/g,
        java: /\b(if|else if|for|while|case|catch|&&|\|\||\\?(?!\.))/g,
        go: /\b(if|else if|for|case|&&|\|\|)/g,
        rs: /\b(if|else if|for|while|match|&&|\|\|)/g
    };
    
    const pattern = patterns[fileExtension as keyof typeof patterns] || patterns.js;
    const matches = content.match(pattern);
    
    if (matches) {
        complexity += matches.length;
    }
    
    return complexity;
}

/**
 * Calculate cognitive complexity
 * Measures how difficult code is to understand (not just paths)
 */
export function calculateCognitiveComplexity(content: string, fileExtension: string): number {
    let complexity = 0;
    let nestingLevel = 0;
    const lines = content.split('\n');
    
    const incrementors = {
        js: ['if', 'else if', 'for', 'while', 'case', 'catch', '&&', '||', '?'],
        ts: ['if', 'else if', 'for', 'while', 'case', 'catch', '&&', '||', '?'],
        py: ['if', 'elif', 'for', 'while', 'except', 'and', 'or'],
        java: ['if', 'else if', 'for', 'while', 'case', 'catch', '&&', '||', '?'],
        go: ['if', 'else if', 'for', 'case', '&&', '||'],
        rs: ['if', 'else if', 'for', 'while', 'match', '&&', '||']
    };
    
    const keywords = incrementors[fileExtension as keyof typeof incrementors] || incrementors.js;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Detect nesting level changes
        if (trimmed.includes('{')) nestingLevel++;
        if (trimmed.includes('}')) nestingLevel = Math.max(0, nestingLevel - 1);
        
        // Check for complexity incrementors
        for (const keyword of keywords) {
            if (trimmed.includes(keyword)) {
                // Add base complexity + nesting penalty
                complexity += 1 + nestingLevel;
                break;
            }
        }
        
        // Recursion adds significant cognitive load
        if (trimmed.match(/\bfunction\s+(\w+)/) && content.includes(trimmed.match(/\bfunction\s+(\w+)/)?.[1] || '')) {
            complexity += 1;
        }
    }
    
    return complexity;
}

/**
 * Count the number of functions in the code
 */
export function countFunctions(content: string, fileExtension: string): number {
    const patterns = {
        js: /\b(function\s+\w+|const\s+\w+\s*=\s*\(.*\)\s*=>|class\s+\w+.*\{[\s\S]*?(\w+\s*\(.*\)\s*\{))/g,
        ts: /\b(function\s+\w+|const\s+\w+\s*=\s*\(.*\)\s*=>|class\s+\w+.*\{[\s\S]*?(\w+\s*\(.*\)\s*\{))/g,
        py: /\bdef\s+\w+\s*\(/g,
        java: /(public|private|protected)?\s*(static)?\s*\w+\s+\w+\s*\(/g,
        go: /\bfunc\s+(\(\w+\s+\*?\w+\)\s*)?\w+\s*\(/g,
        rs: /\bfn\s+\w+\s*\(/g
    };
    
    const pattern = patterns[fileExtension as keyof typeof patterns] || patterns.js;
    const matches = content.match(pattern);
    
    return matches ? matches.length : 0;
}

/**
 * Analyze overall complexity metrics for a file
 */
export function analyzeComplexity(content: string, filePath: string): ComplexityMetrics {
    const ext = filePath.split('.').pop() || 'js';
    const cyclomatic = calculateCyclomaticComplexity(content, ext);
    const cognitive = calculateCognitiveComplexity(content, ext);
    const functions = countFunctions(content, ext);
    
    return {
        cyclomatic,
        cognitive,
        functions,
        avgComplexityPerFunction: functions > 0 ? cyclomatic / functions : 0
    };
}
