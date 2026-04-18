const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const { sectionValidators } = require("../validators");
const sectionController = require("../controllers/section.controller");
const { ROLES } = require("../config/constants");

// Get all sections (public)
router.get("/", sectionController.getSections);

// Create section (admin only)
router.post(
  "/",
  authenticateToken,
  authorize(ROLES.ADMIN),
  validate(sectionValidators.create),
  sectionController.createSection
);

// Update section (admin only)
router.put(
  "/:id",
  authenticateToken,
  authorize(ROLES.ADMIN),
  validate(sectionValidators.update),
  sectionController.updateSection
);

// Delete section (admin only)
router.delete(
  "/:id",
  authenticateToken,
  authorize(ROLES.ADMIN),
  sectionController.deleteSection
);

module.exports = router;
