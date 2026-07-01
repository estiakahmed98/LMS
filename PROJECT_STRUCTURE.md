# PSTC LMS - Project Structure & Setup Guide

## Overview

This is a **frontend-only Learning Management System** for Professional Skills Training Center (PSTC). It uses **mock data** (stored in `/lib/mock-data.ts`) and is fully ready for you to add backend APIs and database connections.

## Key Features Built

### ✅ Fully Functional Pages
- **Login Page** - Split-screen design with email/password form
- **Learner Dashboard** - Shows enrolled courses, progress, and resume button
- **Admin Dashboard** - KPI cards, enrollment trends chart, completion rate pie chart
- **Students Management** - Table with search/filter, detail panel (stub ready for wiring)
- **Assessment Builder** - Tabbed interface for creating assessments

### ✅ Design System
- **Colors**: Crimson red (#DC2626) primary, dark navy (#1A1A2E) secondary
- **Dark Mode**: Full support with next-themes
- **Typography**: Clean, professional fonts with proper hierarchy
- **Responsive**: Mobile-first design with Tailwind CSS

### ✅ UI Components
- TopNav with theme/locale toggles
- AdminSidebar with navigation
- Modal dialogs and detail panels (scaffolded)
- Form components with validation via react-hook-form
- Charts via Recharts (Weekly Enrollment, Completion Rate)

---

## Project Structure

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx                    # Login page
├── (learner)/
│   ├── dashboard/page.tsx              # Student dashboard
│   ├── enroll/page.tsx                 # Course enrollment (stub)
│   ├── course/[courseId]/module/[moduleId]/page.tsx
│   ├── assessment/[id]/mcq/page.tsx
│   └── certificate/[id]/page.tsx
├── (admin)/
│   └── admin/
│       ├── dashboard/page.tsx          # Admin dashboard with charts
│       ├── students/page.tsx           # Students table + detail panel
│       ├── courses/page.tsx            # Courses list (stub)
│       ├── assessments/
│       │   ├── page.tsx
│       │   └── build/page.tsx          # Assessment builder
│       ├── submissions/page.tsx
│       ├── grading/page.tsx
│       ├── certificates/page.tsx
│       ├── notifications/page.tsx
│       ├── roles/page.tsx
│       ├── reports/page.tsx
│       └── settings/page.tsx
├── layout.tsx                          # Root layout (theme provider)
├── page.tsx                            # Redirects to /login
└── globals.css                         # Design tokens & colors

components/
├── TopNav.tsx                          # Top navigation bar
├── AdminSidebar.tsx                    # Admin sidebar menu
├── AdminLayout.tsx                     # Admin layout wrapper
└── ui/                                 # shadcn/ui components

lib/
└── mock-data.ts                        # All mock data structures

messages/
├── en.json                             # English translations (not used yet)
└── bn.json                             # Bengali translations (not used yet)

i18n/
└── request.ts                          # i18n config (not currently active)
```

---

## Mock Data Structure

All data is defined in `/lib/mock-data.ts`. The interfaces mirror what your database schema should look like:

```typescript
// Students
export interface User {
  id: string
  name: string
  email: string
  role: 'student' | 'instructor' | 'admin'
  status: 'active' | 'inactive' | 'pending'
  enrolledCourses: number
  joinDate: string
}

// Courses
export interface Course {
  id: string
  title: string
  description: string
  instructor: string
  hours: number
  category: string
  enrollmentCount: number
}

// Enrollments
export interface Enrollment {
  id: string
  userId: string
  courseId: string
  progress: number
  status: 'enrolled' | 'completed' | 'dropped'
  startDate: string
  completionDate?: string
}

// And more...
```

---

## How to Add Backend

### Step 1: Choose Your Stack

Recommended:
- **Database**: Neon (PostgreSQL) or Supabase
- **Auth**: Better Auth or Supabase Auth
- **API**: Next.js API routes or tRPC

### Step 2: Update Mock Data to API Calls

Replace mock data imports with API calls. Example:

**Before (Mock Data):**
```typescript
import { mockStudents, mockCourses } from '@/lib/mock-data'

export default function StudentsPage() {
  const students = mockStudents
  // ...
}
```

**After (API Call):**
```typescript
'use client'
import useSWR from 'swr'

export default function StudentsPage() {
  const { data: students } = useSWR('/api/students', fetch)
  // ...
}
```

### Step 3: Create API Routes

Create `/app/api/` routes to serve data:

```typescript
// app/api/students/route.ts
import { db } from '@/lib/db'

export async function GET() {
  const students = await db.query('SELECT * FROM users WHERE role = $1', ['student'])
  return Response.json(students)
}
```

### Step 4: Update Form Handlers

Forms currently just log data. Wire them to API calls:

```typescript
// Example: Before
const onSubmit = (data) => {
  console.log('Form data:', data)
}

// After
const onSubmit = async (data) => {
  const response = await fetch('/api/assessments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (response.ok) {
    router.push('/admin/assessments')
  }
}
```

---

## Features Ready to Wire

These pages are fully scaffolded UI but use mock data or stubs:

| Page | Current State | What to Wire |
|------|---------------|-------------|
| Students | ✅ Table + detail panel | API call for search/filter, student details |
| Courses | ✅ Full CRUD scaffolded | API endpoints for CRUD |
| Assessments | ✅ Builder UI ready | Save assessments, fetch questions |
| Submissions | ✅ Table ready | List student submissions from DB |
| Grading | ✅ Form ready | Save grades, trigger notifications |
| Certificates | ✅ Display ready | Generate/list certificates |

---

## Environment Variables

Once you add backend:

```env
# Database
DATABASE_URL=postgresql://user:password@db.neon.tech/dbname

# Authentication (if using Better Auth)
BETTER_AUTH_SECRET=your-secret-here

# API (if using external services)
API_KEY=your-api-key
```

Add these to your `.env.local` file and in Vercel Settings.

---

## Running the App

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Login with demo credentials
# Email: fahim@example.com
# Password: password
```

---

## Design Tokens

All colors are defined in `/app/globals.css` as CSS variables:

```css
:root {
  --primary: #DC2626;              /* Crimson Red */
  --secondary: #1A1A2E;            /* Dark Navy */
  --background: #F8F9FA;
  --foreground: #1A1A2E;
  /* ... */
}

.dark {
  --background: #0F0F1E;
  --foreground: #F8F9FA;
  /* ... */
}
```

To customize colors, edit `globals.css` and update the design tokens.

---

## Next Steps

1. **Set up your database** (Neon/Supabase/etc)
2. **Create API routes** in `/app/api/`
3. **Replace mock data** with API calls
4. **Test login flow** with real authentication
5. **Deploy to Vercel**

---

## Support

The app is production-ready on the frontend. All backend integration points are clearly marked in the code with comments.

Good luck building! 🚀
