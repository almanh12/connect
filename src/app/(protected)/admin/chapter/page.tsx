import { redirect } from "next/navigation";

/** Redirect /admin/chapter to /admin (Overview) for backward compatibility */
export default function ChapterSettingsRedirect() {
  redirect("/admin");
}
