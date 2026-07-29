const INSTRUCTOR_ADMIN_ROUTES = [
  { admin: "/admin/users", instructor: "/instructor/students" },
  { admin: "/admin/assessments", instructor: "/instructor/assessments" },
  { admin: "/admin/question-bank", instructor: "/instructor/question-bank" },
  { admin: "/admin/submissions", instructor: "/instructor/submissions" },
  { admin: "/admin/grading", instructor: "/instructor/grading" },
  { admin: "/admin/certificates", instructor: "/instructor/certificates" },
  { admin: "/admin/roles", instructor: "/instructor/roles" },
  { admin: "/admin/dashboard", instructor: "/instructor/dashboard" },
  { admin: "/admin/classes", instructor: "/instructor/classes" },
  { admin: "/admin/recordings", instructor: "/instructor/recordings" },
  { admin: "/admin/reports", instructor: "/instructor/participants" },
  { admin: "/admin/settings", instructor: "/instructor/settings" },
] as const;

function replacePrefix(pathname: string, from: string, to: string) {
  if (pathname === from) return to;
  if (pathname.startsWith(`${from}/`)) {
    return `${to}${pathname.slice(from.length)}`;
  }
  return null;
}

export function getInstructorPathForAdminPath(pathname: string) {
  for (const route of INSTRUCTOR_ADMIN_ROUTES) {
    const mapped = replacePrefix(pathname, route.admin, route.instructor);
    if (mapped) return mapped;
  }

  return null;
}
