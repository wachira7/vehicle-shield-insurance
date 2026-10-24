// Records a notification once per event and delivers it: always in the app, and by email or
// SMS when the recipient has those details and hasn't turned the channel off.
import { and, eq, sql } from "drizzle-orm";
import { getAddress } from "viem";
import { schema, type Database } from "../db";
import type { RoleCheck } from "../roles";
import { renderEmail, type Channels } from "./channels";
import type { Message } from "./messages";

export interface Notifier {
  /// Notifies one wallet. `key` identifies the event: the same key never notifies twice.
  notify(recipient: string, key: string, message: Message): Promise<void>;
  /// Notifies every registered assessor (in the app and by email; never SMS).
  notifyAssessors(key: string, message: Message): Promise<void>;
}

type Status = "sent" | "failed" | "skipped";

export function createNotifier({
  db,
  channels,
  appUrl,
  isAssessor,
  log = console.error,
}: {
  db: Database;
  channels: Channels;
  appUrl: string;
  isAssessor: RoleCheck;
  log?: (...args: unknown[]) => void;
}): Notifier {
  const profileOf = async (address: string) => {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(sql`lower(${schema.profiles.address}) = ${address.toLowerCase()}`);
    return profile;
  };

  const attempt = async (send: (() => Promise<void>) | undefined, label: string): Promise<Status> => {
    if (!send) return "skipped";
    try {
      await send();
      return "sent";
    } catch (error) {
      log(`Notification ${label} failed:`, error instanceof Error ? error.message : error);
      return "failed";
    }
  };

  async function notify(recipient: string, key: string, message: Message, { allowSms = true } = {}) {
    const profile = await profileOf(recipient);
    const address = profile?.address ?? getAddress(recipient);
    const [created] = await db
      .insert(schema.notifications)
      .values({ recipient: address, key, kind: message.kind, title: message.title, body: message.body, link: message.link ?? null })
      .onConflictDoNothing()
      .returning({ id: schema.notifications.id });
    if (!created) return; // already notified for this event

    const url = message.link ? `${appUrl}${message.link}` : undefined;
    const email = channels.email;
    const sms = channels.sms;
    const [emailStatus, smsStatus] = await Promise.all([
      attempt(
        email && profile?.email && profile.notifyEmail
          ? () => email({ to: profile.email, subject: message.title, ...renderEmail({ title: message.title, body: message.body, url }) })
          : undefined,
        `email to ${address}`,
      ),
      attempt(
        sms && allowSms && message.sms && profile?.phone && profile.notifySms
          ? () => sms({ to: profile.phone!, text: message.sms! })
          : undefined,
        `sms to ${address}`,
      ),
    ]);
    await db
      .update(schema.notifications)
      .set({ email: emailStatus, sms: smsStatus })
      .where(and(eq(schema.notifications.id, created.id)));
  }

  return {
    notify: (recipient, key, message) => notify(recipient, key, message),
    async notifyAssessors(key, message) {
      // Roles live on-chain and can't be listed, so check each registered profile (the role
      // check is cached). Fine for a small team; a role-change indexer would scale further.
      const profiles = await db.select({ address: schema.profiles.address }).from(schema.profiles);
      for (const { address } of profiles) {
        if (await isAssessor(address as `0x${string}`).catch(() => false)) await notify(address, key, message, { allowSms: false });
      }
    },
  };
}
