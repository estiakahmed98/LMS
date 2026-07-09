import { getCurrentUserServer } from "@/lib/auth-server";
import type { User } from "@/lib/mock-data";

export class LearnerAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "LearnerAuthError";
    this.status = status;
  }
}

export async function requireLearner(pathname = "/courses"): Promise<User> {
  const currentUser = await getCurrentUserServer(pathname);

  if (!currentUser?.id) {
    throw new LearnerAuthError("You must be signed in.", 401);
  }

  return currentUser;
}
