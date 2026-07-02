// Mock data for PSTC LMS - No backend/database required
// This mirrors the Prisma schema structure for reference

export type Role =
  | "SUPER_ADMIN"
  | "COURSE_MANAGER"
  | "EXAMINER"
  | "REPORT_VIEWER"
  | "STUDENT";
export type Status =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "ACTIVE"
  | "INACTIVE";
export type EnrollmentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";
export type AssessmentType = "MCQ" | "WRITTEN" | "PRACTICAL" | "MIXED";
export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "GRADING"
  | "GRADED"
  | "REVIEWED";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: Status;
  createdAt: Date;
  lastActive?: Date;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  duration: number; // in hours
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  createdAt: Date;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
  type: "VIDEO" | "READING" | "QUIZ" | "PRACTICE";
  duration: number; // minutes
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  progress: number; // 0-100
  enrolledAt: Date;
  completedAt?: Date;
}

export interface Assessment {
  id: string;
  courseId: string;
  title: string;
  type: AssessmentType;
  totalMarks: number;
  passingMarks: number;
  createdAt: Date;
}

export interface Question {
  id: string;
  assessmentId: string;
  type: "MCQ" | "WRITTEN" | "PRACTICAL";
  question: string;
  marks: number;
  options?: string[];
  correctAnswer?: string;
  rubric?: string;
}

export interface Submission {
  id: string;
  assessmentId: string;
  userId: string;
  status: SubmissionStatus;
  obtainedMarks?: number;
  submittedAt?: Date;
  gradedAt?: Date;
  answerSheetUrls?: string[];
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  issueDate: Date;
  certificateNumber: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
  readAt?: Date;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: Record<string, unknown>;
  createdAt: Date;
}

// ============= MOCK DATA INSTANCES =============

export const mockUsers: User[] = [
  {
    id: "user_1",
    name: "Fahim Ahmed",
    email: "fahim@example.com",
    phone: "+880 1711234567",
    role: "STUDENT",
    status: "ACTIVE",
    createdAt: new Date("2026-01-15"),
    lastActive: new Date(),
  },
  {
    id: "user_2",
    name: "Nusrat Jahan",
    email: "nusrat@example.com",
    phone: "+880 1811234567",
    role: "STUDENT",
    status: "ACTIVE",
    createdAt: new Date("2026-02-10"),
    lastActive: new Date(Date.now() - 3600000),
  },
  {
    id: "user_3",
    name: "Karim Hassan",
    email: "karim@example.com",
    phone: "+880 1911234567",
    role: "STUDENT",
    status: "PENDING",
    createdAt: new Date("2026-02-20"),
  },
  {
    id: "user_4",
    name: "Aisha Rahman",
    email: "aisha@example.com",
    phone: "+880 1711234568",
    role: "STUDENT",
    status: "ACTIVE",
    createdAt: new Date("2026-01-20"),
    lastActive: new Date(Date.now() - 86400000),
  },
  {
    id: "user_5",
    name: "Ravi Kumar",
    email: "ravi@example.com",
    phone: "+880 1811234568",
    role: "STUDENT",
    status: "ACTIVE",
    createdAt: new Date("2026-02-05"),
    lastActive: new Date(Date.now() - 172800000),
  },
  {
    id: "user_6",
    name: "Dina Begum",
    email: "dina@example.com",
    phone: "+880 1911234568",
    role: "STUDENT",
    status: "SUSPENDED",
    createdAt: new Date("2026-01-25"),
  },
  {
    id: "user_7",
    name: "Admin User",
    email: "admin@pstc.edu",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    createdAt: new Date("2023-12-01"),
    lastActive: new Date(),
  },
  {
    id: "user_8",
    name: "Course Manager",
    email: "manager@pstc.edu",
    role: "COURSE_MANAGER",
    status: "ACTIVE",
    createdAt: new Date("2023-12-01"),
    lastActive: new Date(Date.now() - 3600000),
  },
  {
    id: "user_9",
    name: "Examiner One",
    email: "examiner@pstc.edu",
    role: "EXAMINER",
    status: "ACTIVE",
    createdAt: new Date("2023-12-01"),
    lastActive: new Date(Date.now() - 7200000),
  },
  {
    id: "user_10",
    name: "Zahir Islam",
    email: "zahir@example.com",
    phone: "+880 1711234569",
    role: "STUDENT",
    status: "ACTIVE",
    createdAt: new Date("2026-02-25"),
    lastActive: new Date(Date.now() - 259200000),
  },
];

export const mockCourses: Course[] = [
  {
    id: "course_1",
    title: "Community Paramedic Training",
    description:
      "Comprehensive training for community paramedics with hands-on modules and practical assessments.",
    duration: 120,
    level: "INTERMEDIATE",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "course_2",
    title: "HR Recruitment & Assessment",
    description:
      "Master modern recruitment strategies, candidate assessment, and hiring best practices.",
    duration: 60,
    level: "BEGINNER",
    createdAt: new Date("2026-01-05"),
  },
  {
    id: "course_3",
    title: "Advanced Medical Sciences",
    description:
      "Deep dive into advanced medical concepts for healthcare professionals.",
    duration: 180,
    level: "ADVANCED",
    createdAt: new Date("2026-01-10"),
  },
  {
    id: "course_4",
    title: "Professional Development Fundamentals",
    description:
      "Essential skills for career growth and professional development.",
    duration: 40,
    level: "BEGINNER",
    createdAt: new Date("2026-01-15"),
  },
  {
    id: "course_5",
    title: "Digital Marketing Essentials",
    description:
      "Learn digital marketing strategies in the modern business landscape.",
    duration: 80,
    level: "INTERMEDIATE",
    createdAt: new Date("2026-01-20"),
  },
  {
    id: "course_6",
    title: "Basic Life Support (BLS) Certification",
    description:
      "Hands-on certification course covering CPR, choking response, and AED use for healthcare and community responders.",
    duration: 24,
    level: "BEGINNER",
    createdAt: new Date("2026-02-01"),
  },
  {
    id: "course_7",
    title: "Occupational Health & Safety Management",
    description:
      "Learn workplace risk assessment, hazard control, and compliance frameworks for a safer working environment.",
    duration: 50,
    level: "INTERMEDIATE",
    createdAt: new Date("2026-02-05"),
  },
  {
    id: "course_8",
    title: "Data Analysis with Excel & Power BI",
    description:
      "Build practical data analysis and dashboarding skills using Excel and Power BI for business reporting.",
    duration: 45,
    level: "BEGINNER",
    createdAt: new Date("2026-02-08"),
  },
  {
    id: "course_9",
    title: "Leadership & Team Management",
    description:
      "Develop core leadership skills, effective delegation, and team performance management techniques.",
    duration: 35,
    level: "INTERMEDIATE",
    createdAt: new Date("2026-02-12"),
  },
  {
    id: "course_10",
    title: "Advanced Surgical Nursing Techniques",
    description:
      "In-depth training on peri-operative care, sterile technique, and advanced surgical assistance for nursing professionals.",
    duration: 150,
    level: "ADVANCED",
    createdAt: new Date("2026-02-18"),
  },
];

export const mockModules: Module[] = [
  // Course 1: Community Paramedic Training (10 modules)
  {
    id: "mod_1",
    courseId: "course_1",
    title: "Introduction to Community Paramedics",
    order: 1,
    type: "VIDEO",
    duration: 45,
  },
  {
    id: "mod_2",
    courseId: "course_1",
    title: "Emergency Response Protocols",
    order: 2,
    type: "VIDEO",
    duration: 60,
  },
  {
    id: "mod_3",
    courseId: "course_1",
    title: "First Aid Essentials",
    order: 3,
    type: "PRACTICE",
    duration: 90,
  },
  {
    id: "mod_4",
    courseId: "course_1",
    title: "Patient Assessment Techniques",
    order: 4,
    type: "VIDEO",
    duration: 55,
  },
  {
    id: "mod_5",
    courseId: "course_1",
    title: "Medical Emergency Management",
    order: 5,
    type: "READING",
    duration: 40,
  },
  {
    id: "mod_6",
    courseId: "course_1",
    title: "Trauma Care Fundamentals",
    order: 6,
    type: "VIDEO",
    duration: 70,
  },
  {
    id: "mod_7",
    courseId: "course_1",
    title: "Pediatric Emergency Response",
    order: 7,
    type: "PRACTICE",
    duration: 80,
  },
  {
    id: "mod_8",
    courseId: "course_1",
    title: "Geriatric Care Protocols",
    order: 8,
    type: "READING",
    duration: 35,
  },
  {
    id: "mod_9",
    courseId: "course_1",
    title: "Mental Health Crisis Intervention",
    order: 9,
    type: "VIDEO",
    duration: 50,
  },
  {
    id: "mod_10",
    courseId: "course_1",
    title: "Community Health Integration",
    order: 10,
    type: "PRACTICE",
    duration: 75,
  },

  // Course 2: HR Recruitment & Assessment (10 modules)
  {
    id: "mod_11",
    courseId: "course_2",
    title: "Recruitment Fundamentals",
    order: 1,
    type: "READING",
    duration: 30,
  },
  {
    id: "mod_12",
    courseId: "course_2",
    title: "Interview Techniques",
    order: 2,
    type: "VIDEO",
    duration: 45,
  },
  {
    id: "mod_13",
    courseId: "course_2",
    title: "Candidate Assessment Workshop",
    order: 3,
    type: "PRACTICE",
    duration: 60,
  },
  {
    id: "mod_14",
    courseId: "course_2",
    title: "Job Description Writing",
    order: 4,
    type: "READING",
    duration: 25,
  },
  {
    id: "mod_15",
    courseId: "course_2",
    title: "Sourcing Strategies",
    order: 5,
    type: "VIDEO",
    duration: 40,
  },
  {
    id: "mod_16",
    courseId: "course_2",
    title: "Behavioral Interviewing",
    order: 6,
    type: "PRACTICE",
    duration: 55,
  },
  {
    id: "mod_17",
    courseId: "course_2",
    title: "Assessment Center Design",
    order: 7,
    type: "READING",
    duration: 35,
  },
  {
    id: "mod_18",
    courseId: "course_2",
    title: "Background Verification",
    order: 8,
    type: "VIDEO",
    duration: 30,
  },
  {
    id: "mod_19",
    courseId: "course_2",
    title: "Offer Negotiation",
    order: 9,
    type: "PRACTICE",
    duration: 50,
  },
  {
    id: "mod_20",
    courseId: "course_2",
    title: "Onboarding Best Practices",
    order: 10,
    type: "READING",
    duration: 40,
  },

  // Course 3: Advanced Medical Sciences (10 modules)
  {
    id: "mod_21",
    courseId: "course_3",
    title: "Advanced Anatomy & Physiology",
    order: 1,
    type: "VIDEO",
    duration: 90,
  },
  {
    id: "mod_22",
    courseId: "course_3",
    title: "Pathophysiology Fundamentals",
    order: 2,
    type: "READING",
    duration: 80,
  },
  {
    id: "mod_23",
    courseId: "course_3",
    title: "Clinical Pharmacology",
    order: 3,
    type: "VIDEO",
    duration: 120,
  },
  {
    id: "mod_24",
    courseId: "course_3",
    title: "Diagnostic Procedures",
    order: 4,
    type: "PRACTICE",
    duration: 100,
  },
  {
    id: "mod_25",
    courseId: "course_3",
    title: "Medical Research Methods",
    order: 5,
    type: "READING",
    duration: 85,
  },
  {
    id: "mod_26",
    courseId: "course_3",
    title: "Evidence-Based Practice",
    order: 6,
    type: "VIDEO",
    duration: 70,
  },
  {
    id: "mod_27",
    courseId: "course_3",
    title: "Advanced Diagnostic Imaging",
    order: 7,
    type: "PRACTICE",
    duration: 110,
  },
  {
    id: "mod_28",
    courseId: "course_3",
    title: "Medical Ethics & Law",
    order: 8,
    type: "READING",
    duration: 60,
  },
  {
    id: "mod_29",
    courseId: "course_3",
    title: "Infectious Disease Management",
    order: 9,
    type: "VIDEO",
    duration: 95,
  },
  {
    id: "mod_30",
    courseId: "course_3",
    title: "Chronic Disease Management",
    order: 10,
    type: "PRACTICE",
    duration: 105,
  },

  // Course 4: Professional Development Fundamentals (10 modules)
  {
    id: "mod_31",
    courseId: "course_4",
    title: "Goal Setting & Planning",
    order: 1,
    type: "READING",
    duration: 20,
  },
  {
    id: "mod_32",
    courseId: "course_4",
    title: "Time Management Skills",
    order: 2,
    type: "VIDEO",
    duration: 25,
  },
  {
    id: "mod_33",
    courseId: "course_4",
    title: "Communication Fundamentals",
    order: 3,
    type: "PRACTICE",
    duration: 30,
  },
  {
    id: "mod_34",
    courseId: "course_4",
    title: "Public Speaking",
    order: 4,
    type: "VIDEO",
    duration: 35,
  },
  {
    id: "mod_35",
    courseId: "course_4",
    title: "Professional Networking",
    order: 5,
    type: "READING",
    duration: 20,
  },
  {
    id: "mod_36",
    courseId: "course_4",
    title: "Resume Writing Workshop",
    order: 6,
    type: "PRACTICE",
    duration: 40,
  },
  {
    id: "mod_37",
    courseId: "course_4",
    title: "Interview Preparation",
    order: 7,
    type: "VIDEO",
    duration: 30,
  },
  {
    id: "mod_38",
    courseId: "course_4",
    title: "Career Path Planning",
    order: 8,
    type: "READING",
    duration: 25,
  },
  {
    id: "mod_39",
    courseId: "course_4",
    title: "Mentorship & Coaching",
    order: 9,
    type: "VIDEO",
    duration: 35,
  },
  {
    id: "mod_40",
    courseId: "course_4",
    title: "Personal Branding",
    order: 10,
    type: "PRACTICE",
    duration: 45,
  },

  // Course 5: Digital Marketing Essentials (10 modules)
  {
    id: "mod_41",
    courseId: "course_5",
    title: "Digital Marketing Overview",
    order: 1,
    type: "VIDEO",
    duration: 40,
  },
  {
    id: "mod_42",
    courseId: "course_5",
    title: "SEO Fundamentals",
    order: 2,
    type: "READING",
    duration: 45,
  },
  {
    id: "mod_43",
    courseId: "course_5",
    title: "Content Marketing Strategy",
    order: 3,
    type: "VIDEO",
    duration: 50,
  },
  {
    id: "mod_44",
    courseId: "course_5",
    title: "Social Media Marketing",
    order: 4,
    type: "PRACTICE",
    duration: 60,
  },
  {
    id: "mod_45",
    courseId: "course_5",
    title: "Email Marketing Campaigns",
    order: 5,
    type: "READING",
    duration: 35,
  },
  {
    id: "mod_46",
    courseId: "course_5",
    title: "PPC Advertising",
    order: 6,
    type: "VIDEO",
    duration: 55,
  },
  {
    id: "mod_47",
    courseId: "course_5",
    title: "Analytics & Metrics",
    order: 7,
    type: "PRACTICE",
    duration: 50,
  },
  {
    id: "mod_48",
    courseId: "course_5",
    title: "Conversion Rate Optimization",
    order: 8,
    type: "READING",
    duration: 40,
  },
  {
    id: "mod_49",
    courseId: "course_5",
    title: "Mobile Marketing",
    order: 9,
    type: "VIDEO",
    duration: 35,
  },
  {
    id: "mod_50",
    courseId: "course_5",
    title: "Digital Marketing Strategy",
    order: 10,
    type: "PRACTICE",
    duration: 65,
  },

  // Course 6: Basic Life Support (BLS) Certification (10 modules)
  {
    id: "mod_51",
    courseId: "course_6",
    title: "BLS Overview & Guidelines",
    order: 1,
    type: "READING",
    duration: 15,
  },
  {
    id: "mod_52",
    courseId: "course_6",
    title: "CPR Techniques",
    order: 2,
    type: "VIDEO",
    duration: 20,
  },
  {
    id: "mod_53",
    courseId: "course_6",
    title: "AED Operation",
    order: 3,
    type: "PRACTICE",
    duration: 25,
  },
  {
    id: "mod_54",
    courseId: "course_6",
    title: "Choking Response",
    order: 4,
    type: "VIDEO",
    duration: 15,
  },
  {
    id: "mod_55",
    courseId: "course_6",
    title: "Adult BLS Protocols",
    order: 5,
    type: "PRACTICE",
    duration: 30,
  },
  {
    id: "mod_56",
    courseId: "course_6",
    title: "Pediatric BLS",
    order: 6,
    type: "VIDEO",
    duration: 25,
  },
  {
    id: "mod_57",
    courseId: "course_6",
    title: "BLS for Healthcare Providers",
    order: 7,
    type: "READING",
    duration: 20,
  },
  {
    id: "mod_58",
    courseId: "course_6",
    title: "Team Dynamics in BLS",
    order: 8,
    type: "PRACTICE",
    duration: 35,
  },
  {
    id: "mod_59",
    courseId: "course_6",
    title: "BLS Case Studies",
    order: 9,
    type: "VIDEO",
    duration: 25,
  },
  {
    id: "mod_60",
    courseId: "course_6",
    title: "Certification Assessment",
    order: 10,
    type: "PRACTICE",
    duration: 40,
  },

  // Course 7: Occupational Health & Safety Management (10 modules)
  {
    id: "mod_61",
    courseId: "course_7",
    title: "Introduction to OHS",
    order: 1,
    type: "READING",
    duration: 30,
  },
  {
    id: "mod_62",
    courseId: "course_7",
    title: "Risk Assessment Methods",
    order: 2,
    type: "VIDEO",
    duration: 40,
  },
  {
    id: "mod_63",
    courseId: "course_7",
    title: "Hazard Control Strategies",
    order: 3,
    type: "PRACTICE",
    duration: 45,
  },
  {
    id: "mod_64",
    courseId: "course_7",
    title: "Workplace Safety Inspections",
    order: 4,
    type: "READING",
    duration: 35,
  },
  {
    id: "mod_65",
    courseId: "course_7",
    title: "Emergency Preparedness",
    order: 5,
    type: "VIDEO",
    duration: 50,
  },
  {
    id: "mod_66",
    courseId: "course_7",
    title: "PPE Selection & Use",
    order: 6,
    type: "PRACTICE",
    duration: 40,
  },
  {
    id: "mod_67",
    courseId: "course_7",
    title: "Incident Investigation",
    order: 7,
    type: "READING",
    duration: 45,
  },
  {
    id: "mod_68",
    courseId: "course_7",
    title: "OHS Training Programs",
    order: 8,
    type: "VIDEO",
    duration: 35,
  },
  {
    id: "mod_69",
    courseId: "course_7",
    title: "Legal Compliance",
    order: 9,
    type: "READING",
    duration: 40,
  },
  {
    id: "mod_70",
    courseId: "course_7",
    title: "Safety Culture Development",
    order: 10,
    type: "PRACTICE",
    duration: 50,
  },

  // Course 8: Data Analysis with Excel & Power BI (10 modules)
  {
    id: "mod_71",
    courseId: "course_8",
    title: "Excel Fundamentals",
    order: 1,
    type: "VIDEO",
    duration: 30,
  },
  {
    id: "mod_72",
    courseId: "course_8",
    title: "Data Cleaning in Excel",
    order: 2,
    type: "PRACTICE",
    duration: 35,
  },
  {
    id: "mod_73",
    courseId: "course_8",
    title: "Advanced Excel Functions",
    order: 3,
    type: "READING",
    duration: 40,
  },
  {
    id: "mod_74",
    courseId: "course_8",
    title: "Pivot Tables & Charts",
    order: 4,
    type: "PRACTICE",
    duration: 45,
  },
  {
    id: "mod_75",
    courseId: "course_8",
    title: "Power BI Basics",
    order: 5,
    type: "VIDEO",
    duration: 30,
  },
  {
    id: "mod_76",
    courseId: "course_8",
    title: "Data Visualization in Power BI",
    order: 6,
    type: "PRACTICE",
    duration: 40,
  },
  {
    id: "mod_77",
    courseId: "course_8",
    title: "DAX Expressions",
    order: 7,
    type: "READING",
    duration: 35,
  },
  {
    id: "mod_78",
    courseId: "course_8",
    title: "Power Query & ETL",
    order: 8,
    type: "VIDEO",
    duration: 45,
  },
  {
    id: "mod_79",
    courseId: "course_8",
    title: "Dashboard Design",
    order: 9,
    type: "PRACTICE",
    duration: 50,
  },
  {
    id: "mod_80",
    courseId: "course_8",
    title: "Data Storytelling",
    order: 10,
    type: "READING",
    duration: 35,
  },

  // Course 9: Leadership & Team Management (10 modules)
  {
    id: "mod_81",
    courseId: "course_9",
    title: "Leadership Theories",
    order: 1,
    type: "READING",
    duration: 25,
  },
  {
    id: "mod_82",
    courseId: "course_9",
    title: "Effective Communication",
    order: 2,
    type: "VIDEO",
    duration: 30,
  },
  {
    id: "mod_83",
    courseId: "course_9",
    title: "Delegation Techniques",
    order: 3,
    type: "PRACTICE",
    duration: 35,
  },
  {
    id: "mod_84",
    courseId: "course_9",
    title: "Team Performance Management",
    order: 4,
    type: "READING",
    duration: 40,
  },
  {
    id: "mod_85",
    courseId: "course_9",
    title: "Motivation & Engagement",
    order: 5,
    type: "VIDEO",
    duration: 30,
  },
  {
    id: "mod_86",
    courseId: "course_9",
    title: "Conflict Resolution",
    order: 6,
    type: "PRACTICE",
    duration: 45,
  },
  {
    id: "mod_87",
    courseId: "course_9",
    title: "Decision Making",
    order: 7,
    type: "READING",
    duration: 35,
  },
  {
    id: "mod_88",
    courseId: "course_9",
    title: "Change Management",
    order: 8,
    type: "VIDEO",
    duration: 40,
  },
  {
    id: "mod_89",
    courseId: "course_9",
    title: "Coaching & Development",
    order: 9,
    type: "PRACTICE",
    duration: 50,
  },
  {
    id: "mod_90",
    courseId: "course_9",
    title: "Strategic Leadership",
    order: 10,
    type: "READING",
    duration: 45,
  },

  // Course 10: Advanced Surgical Nursing Techniques (10 modules)
  {
    id: "mod_91",
    courseId: "course_10",
    title: "Peri-operative Nursing Overview",
    order: 1,
    type: "READING",
    duration: 60,
  },
  {
    id: "mod_92",
    courseId: "course_10",
    title: "Sterile Technique Fundamentals",
    order: 2,
    type: "VIDEO",
    duration: 70,
  },
  {
    id: "mod_93",
    courseId: "course_10",
    title: "Surgical Instrumentation",
    order: 3,
    type: "PRACTICE",
    duration: 80,
  },
  {
    id: "mod_94",
    courseId: "course_10",
    title: "Pre-operative Assessment",
    order: 4,
    type: "READING",
    duration: 65,
  },
  {
    id: "mod_95",
    courseId: "course_10",
    title: "Intra-operative Nursing Care",
    order: 5,
    type: "VIDEO",
    duration: 90,
  },
  {
    id: "mod_96",
    courseId: "course_10",
    title: "Post-operative Management",
    order: 6,
    type: "PRACTICE",
    duration: 85,
  },
  {
    id: "mod_97",
    courseId: "course_10",
    title: "Complication Prevention",
    order: 7,
    type: "READING",
    duration: 70,
  },
  {
    id: "mod_98",
    courseId: "course_10",
    title: "Surgical Emergency Response",
    order: 8,
    type: "VIDEO",
    duration: 75,
  },
  {
    id: "mod_99",
    courseId: "course_10",
    title: "Wound Care & Healing",
    order: 9,
    type: "PRACTICE",
    duration: 80,
  },
  {
    id: "mod_100",
    courseId: "course_10",
    title: "Surgical Nursing Best Practices",
    order: 10,
    type: "READING",
    duration: 90,
  },
];

export const mockEnrollments: Enrollment[] = [
  {
    id: "enroll_1",
    userId: "user_1",
    courseId: "course_1",
    status: "APPROVED",
    progress: 65,
    enrolledAt: new Date("2026-01-20"),
  },
  {
    id: "enroll_2",
    userId: "user_1",
    courseId: "course_2",
    status: "APPROVED",
    progress: 100,
    enrolledAt: new Date("2026-01-25"),
    completedAt: new Date("2026-02-15"),
  },
  {
    id: "enroll_3",
    userId: "user_2",
    courseId: "course_1",
    status: "APPROVED",
    progress: 35,
    enrolledAt: new Date("2026-02-01"),
  },
  {
    id: "enroll_4",
    userId: "user_2",
    courseId: "course_3",
    status: "PENDING",
    progress: 0,
    enrolledAt: new Date("2026-02-20"),
  },
  {
    id: "enroll_5",
    userId: "user_3",
    courseId: "course_2",
    status: "PENDING",
    progress: 0,
    enrolledAt: new Date("2026-02-25"),
  },
  {
    id: "enroll_6",
    userId: "user_4",
    courseId: "course_1",
    status: "APPROVED",
    progress: 45,
    enrolledAt: new Date("2026-02-01"),
  },
  {
    id: "enroll_7",
    userId: "user_5",
    courseId: "course_2",
    status: "APPROVED",
    progress: 80,
    enrolledAt: new Date("2026-02-05"),
  },
  {
    id: "enroll_8",
    userId: "user_6",
    courseId: "course_1",
    status: "REJECTED",
    progress: 0,
    enrolledAt: new Date("2026-02-10"),
  },
  {
    id: "enroll_9",
    userId: "user_10",
    courseId: "course_3",
    status: "APPROVED",
    progress: 25,
    enrolledAt: new Date("2026-02-25"),
  },
  {
    id: "enroll_10",
    userId: "user_1",
    courseId: "course_6",
    status: "APPROVED",
    progress: 10,
    enrolledAt: new Date("2026-02-10"),
  },
  {
    id: "enroll_11",
    userId: "user_1",
    courseId: "course_7",
    status: "APPROVED",
    progress: 0,
    enrolledAt: new Date("2026-02-14"),
  },
];

export const mockAssessments: Assessment[] = [
  {
    id: "assess_1",
    courseId: "course_1",
    title: "Emergency Response Quiz",
    type: "MCQ",
    totalMarks: 50,
    passingMarks: 25,
    createdAt: new Date("2026-01-15"),
  },
  {
    id: "assess_2",
    courseId: "course_1",
    title: "First Aid Practical",
    type: "PRACTICAL",
    totalMarks: 100,
    passingMarks: 60,
    createdAt: new Date("2026-01-20"),
  },
  {
    id: "assess_3",
    courseId: "course_2",
    title: "Recruitment Strategy Assignment",
    type: "WRITTEN",
    totalMarks: 75,
    passingMarks: 45,
    createdAt: new Date("2026-01-28"),
  },
  {
    id: "assess_4",
    courseId: "course_2",
    title: "Interview Skills Exam",
    type: "MCQ",
    totalMarks: 50,
    passingMarks: 30,
    createdAt: new Date("2026-02-05"),
  },
];

export const mockSubmissions: Submission[] = [
  {
    id: "submit_1",
    assessmentId: "assess_1",
    userId: "user_1",
    status: "GRADED",
    obtainedMarks: 42,
    submittedAt: new Date("2026-02-10"),
    gradedAt: new Date("2026-02-12"),
  },
  {
    id: "submit_2",
    assessmentId: "assess_3",
    userId: "user_1",
    status: "GRADED",
    obtainedMarks: 68,
    submittedAt: new Date("2026-02-15"),
    gradedAt: new Date("2026-02-17"),
  },
  {
    id: "submit_3",
    assessmentId: "assess_1",
    userId: "user_2",
    status: "SUBMITTED",
    submittedAt: new Date("2026-02-18"),
  },
  {
    id: "submit_4",
    assessmentId: "assess_4",
    userId: "user_5",
    status: "GRADED",
    obtainedMarks: 38,
    submittedAt: new Date("2026-02-16"),
    gradedAt: new Date("2026-02-18"),
  },
  {
    id: "submit_5",
    assessmentId: "assess_2",
    userId: "user_1",
    status: "GRADING",
    submittedAt: new Date("2026-02-19"),
  },
];

export const mockCertificates: Certificate[] = [
  {
    id: "cert_1",
    userId: "user_1",
    courseId: "course_2",
    issueDate: new Date("2026-02-15"),
    certificateNumber: "PSTC-2026-001",
  },
];

export const mockNotifications: Notification[] = [
  {
    id: "notif_1",
    userId: "user_1",
    title: "Assessment Result",
    message: "Your Emergency Response Quiz has been graded. Score: 42/50",
    type: "SUCCESS",
    readAt: new Date("2026-02-13"),
    createdAt: new Date("2026-02-12"),
  },
  {
    id: "notif_2",
    userId: "user_2",
    title: "Enrollment Approved",
    message: "Your enrollment for Advanced Medical Sciences has been approved.",
    type: "SUCCESS",
    createdAt: new Date("2026-02-20"),
  },
  {
    id: "notif_3",
    userId: "user_3",
    title: "Enrollment Pending",
    message:
      "Your enrollment for HR Recruitment & Assessment is pending approval.",
    type: "INFO",
    createdAt: new Date("2026-02-25"),
  },
  {
    id: "notif_4",
    userId: "user_5",
    title: "Assessment Deadline",
    message: "You have 2 days left to complete the Interview Skills Exam.",
    type: "WARNING",
    createdAt: new Date("2026-02-20"),
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: "audit_1",
    userId: "user_7",
    action: "APPROVED",
    entity: "ENROLLMENT",
    entityId: "enroll_4",
    changes: { status: "APPROVED" },
    createdAt: new Date("2026-02-20"),
  },
  {
    id: "audit_2",
    userId: "user_9",
    action: "GRADED",
    entity: "SUBMISSION",
    entityId: "submit_1",
    changes: { obtainedMarks: 42, status: "GRADED" },
    createdAt: new Date("2026-02-12"),
  },
  {
    id: "audit_3",
    userId: "user_7",
    action: "CREATED",
    entity: "ASSESSMENT",
    entityId: "assess_4",
    createdAt: new Date("2026-02-05"),
  },
  {
    id: "audit_4",
    userId: "user_8",
    action: "UPDATED",
    entity: "COURSE",
    entityId: "course_1",
    changes: { description: "Updated description" },
    createdAt: new Date("2026-02-18"),
  },
  {
    id: "audit_5",
    userId: "user_9",
    action: "ISSUED",
    entity: "CERTIFICATE",
    entityId: "cert_1",
    createdAt: new Date("2026-02-15"),
  },
];

export const mockQuestions: Question[] = [
  {
    id: "q_1",
    assessmentId: "assess_1",
    type: "MCQ",
    question: "What is the first step when arriving at an emergency scene?",
    marks: 10,
    options: [
      "Assess scene safety",
      "Start CPR immediately",
      "Call the patient's family",
      "Administer medication",
    ],
    correctAnswer: "Assess scene safety",
  },
  {
    id: "q_2",
    assessmentId: "assess_1",
    type: "MCQ",
    question:
      "How often should chest compressions be given during CPR (per minute)?",
    marks: 10,
    options: ["40-60", "60-80", "100-120", "150-170"],
    correctAnswer: "100-120",
  },
  {
    id: "q_3",
    assessmentId: "assess_1",
    type: "MCQ",
    question: "Which of these is a sign of shock?",
    marks: 10,
    options: [
      "Warm, dry skin",
      "Slow, strong pulse",
      "Pale, clammy skin",
      "Increased alertness",
    ],
    correctAnswer: "Pale, clammy skin",
  },
  {
    id: "q_6",
    assessmentId: "assess_1",
    type: "MCQ",
    question:
      "What is the correct compression-to-breath ratio for adult CPR (single rescuer)?",
    marks: 10,
    options: ["15:2", "30:2", "5:1", "10:1"],
    correctAnswer: "30:2",
  },
  {
    id: "q_7",
    assessmentId: "assess_1",
    type: "MCQ",
    question:
      "What should you do first if a casualty is unresponsive but breathing?",
    marks: 10,
    options: [
      "Start CPR",
      "Place in recovery position",
      "Give water",
      "Leave them and call for help",
    ],
    correctAnswer: "Place in recovery position",
  },
  {
    id: "q_8",
    assessmentId: "assess_1",
    type: "MCQ",
    question:
      "Which of the following is the correct way to control severe external bleeding?",
    marks: 10,
    options: [
      "Apply direct pressure",
      "Apply a tourniquet immediately",
      "Elevate and ignore",
      "Apply ice only",
    ],
    correctAnswer: "Apply direct pressure",
  },
  {
    id: "q_9",
    assessmentId: "assess_1",
    type: "MCQ",
    question: 'What does the "A" stand for in the ABC of first aid?',
    marks: 10,
    options: ["Alertness", "Airway", "Assessment", "Ambulance"],
    correctAnswer: "Airway",
  },
  {
    id: "q_10",
    assessmentId: "assess_1",
    type: "MCQ",
    question: "How should you treat a suspected fracture at the scene?",
    marks: 10,
    options: [
      "Realign the bone",
      "Immobilize the area",
      "Massage the area",
      "Apply heat",
    ],
    correctAnswer: "Immobilize the area",
  },
  {
    id: "q_11",
    assessmentId: "assess_1",
    type: "MCQ",
    question:
      "What is the normal adult resting heart rate range (beats per minute)?",
    marks: 10,
    options: ["20-40", "60-100", "120-150", "160-200"],
    correctAnswer: "60-100",
  },
  {
    id: "q_12",
    assessmentId: "assess_1",
    type: "MCQ",
    question: "Which action is appropriate for a suspected spinal injury?",
    marks: 10,
    options: [
      "Sit the casualty up",
      "Keep the head and neck still",
      "Move them immediately",
      "Remove their helmet quickly",
    ],
    correctAnswer: "Keep the head and neck still",
  },
  {
    id: "q_13",
    assessmentId: "assess_1",
    type: "MCQ",
    question:
      "What is the first priority when approaching any emergency scene?",
    marks: 10,
    options: [
      "Personal and scene safety",
      "Calling the family",
      "Recording patient details",
      "Treating the most vocal patient first",
    ],
    correctAnswer: "Personal and scene safety",
  },
  {
    id: "q_14",
    assessmentId: "assess_1",
    type: "MCQ",
    question: "Which of the following best describes anaphylaxis?",
    marks: 10,
    options: [
      "A minor skin rash",
      "A severe, life-threatening allergic reaction",
      "A common cold symptom",
      "A type of fracture",
    ],
    correctAnswer: "A severe, life-threatening allergic reaction",
  },
  {
    id: "q_15",
    assessmentId: "assess_1",
    type: "MCQ",
    question:
      "What should be done immediately after using an AED shock on a casualty?",
    marks: 10,
    options: [
      "Stop all care",
      "Resume CPR immediately",
      "Wait 5 minutes before acting",
      "Check for a pulse for 2 minutes",
    ],
    correctAnswer: "Resume CPR immediately",
  },
  {
    id: "q_16",
    assessmentId: "assess_1",
    type: "MCQ",
    question:
      "Which burn classification involves all layers of skin and possibly underlying tissue?",
    marks: 10,
    options: ["First-degree", "Second-degree", "Third-degree", "Superficial"],
    correctAnswer: "Third-degree",
  },
  {
    id: "q_17",
    assessmentId: "assess_1",
    type: "MCQ",
    question: "What is the recommended initial treatment for a minor burn?",
    marks: 10,
    options: [
      "Apply butter",
      "Cool running water for 20 minutes",
      "Ice directly on the burn",
      "Pop any blisters",
    ],
    correctAnswer: "Cool running water for 20 minutes",
  },
  {
    id: "q_4",
    assessmentId: "assess_4",
    type: "MCQ",
    question: "What is the primary goal of a structured interview?",
    marks: 10,
    options: [
      "Reduce hiring bias",
      "Shorten the hiring process",
      "Avoid legal review",
      "Skip reference checks",
    ],
    correctAnswer: "Reduce hiring bias",
  },
  {
    id: "q_5",
    assessmentId: "assess_4",
    type: "MCQ",
    question: "Which question type is most useful for assessing past behavior?",
    marks: 10,
    options: ["Hypothetical", "Behavioral", "Yes/No", "Leading"],
    correctAnswer: "Behavioral",
  },
  {
    id: "q_18",
    assessmentId: "assess_3",
    type: "WRITTEN",
    question:
      "Describe the key stages of a modern recruitment process and explain why each stage matters.",
    marks: 25,
    rubric:
      "Should cover sourcing, screening, interviewing, assessment, and offer stages with clear reasoning for each.",
  },
  {
    id: "q_19",
    assessmentId: "assess_3",
    type: "WRITTEN",
    question:
      "Explain how structured interviews reduce hiring bias compared to unstructured interviews.",
    marks: 25,
    rubric:
      "Should reference consistency, standardized scoring, and reduced reliance on gut feeling.",
  },
  {
    id: "q_20",
    assessmentId: "assess_3",
    type: "WRITTEN",
    question:
      "Discuss the role of candidate assessment tools (e.g. skills tests, psychometrics) in improving hiring decisions.",
    marks: 25,
    rubric:
      "Should discuss validity, reliability, and how assessment tools complement interviews.",
  },
];

// Helper functions
export const getUserById = (id: string) => mockUsers.find((u) => u.id === id);
export const getCourseById = (id: string) =>
  mockCourses.find((c) => c.id === id);
export const getAssessmentById = (id: string) =>
  mockAssessments.find((a) => a.id === id);
export const getQuestionsByAssessmentId = (assessmentId: string) =>
  mockQuestions.filter((q) => q.assessmentId === assessmentId);
export const getEnrollmentsByUserId = (userId: string) =>
  mockEnrollments.filter((e) => e.userId === userId);
export const getEnrollmentsByCourseId = (courseId: string) =>
  mockEnrollments.filter((e) => e.courseId === courseId);
export const getModulesByCourseId = (courseId: string) =>
  mockModules.filter((m) => m.courseId === courseId);
export const getAssessmentsByCourseId = (courseId: string) =>
  mockAssessments.filter((a) => a.courseId === courseId);
export const getSubmissionsByUserId = (userId: string) =>
  mockSubmissions.filter((s) => s.userId === userId);
export const getSubmissionsByAssessmentId = (assessmentId: string) =>
  mockSubmissions.filter((s) => s.assessmentId === assessmentId);
export const submitOfflineAssessment = (
  assessmentId: string,
  userId: string,
  answerSheetUrls: string[],
) => {
  const existing = mockSubmissions.find(
    (s) => s.assessmentId === assessmentId && s.userId === userId,
  );
  if (existing) {
    existing.status = "SUBMITTED";
    existing.submittedAt = new Date();
    existing.answerSheetUrls = answerSheetUrls;
    return existing;
  }
  const submission: Submission = {
    id: `submit_${mockSubmissions.length + 1}`,
    assessmentId,
    userId,
    status: "SUBMITTED",
    submittedAt: new Date(),
    answerSheetUrls,
  };
  mockSubmissions.push(submission);
  return submission;
};
export const getCertificatesByUserId = (userId: string) =>
  mockCertificates.filter((c) => c.userId === userId);
export const getNotificationsByUserId = (userId: string) =>
  mockNotifications.filter((n) => n.userId === userId);
