// Profile controllers: use these with useApi (e.g. useApi(ProfileControllers.get)). Endpoints: docs/frontend-api.md.
import * as profileApi from "@/api/profile";
import { controller } from "./controller";

export const ProfileControllers = {
  get: controller(profileApi.getProfile),
  // Same endpoint, two controllers so each save shows its own success toast.
  saveDetails: controller(profileApi.updateProfile, { successMessage: "Your information has been saved." }),
  saveConsents: controller(profileApi.updateProfile, { successMessage: "Consent preferences saved." }),
};
