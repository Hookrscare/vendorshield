import { WorkspaceShell } from "@/components/WorkspaceShell";
import "./workspace.css";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
