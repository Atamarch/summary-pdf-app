package router

import (
	"app/src/controller"
	"app/src/handler"
	"app/src/service"

	"github.com/gofiber/fiber/v2"
)

func PDFRoutes(v1 fiber.Router, p service.PDFService) {
	pdfController := controller.NewPDFController(p)
	pdfHandler := handler.NewPDFHandler(p)

	pdf := v1.Group("/pdfs")

	pdf.Post("/", pdfController.UploadPDF)
	pdf.Get("/", pdfController.GetPDFs)
	pdf.Get("/:pdfId", pdfController.GetPDFByID)
	pdf.Get("/:id/view", pdfHandler.ViewPDF)
	pdf.Delete("/:pdfId", pdfController.DeletePDF)
	pdf.Post("/:pdfId/summarize", pdfController.SummarizePDF)
}
