export type LearnerProfilePayload = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT";
  status: string;
  phone: string | null;
  photoUrl: string | null;
  createdAt: string;
  lastActive: string | null;
  enrollmentCount: number;
  profile: {
    dateOfBirth: string | null;
    nidNumber: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
  } | null;
};
