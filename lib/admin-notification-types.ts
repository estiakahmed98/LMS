export type NotificationAudienceValue =
  | "ALL_ACTIVE_STUDENTS"
  | "COURSE_STUDENTS"
  | "ASSESSMENT_PENDING_STUDENTS";

export type NotificationTypeValue = "INFO" | "WARNING" | "SUCCESS" | "ERROR";

export interface NotificationAudienceOption {
  id: string;
  label: string;
  learnerCount: number;
  courseTitle?: string;
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
    courses: NotificationAudienceOption[];
    assessments: NotificationAudienceOption[];
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
  actionUrl?: string;
}
