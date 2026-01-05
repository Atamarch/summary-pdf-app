package service

import (
	"app/src/dto"
	"app/src/model"
	"app/src/response"
	"app/src/utils"
	"app/src/validation"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type PDFService interface {
	UploadPDF(c *fiber.Ctx) (*model.PDF, error)
	GetPDFs(c *fiber.Ctx, params *validation.QueryPDF) ([]model.PDF, int64, error)
	GetPDFByID(c *fiber.Ctx, id string) (*model.PDF, error)
	DeletePDF(c *fiber.Ctx, id string) error
	SummarizePDF(c *fiber.Ctx, id string) (*response.SummaryResponse, error)
	ViewPDF(c *fiber.Ctx, id string) error
}

type pdfService struct {
	Log               *logrus.Logger
	DB                *gorm.DB
	Validate          *validator.Validate
	SummaryServiceURL string
}

func NewPDFService(db *gorm.DB, validate *validator.Validate, summaryServiceURL string) PDFService {
	return &pdfService{
		Log:               utils.Log,
		DB:                db,
		Validate:          validate,
		SummaryServiceURL: summaryServiceURL,
	}
}

// UploadPDF handles PDF file upload
func (s *pdfService) UploadPDF(c *fiber.Ctx) (*model.PDF, error) {
	file, err := c.FormFile("file")
	if err != nil {
		s.Log.Errorf("Failed to get file from form: %+v", err)
		return nil, fiber.NewError(fiber.StatusBadRequest, "File is required")
	}

	// Validate file extension
	ext := filepath.Ext(file.Filename)
	if ext != ".pdf" {
		return nil, fiber.NewError(fiber.StatusBadRequest, "Only PDF files are allowed")
	}

	// Validate file size (max 10MB)
	maxSize := int64(10 * 1024 * 1024) // 10MB
	if file.Size > maxSize {
		return nil, fiber.NewError(fiber.StatusBadRequest, "File size exceeds 10MB limit")
	}

	// Generate unique filename
	uniqueID := uuid.New().String()
	filename := fmt.Sprintf("%s%s", uniqueID, ext)

	// Create storage directory if not exists
	storageDir := "./storage/pdf"
	if err := os.MkdirAll(storageDir, os.ModePerm); err != nil {
		s.Log.Errorf("Failed to create storage directory: %+v", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to create storage directory")
	}

	// Full file path
	filePath := filepath.Join(storageDir, filename)

	// Save file to storage
	if err := c.SaveFile(file, filePath); err != nil {
		s.Log.Errorf("Failed to save file: %+v", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to save file")
	}

	// Create PDF record in database
	pdf := &model.PDF{
		Filename:         filename,
		OriginalFilename: file.Filename,
		FilePath:         filePath,
		FileSize:         file.Size,
	}

	result := s.DB.WithContext(c.Context()).Create(pdf)
	if result.Error != nil {
		// Rollback: delete file if DB insert fails
		os.Remove(filePath)
		s.Log.Errorf("Failed to create PDF record: %+v", result.Error)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to save PDF metadata")
	}

	return pdf, nil
}

// GetPDFs retrieves all PDFs with pagination and search
func (s *pdfService) GetPDFs(c *fiber.Ctx, params *validation.QueryPDF) ([]model.PDF, int64, error) {
	var pdfs []model.PDF
	var totalResults int64

	if err := s.Validate.Struct(params); err != nil {
		return nil, 0, err
	}

	offset := (params.Page - 1) * params.Limit
	query := s.DB.WithContext(c.Context()).Order("upload_date desc")

	if search := params.Search; search != "" {
		query = query.Where("original_filename LIKE ?", "%"+search+"%")
	}

	// Count total results
	result := query.Model(&model.PDF{}).Count(&totalResults)
	if result.Error != nil {
		s.Log.Errorf("Failed to count PDFs: %+v", result.Error)
		return nil, 0, result.Error
	}

	// Get paginated results
	result = query.Limit(params.Limit).Offset(offset).Find(&pdfs)
	if result.Error != nil {
		s.Log.Errorf("Failed to get PDFs: %+v", result.Error)
		return nil, 0, result.Error
	}

	return pdfs, totalResults, nil
}

// GetPDFByID retrieves a single PDF by ID
func (s *pdfService) GetPDFByID(c *fiber.Ctx, id string) (*model.PDF, error) {
	pdf := new(model.PDF)

	result := s.DB.WithContext(c.Context()).First(pdf, "id = ?", id)

	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return nil, fiber.NewError(fiber.StatusNotFound, "PDF not found")
	}

	if result.Error != nil {
		s.Log.Errorf("Failed to get PDF by ID: %+v", result.Error)
		return nil, result.Error
	}

	return pdf, nil
}

// DeletePDF deletes PDF file and database record
func (s *pdfService) DeletePDF(c *fiber.Ctx, id string) error {
	// Get PDF record first
	pdf, err := s.GetPDFByID(c, id)
	if err != nil {
		return err
	}

	// Delete file from storage
	if err := os.Remove(pdf.FilePath); err != nil {
		if !os.IsNotExist(err) {
			s.Log.Errorf("Failed to delete file: %+v", err)
			return fiber.NewError(fiber.StatusInternalServerError, "Failed to delete file")
		}
	}

	// Delete record from database
	result := s.DB.WithContext(c.Context()).Delete(&model.PDF{}, "id = ?", id)
	if result.Error != nil {
		s.Log.Errorf("Failed to delete PDF record: %+v", result.Error)
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to delete PDF record")
	}

	return nil
}

func (s *pdfService) SummarizePDF(c *fiber.Ctx, id string) (*response.SummaryResponse, error) {
	startTime := time.Now()

	// 1. Get PDF record
	pdf, err := s.GetPDFByID(c, id)
	if err != nil {
		return nil, err
	}

	// 2. Read file content
	fileContent, err := os.ReadFile(pdf.FilePath)
	if err != nil {
		s.Log.Errorf("Failed to read file: %+v", err)
		return nil, fiber.NewError(fiber.StatusNotFound, "PDF file not found")
	}

	// 3. Prepare multipart form request
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", pdf.OriginalFilename)
	if err != nil {
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to create form")
	}

	part.Write(fileContent)
	writer.Close()

	// 4. Call Python service
	httpReq, err := http.NewRequestWithContext(
		c.Context(),
		"POST",
		s.SummaryServiceURL+"/summarize",
		body,
	)
	if err != nil {
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to create request")
	}

	httpReq.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 60 * time.Second}
	httpResp, err := client.Do(httpReq)
	if err != nil {
		s.Log.Errorf("Failed to call Python service: %+v", err)
		return nil, fiber.NewError(fiber.StatusServiceUnavailable, "Summarization service unavailable")
	}
	defer httpResp.Body.Close()

	// 5. Parse response
	respBody, _ := io.ReadAll(httpResp.Body)

	var pythonResp dto.PythonSummarizeResponse
	if err := json.Unmarshal(respBody, &pythonResp); err != nil {
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to parse response")
	}

	if !pythonResp.Success {
		return nil, fiber.NewError(fiber.StatusInternalServerError, pythonResp.Error)
	}

	// 6. Return response
	return &response.SummaryResponse{
		PDFID:            pdf.ID,
		OriginalFilename: pdf.OriginalFilename,
		SummaryText:      pythonResp.SummaryText,
		ProcessingTimeMs: int(time.Since(startTime).Milliseconds()),
		GeneratedAt:      time.Now(),
	}, nil
}

// ViewPDF serves the PDF file for preview
func (s *pdfService) ViewPDF(c *fiber.Ctx, id string) error {
	// Get PDF record
	pdf, err := s.GetPDFByID(c, id)
	if err != nil {
		return err
	}

	// Check if file exists
	if _, err := os.Stat(pdf.FilePath); os.IsNotExist(err) {
		return fiber.NewError(fiber.StatusNotFound, "PDF file not found")
	}

	// Set headers for PDF
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", "inline; filename=\""+pdf.OriginalFilename+"\"")

	// Serve the file
	return c.SendFile(pdf.FilePath)
}
