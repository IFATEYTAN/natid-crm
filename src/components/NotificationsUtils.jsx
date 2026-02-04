import { base44 } from '@/lib/api';

export const triggerNotification = async (event, data, currentUser) => {
  try {
    const settings = await base44.entities.NotificationSetting.filter({
      event: event,
      enabled: true,
    });

    if (!settings || settings.length === 0) return;

    for (const setting of settings) {
      if (setting.conditions) {
        if (setting.conditions.priority && setting.conditions.priority !== 'all') {
          if (data.priority && data.priority !== setting.conditions.priority) continue;
        }
      }

      if (setting.channels?.inApp) {
        let recipients = [];
        if (setting.recipients && setting.recipients.length > 0) {
          recipients.push(currentUser?.id);
        } else {
          recipients.push(currentUser?.id);
        }

        let title = setting.message_template?.title || setting.name;
        let body = setting.message_template?.body || 'התראה חדשה';

        if (data) {
          Object.keys(data).forEach((key) => {
            title = title.replace(new RegExp(`{${key}}`, 'g'), data[key] || '');
            body = body.replace(new RegExp(`{${key}}`, 'g'), data[key] || '');
          });
        }

        for (const userId of recipients) {
          if (!userId) continue;
          await base44.entities.Notification.create({
            user_id: userId,
            title: title,
            message: body,
            type: 'info',
            is_read: false,
            link: data.link || null,
            related_entity_id: data.id,
            related_entity_type: data.entityType,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch (error) {
    console.error('Error triggering notification:', error);
  }
};
