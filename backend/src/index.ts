import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first
dotenv.config();

// Import database and schema
import { query } from './config/database';
import pool from './config/database';
import { initializeDatabase } from './config/schema';

// Import routes
import plantRoutes from './routes/plants';
import gardenRoutes from './routes/gardens';
import authRoutes from './routes/auth';
import notificationRoutes from './routes/notifications';
import plantBankRoutes from './routes/plantBank';
import diagnosisRoutes from './routes/diagnosis';

const app = express();
const PORT = process.env.PORT || 4380;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: true, // Allow all origins for mobile app
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for plant images
app.use('/storage/plant', express.static(path.join(__dirname, '../gol_gadering/mainPic')));
app.use('/storage/plant', express.static(path.join(__dirname, '../gol_gadering/pics')));

// Static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🌱 به API گل دان خوش آمدید',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      plants: '/api/plants',
      gardens: '/api/gardens',
      notifications: '/api/notifications'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as server_time, version() as db_version');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        server_time: dbResult.rows[0].server_time,
        version: dbResult.rows[0].db_version.split(' ')[1]
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodejs: process.version
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodejs: process.version
      }
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/gardens', gardenRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/plant-bank', plantBankRoutes);
app.use('/api/diagnosis', diagnosisRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'خطای داخلی سرور',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'صفحه مورد نظر یافت نشد'
  });
});

// Start server with database initialization
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('📦 اتصال به دیتابیس PostgreSQL برقرار شد');

    // Initialize database tables
    await initializeDatabase();

    // Start Express server
    app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log(`🌱 سرور گل دان در پورت ${PORT} اجرا شد`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`🔗 API Base URL: http://130.185.76.46:${PORT}`);
      console.log('═══════════════════════════════════════════');
      console.log('');
    });
  } catch (error) {
    console.error('❌ خطا در راه‌اندازی سرور:', error);
    process.exit(1);
  }
};

startServer();