#!/usr/bin/env node
// state-agent CLI entry point
// Can run standalone or be invoked as a Claude Code skill
import { analyzeApp } from './analyzer/index.js';
import { designState } from './designer/index.js';
import { generateCode } from './generator/index.js';
function parseArgs(argv) {
    const args = argv.slice(2);
    const command = args[0] || 'help';
    const verbose = args.includes('--verbose') || args.includes('-v');
    const filteredArgs = args.slice(1).filter(a => a !== '--verbose' && a !== '-v');
    return {
        command,
        args: filteredArgs,
        cwd: process.cwd(),
        verbose,
    };
}
async function main() {
    const opts = parseArgs(process.argv);
    switch (opts.command) {
        case 'init': {
            console.log('Analyzing your application...\n');
            const analysis = await analyzeApp(opts.cwd, opts.verbose);
            console.log('Designing state architecture...\n');
            const design = await designState(analysis);
            console.log('Generating code...\n');
            const files = await generateCode(design, opts.cwd);
            console.log(`\nCreated ${files.length} files:`);
            for (const file of files) {
                console.log(`  ${file}`);
            }
            break;
        }
        case 'add': {
            const feature = opts.args.join(' ');
            if (!feature) {
                console.error('Usage: state-agent add "feature description"');
                process.exit(1);
            }
            console.log(`Adding state for: ${feature}\n`);
            const analysis = await analyzeApp(opts.cwd, opts.verbose);
            const design = await designState(analysis, feature);
            const files = await generateCode(design, opts.cwd);
            console.log(`\nCreated/updated ${files.length} files:`);
            for (const file of files) {
                console.log(`  ${file}`);
            }
            break;
        }
        case 'why': {
            const storeName = opts.args[0];
            if (!storeName) {
                console.error('Usage: state-agent why "storeName"');
                process.exit(1);
            }
            const analysis = await analyzeApp(opts.cwd, opts.verbose);
            console.log(`\nExplaining design for "${storeName}" store...\n`);
            // Agent explains its reasoning — uses LLM to describe the design choices
            console.log('(LLM explanation would be generated here)');
            break;
        }
        case 'refactor': {
            console.log('Analyzing current state architecture...\n');
            const analysis = await analyzeApp(opts.cwd, opts.verbose);
            console.log('Looking for optimization opportunities...\n');
            // Agent analyzes current state usage and suggests improvements
            console.log('(Refactoring suggestions would be generated here)');
            break;
        }
        case 'types': {
            console.log('Regenerating TypeScript types...\n');
            const analysis = await analyzeApp(opts.cwd, opts.verbose);
            const design = await designState(analysis);
            const files = await generateCode(design, opts.cwd, { typesOnly: true });
            console.log(`\nUpdated ${files.length} type files:`);
            for (const file of files) {
                console.log(`  ${file}`);
            }
            break;
        }
        case 'help':
        default: {
            console.log(`
state-agent — AI agent that designs and manages app state

Commands:
  init                        Analyze app and create initial state design
  add "feature description"   Add state for a new feature
  why "storeName"             Explain why state was designed this way
  refactor                    Optimize existing state based on usage
  types                       Regenerate TypeScript types

Options:
  --verbose, -v               Show detailed output

Examples:
  state-agent init
  state-agent add "shopping cart with checkout flow"
  state-agent why "cart"
  state-agent refactor
`);
            break;
        }
    }
}
main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map