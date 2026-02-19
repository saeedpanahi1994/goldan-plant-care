import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import { query } from '../config/database';
import { askPlantExpert } from '../services/chatService';
import { checkUsageLimit, trackUsage } from './subscription';

const router = Router();

// ===================================
// POST /api/chat/ask - Ask a question about a plant
// ===================================
router.post('/ask', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // بررسی محدودیت مصرف چت
    const usageCheck = await checkUsageLimit(user.id, 'chat');
    if (!usageCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `سهمیه ${usageCheck.period} چت هوشمند شما تمام شده (${usageCheck.limit} پیام)`,
        usageInfo: usageCheck,
        upgradeRequired: usageCheck.tier === 'free',
      });
    }

    const { plantId, plantName, question, context } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'سوال الزامی است'
      });
    }

    // 1. Get Answer from AI
    const answer = await askPlantExpert(plantName || 'گیاه', question, context);

    // 2. Save conversation to DB
    await query(`
      INSERT INTO plant_chat_history (user_id, plant_id, plant_name, question, answer)
      VALUES ($1, $2, $3, $4, $5)
    `, [user.id, plantId || null, plantName || null, question, answer]);

    // 3. ثبت مصرف
    await trackUsage(user.id, 'chat');

    res.json({
      success: true,
      answer
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در پردازش سوال'
    });
  }
});

// ===================================
// GET /api/chat/history - Get user's chat conversations
// ===================================
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { limit = 50, offset = 0 } = req.query;

    // Group by plant to show conversations list
    // Returns the latest message for each plant
    // Also checks if the plant is currently in user's garden
    const result = await query(`
      SELECT DISTINCT ON (pch.plant_id) 
        pch.id,
        pch.plant_id, 
        pch.plant_name, 
        pch.question, 
        pch.answer, 
        pch.created_at,
        CASE WHEN up.id IS NOT NULL THEN true ELSE false END as is_user_plant
      FROM plant_chat_history pch
      LEFT JOIN user_plants up ON pch.plant_id = up.id AND pch.user_id = up.user_id
      WHERE pch.user_id = $1
      ORDER BY pch.plant_id, pch.created_at DESC
    `, [user.id]);

    // Sort by most recent activity
    const sortedHistory = result.rows.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json({
      success: true,
      history: sortedHistory
    });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت تاریخچه چت'
    });
  }
});

// ===================================
// GET /api/chat/plant/:plantId - Get chat history for a specific plant
// ===================================
router.get('/plant/:plantId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { plantId } = req.params;

    const result = await query(`
      SELECT * FROM plant_chat_history
      WHERE user_id = $1 AND plant_id = $2
      ORDER BY created_at ASC
    `, [user.id, plantId]);

    res.json({
      success: true,
      messages: result.rows
    });
  } catch (error) {
    console.error('Plant chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت تاریخچه چت گیاه'
    });
  }
});

export default router;
