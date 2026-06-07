const { prisma } = require("../prisma/client");
const { getTokenFromRequest, verifyToken } = require("../services/authService");
const { AppError } = require("./errorHandler");

async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    const payload = verifyToken(token);

    if (!payload?.sub) {
      throw new AppError(401, "Authentication required");
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
      throw new AppError(401, "Authentication required");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth };
