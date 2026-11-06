#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { Command } from 'commander';
import {
  buildZip,
  generatePlan,
  validateOutput,
  validateSpec,
  type GeneratedFile,
  type ValidationIssue,
} from '../core/index';
import { formatIssues, validateSpecFile } from './validate';

const program = new Command();

program
  .name('psplugin')
  .description('PowerSchool plugin workbench')
  .version('0.1.0');

program
  .command('validate')
  .description('Validate a plugin.json spec')
  .argument('<spec>', 'path to plugin.json')
  .option('--previous <file>', 'previous navigation JSON for version checks')
  .option('--json', 'print issues as JSON')
  .action(
    async (
      specPath: string,
      options: { previous?: string; json?: boolean },
    ) => {
      const result = await validateSpecFile(specPath, options.previous);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatIssues(result.issues));
        console.log(
          `\n${result.errors} error(s), ${result.warnings} warning(s).`,
        );
      }
      if (result.errors > 0) process.exitCode = 1;
    },
  );

function assertInside(root: string, path: string): void {
  const resolvedRoot = resolve(root);
  const resolved = resolve(path);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`Refusing to write outside output directory: ${path}`);
  }
}

function printIssues(issues: ValidationIssue[]): void {
  console.log(formatIssues(issues));
}

async function writeFiles(outDir: string, files: GeneratedFile[]): Promise<void> {
  for (const file of files) {
    const target = resolve(outDir, file.path);
    assertInside(outDir, target);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
}

program
  .command('generate')
  .description('Validate, generate and optionally zip a plugin')
  .argument('<spec>', 'path to plugin.json')
  .option('--out <dir>', 'output directory', 'build')
  .option('--zip', 'also write api.zip, dbsetup.zip and combined.zip', false)
  .action(
    async (specPath: string, options: { out: string; zip: boolean }) => {
      const spec = JSON.parse(await readFile(specPath, 'utf8'));
      const specIssues = validateSpec(spec);
      const specErrors = specIssues.filter((issue) => issue.severity === 'error');
      if (specErrors.length) {
        printIssues(specIssues);
        console.error(`\n${specErrors.length} validation error(s); nothing written.`);
        process.exitCode = 1;
        return;
      }

      const rawFiles = new Map<string, Uint8Array>();
      for (const raw of spec.rawFiles ?? []) {
        try {
          rawFiles.set(
            raw.path,
            await readFile(resolve(dirname(specPath), raw.path)),
          );
        } catch {
          // generatePlan will report the missing raw content.
        }
      }

      const files = generatePlan(spec, { rawFiles });
      const zips = options.zip
        ? {
            api: buildZip(files, 'api'),
            dbsetup: buildZip(files, 'dbsetup'),
            combined: buildZip(files, 'combined'),
          }
        : undefined;
      const outputIssues = validateOutput(files, { zip: zips?.combined });
      const outputErrors = outputIssues.filter(
        (issue) => issue.severity === 'error',
      );
      if (outputErrors.length) {
        printIssues(outputIssues);
        console.error(`\n${outputErrors.length} output error(s); nothing written.`);
        process.exitCode = 1;
        return;
      }

      await writeFiles(options.out, files);

      if (zips) {
        for (const artifact of ['api', 'dbsetup', 'combined'] as const) {
          await writeFile(resolve(options.out, `${artifact}.zip`), zips[artifact]);
        }
      }

      console.log(
        `Generated ${files.length} file(s) into ${relative(process.cwd(), resolve(options.out)) || '.'}.`,
      );
      if (options.zip) console.log('Wrote api.zip, dbsetup.zip, combined.zip.');
    },
  );

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
