/**
 * Email templates. Table layout with inline styles and explicit colours so they
 * render the same in Gmail, Outlook and phone mail apps, including dark mode: the
 * logo has dark lettering on a transparent background, so it always sits on a white panel.
 */

const NAVY = "#1F3D5C";
const INK = "#101A24";
const MUTED = "#5B6B7B";
const LINE = "#E3E8EE";
const FONT = "Arial, Helvetica, sans-serif";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function approvalEmail(args: { fullName: string; tscNumber: string; siteUrl: string }) {
  const site = args.siteUrl.replace(/\/+$/, "");
  const loginUrl = `${site}/login`;
  const logoUrl = `${site}/logo.png`;
  const firstName = escapeHtml(args.fullName.trim().split(/\s+/)[0] || "Teacher");
  const tsc = escapeHtml(args.tscNumber);

  const subject = "Your KUPPET Busia membership is approved";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#EEF2F6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EEF2F6;">Your membership has been approved. You can now sign in to the KUPPET Busia portal.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EEF2F6" style="background-color:#EEF2F6;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
    <tr><td align="center" bgcolor="${NAVY}" style="background-color:${NAVY};border-radius:16px 16px 0 0;padding:28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:12px;padding:10px 16px;">
          <img src="${logoUrl}" width="160" height="80" alt="KUPPET Busia Branch" style="display:block;width:160px;height:80px;border:0;outline:none;">
        </td>
      </tr></table>
      <div style="font-family:${FONT};font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;margin-top:16px;">Busia Branch &middot; Members Portal</div>
    </td></tr>
    <tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:36px 32px 12px 32px;font-family:${FONT};color:${INK};">
      <div style="font-size:24px;line-height:32px;font-weight:bold;color:${NAVY};">You&rsquo;re approved, ${firstName}.</div>
      <p style="font-size:16px;line-height:26px;color:${INK};margin:16px 0 0 0;">
        The branch office has verified your details and approved your membership. Your account is now active, and you can sign in to the KUPPET Busia portal.
      </p>
    </td></tr>
    <tr><td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:24px 32px 8px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="${NAVY}" style="background-color:${NAVY};border-radius:10px;">
          <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:16px 40px;font-family:${FONT};font-size:17px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:10px;">Sign in to your account</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:20px 32px 36px 32px;font-family:${FONT};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#F4F7FA" style="background-color:#F4F7FA;border:1px solid ${LINE};border-radius:10px;padding:16px 20px;font-size:15px;line-height:24px;color:${INK};">
          Sign in with your TSC number <strong style="color:${NAVY};">${tsc}</strong> and the password you chose when you registered.
        </td>
      </tr></table>
      <p style="font-size:13px;line-height:20px;color:${MUTED};margin:20px 0 0 0;">
        If the button doesn&rsquo;t work, copy this link into your browser:<br>
        <a href="${loginUrl}" style="color:${NAVY};word-break:break-all;">${loginUrl}</a>
      </p>
    </td></tr>
    <tr><td align="center" bgcolor="#F4F7FA" style="background-color:#F4F7FA;border-top:1px solid ${LINE};border-radius:0 0 16px 16px;padding:20px 24px;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">
      Kenya Union of Post-Primary Education Teachers &middot; Busia Branch<br>
      You received this because you registered on the KUPPET Busia portal. If this wasn&rsquo;t you, please ignore this email.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = `You're approved, ${firstName}.

The branch office has verified your details and approved your KUPPET Busia membership. Your account is now active.

Sign in here: ${loginUrl}
Use your TSC number (${args.tscNumber}) and the password you chose when you registered.

KUPPET Busia Branch`;

  return { subject, html, text };
}
