import { revalidateTag } from "next/cache";

/** Expire learner-visible server data after a committed mutation. */
export function invalidateLearnerData() {
  revalidateTag("learner-data", { expire: 0 });
  revalidateTag("admin-reports", "max");
  revalidateTag("instructor-data", "max");
}
