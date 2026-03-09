import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { getPrismaWithUser, prisma } from './prisma';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'agrox-dev-secret';

// Declare global types
declare global {
  namespace Express {
    interface Request {
      user?: { sub: string, role: string };
    }
  }
}

// Authentication Middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string, role: string };
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Login Route (Testing only, issues a manual token)
app.post('/api/auth/login', async (req, res) => {
  const { email, role } = req.body;
  // For demo: Generate a mock user ID if none provided
  const dummyUserId = "123e4567-e89b-12d3-a456-426614174000"; 
  
  const token = jwt.sign({ sub: dummyUserId, role: role || 'ADMINISTRADOR' }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, user: { id: dummyUserId, role: role || 'ADMINISTRADOR' } });
});

// Organizations - using RLS Context
app.get('/api/organizations', authMiddleware, async (req, res) => {
  try {
    const rlsPrisma = getPrismaWithUser(req.user!.sub, req.user!.role);
    const orgs = await rlsPrisma.organization.findMany();
    res.json(orgs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Properties
app.get('/api/properties', authMiddleware, async (req, res) => {
  try {
    const rlsPrisma = getPrismaWithUser(req.user!.sub, req.user!.role);
    const properties = await rlsPrisma.property.findMany({
      include: {
        organization: true
      }
    });
    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Plots
app.get('/api/plots', authMiddleware, async (req, res) => {
  try {
    const rlsPrisma = getPrismaWithUser(req.user!.sub, req.user!.role);
    const plots = await rlsPrisma.plot.findMany();
    res.json(plots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch plots' });
  }
});

// Crops
app.get('/api/crops', authMiddleware, async (req, res) => {
  try {
    const rlsPrisma = getPrismaWithUser(req.user!.sub, req.user!.role);
    const crops = await rlsPrisma.crop.findMany({
      include: {
        stage_progress: true
      }
    });
    res.json(crops);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AgroX Backend running on port ${PORT}`);
});
