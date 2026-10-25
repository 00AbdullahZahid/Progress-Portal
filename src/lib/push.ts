import webpush from "web-push";
import { db } from "./db";

export type PushPayload = {
  title: string;
  body?: string | null;
  href?: string | null;
  tag?: string;
};

export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send a browser push to every device a member has subscribed. Missing or
 * revoked subscriptions are cleaned up as we go; push failures never take down
 * the request that triggered them.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  if (userIds.length === 0 || !pushConfigured()) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;
  const privateKey = process.env.VAPID_PRIVATE_KEY as string;
  const subject = process.env.VAPID_SUBJECT || "mailto:notifications@example.com";

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 }
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription
            .deleteMany({ where: { endpoint: subscription.endpoint } })
            .catch(() => {});
        }
      }
    })
  );
}
