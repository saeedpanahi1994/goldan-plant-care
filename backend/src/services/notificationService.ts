import { query } from '../config/database';

// Types
export interface Notification {
  id: number;
  user_id: number;
  user_plant_id: number | null;
  type: 'watering' | 'fertilizing' | 'health_check' | 'custom';
  title: string;
  message: string | null;
  scheduled_at: Date;
  sent_at: Date | null;
  read_at: Date | null;
  is_sent: boolean;
  is_read: boolean;
  is_active: boolean;
  created_at: Date;
}

export interface NotificationSettings {
  id: number;
  user_id: number;
  watering_enabled: boolean;
  watering_time: string;
  watering_days_before: number;
  fertilizing_enabled: boolean;
  fertilizing_time: string;
  fertilizing_days_before: number;
  push_enabled: boolean;
  sms_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

// ===================================
// Notification Functions
// ===================================

export const createNotification = async (
  userId: number,
  type: Notification['type'],
  title: string,
  message: string,
  scheduledAt: Date,
  userPlantId?: number
): Promise<Notification> => {
  const result = await query(
    `INSERT INTO notifications (user_id, user_plant_id, type, title, message, scheduled_at) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, userPlantId || null, type, title, message, scheduledAt]
  );
  return result.rows[0];
};

export const getNotificationsByUser = async (
  userId: number,
  includeRead: boolean = false
): Promise<(Notification & { plant_name?: string })[]> => {
  const readCondition = includeRead ? '' : 'AND n.is_read = false';
  const result = await query(
    `SELECT n.*, p.name_fa as plant_name 
     FROM notifications n 
     LEFT JOIN user_plants up ON n.user_plant_id = up.id
     LEFT JOIN plants p ON up.plant_id = p.id 
     WHERE n.user_id = $1 AND n.is_active = true ${readCondition}
     ORDER BY n.scheduled_at DESC`,
    [userId]
  );
  return result.rows;
};

export const getPendingNotifications = async (): Promise<Notification[]> => {
  const result = await query(
    `SELECT n.*, u.phone 
     FROM notifications n 
     JOIN users u ON n.user_id = u.id 
     WHERE n.is_sent = false AND n.is_active = true AND n.scheduled_at <= CURRENT_TIMESTAMP
     ORDER BY n.scheduled_at ASC`
  );
  return result.rows;
};

export const markNotificationAsSent = async (id: number): Promise<void> => {
  await query(
    'UPDATE notifications SET is_sent = true, sent_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );
};

export const markNotificationAsRead = async (id: number, userId: number): Promise<void> => {
  await query(
    'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
};

export const markAllNotificationsAsRead = async (userId: number): Promise<number> => {
  const result = await query(
    'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false RETURNING id',
    [userId]
  );
  return result.rowCount || 0;
};

export const deleteNotification = async (id: number, userId: number): Promise<boolean> => {
  const result = await query(
    'UPDATE notifications SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  return (result.rowCount || 0) > 0;
};

export const getUnreadCount = async (userId: number): Promise<number> => {
  const result = await query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false AND is_active = true',
    [userId]
  );
  return parseInt(result.rows[0].count) || 0;
};

// ===================================
// Notification Settings Functions
// ===================================

export const getNotificationSettings = async (userId: number): Promise<NotificationSettings | null> => {
  const result = await query(
    'SELECT * FROM notification_settings WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
};

export const createDefaultSettings = async (userId: number): Promise<NotificationSettings> => {
  const existing = await getNotificationSettings(userId);
  if (existing) return existing;

  const result = await query(
    'INSERT INTO notification_settings (user_id) VALUES ($1) RETURNING *',
    [userId]
  );
  return result.rows[0];
};

export const updateNotificationSettings = async (
  userId: number,
  data: Partial<NotificationSettings>
): Promise<NotificationSettings | null> => {
  const allowedFields = [
    'watering_enabled', 'watering_time', 'watering_days_before',
    'fertilizing_enabled', 'fertilizing_time', 'fertilizing_days_before',
    'push_enabled', 'sms_enabled'
  ];

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if ((data as any)[field] !== undefined) {
      fields.push(`${field} = $${paramIndex++}`);
      values.push((data as any)[field]);
    }
  }

  if (fields.length === 0) return getNotificationSettings(userId);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  const result = await query(
    `UPDATE notification_settings SET ${fields.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
};

// ===================================
// Scheduled Notifications Generator
// ===================================

export const generateWateringNotifications = async (): Promise<number> => {
  // Get all plants that need watering notifications
  const plants = await query(
    `SELECT up.id, p.name_fa as name, up.user_id, up.next_watering_at, ns.watering_enabled, ns.watering_time, ns.watering_days_before
     FROM user_plants up
     JOIN plants p ON up.plant_id = p.id
     JOIN notification_settings ns ON up.user_id = ns.user_id
     WHERE ns.watering_enabled = true 
     AND up.next_watering_at IS NOT NULL
     AND up.next_watering_at <= CURRENT_TIMESTAMP + (ns.watering_days_before || ' days')::interval`
  );

  let count = 0;
  for (const plant of plants.rows) {
    // Check if notification already exists
    const existing = await query(
      `SELECT id FROM notifications 
       WHERE user_plant_id = $1 AND type = 'watering' AND is_active = true 
       AND scheduled_at::date = $2::date`,
      [plant.id, plant.next_watering_at]
    );

    if (existing.rows.length === 0) {
      const scheduledAt = new Date(plant.next_watering_at);
      const [hours, minutes] = plant.watering_time.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await createNotification(
        plant.user_id,
        'watering',
        `آبیاری ${plant.name}`,
        `زمان آبیاری گیاه ${plant.name} فرا رسیده است 💧`,
        scheduledAt,
        plant.id
      );
      count++;
    }
  }

  return count;
};

export const generateFertilizingNotifications = async (): Promise<number> => {
  // Get all plants that need fertilizing notifications
  const plants = await query(
    `SELECT up.id, p.name_fa as name, up.user_id, up.next_fertilizing_at, ns.fertilizing_enabled, ns.fertilizing_time, ns.fertilizing_days_before
     FROM user_plants up
     JOIN plants p ON up.plant_id = p.id
     JOIN notification_settings ns ON up.user_id = ns.user_id
     WHERE ns.fertilizing_enabled = true 
     AND up.next_fertilizing_at IS NOT NULL
     AND up.next_fertilizing_at <= CURRENT_TIMESTAMP + (ns.fertilizing_days_before || ' days')::interval`
  );

  let count = 0;
  for (const plant of plants.rows) {
    // Check if notification already exists
    const existing = await query(
      `SELECT id FROM notifications 
       WHERE user_plant_id = $1 AND type = 'fertilizing' AND is_active = true 
       AND scheduled_at::date = $2::date`,
      [plant.id, plant.next_fertilizing_at]
    );

    if (existing.rows.length === 0) {
      const scheduledAt = new Date(plant.next_fertilizing_at);
      const [hours, minutes] = plant.fertilizing_time.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await createNotification(
        plant.user_id,
        'fertilizing',
        `کوددهی ${plant.name}`,
        `زمان کوددهی گیاه ${plant.name} فرا رسیده است 🌿`,
        scheduledAt,
        plant.id
      );
      count++;
    }
  }

  return count;
};

// Cleanup old notifications
export const cleanupOldNotifications = async (daysOld: number = 30): Promise<number> => {
  const result = await query(
    `DELETE FROM notifications 
     WHERE created_at < CURRENT_TIMESTAMP - ($1 || ' days')::interval 
     AND (is_read = true OR is_active = false) RETURNING id`,
    [daysOld]
  );
  return result.rowCount || 0;
};

export default {
  createNotification,
  getNotificationsByUser,
  getPendingNotifications,
  markNotificationAsSent,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  getNotificationSettings,
  createDefaultSettings,
  updateNotificationSettings,
  generateWateringNotifications,
  generateFertilizingNotifications,
  cleanupOldNotifications
};
