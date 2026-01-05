package controller

import (
	"app/src/response"
	"app/src/service"
	"app/src/validation"
	"math"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type PDFController struct {
	PDFService service.PDFService
}

func NewPDFController(pdfService service.PDFService) *PDFController {
	return &PDFController{
		PDFService: pdfService,
	}
}

// @Tags         PDFs
// @Summary      Upload a PDF file
// @Description  Upload a PDF file to the server
// @Accept       multipart/form-data
// @Produce      json
// @Param        file  formData  file  true  "PDF file to upload"
// @Router       /pdfs [post]
// @Success      201  {object}  response.UploadPDFResponse
// @Failure      400  {object}  response.Common  "Bad Request"
// @Failure      500  {object}  response.Common  "Internal Server Error"
func (p *PDFController) UploadPDF(c *fiber.Ctx) error {
	pdf, err := p.PDFService.UploadPDF(c)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).
		JSON(response.UploadPDFResponse{
			ID:               pdf.ID,
			OriginalFilename: pdf.OriginalFilename,
			FileSize:         pdf.FileSize,
			Message:          "PDF uploaded successfully",
		})
}

// @Tags         PDFs
// @Summary      Get all PDFs
// @Description  Retrieve all uploaded PDFs with pagination and search
// @Produce      json
// @Param        page     query     int     false   "Page number"  default(1)
// @Param        limit    query     int     false   "Maximum number of PDFs"    default(10)
// @Param        search   query     string  false  "Search by original filename"
// @Router       /pdfs [get]
// @Success      200  {object}  response.PDFListResponse
// @Failure      400  {object}  response.Common  "Bad Request"
// @Failure      500  {object}  response.Common  "Internal Server Error"
func (p *PDFController) GetPDFs(c *fiber.Ctx) error {
	query := &validation.QueryPDF{
		Page:   c.QueryInt("page", 1),
		Limit:  c.QueryInt("limit", 10),
		Search: c.Query("search", ""),
	}

	pdfs, totalResults, err := p.PDFService.GetPDFs(c, query)
	if err != nil {
		return err
	}

	// Convert to response format
	pdfResponses := make([]response.PDFResponse, len(pdfs))
	for i, pdf := range pdfs {
		pdfResponses[i] = response.PDFResponse{
			ID:               pdf.ID,
			OriginalFilename: pdf.OriginalFilename,
			FileSize:         pdf.FileSize,
			UploadDate:       pdf.UploadDate,
		}
	}

	return c.Status(fiber.StatusOK).
		JSON(response.PDFListResponse{
			Data:       pdfResponses,
			Total:      totalResults,
			Page:       query.Page,
			Limit:      query.Limit,
			TotalPages: int(math.Ceil(float64(totalResults) / float64(query.Limit))),
		})
}

// @Tags         PDFs
// @Summary      Get a PDF by ID
// @Description  Retrieve a single PDF by its ID
// @Produce      json
// @Param        id  path  string  true  "PDF id"
// @Router       /pdfs/{id} [get]
// @Success      200  {object}  response.PDFResponse
// @Failure      400  {object}  response.Common  "Bad Request"
// @Failure      404  {object}  response.Common  "Not Found"
func (p *PDFController) GetPDFByID(c *fiber.Ctx) error {
	pdfID := c.Params("pdfId")

	if _, err := uuid.Parse(pdfID); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid PDF ID")
	}

	pdf, err := p.PDFService.GetPDFByID(c, pdfID)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusOK).
		JSON(response.PDFResponse{
			ID:               pdf.ID,
			OriginalFilename: pdf.OriginalFilename,
			FileSize:         pdf.FileSize,
			UploadDate:       pdf.UploadDate,
		})
}

// @Tags         PDFs
// @Summary      Delete a PDF
// @Description  Delete a PDF file and its metadata
// @Produce      json
// @Param        id  path  string  true  "PDF id"
// @Router       /pdfs/{id} [delete]
// @Success      200  {object}  response.Common
// @Failure      400  {object}  response.Common  "Bad Request"
// @Failure      404  {object}  response.Common  "Not Found"
// @Failure      500  {object}  response.Common  "Internal Server Error"
func (p *PDFController) DeletePDF(c *fiber.Ctx) error {
	pdfID := c.Params("pdfId")

	if _, err := uuid.Parse(pdfID); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid PDF ID")
	}

	if err := p.PDFService.DeletePDF(c, pdfID); err != nil {
		return err
	}

	return c.Status(fiber.StatusOK).
		JSON(response.Common{
			Code:    fiber.StatusOK,
			Status:  "success",
			Message: "PDF deleted successfully",
		})
}

// @Tags         PDFs
// @Summary      Summarize a PDF
// @Description  Generate a summary of the PDF content using AI
// @Produce      json
// @Param        id  path  string  true  "PDF id"
// @Router       /pdfs/{id}/summarize [post]
// @Success      200  {object}  response.SummaryResponse
// @Failure      400  {object}  response.Common  "Bad Request"
// @Failure      404  {object}  response.Common  "Not Found"
// @Failure      500  {object}  response.Common  "Internal Server Error"
// @Failure      503  {object}  response.Common  "Service Unavailable"
func (p *PDFController) SummarizePDF(c *fiber.Ctx) error {
	pdfID := c.Params("pdfId")

	if _, err := uuid.Parse(pdfID); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid PDF ID")
	}

	summaryResponse, err := p.PDFService.SummarizePDF(c, pdfID)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(summaryResponse)
}