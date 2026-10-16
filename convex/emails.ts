"use node";

import nodemailer from "nodemailer";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { approvalEmail } from "./lib/emailTemplates";

/**
 * Tells a teacher their membership was approved. Sent through the branch Gmail account
 * (GMAIL_USER + GMAIL_APP_PASSWORD on the Convex deployment). It never throws into the
 * approval: a failed send is logged and the in-app notification still exists.
 */
export const sendApproval = internalAction({
  args: { email: v.string(), fullName: v.string(), tscNumber: v.string() },
  handler: async (_ctx, args) => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    const siteUrl = process.env.SITE_URL;
    if (!user || !pass || !siteUrl) {
      console.error("Approval email skipped: GMAIL_USER, GMAIL_APP_PASSWORD or SITE_URL is not set.");
      return { sent: false };
    }

    const { subject, html, text } = approvalEmail({
      fullName: args.fullName,
      tscNumber: args.tscNumber,
      siteUrl,
    });

    try {
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user, pass: pass.replace(/\s+/g, "") },
      });
      await transport.sendMail({
        from: `"KUPPET Busia Branch" <${user}>`,
        to: args.email,
        subject,
        html,
        text,
      });
      return { sent: true };
    } catch (err) {
      console.error("Approval email failed:", err instanceof Error ? err.message : err);
      return { sent: false };
    }
  },
});
