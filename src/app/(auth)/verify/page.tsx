import { redirect } from "next/navigation";

// Email-link verification was never wired to a real mail flow and has been
// retired: new teachers are approved by a branch admin instead.
export default function VerifyPage() {
  redirect("/login");
}
