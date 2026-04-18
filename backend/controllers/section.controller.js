const { asyncHandler } = require("../middleware/errorHandler");
const { SectionService } = require("../services/database.service");
const { ApiError } = require("../utils/errors");
const { HTTP_STATUS } = require("../config/constants");

/**
 * GET /api/sections
 */
const getSections = asyncHandler(async (req, res) => {
  const sections = await SectionService.findAll();
  res.status(HTTP_STATUS.OK).json(sections);
});

/**
 * POST /api/sections
 */
const createSection = asyncHandler(async (req, res) => {
  const section = await SectionService.create({
    name: req.body.name,
    description: req.body.description,
    image: req.body.image,
    createdBy: req.user.userId,
  });

  res.status(HTTP_STATUS.CREATED).json(section);
});

/**
 * PUT /api/sections/:id
 */
const updateSection = asyncHandler(async (req, res) => {
  const section = await SectionService.findById(req.params.id);
  if (!section) {
    throw new ApiError("Section not found", HTTP_STATUS.NOT_FOUND);
  }

  const updated = await SectionService.update(req.params.id, req.body);
  res.status(HTTP_STATUS.OK).json(updated);
});

/**
 * DELETE /api/sections/:id
 */
const deleteSection = asyncHandler(async (req, res) => {
  const section = await SectionService.findById(req.params.id);
  if (!section) {
    throw new ApiError("Section not found", HTTP_STATUS.NOT_FOUND);
  }

  await SectionService.delete(req.params.id);
  res.status(HTTP_STATUS.OK).json({ message: "Section deleted successfully" });
});

module.exports = {
  getSections,
  createSection,
  updateSection,
  deleteSection,
};
