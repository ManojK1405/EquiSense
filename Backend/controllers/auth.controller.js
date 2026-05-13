import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isProd = process.env.NODE_ENV === 'production';

const cookieOptions = {
    httpOnly: true,
    secure: isProd, // true on production (HTTPS), false on localhost (HTTP)
    sameSite: isProd ? 'none' : 'lax', // 'none' for cross-site prod, 'lax' for same-site local
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const signup = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.cookie('token', token, cookieOptions);
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, brokerType: user.brokerType, zerodhaApiKey: user.zerodhaApiKey, hasZerodhaApiSecret: !!user.zerodhaApiSecret, hasZerodhaAccessToken: !!user.zerodhaAccessToken, zerodhaAccessExpiry: user.zerodhaAccessExpiry, growwApiKey: user.growwApiKey, hasGrowwApiSecret: !!user.growwApiSecret, hasGrowwAccessToken: !!user.growwAccessToken, growwAccessExpiry: user.growwAccessExpiry, dhanApiKey: user.dhanApiKey, hasDhanApiSecret: !!user.dhanApiSecret, hasDhanAccessToken: !!user.dhanAccessToken, dhanAccessExpiry: user.dhanAccessExpiry, mockBalance: user.mockBalance, autoPilotMock: user.autoPilotMock, autoPilotLive: user.autoPilotLive, pilotLimitMock: user.pilotLimitMock, pilotLimitLive: user.pilotLimitLive }, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

export const checkUser = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { name: true, avatar: true }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error checking user' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google Login. Please sign in with Google.' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Optimization: Fetch initial dashboard data to reduce loading time
    const [portfolioItems, recentAnalyses] = await Promise.all([
      prisma.portfolioItem.findMany({
        where: { userId: user.id },
        include: { stock: { select: { symbol: true } } },
        take: 10
      }),
      prisma.recentAnalysis.findMany({
        where: { userId: user.id },
        orderBy: { analyzedAt: 'desc' },
        take: 5
      })
    ]);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      brokerType: user.brokerType,
      mockBalance: user.mockBalance,
      autoPilotMock: user.autoPilotMock,
      autoPilotLive: user.autoPilotLive,
      // Pass the pre-fetched data to the frontend
      initialData: {
        portfolio: portfolioItems,
        recentAnalyses
      }
    };

    res.cookie('token', token, cookieOptions);
    res.status(200).json({ user: userPayload, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

export const googleLogin = async (req, res) => {
  const { tokenId } = req.body;

  try {
    const freshClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await freshClient.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture, sub } = ticket.getPayload();

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar: picture,
          googleId: sub,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { email },
        data: { googleId: sub, avatar: picture },
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.cookie('token', token, cookieOptions);
    res.status(200).json({ user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, brokerType: user.brokerType, zerodhaApiKey: user.zerodhaApiKey, hasZerodhaApiSecret: !!user.zerodhaApiSecret, hasZerodhaAccessToken: !!user.zerodhaAccessToken, zerodhaAccessExpiry: user.zerodhaAccessExpiry, growwApiKey: user.growwApiKey, hasGrowwApiSecret: !!user.growwApiSecret, hasGrowwAccessToken: !!user.growwAccessToken, growwAccessExpiry: user.growwAccessExpiry, dhanApiKey: user.dhanApiKey, hasDhanApiSecret: !!user.dhanApiSecret, hasDhanAccessToken: !!user.dhanAccessToken, dhanAccessExpiry: user.dhanAccessExpiry, mockBalance: user.mockBalance, autoPilotMock: user.autoPilotMock, autoPilotLive: user.autoPilotLive, pilotLimitMock: user.pilotLimitMock, pilotLimitLive: user.pilotLimitLive }, token });
  } catch (error) {
    console.error('[Google Login Error]:', error.message);
    res.status(500).json({ 
        message: 'Google authentication failed', 
        error: process.env.NODE_ENV === 'development' ? error.message : 'Invalid token or configuration' 
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, avatar: true, googleId: true, brokerType: true, zerodhaApiKey: true, zerodhaApiSecret: true, zerodhaAccessToken: true, zerodhaAccessExpiry: true, growwApiKey: true, growwApiSecret: true, growwAccessToken: true, growwAccessExpiry: true, dhanApiKey: true, dhanApiSecret: true, dhanAccessToken: true, dhanAccessExpiry: true, mockBalance: true, autoPilotMock: true, autoPilotLive: true, pilotLimitMock: true, pilotLimitLive: true }
    });
    const userPayload = {
      ...user,
      hasZerodhaAccessToken: !!user.zerodhaAccessToken,
      hasZerodhaApiSecret: !!user.zerodhaApiSecret,
      hasGrowwAccessToken: !!user.growwAccessToken,
      hasGrowwApiSecret: !!user.growwApiSecret,
      hasDhanAccessToken: !!user.dhanAccessToken,
      hasDhanApiSecret: !!user.dhanApiSecret
    };
    res.status(200).json(userPayload);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user' });
  }
};

export const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};

export const updateProfile = async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    if (newPassword) {
      if (user.googleId) {
        return res.status(400).json({ message: 'Password changes are disabled for Google-authenticated accounts.' });
      }
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new one.' });
      }
      const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ message: 'Incorrect current password.' });
      }
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData
    });

    res.json({ 
      message: 'Profile updated successfully',
      user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

export const getRecentAnalyses = async (req, res) => {
  try {
    const recent = await prisma.recentAnalysis.findMany({
      where: { userId: req.userId },
      orderBy: { analyzedAt: 'desc' },
      take: 5,
    });
    res.json(recent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch recent analyses' });
  }
};

export const recordRecentAnalysis = async (req, res) => {
  const { symbol, name } = req.body;
  if (!symbol) return res.status(400).json({ message: 'Symbol is required' });

  try {
    await prisma.recentAnalysis.upsert({
      where: { userId_symbol: { userId: req.userId, symbol } },
      update: { analyzedAt: new Date(), name },
      create: { userId: req.userId, symbol, name },
    });

    // Enforce max 5 per user: delete oldest beyond 5
    const all = await prisma.recentAnalysis.findMany({
      where: { userId: req.userId },
      orderBy: { analyzedAt: 'desc' },
    });
    if (all.length > 5) {
      const toDelete = all.slice(5).map(r => r.id);
      await prisma.recentAnalysis.deleteMany({ where: { id: { in: toDelete } } });
    }

    res.json({ message: 'Recorded' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to record analysis' });
  }
};
