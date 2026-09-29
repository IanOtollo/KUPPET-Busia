import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      /**
       * The Password provider calls this synchronously, so it must not be an
       * async function (a returned Promise is not a supported Convex value).
       *
       * Accounts are only ever created server-side by `users.registerMember`
       * (which enforces uniqueness and password rules) and
       * `adminSetup.createDefaultAdmin`, both of which call `createAccount`
       * directly and never pass through this callback. A client calling
       * `signIn("password", { flow: "signUp" })` would bypass all of that, so
       * sign-up through the provider is refused outright.
       */
      profile: (params) => {
        if (params.flow === "signUp") {
          throw new Error("Direct sign-up is disabled.");
        }

        const email = String(params.email ?? "")
          .toLowerCase()
          .trim();

        return { email };
      },
    }),
  ],
});
