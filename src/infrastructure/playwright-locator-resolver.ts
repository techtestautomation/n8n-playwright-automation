import type { LocatorRegistry } from "../application/locator-registry.js";

export class PlaywrightLocatorResolver {
  constructor(private readonly locatorRegistry: LocatorRegistry) {}

  resolve(target: { locator?: string; locatorRef?: string }): string {
    if (target.locator) {
      return target.locator;
    }

    if (target.locatorRef) {
      return this.locatorRegistry.resolve(target.locatorRef);
    }

    throw new Error("Locator is missing");
  }
}
