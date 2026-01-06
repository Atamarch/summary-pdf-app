package router

import (
	"app/src/controller"
	"app/src/service"

	"github.com/gofiber/fiber/v2"
)

func PDFLogRoutes(v1 fiber.Router, l service.PDFLogService) {
	pdfLogController := controller.NewPDFLogController(l)

	pdf := v1.Group("/pdfs")

	pdf.Get("/:pdf_id/log", pdfLogController.GetAllLogs)
}
