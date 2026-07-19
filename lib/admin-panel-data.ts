export const dashboardStats = [
  {
    id: "totalEnrolledStudents",
    value: 1284,
    deltaValue: 8.4,
    deltaType: "percent",
    valueType: "number",
  },
  {
    id: "activeCourses",
    value: 18,
    deltaValue: 2,
    deltaType: "thisMonth",
    valueType: "number",
  },
  {
    id: "assessmentsPendingReview",
    value: 23,
    deltaValue: 6,
    deltaType: "dueToday",
    valueType: "number",
  },
  {
    id: "passRate",
    value: 87,
    deltaValue: 3.1,
    deltaType: "percent",
    valueType: "percentage",
  },
  {
    id: "certificatesIssuedThisMonth",
    value: 96,
    deltaValue: 18,
    deltaType: "percent",
    valueType: "number",
  },
  {
    id: "revenueMtd",
    value: 214500,
    deltaValue: 11.2,
    deltaType: "percent",
    valueType: "currency",
  },
] as const;

export const enrollmentTrend = [
  { week: 1, enrollments: 72 },
  { week: 2, enrollments: 86 },
  { week: 3, enrollments: 81 },
  { week: 4, enrollments: 95 },
  { week: 5, enrollments: 104 },
  { week: 6, enrollments: 98 },
  { week: 7, enrollments: 116 },
  { week: 8, enrollments: 121 },
  { week: 9, enrollments: 114 },
  { week: 10, enrollments: 136 },
  { week: 11, enrollments: 142 },
  { week: 12, enrollments: 151 },
] as const;

export const completionByCategory = [
  { id: "paramedic", value: 46 },
  { id: "publicHealth", value: 24 },
  { id: "hr", value: 18 },
  { id: "safety", value: 12 },
] as const;

export const activityFeed = [
  { id: "scanSubmissionsApproved", time: "09:41" },
  { id: "newCoursePublished", time: "09:15" },
  { id: "certificateReissued", time: "08:52" },
  { id: "examinerPermissionsUpdated", time: "08:20" },
] as const;

export const pendingActions = [
  { id: "scanSubmissionsAwaitingVerification" },
  { id: "studentAppealsPendingReview" },
  { id: "certificateRevokeRequestOpen" },
] as const;

export type AdminStudentStatus = "Active" | "Completed" | "Suspended";

export const adminStudents = [
  {
    id: "BOED-1042",
    name: "Fahim Ahmed",
    email: "fahim.a@email.com",
    phone: "+880 1712-345678",
    courses: ["Community Paramedic"],
    progress: 78,
    lastActive: "2 hrs ago",
    status: "Active" as AdminStudentStatus,
    enrolledAt: "2026-02-12",
    scores: [
      { assessment: "MCQ - Module 1", score: "92%" },
      { assessment: "Written - Module 2", score: "78%" },
      { assessment: "Practical - Module 3", score: "85%" },
    ],
    certificates: ["Community_Paramedic_Certificate.pdf"],
  },
  {
    id: "BOED-1043",
    name: "Nusrat Jahan",
    email: "nusrat.j@email.com",
    phone: "+880 1811-112233",
    courses: ["HR & Recruitment"],
    progress: 45,
    lastActive: "1 day ago",
    status: "Active" as AdminStudentStatus,
    enrolledAt: "2026-03-04",
    scores: [
      { assessment: "Written - Module 2", score: "68%" },
      { assessment: "MCQ - Module 4", score: "74%" },
    ],
    certificates: [],
  },
  {
    id: "BOED-1044",
    name: "Rakibul Islam",
    email: "rakibul.i@email.com",
    phone: "+880 1910-223344",
    courses: ["Public Health Essentials"],
    progress: 100,
    lastActive: "3 days ago",
    status: "Completed" as AdminStudentStatus,
    enrolledAt: "2026-01-19",
    scores: [
      { assessment: "MCQ - Module 1", score: "81%" },
      { assessment: "Practical - Module 3", score: "88%" },
    ],
    certificates: ["Public_Health_Certificate.pdf"],
  },
  {
    id: "BOED-1045",
    name: "Sadia Islam",
    email: "sadia.i@email.com",
    phone: "+880 1719-998877",
    courses: ["Community Paramedic"],
    progress: 12,
    lastActive: "14 days ago",
    status: "Suspended" as AdminStudentStatus,
    enrolledAt: "2026-04-02",
    scores: [{ assessment: "Written - Module 1", score: "Pending" }],
    certificates: [],
  },
  {
    id: "BOED-1046",
    name: "Tanvir Hasan",
    email: "tanvir.h@email.com",
    phone: "+880 1818-556677",
    courses: ["Community Paramedic"],
    progress: 63,
    lastActive: "5 hrs ago",
    status: "Active" as AdminStudentStatus,
    enrolledAt: "2026-04-22",
    scores: [
      { assessment: "Lab Report - Module 3", score: "Reviewed" },
      { assessment: "MCQ - Module 2", score: "75%" },
    ],
    certificates: [],
  },
];

export interface AdminQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  marks: number;
}

export interface AdminModuleQuiz {
  passingScore: number;
  questions: AdminQuizQuestion[];
}

export interface AdminModuleNote {
  id: string;
  heading: string;
  body: string;
}

export interface AdminModuleResource {
  id: string;
  title: string;
  type: "PDF" | "LINK" | "SLIDES" | "FILE";
  meta: string;
  fileUrl?: string;
}

export interface AdminCourseModule {
  id: string;
  order: number;
  title: string;
  duration: string;
  coverImage: string;
  videoUrl: string;
  overview: string;
  hasQuiz: boolean;
  watchTimeMinutes: number;
  viewCount: number;
  notes: AdminModuleNote[];
  resources: AdminModuleResource[];
  quiz: AdminModuleQuiz;
}

export const courseRecords = [
  {
    id: "course-community-paramedic",
    coverImage: "/assets/Community Paramedic Training.jpeg",
    title: "Community Paramedic Training",
    category: "Healthcare",
    enrolled: 312,
    status: "Published",
    description:
      "Emergency response, patient assessment, airway care, and trauma fundamentals.",
    modules: [
      {
        id: "mod-cp-1",
        order: 1,
        title: "Intro to Emergency Response",
        duration: "12 min",
        coverImage: "/assets/Emergency Response.jpg",
        videoUrl: "",
        overview:
          "Introduces the emergency response framework community paramedics use on scene, from initial dispatch to handoff.",
        hasQuiz: true,
        watchTimeMinutes: 2840,
        viewCount: 298,
        notes: [
          {
            id: "mod-cp-1-note-1",
            heading: "Key takeaways",
            body: "Understand the chain of survival and how community paramedics fit into the wider emergency response system.",
          },
        ],
        resources: [
          {
            id: "mod-cp-1-res-1",
            title: "Intro to Emergency Response — Slide Deck",
            type: "SLIDES",
            meta: "12 slides",
          },
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: "mod-cp-1-q1",
              question:
                "What is the first priority on arriving at an emergency scene?",
              options: [
                "Scene safety",
                "Patient history",
                "Billing paperwork",
                "Calling family",
              ],
              correctIndex: 0,
              marks: 5,
            },
          ],
        },
      },
      {
        id: "mod-cp-2",
        order: 2,
        title: "Vitals & Patient Assessment",
        duration: "18 min",
        coverImage: "/assets/Patient Assessment.jpg",
        videoUrl: "",
        overview:
          "Covers systematic vital sign collection and primary/secondary patient assessment techniques.",
        hasQuiz: true,
        watchTimeMinutes: 3960,
        viewCount: 264,
        notes: [
          {
            id: "mod-cp-2-note-1",
            heading: "Key takeaways",
            body: "Practice the ABCDE assessment sequence until it becomes automatic under pressure.",
          },
        ],
        resources: [
          {
            id: "mod-cp-2-res-1",
            title: "Vitals & Patient Assessment — Reading Handout",
            type: "PDF",
            meta: "2 pages",
          },
        ],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: "mod-cp-2-q1",
              question: "Normal adult resting heart rate range is:",
              options: ["20-40", "40-60", "60-100", "120-150"],
              correctIndex: 2,
              marks: 5,
            },
          ],
        },
      },
      {
        id: "mod-cp-3",
        order: 3,
        title: "Airway Management",
        duration: "22 min",
        coverImage: "/assets/Airway Management.jpg",
        videoUrl: "",
        overview:
          "Hands-on airway management techniques including head-tilt, jaw-thrust, and airway adjuncts.",
        hasQuiz: false,
        watchTimeMinutes: 4290,
        viewCount: 221,
        notes: [],
        resources: [],
        quiz: { passingScore: 70, questions: [] },
      },
      {
        id: "mod-cp-4",
        order: 4,
        title: "Trauma Care Fundamentals",
        duration: "19 min",
        coverImage: "/assets/Trauma Care Fundamentals.jpg",
        videoUrl: "",
        overview:
          "Fundamentals of trauma triage, bleeding control, and stabilization before transport.",
        hasQuiz: false,
        watchTimeMinutes: 3230,
        viewCount: 189,
        notes: [],
        resources: [],
        quiz: { passingScore: 70, questions: [] },
      },
    ] as AdminCourseModule[],
  },
  {
    id: "course-hr-recruitment",
    coverImage: "/assets/HR Recruitment & Assessment.jpg",
    title: "HR Recruitment & Assessment",
    category: "Human Resources",
    enrolled: 148,
    status: "Published",
    description:
      "Structured interviews, assessment design, and hiring decision workflows.",
    modules: [
      {
        id: "mod-hr-1",
        order: 1,
        title: "Recruitment Funnel Basics",
        duration: "14 min",
        coverImage: "/assets/Recruitment Funnel.jpg",
        videoUrl: "",
        overview:
          "Walks through each stage of the recruitment funnel from sourcing to offer.",
        hasQuiz: true,
        watchTimeMinutes: 1610,
        viewCount: 142,
        notes: [
          {
            id: "mod-hr-1-note-1",
            heading: "Key takeaways",
            body: "Map every funnel stage to a measurable conversion metric.",
          },
        ],
        resources: [],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: "mod-hr-1-q1",
              question:
                "Which stage comes right after sourcing in the recruitment funnel?",
              options: ["Offer", "Screening", "Onboarding", "Termination"],
              correctIndex: 1,
              marks: 5,
            },
          ],
        },
      },
      {
        id: "mod-hr-2",
        order: 2,
        title: "Structured Interviewing",
        duration: "20 min",
        coverImage: "/assets/Structured Interviewing.jpg",
        videoUrl: "",
        overview:
          "Designing and running structured interviews that reduce bias and improve signal.",
        hasQuiz: true,
        watchTimeMinutes: 2080,
        viewCount: 118,
        notes: [],
        resources: [],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: "mod-hr-2-q1",
              question: "What is a core benefit of structured interviews?",
              options: [
                "Faster hiring only",
                "Reduced interviewer bias",
                "No scorecards needed",
                "Skipping reference checks",
              ],
              correctIndex: 1,
              marks: 5,
            },
          ],
        },
      },
      {
        id: "mod-hr-3",
        order: 3,
        title: "Candidate Scorecards",
        duration: "16 min",
        coverImage: "/assets/Candidate Scorecards.jpg",
        videoUrl: "",
        overview:
          "Building consistent scorecards to compare candidates objectively across interview panels.",
        hasQuiz: false,
        watchTimeMinutes: 1490,
        viewCount: 96,
        notes: [],
        resources: [],
        quiz: { passingScore: 70, questions: [] },
      },
    ] as AdminCourseModule[],
  },
  {
    id: "course-public-health",
    coverImage: "/assets/Public Health Essentials.jpeg",
    title: "Public Health Essentials",
    category: "Public Health",
    enrolled: 96,
    status: "Draft",
    description:
      "Core public health principles, field data, surveillance, and community outreach.",
    modules: [
      {
        id: "mod-ph-1",
        order: 1,
        title: "Public Health Foundations",
        duration: "13 min",
        coverImage: "/assets/Public Health Foundations.jpg",
        videoUrl: "",
        overview:
          "Core principles of public health practice and how they apply to community-level interventions.",
        hasQuiz: true,
        watchTimeMinutes: 980,
        viewCount: 87,
        notes: [],
        resources: [],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: "mod-ph-1-q1",
              question: "Public health primarily focuses on:",
              options: [
                "Individual patients only",
                "Population-level health outcomes",
                "Hospital billing",
                "Pharmaceutical sales",
              ],
              correctIndex: 1,
              marks: 5,
            },
          ],
        },
      },
      {
        id: "mod-ph-2",
        order: 2,
        title: "Community Data Collection",
        duration: "21 min",
        coverImage: "/assets/Community Data Collection.jpg",
        videoUrl: "",
        overview:
          "Field methods for gathering reliable community health data and avoiding common survey pitfalls.",
        hasQuiz: false,
        watchTimeMinutes: 1230,
        viewCount: 71,
        notes: [],
        resources: [],
        quiz: { passingScore: 70, questions: [] },
      },
    ] as AdminCourseModule[],
  },
  {
    id: "course-trauma-response",
    coverImage: "/assets/Trauma Response Basics.jpg",
    title: "Trauma Response Basics",
    category: "Emergency Care",
    enrolled: 0,
    status: "Archived",
    description:
      "Rapid trauma triage, stabilization, and referral coordination.",
    modules: [
      {
        id: "mod-tr-1",
        order: 1,
        title: "Scene Safety and Triage",
        duration: "15 min",
        coverImage: "/assets/Scene Safety and Triage.jpg",
        videoUrl: "",
        overview:
          "Assessing scene safety and applying rapid triage principles before treatment begins.",
        hasQuiz: true,
        watchTimeMinutes: 560,
        viewCount: 34,
        notes: [],
        resources: [],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: "mod-tr-1-q1",
              question:
                "Select the correct sequence for primary patient assessment.",
              options: ["CABDE", "ABCDE", "DEABC", "BACDE"],
              correctIndex: 1,
              marks: 5,
            },
          ],
        },
      },
      {
        id: "mod-tr-2",
        order: 2,
        title: "Bleeding Control",
        duration: "17 min",
        coverImage: "/assets/Bleeding Control.jpg",
        videoUrl: "",
        overview:
          "Direct pressure, wound packing, and tourniquet application for severe bleeding control.",
        hasQuiz: true,
        watchTimeMinutes: 410,
        viewCount: 27,
        notes: [],
        resources: [],
        quiz: {
          passingScore: 70,
          questions: [
            {
              id: "mod-tr-2-q1",
              question:
                "What is the first-line technique to control external bleeding?",
              options: [
                "Tourniquet immediately",
                "Direct pressure",
                "Elevation only",
                "Ice application",
              ],
              correctIndex: 1,
              marks: 5,
            },
          ],
        },
      },
    ] as AdminCourseModule[],
  },
];

export const assessmentQuestionSet = [
  {
    number: 1,
    difficulty: "Medium",
    prompt: "Which airway maneuver is used for a suspected spinal injury?",
    options: ["Head tilt", "Jaw thrust", "Chin lift", "Recovery roll"],
  },
  {
    number: 2,
    difficulty: "Easy",
    prompt: "Normal adult resting heart rate range is:",
    options: ["20-40", "40-60", "60-100", "120-150"],
  },
  {
    number: 3,
    difficulty: "Hard",
    prompt: "Select the correct sequence for primary patient assessment.",
    options: ["CABDE", "ABCDE", "DEABC", "BACDE"],
  },
];

export type SubmissionStatus = "Pending" | "Reviewed" | "Disputed";

export const submissionRows = [
  {
    id: "SUB-2291",
    student: "Nusrat Jahan",
    assessment: "Written - Mod 2",
    type: "Written",
    status: "Pending" as SubmissionStatus,
  },
  {
    id: "SUB-2292",
    student: "Fahim Ahmed",
    assessment: "MCQ - Mod 4 (Scan)",
    type: "OMR",
    status: "Pending" as SubmissionStatus,
  },
  {
    id: "SUB-2293",
    student: "Tanvir Hasan",
    assessment: "Lab Report - Mod 3",
    type: "Lab",
    status: "Reviewed" as SubmissionStatus,
  },
  {
    id: "SUB-2294",
    student: "Sadia Islam",
    assessment: "Written - Mod 1 (Scan)",
    type: "Scan",
    status: "Disputed" as SubmissionStatus,
  },
  {
    id: "SUB-2295",
    student: "Rakibul Islam",
    assessment: "MCQ - Mod 2",
    type: "OMR",
    status: "Pending" as SubmissionStatus,
  },
];

export const scanReviewRows = [
  { q: 1, student: "B", correct: "B", matched: true },
  { q: 2, student: "C", correct: "A", matched: false },
  { q: 3, student: "D", correct: "D", matched: true },
];

export const gradingRows = [
  { student: "Fahim Ahmed", score: 92, grade: "A", status: "Auto-graded" },
  {
    student: "Nusrat Jahan",
    score: 68,
    grade: "C",
    status: "Manually Reviewed",
  },
  { student: "Rakibul Islam", score: 54, grade: "Fail", status: "Disputed" },
  { student: "Sadia Islam", score: 88, grade: "A", status: "Auto-graded" },
  { student: "Tanvir Hasan", score: 75, grade: "B", status: "Auto-graded" },
];

export const gradeDistribution = [
  { grade: "A", count: 18 },
  { grade: "B", count: 24 },
  { grade: "C", count: 12 },
  { grade: "Fail", count: 5 },
];

export const certificateRows = [
  {
    id: "CERT-0091",
    student: "Fahim Ahmed",
    course: "Paramedic",
    status: "Valid",
  },
  {
    id: "CERT-0092",
    student: "Rakibul Islam",
    course: "Public Health",
    status: "Valid",
  },
  {
    id: "CERT-0093",
    student: "M. Chowdhury",
    course: "Paramedic",
    status: "Revoked",
  },
];

export const sentMessages = [
  { subject: "Exam reminder - Mod 4", channel: "Email", openRate: "64%" },
  { subject: "Certificate issued", channel: "In-App", openRate: "91%" },
];

export const triggerRules = [
  "Send reminder 1 day before exam",
  "Send certificate on pass",
  "Alert admin on scan upload",
  "Notify on assessment dispute",
  "Weekly progress digest to students",
];

export const reportRows = [
  {
    assessment: "MCQ - Module 1",
    avgScore: "81%",
    passRate: "92%",
    attempts: 310,
  },
  {
    assessment: "Written - Module 2",
    avgScore: "74%",
    passRate: "85%",
    attempts: 298,
  },
  {
    assessment: "Practical - Module 3",
    avgScore: "79%",
    passRate: "88%",
    attempts: 276,
  },
];

export const reportTypes = [
  "Enrollment Report",
  "Completion Report",
  "Assessment Performance",
  "Certificate Issuance",
  "Submission Activity",
  "Revenue Report",
];

export const permissionModules = [
  { module: "Students", values: ["yes", "no", "no", "no", "yes"] },
  { module: "Courses", values: ["yes", "yes", "yes", "yes", "yes"] },
  { module: "Assessments", values: ["yes", "yes", "yes", "no", "yes"] },
  { module: "Submissions", values: ["yes", "no", "yes", "no", "yes"] },
  { module: "Grading", values: ["yes", "no", "yes", "no", "yes"] },
  { module: "Certificates", values: ["yes", "no", "no", "no", "yes"] },
  { module: "Reports", values: ["yes", "no", "no", "no", "yes"] },
  { module: "Settings", values: ["no", "no", "no", "no", "no"] },
  { module: "Roles", values: ["no", "no", "no", "no", "no"] },
];

export const roleActivityLog = [
  "Course Manager export permission enabled by Super Admin",
  "Examiner delete permission removed by A. Karim",
  "Report Viewer assigned to T. Chowdhury",
];
