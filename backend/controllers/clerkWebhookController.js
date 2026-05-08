import { Webhook } from 'svix';
import logger from '../lib/logger.js';
import { User } from '../models/index.js';

/**
 * POST /auth/webhook — Clerk user lifecycle (Svix-signed).
 * Must use `express.raw` body (see app.js registration before JSON parser).
 */
export async function clerkWebhookHandler(req, res) {
  const secretRaw = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  const secret = typeof secretRaw === 'string' ? secretRaw.trim() : '';
  if (!secret) {
    logger.warn('CLERK_WEBHOOK_SIGNING_SECRET not set; rejecting webhook');
    return res.status(503).json({ success: false, error: 'Webhook signing not configured' });
  }

  const payloadString =
    Buffer.isBuffer(req.body) ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : '';

  if (!payloadString) {
    return res.status(400).json({ success: false, error: 'Empty body' });
  }

  const svixId = req.get('svix-id') || '';
  const svixTs = req.get('svix-timestamp') || '';
  const svixSig = req.get('svix-signature') || '';
  if (!svixId || !svixTs || !svixSig) {
    return res.status(400).json({ success: false, error: 'Missing Svix signature headers' });
  }

  let evt;
  try {
    evt = new Webhook(secret).verify(payloadString, {
      'svix-id': svixId,
      'svix-timestamp': svixTs,
      'svix-signature': svixSig
    });
  } catch (err) {
    logger.warn({ err: err.message }, 'Clerk webhook signature verification failed');
    return res.status(400).json({ success: false, error: 'Invalid signature' });
  }

  const type = evt?.type;
  const data = evt?.data;

  try {
    if (type === 'user.created' || type === 'user.updated') {
      const clerkUser = data;
      if (clerkUser?.id) {
        await User.findOneAndUpdate(
          { clerkId: clerkUser.id },
          {
            email: clerkUser.email_addresses?.[0]?.email_address,
            emailVerified: clerkUser.email_addresses?.[0]?.verification?.status === 'verified',
            lastLoginAt: new Date(),
            providerData: {
              firstName: clerkUser.first_name,
              lastName: clerkUser.last_name,
              imageUrl: clerkUser.image_url
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
      logger.info({ type, clerkUserId: clerkUser?.id }, 'Clerk user webhook processed');
    } else if (type === 'user.deleted') {
      if (data?.id) {
        await User.deleteOne({ clerkId: data.id });
      }
      logger.info({ clerkUserId: data?.id }, 'Clerk user deleted webhook processed');
    } else {
      logger.debug({ type }, 'Clerk webhook type ignored');
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error, type }, 'Clerk webhook handler error');
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
}
