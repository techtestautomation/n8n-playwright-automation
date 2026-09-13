import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type { LocatorRegistry } from '../application/locator-registry.js';

export class JsonLocatorRegistry implements LocatorRegistry {
  private readonly locators = new Map<string, string>();

  constructor(directory = './locators') {
    const files = readdirSync(directory).filter((file) =>
      file.endsWith('.json'),
    );

    for (const file of files) {
      const page = path.basename(file, '.json');

      const filePath = path.join(directory, file);
      const contents = readFileSync(filePath, 'utf8');

      const entries = JSON.parse(contents) as Record<string, unknown>;

      for (const [name, locator] of Object.entries(entries)) {
        if (typeof locator !== 'string' || locator.trim() === '') {
          throw new Error(
            `Invalid locator "${page}.${name}" in ${file}`,
          );
        }

        this.locators.set(`${page}.${name}`, locator);
      }
    }
  }

  resolve(reference: string): string {
    const locator = this.locators.get(reference);

    if (!locator) {
      throw new Error(`Unknown locator reference: ${reference}`);
    }

    return locator;
  }
}