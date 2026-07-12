import { prisma } from "@/lib/prisma";
import type { AdminRecordingSummary } from "@/lib/admin-recording-types";
import { Prisma } from "@/lib/generated/prisma/client";

const recordingInclude = {
  liveClass: {
    select: {
      id: true,
      title: true,
      courseId: true,
      subjectName: true,
      batchName: true,
      course: { select: { title: true } },
      instructor: { select: { id: true, name: true, email: true } },
    },
  },
  attendances: { select: { id: true } },
} satisfies Prisma.LiveClassSessionInclude;

type RecordingRow = Prisma.LiveClassSessionGetPayload<{
  include: typeof recordingInclude;
}>;

function serializeRecording(session: RecordingRow): AdminRecordingSummary {
  return {
    id: session.id,
    liveClassId: session.liveClassId,
    classTitle: session.liveClass.title,
    courseId: session.liveClass.courseId,
    courseTitle: session.liveClass.course.title,
    subjectName: session.liveClass.subjectName,
    batchName: session.liveClass.batchName,
    instructor: session.liveClass.instructor,
    scheduledStart: session.scheduledStart.toISOString(),
    scheduledEnd: session.scheduledEnd.toISOString(),
    status: session.status,
    recordingUrl: session.recordingUrl ?? "",
    recordingSizeMb: session.recordingSizeMb,
    attendeeCount: session.attendances.length,
    createdAt: session.scheduledStart.toISOString(),
  };
}

export async function listInstructorRecordings(instructorId: string) {
  const sessions = await prisma.liveClassSession.findMany({
    where: {
      recordingUrl: { not: null },
      liveClass: { instructorId },
    },
    include: recordingInclude,
    orderBy: { scheduledStart: "desc" },
  });

  return sessions.map(serializeRecording);
}
