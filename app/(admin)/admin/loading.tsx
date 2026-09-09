import LearningLoader from "@/components/navigation/LearningLoader";

export default function AdminLoading() {
  return (
    <LearningLoader
      className="min-h-[calc(100vh-4rem)]"
      label="Loading admin workspace..."
    />
  );
}
