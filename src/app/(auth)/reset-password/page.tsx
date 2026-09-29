import { redirect } from "next/navigation";

// Self-service email reset links are not used. Password resets go through the
// Executive Secretary — see /forgot-password.
export default function ResetPasswordPage() {
  redirect("/forgot-password");
}
