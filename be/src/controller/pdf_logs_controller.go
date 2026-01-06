package controller

import (
	"app/src/response"
	"app/src/service"
	"app/src/validation"

	"github.com/gofiber/fiber/v2"
)

type PDFLogController struct {
	PDFLogService service.PDFLogService
}

func NewPDFLogController(pdfLogService service.PDFLogService) *PDFLogController {
	return &PDFLogController{
		PDFLogService: pdfLogService,
	}
}

// GetAllLogs godoc
// @Summary Get all PDF logs
// @Description Get all PDF logs from all PDFs with pagination
// @Tags PDF Logs
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} map[string]interface{} "Success response with logs data"
// @Failure 400 {object} map[string]interface{} "Invalid query parameters"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/logs [get]
func (ctrl *PDFLogController) GetAllLogs(c *fiber.Ctx) error {
	var params validation.QueryPDFLog
	params.Page = c.QueryInt("page", 1)
	params.Limit = c.QueryInt("limit", 10)
	params.SetDefaults()

	logs, total, err := ctrl.PDFLogService.GetAllLogs(c, &params)
	if err != nil {
		return err
	}

	// Map to response
	var logResponses []response.PDFLogResponse
	for _, log := range logs {
		logResponses = append(logResponses, response.PDFLogResponse{
			ID:         log.ID,
			PDFID:      log.PDFID,
			Summary:    log.Summary,
			Language:   log.Language,
			OutputType: log.OutputType,
			CreatedAt:  log.CreatedAt,
		})
	}

	totalPages := (total + int64(params.Limit) - 1) / int64(params.Limit)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "All PDF logs retrieved successfully",
		"data":    logResponses,
		"meta": fiber.Map{
			"page":        params.Page,
			"limit":       params.Limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}