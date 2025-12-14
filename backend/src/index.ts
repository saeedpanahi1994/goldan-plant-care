import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import plantRoutes from './routes/plants';
import userRoutes from './routes/users';
import diagnosisRoutes from './routes/diagnosis';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🌱 به API گل دان خوش آمدید',
    version: '1.0.0',
    endpoints: {
      plants: '/api/plants',
      users: '/api/users', 
      diagnosis: '/api/diagnosis'
    }
  });
});

app.use('/api/plants', plantRoutes);
app.use('/api/users', userRoutes);
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

app.listen(PORT, () => {
  console.log(`🌱 سرور گل دان در پورت ${PORT} اجرا شد`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
});