import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Notifications live for 24 hours; sweep expired ones out every hour.
crons.interval("purge expired notifications", { hours: 1 }, internal.notifications.purgeExpired, {});

// Refresh the pre-computed membership figures used by the dashboards.
crons.interval("refresh member stats", { minutes: 15 }, internal.stats.startMembersRefresh, {});

// Rebuild the bereavement queue totals from the claims, correcting any drift.
crons.interval("recount bereavement queue", { hours: 24 }, internal.bereavement.recountStages, { cursor: null });

export default crons;
