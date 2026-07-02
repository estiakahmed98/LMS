export const dashboardStats = [
  { label: "Total Enrolled Students", value: "1,284", delta: "+8.4%" },
  { label: "Active Courses", value: "18", delta: "+2 this month" },
  { label: "Assessments Pending Review", value: "23", delta: "6 due today" },
  { label: "Pass Rate", value: "87%", delta: "+3.1%" },
  { label: "Certificates Issued This Month", value: "96", delta: "+18%" },
  { label: "Revenue (MTD)", value: "BDT 214,500", delta: "+11.2%" },
]

export const enrollmentTrend = [
  { week: "W1", enrollments: 72 },
  { week: "W2", enrollments: 86 },
  { week: "W3", enrollments: 81 },
  { week: "W4", enrollments: 95 },
  { week: "W5", enrollments: 104 },
  { week: "W6", enrollments: 98 },
  { week: "W7", enrollments: 116 },
  { week: "W8", enrollments: 121 },
  { week: "W9", enrollments: 114 },
  { week: "W10", enrollments: 136 },
  { week: "W11", enrollments: 142 },
  { week: "W12", enrollments: 151 },
]

export const completionByCategory = [
  { name: "Paramedic", value: 46 },
  { name: "Public Health", value: 24 },
  { name: "HR", value: 18 },
  { name: "Safety", value: 12 },
]

export const activityFeed = [
  "S. Rahman approved 3 scan submissions - Paramedic Mod 4",
  "New course Trauma Response Basics published",
  "Certificate re-issued for student PSTC-1042",
  "Role Examiner permissions updated by A. Karim",
]

export const pendingActions = [
  "3 scan submissions awaiting manual verification",
  "2 student appeals pending review",
  "1 certificate revoke request open",
]

export type AdminStudentStatus = "Active" | "Completed" | "Suspended"

export const adminStudents = [
  {
    id: "PSTC-1042",
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
    id: "PSTC-1043",
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
    id: "PSTC-1044",
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
    id: "PSTC-1045",
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
    id: "PSTC-1046",
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
]

export const courseRecords = [
  {
    title: "Community Paramedic Training",
    category: "Healthcare",
    enrolled: 312,
    status: "Published",
    description: "Emergency response, patient assessment, airway care, and trauma fundamentals.",
    lessons: [
      { order: 1, title: "Intro to Emergency Response", duration: "12 min", quiz: true },
      { order: 2, title: "Vitals & Patient Assessment", duration: "18 min", quiz: true },
      { order: 3, title: "Airway Management", duration: "22 min", quiz: false },
      { order: 4, title: "Trauma Care Fundamentals", duration: "19 min", quiz: false },
    ],
  },
  {
    title: "HR Recruitment & Assessment",
    category: "Human Resources",
    enrolled: 148,
    status: "Published",
    description: "Structured interviews, assessment design, and hiring decision workflows.",
    lessons: [
      { order: 1, title: "Recruitment Funnel Basics", duration: "14 min", quiz: true },
      { order: 2, title: "Structured Interviewing", duration: "20 min", quiz: true },
      { order: 3, title: "Candidate Scorecards", duration: "16 min", quiz: false },
    ],
  },
  {
    title: "Public Health Essentials",
    category: "Public Health",
    enrolled: 96,
    status: "Draft",
    description: "Core public health principles, field data, surveillance, and community outreach.",
    lessons: [
      { order: 1, title: "Public Health Foundations", duration: "13 min", quiz: true },
      { order: 2, title: "Community Data Collection", duration: "21 min", quiz: false },
    ],
  },
  {
    title: "Trauma Response Basics",
    category: "Emergency Care",
    enrolled: 0,
    status: "Archived",
    description: "Rapid trauma triage, stabilization, and referral coordination.",
    lessons: [
      { order: 1, title: "Scene Safety and Triage", duration: "15 min", quiz: true },
      { order: 2, title: "Bleeding Control", duration: "17 min", quiz: true },
    ],
  },
]

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
]

export type SubmissionStatus = "Pending" | "Reviewed" | "Disputed"

export const submissionRows = [
  { id: "SUB-2291", student: "Nusrat Jahan", assessment: "Written - Mod 2", type: "Written", status: "Pending" as SubmissionStatus },
  { id: "SUB-2292", student: "Fahim Ahmed", assessment: "MCQ - Mod 4 (Scan)", type: "OMR", status: "Pending" as SubmissionStatus },
  { id: "SUB-2293", student: "Tanvir Hasan", assessment: "Lab Report - Mod 3", type: "Lab", status: "Reviewed" as SubmissionStatus },
  { id: "SUB-2294", student: "Sadia Islam", assessment: "Written - Mod 1 (Scan)", type: "Scan", status: "Disputed" as SubmissionStatus },
  { id: "SUB-2295", student: "Rakibul Islam", assessment: "MCQ - Mod 2", type: "OMR", status: "Pending" as SubmissionStatus },
]

export const scanReviewRows = [
  { q: 1, student: "B", correct: "B", matched: true },
  { q: 2, student: "C", correct: "A", matched: false },
  { q: 3, student: "D", correct: "D", matched: true },
]

export const gradingRows = [
  { student: "Fahim Ahmed", score: 92, grade: "A", status: "Auto-graded" },
  { student: "Nusrat Jahan", score: 68, grade: "C", status: "Manually Reviewed" },
  { student: "Rakibul Islam", score: 54, grade: "Fail", status: "Disputed" },
  { student: "Sadia Islam", score: 88, grade: "A", status: "Auto-graded" },
  { student: "Tanvir Hasan", score: 75, grade: "B", status: "Auto-graded" },
]

export const gradeDistribution = [
  { grade: "A", count: 18 },
  { grade: "B", count: 24 },
  { grade: "C", count: 12 },
  { grade: "Fail", count: 5 },
]

export const certificateRows = [
  { id: "CERT-0091", student: "Fahim Ahmed", course: "Paramedic", status: "Valid" },
  { id: "CERT-0092", student: "Rakibul Islam", course: "Public Health", status: "Valid" },
  { id: "CERT-0093", student: "M. Chowdhury", course: "Paramedic", status: "Revoked" },
]

export const sentMessages = [
  { subject: "Exam reminder - Mod 4", channel: "Email", openRate: "64%" },
  { subject: "Certificate issued", channel: "In-App", openRate: "91%" },
]

export const triggerRules = [
  "Send reminder 1 day before exam",
  "Send certificate on pass",
  "Alert admin on scan upload",
  "Notify on assessment dispute",
  "Weekly progress digest to students",
]

export const reportRows = [
  { assessment: "MCQ - Module 1", avgScore: "81%", passRate: "92%", attempts: 310 },
  { assessment: "Written - Module 2", avgScore: "74%", passRate: "85%", attempts: 298 },
  { assessment: "Practical - Module 3", avgScore: "79%", passRate: "88%", attempts: 276 },
]

export const reportTypes = [
  "Enrollment Report",
  "Completion Report",
  "Assessment Performance",
  "Certificate Issuance",
  "Submission Activity",
  "Revenue Report",
]

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
]

export const roleActivityLog = [
  "Course Manager export permission enabled by Super Admin",
  "Examiner delete permission removed by A. Karim",
  "Report Viewer assigned to T. Chowdhury",
]
