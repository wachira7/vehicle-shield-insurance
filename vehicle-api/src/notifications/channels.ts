// How notifications leave the system. Email goes through Resend and SMS through Africa's
// Talking; without their keys, messages are logged instead, so development needs no accounts.

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Sms {
  to: string; // E.164, e.g. +254712345678
  text: string;
}

export interface Channels {
  email?: (email: Email) => Promise<void>;
  sms?: (sms: Sms) => Promise<void>;
}

type Fetch = typeof fetch;
const TIMEOUT_MS = 10_000;

/// Resend (https://resend.com): `from` must be on a domain verified in Resend, or
/// onboarding@resend.dev for testing (which only delivers to the account owner's address).
export function resendEmail({ apiKey, from, fetchImpl = fetch }: { apiKey: string; from: string; fetchImpl?: Fetch }) {
  return async (email: Email) => {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Resend answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
  };
}

/// Africa's Talking (https://africastalking.com). The username "sandbox" uses their simulator,
/// which shows messages in the dashboard without sending them; `senderId` needs approval first.
export function africasTalkingSms({
  username,
  apiKey,
  senderId,
  fetchImpl = fetch,
}: {
  username: string;
  apiKey: string;
  senderId?: string;
  fetchImpl?: Fetch;
}) {
  const host = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  return async (sms: Sms) => {
    const form = new URLSearchParams({ username, to: sms.to, message: sms.text });
    if (senderId) form.set("from", senderId);
    const response = await fetchImpl(`${host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await response.json().catch(() => ({}))) as { SMSMessageData?: { Recipients?: { status?: string }[] } };
    const status = body.SMSMessageData?.Recipients?.[0]?.status;
    if (!response.ok || status !== "Success") throw new Error(`Africa's Talking: ${response.status} ${status ?? "no recipient status"}`);
  };
}

/// Prints what would have been sent. Used for any channel without credentials.
export const logChannels = (log: (line: string) => void = console.log): Required<Channels> => ({
  email: async (email) => log(`[email → ${email.to}] ${email.subject}`),
  sms: async (sms) => log(`[sms → ${sms.to}] ${sms.text}`),
});

/// A plain, readable email: heading, text, one button.
export function renderEmail({ title, body, url }: { title: string; body: string; url?: string }): { text: string; html: string } {
  const escape = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const text = [title, "", body, ...(url ? ["", url] : []), "", "VehicleShield"].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6fa;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0b1020">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:14px;font-weight:600;color:#0f9f7f;padding-bottom:16px">VehicleShield</td></tr>
<tr><td style="font-size:22px;font-weight:600;line-height:1.3;padding-bottom:12px">${escape(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#3b4256;padding-bottom:24px">${escape(body)}</td></tr>
${url ? `<tr><td><a href="${escape(url)}" style="display:inline-block;background:#2dd4a7;color:#0b1020;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">Open in VehicleShield</a></td></tr>` : ""}
</table>
<p style="font-size:12px;color:#8a90a2;margin-top:16px">You're getting this because of activity on your VehicleShield account. Turn emails off in Account settings.</p>
</td></tr></table></body></html>`;
  return { text, html };
}
