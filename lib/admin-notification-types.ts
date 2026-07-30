export type NotificationAudienceValue =
  | "ALL_ACTIVE_STUDENTS"
  | "COURSE_STUDENTS"
  | "ASSESSMENT_PENDING_STUDENTS"
  | "ALL_ACTIVE_INSTRUCTORS"
  | "COURSE_INSTRUCTORS"
  | "SPECIFIC_INSTRUCTOR";

export type NotificationTypeValue = "INFO" | "WARNING" | "SUCCESS" | "ERROR";

export interface NotificationAudienceOption {
  id: string;
  label: string;
  learnerCount: number;
  instructorCount?: number;
  courseTitle?: string;
  email?: string;
}

export interface NotificationCampaignListItem {
  id: string;
  subject: string;
  message: string;
  type: NotificationTypeValue;
  audienceType: NotificationAudienceValue;
  audienceLabel: string;
  actionUrl: string | null;
  recipientCount: number;
  readCount: number;
  unreadCount: number;
  readRate: number;
  sentAt: string;
  createdBy: string;
}

export interface AdminNotificationData {
  campaigns: NotificationCampaignListItem[];
  audiences: {
    allActiveStudents: number;
    allActiveInstructors: number;
    courses: NotificationAudienceOption[];
    assessments: NotificationAudienceOption[];
    instructors: NotificationAudienceOption[];
  };
  totals: {
    campaigns: number;
    delivered: number;
    read: number;
    unread: number;
  };
}

export interface CreateNotificationCampaignInput {
  subject: string;
  message: string;
  type: NotificationTypeValue;
  audienceType: NotificationAudienceValue;
  courseId?: string;
  assessmentId?: string;
  instructorId?: string;
  actionUrl?: string;
}
