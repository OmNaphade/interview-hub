const { prisma } = require("../prisma/client");
const { getTokenFromRequest, verifyToken } = require("../services/authService");

async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    const payload = verifyToken(token);

    if (!payload?.sub) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth };
