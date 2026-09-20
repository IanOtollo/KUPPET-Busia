/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as announcements from "../announcements.js";
import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as bereavement from "../bereavement.js";
import type * as busBookings from "../busBookings.js";
import type * as financialReports from "../financialReports.js";
import type * as harassment from "../harassment.js";
import type * as http from "../http.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_refs from "../lib/refs.js";
import type * as lib_validators from "../lib/validators.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as officials from "../officials.js";
import type * as schools from "../schools.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  announcements: typeof announcements;
  auditLog: typeof auditLog;
  auth: typeof auth;
  bereavement: typeof bereavement;
  busBookings: typeof busBookings;
  financialReports: typeof financialReports;
  harassment: typeof harassment;
  http: typeof http;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/refs": typeof lib_refs;
  "lib/validators": typeof lib_validators;
  messages: typeof messages;
  notifications: typeof notifications;
  officials: typeof officials;
  schools: typeof schools;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
