import { query } from '../config/database';
import crypto from 'crypto';

// Types
export interface User {
  id: number;
  phone: string;
  name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

export interface OTPCode {
  id: number;
  phone: string;
  code: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export interface AuthToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  is_active: boolean;
  device_info: string | null;
  created_at: Date;
}

// ===================================
// User Functions
// ===================================

export const findUserByPhone = async (phone: string): Promise<User | null> => {
  const result = await query('SELECT * FROM users WHERE phone = $1', [phone]);
  return result.rows[0] || null;
};

export const findUserById = async (id: number): Promise<User | null> => {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const createUser = async (phone: string): Promise<User> => {
  const result = await query(
    `INSERT INTO users (phone, is_verified) VALUES ($1, true) 
     ON CONFLICT (phone) DO UPDATE SET is_verified = true, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [phone]
  );
  return result.rows[0];
};

export const updateUser = async (
  id: number,
  data: { name?: string; avatar_url?: string }
): Promise<User | null> => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIndex++}`);
    values.push(data.avatar_url);
  }

  if (fields.length === 0) return findUserById(id);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
};

export const updateLastLogin = async (id: number): Promise<void> => {
  await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [id]);
};

// ===================================
// OTP Functions
// ===================================

export const generateOTPCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createOTP = async (phone: string): Promise<string> => {
  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  // Mark any existing OTPs as used
  await query('UPDATE otp_codes SET used = true WHERE phone = $1 AND used = false', [phone]);

  // Create new OTP
  await query(
    'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
    [phone, code, expiresAt]
  );

  return code;
};

export const verifyOTP = async (phone: string, code: string): Promise<boolean> => {
  const result = await query(
    `SELECT * FROM otp_codes 
     WHERE phone = $1 AND code = $2 AND used = false AND expires_at > CURRENT_TIMESTAMP
     ORDER BY created_at DESC LIMIT 1`,
    [phone, code]
  );

  if (result.rows.length === 0) return false;

  // Mark OTP as used
  await query('UPDATE otp_codes SET used = true WHERE id = $1', [result.rows[0].id]);
  return true;
};

// Clean up old OTPs
export const cleanupExpiredOTPs = async (): Promise<number> => {
  const result = await query(
    `DELETE FROM otp_codes WHERE expires_at < CURRENT_TIMESTAMP OR used = true RETURNING id`
  );
  return result.rowCount || 0;
};

// ===================================
// Auth Token Functions
// ===================================

export const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const createAuthToken = async (
  userId: number,
  deviceInfo?: string
): Promise<string> => {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await query(
    `INSERT INTO auth_tokens (user_id, token, expires_at, device_info) VALUES ($1, $2, $3, $4)`,
    [userId, token, expiresAt, deviceInfo || null]
  );

  return token;
};

export const verifyAuthToken = async (token: string): Promise<User | null> => {
  const result = await query(
    `SELECT u.* FROM auth_tokens t
     JOIN users u ON t.user_id = u.id
     WHERE t.token = $1 AND t.is_active = true AND t.expires_at > CURRENT_TIMESTAMP`,
    [token]
  );
  return result.rows[0] || null;
};

export const revokeToken = async (token: string): Promise<boolean> => {
  const result = await query(
    'UPDATE auth_tokens SET is_active = false WHERE token = $1 RETURNING id',
    [token]
  );
  return (result.rowCount || 0) > 0;
};

export const revokeAllUserTokens = async (userId: number): Promise<void> => {
  await query('UPDATE auth_tokens SET is_active = false WHERE user_id = $1', [userId]);
};

// Clean up expired tokens
export const cleanupExpiredTokens = async (): Promise<number> => {
  const result = await query(
    `DELETE FROM auth_tokens WHERE expires_at < CURRENT_TIMESTAMP OR is_active = false RETURNING id`
  );
  return result.rowCount || 0;
};

// ===================================
// Rate Limiting Functions
// ===================================

const RATE_LIMIT_MAX = 3; // Maximum requests
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

export const checkRateLimit = async (phone: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> => {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW);

  // Get current rate limit record
  const result = await query(
    `SELECT * FROM rate_limits WHERE phone = $1 AND window_start > $2`,
    [phone, windowStart]
  );

  if (result.rows.length === 0) {
    // No recent requests, create new record
    await query(
      'INSERT INTO rate_limits (phone, request_count, window_start) VALUES ($1, 1, CURRENT_TIMESTAMP)',
      [phone]
    );
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX - 1,
      resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW)
    };
  }

  const record = result.rows[0];
  
  if (record.request_count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(new Date(record.window_start).getTime() + RATE_LIMIT_WINDOW)
    };
  }

  // Increment counter
  await query(
    'UPDATE rate_limits SET request_count = request_count + 1 WHERE id = $1',
    [record.id]
  );

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - record.request_count - 1,
    resetAt: new Date(new Date(record.window_start).getTime() + RATE_LIMIT_WINDOW)
  };
};

// Clean up old rate limit records
export const cleanupRateLimits = async (): Promise<number> => {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW);
  const result = await query(
    'DELETE FROM rate_limits WHERE window_start < $1 RETURNING id',
    [windowStart]
  );
  return result.rowCount || 0;
};

export default {
  findUserByPhone,
  findUserById,
  createUser,
  updateUser,
  updateLastLogin,
  generateOTPCode,
  createOTP,
  verifyOTP,
  cleanupExpiredOTPs,
  generateToken,
  createAuthToken,
  verifyAuthToken,
  revokeToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  checkRateLimit,
  cleanupRateLimits
};
