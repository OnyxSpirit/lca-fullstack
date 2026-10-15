import { HttpError } from "../../shared/http-error.js";

export function assertRemunerationDecisionSeparation(actorId: unknown, preparedBy: unknown, submittedBy: unknown) {
  const actor = String(actorId ?? "");
  if (actor === String(preparedBy ?? "") || actor === String(submittedBy ?? ""))
    throw new HttpError(403, "Auto-validation interdite");
}
