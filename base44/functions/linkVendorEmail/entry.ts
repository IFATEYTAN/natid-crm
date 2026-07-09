import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { resolveAppRole } from './_shared/appRole.ts';

/**
 * Link an email address to a vendor profile.
 * Admin-only operation — allows vendors to log in and see their portal.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appRole = await resolveAppRole(base44, user);
    if (appRole !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { vendor_id, email } = await req.json();

    if (!vendor_id || !email) {
      return Response.json({ error: 'Missing vendor_id or email' }, { status: 400 });
    }

    // Normalize email to lowercase so it matches the user record regardless of
    // how it was typed (user emails are stored lowercase).
    const normalizedEmail = email.trim().toLowerCase();

    // Update vendor with the email
    await base44.asServiceRole.entities.Vendor.update(vendor_id, { email: normalizedEmail });

    // Promote the matching user to a vendor so they get the vendor portal.
    // Without this the user keeps role 'user' and cannot access the portal.
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    if (users.length > 0) {
      const targetUser = users[0];
      if (targetUser.role !== 'vendor' && targetUser.role !== 'ספק') {
        await base44.asServiceRole.entities.User.update(targetUser.id, {
          role: 'vendor',
          vendor_id,
        });
      }
      return Response.json({ success: true, vendor_id, email: normalizedEmail, role_updated: true });
    }

    // No user registered with this email yet — the email is linked, but the role
    // will only flip once the user signs up. Surface a warning instead of a silent success.
    return Response.json({
      success: true,
      vendor_id,
      email: normalizedEmail,
      role_updated: false,
      warning: 'האימייל קושר לספק, אך לא נמצא משתמש רשום עם כתובת זו. לאחר שהספק יירשם, יש לקשר שוב כדי להפוך אותו ל-vendor.',
    });
  } catch (error) {
    console.error('linkVendorEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});