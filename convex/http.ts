import { httpRouter, HttpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

// Override /.well-known/jwks.json to guarantee valid JSON output
// regardless of how the JWKS env var was stored (shell quoting strips quotes)
http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    const rawJwks = process.env.JWKS ?? "{}";
    // Attempt to parse as valid JSON; if it fails, try wrapping it
    let jwks: string;
    try {
      JSON.parse(rawJwks);
      jwks = rawJwks;
    } catch {
      // The value was stored without quotes — convert JS object notation to JSON
      // by using Function eval in a safe way
      try {
        // eslint-disable-next-line no-new-func
        const obj = new Function("return " + rawJwks)();
        jwks = JSON.stringify(obj);
      } catch {
        jwks = "{}";
      }
    }
    return new Response(jwks, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

auth.addHttpRoutes(http);

export default http;
