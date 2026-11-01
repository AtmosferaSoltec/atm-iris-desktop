import type { ChurchSettings, ProjectionSettings, Settings } from "@shared/domain/models";
import { parseInput } from "@shared/errors";
import { churchSchema, projectionSchema } from "@shared/schemas/settings";
import type { SettingsRepository } from "../repositories/types";

export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}
  get(): Settings {
    return this.repository.get();
  }
  updateChurch(input: unknown): ChurchSettings {
    return this.repository.updateChurch(parseInput(churchSchema, input));
  }
  updateProjection(input: unknown): ProjectionSettings {
    return this.repository.updateProjection(parseInput(projectionSchema, input));
  }
  isOnboardingDone(): boolean {
    return this.repository.getPreference("onboarding.completed", false);
  }
  completeOnboarding(): void {
    this.repository.setPreference("onboarding.completed", true);
  }
}
