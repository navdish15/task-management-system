const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userRole = String(req.user.role).toLowerCase();
      const roles = allowedRoles.map((r) => String(r).toLowerCase());

      if (!roles.includes(userRole)) {
        console.warn(
          `Access denied: User ${req.user.id}, Role ${req.user.role}`,
        );
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({ message: "Authorization error" });
    }
  };
};

module.exports = authorizeRoles;
