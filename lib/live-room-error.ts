/**
 * Deliberately dependency-free (no Prisma/auth imports) so pure logic and
 * tests can import just the error type without pulling in the DB client or
 * NextAuth config module-load side effects.
 */
export class LiveRoomError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "LiveRoomError";
    this.status = status;
  }
}
