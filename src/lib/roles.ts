/** Role hierarchy: owner > admin > member */

export type ChapterRole = "owner" | "admin" | "member";

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "officer" || role === "advisor";
}

export function isOwner(role: string | null | undefined): boolean {
  return role === "owner";
}

/** Display label for role (handles legacy officer/advisor as Admin) */
export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return "Member";
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
    case "officer":
    case "advisor":
      return "Admin";
    default:
      return "Member";
  }
}
