import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      /**
       * The Password provider calls this synchronously, so it must not be an
       * async function (a returned Promise is not a supported Convex value).
       * Teacher sign-up goes through `users.registerMember`, which enforces
       * uniqueness before the account is created; this callback only maps the
       * submitted fields onto the `users` table.
       */
      profile: (params) => {
        const email = String(params.email ?? "")
          .toLowerCase()
          .trim();

        // Sign-in and password-reset flows only need the account identifier.
        if (params.flow !== "signUp") {
          return { email };
        }

        return {
          email,
          fullName: String(params.fullName ?? "").trim(),
          idNumber: String(params.idNumber ?? "").trim(),
          tscNumber: String(params.tscNumber ?? "")
            .toUpperCase()
            .trim(),
          phone: String(params.phone ?? "").trim(),
          school: String(params.school ?? "").trim(),
          subCounty: String(params.subCounty ?? ""),
          designation: String(params.designation ?? ""),
          ...(params.schoolRole
            ? { schoolRole: String(params.schoolRole) }
            : {}),
          ...(Array.isArray(params.subjects) ? { subjects: params.subjects } : {}),
          ...(params.gender ? { gender: String(params.gender) } : {}),
          role: "member",
          status: "active",
          failedLoginCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      },
    }),
  ],
});
