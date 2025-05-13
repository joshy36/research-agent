#!/usr/bin/env node
/* concat-project.js
 *
 * Concatenate every non-ignored, non-binary file in the repo into one big
 * text file for LLM ingestion.
 *
 * Usage:
 *   node concat-project.js             # → combined_project.txt
 *   node concat-project.js mydump.txt  # → mydump.txt
 *
 * Requires: Git in PATH, Node ≥ 14 (no external npm deps).
 */

import { execSync } from 'node:child_process';
import { readFileSync, createReadStream, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = process.argv[2] ? join(__dirname, process.argv[2])
    : join(__dirname, 'combined_project.txt');

const CHUNK = 64 * 1024;       // 64 KiB read buffer
const MAX_BYTES = 2 * 1024 ** 2;   // skip files > 2 MiB

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Return every path Git considers NOT ignored (.gitignore + global rules). */
function gitLsFiles() {
    const out = execSync(
        'git ls-files --others --cached --exclude-standard -z',
        { encoding: 'utf8', cwd: __dirname }
    );
    return out.split('\0').filter(Boolean);
}

/** Very cheap binary detector: NUL byte in first 8 KB → treat as binary. */
function isBinary(absPath) {
    const buf = readFileSync(absPath, { encoding: null, length: 8192 });
    return buf.includes(0);           // 0x00 byte
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

(async function main() {
    let files;
    try {
        files = gitLsFiles();
    } catch {
        console.error('❌  Not a Git repo (or git not found).');
        process.exit(1);
    }

    if (!files.length) {
        console.error('ℹ️  Nothing to concatenate – Git found no non-ignored files.');
        return;
    }

    console.log(`⚙️  Concatenating ${files.length} files → ${OUTPUT}`);
    const out = [];
    out.push(`# Combined project dump`);
    out.push(`# Generated ${new Date().toISOString()}`);
    out.push(`# Root: ${__dirname}`);
    out.push(`# Files included: ${files.length}`);
    out.push(`# NOTE: binary files and files > ${MAX_BYTES} B are skipped.\n`);

    for (const rel of files) {
        const abs = join(__dirname, rel);
        const size = statSync(abs).size;

        if (size > MAX_BYTES || isBinary(abs) || rel.endsWith('package-lock.json')) {
            console.error(`  • Skipping binary/large file ${rel}`);
            continue;
        }

        out.push(`\n\n## >>> ${rel} <<<`);
        out.push('```text');

        const fd = createReadStream(abs, { encoding: 'utf8' });
        let chunk;
        while (null !== (chunk = fd.read(CHUNK))) {
            out.push(chunk);
        }
        // readStream with .read() needs manual 'readable' sync:
        fd.on('readable', () => {
            while (null !== (chunk = fd.read(CHUNK))) {
                out.push(chunk);
            }
        });
        await new Promise(res => fd.on('end', res));
        out.push('```');
    }

    writeFileSync(OUTPUT, out.join('\n'), 'utf8');
    console.log('✅  Done!');
})();
