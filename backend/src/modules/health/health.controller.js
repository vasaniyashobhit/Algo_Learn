export const getHealth = async (_req, res, next) => {
  try {
    res.json({
      success: true,
      data: { status: 'ok', uptime: process.uptime(), time: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
};
