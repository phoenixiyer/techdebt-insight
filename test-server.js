#!/usr/bin/env node

// Simple test to verify the MCP server starts correctly
import { spawn } from 'child_process';

console.log('Testing MCP Server startup...\n');

const server = spawn('node', ['dist/example.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
    output += data.toString();
});

server.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.log('Server output:', data.toString());
});

server.on('error', (error) => {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
});

// Give the server 2 seconds to start
setTimeout(() => {
    if (errorOutput.includes('Tech Debt Insight MCP Server started successfully')) {
        console.log('\n✅ Server started successfully!');
        console.log('✅ MCP tools are ready to use');
        console.log('\nNext steps:');
        console.log('1. Run: gemini extensions uninstall techdebt-insight (if already installed)');
        console.log('2. Run: gemini extensions link .');
        console.log('3. Run: gemini');
        console.log('4. Type: /mcp');
        console.log('5. Verify nodeServer shows as connected (🟢)');
    } else {
        console.log('\n⚠️  Server may not have started correctly');
        console.log('Error output:', errorOutput);
    }
    
    server.kill();
    process.exit(0);
}, 2000);
