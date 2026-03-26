const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Unauthorized. No user found." });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          message: `Access denied. Role '${req.user.role}' not allowed.`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ message: "Authorization error" });
    }
  };
};

module.exports = authorizeRoles;
