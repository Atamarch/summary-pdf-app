package service

import (
	"app/src/dto"
	"app/src/model"
	"app/src/response"
	"app/src/utils"
	"app/src/validation"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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
	SummarizePDF(c *fiber.Ctx, id string, req *validation.SummarizeRequest) (*response.SummaryResponse, error)
	CancelSummarization(c *fiber.Ctx, id string) error
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

func (s *pdfService) UploadPDF(c *fiber.Ctx) (*model.PDF, error) {
	file, err := c.FormFile("file")
	if err != nil {
		s.Log.Errorf("Failed to get file from form: %+v", err)
		return nil, fiber.NewError(fiber.StatusBadRequest, "File is required")
	}

	ext := filepath.Ext(file.Filename)
	if ext != ".pdf" {
		return nil, fiber.NewError(fiber.StatusBadRequest, "Only PDF files are allowed")
	}

	// Validate MIME type
	fileReader, err := file.Open()
	if err != nil {
		s.Log.Errorf("Failed to open file: %+v", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to process file")
	}
	defer fileReader.Close()

	buffer := make([]byte, 512)
	n, err := fileReader.Read(buffer)
	if err != nil && err != io.EOF {
		s.Log.Errorf("Failed to read file: %+v", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to process file")
	}

	mimeType := http.DetectContentType(buffer[:n])
	s.Log.Infof("Detected MIME type: %s for file: %s", mimeType, file.Filename)
	if mimeType != "application/pdf" {
		return nil, fiber.NewError(fiber.StatusBadRequest, "Invalid file type, only PDF files are allowed")
	}

	maxSize := int64(10 * 1024 * 1024)
	if file.Size > maxSize {
		fileSizeMB := float64(file.Size) / (1024 * 1024)
		return nil, fiber.NewError(fiber.StatusBadRequest, fmt.Sprintf("File size (%.2f MB) exceeds the maximum limit of 10 MB. Please choose a smaller file.", fileSizeMB))
	}

	uniqueID := uuid.New().String()
	filename := fmt.Sprintf("%s%s", uniqueID, ext)

	storageDir := "./storage/pdf"
	if err := os.MkdirAll(storageDir, os.ModePerm); err != nil {
		s.Log.Errorf("Failed to create storage directory: %+v", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to create storage directory")
	}

	filePath := filepath.Join(storageDir, filename)

	if err := c.SaveFile(file, filePath); err != nil {
		s.Log.Errorf("Failed to save file: %+v", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to save file")
	}

	pdf := &model.PDF{
		Filename:         filename,
		OriginalFilename: file.Filename,
		FilePath:         filePath,
		FileSize:         file.Size,
	}

	result := s.DB.WithContext(c.Context()).Create(pdf)
	if result.Error != nil {
		os.Remove(filePath)
		s.Log.Errorf("Failed to create PDF record: %+v", result.Error)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to save PDF metadata")
	}
	return pdf, nil
}

func (s *pdfService) GetPDFs(c *fiber.Ctx, params *validation.QueryPDF) ([]model.PDF, int64, error) {
	var pdfs []model.PDF
	var totalResults int64

	if err := s.Validate.Struct(params); err != nil {
		return nil, 0, err
	}

	offset := (params.Page - 1) * params.Limit
	query := s.DB.WithContext(c.Context()).Order("upload_date desc")

	if search := params.Search; search != "" {
		query = query.Where("original_filename ILIKE ?", "%"+search+"%")
	}

	result := query.Model(&model.PDF{}).Count(&totalResults)
	if result.Error != nil {
		s.Log.Errorf("Failed to count PDFs: %+v", result.Error)
		return nil, 0, result.Error
	}

	result = query.Limit(params.Limit).Offset(offset).Find(&pdfs)
	if result.Error != nil {
		s.Log.Errorf("Failed to get PDFs: %+v", result.Error)
		return nil, 0, result.Error
	}

	return pdfs, totalResults, nil
}

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

func (s *pdfService) DeletePDF(c *fiber.Ctx, id string) error {
	pdf, err := s.GetPDFByID(c, id)
	if err != nil {
		return err
	}

	if err := os.Remove(pdf.FilePath); err != nil {
		if !os.IsNotExist(err) {
			s.Log.Errorf("Failed to delete file: %+v", err)
			return fiber.NewError(fiber.StatusInternalServerError, "Failed to delete file")
		}
	}

	result := s.DB.WithContext(c.Context()).Delete(&model.PDF{}, "id = ?", id)
	if result.Error != nil {
		s.Log.Errorf("Failed to delete PDF record: %+v", result.Error)
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to delete PDF record")
	}
	return nil
}

func (s *pdfService) SummarizePDF(c *fiber.Ctx, id string, req *validation.SummarizeRequest) (*response.SummaryResponse, error) {
	startTime := time.Now()

	// Create cancellable context
	ctx, cancel := context.WithCancel(c.Context())
	defer cancel()

	// 1. Validate request
	if err := s.Validate.Struct(req); err != nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, "Invalid request data")
	}

	// 2. Get PDF by ID
	pdf, err := s.GetPDFByID(c, id)
	if err != nil {
		return nil, err
	}

	// 3. Set status to processing
	if err := s.DB.WithContext(c.Context()).Model(&model.PDF{}).Where("id = ?", id).Updates(map[string]interface{}{
		"summary_status": "processing",
		"summary_error":  nil,
	}).Error; err != nil {
		s.Log.Errorf("Failed to set processing status: %+v", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to start summarization")
	}

	// 4. Update language dan output_type
	updates := map[string]interface{}{
		"language":    req.Language,
		"output_type": req.OutputType,
		"upload_date": time.Now(),
	}

	if err := s.DB.WithContext(c.Context()).Model(&model.PDF{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		s.Log.Errorf("Failed to update PDF config: %+v", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to update configuration")
	}

	// 5. Read PDF file
	fileContent, err := os.ReadFile(pdf.FilePath)
	if err != nil {
		s.Log.Errorf("Failed to read file: %+v", err)
		s.setFailedStatus(c, id, "PDF file not found")
		return nil, fiber.NewError(fiber.StatusNotFound, "PDF file not found")
	}

	// 6. Retry logic
	maxRetries := 3
	var lastError error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		s.Log.Infof("Summarization attempt %d for PDF %s", attempt, id)

		pythonResp, err := s.callPythonService(ctx, pdf, fileContent, req)
		if err != nil {
			lastError = err
			if s.isPermanentError(err) {
				s.Log.Errorf("Permanent error on attempt %d: %+v", attempt, err)
				s.setFailedStatus(c, id, err.Error())
				return nil, err
			}
			if attempt < maxRetries {
				waitTime := time.Duration(attempt*5) * time.Second
				s.Log.Infof("Retrying in %v...", waitTime)
				select {
				case <-time.After(waitTime):
				case <-ctx.Done():
					s.Log.Info("Summarization cancelled")
					s.setFailedStatus(c, id, "Cancelled by user")
					return nil, fiber.NewError(fiber.StatusRequestTimeout, "Summarization cancelled")
				}
				continue
			}
		} else {
			if err := s.DB.WithContext(c.Context()).Model(&model.PDF{}).Where("id = ?", id).Updates(map[string]interface{}{
				"summary":        pythonResp.SummaryText,
				"summary_status": "completed",
				"summary_error":  nil,
			}).Error; err != nil {
				s.Log.Errorf("Failed to save summary: %+v", err)
				return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to save summary")
			}

			return &response.SummaryResponse{
				PDFID:            pdf.ID,
				OriginalFilename: pdf.OriginalFilename,
				SummaryText:      pythonResp.SummaryText,
				Language:         req.Language,
				OutputType:       req.OutputType,
				ProcessingTimeMs: int(time.Since(startTime).Milliseconds()),
				GeneratedAt:      time.Now(),
			}, nil
		}
	}

	// All retries failed
	errorMsg := fmt.Sprintf("Failed after %d attempts: %v", maxRetries, lastError)
	s.Log.Errorf(errorMsg)
	s.setFailedStatus(c, id, errorMsg)
	return nil, fiber.NewError(fiber.StatusServiceUnavailable, "Summarization failed after retries")
}

func (s *pdfService) callPythonService(ctx context.Context, pdf *model.PDF, fileContent []byte, req *validation.SummarizeRequest) (*dto.PythonSummarizeResponse, error) {
	// Prepare multipart form
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Kirim file
	part, err := writer.CreateFormFile("file", pdf.OriginalFilename)
	if err != nil {
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to create form")
	}
	part.Write(fileContent)

	writer.WriteField("pdf_id", pdf.ID.String())
	writer.WriteField("original_filename", pdf.OriginalFilename)
	writer.WriteField("file_size", fmt.Sprintf("%d", pdf.FileSize))
	writer.WriteField("language", req.Language)
	writer.WriteField("output_type", req.OutputType)

	writer.Close()

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.SummaryServiceURL+"/summarize", body)
	if err != nil {
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to create request")
	}

	httpReq.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 120 * time.Second}
	httpResp, err := client.Do(httpReq)
	if err != nil {
		return nil, fiber.NewError(fiber.StatusServiceUnavailable, "Summarization service unavailable")
	}
	defer httpResp.Body.Close()

	respBody, _ := io.ReadAll(httpResp.Body)

	var pythonResp dto.PythonSummarizeResponse
	if err := json.Unmarshal(respBody, &pythonResp); err != nil {
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to parse response")
	}

	if !pythonResp.Success {
		if httpResp.StatusCode == 429 || strings.Contains(strings.ToLower(pythonResp.Error), "limit") {
			return nil, fiber.NewError(fiber.StatusTooManyRequests, pythonResp.Error)
		}
		return nil, fiber.NewError(fiber.StatusInternalServerError, pythonResp.Error)
	}

	return &pythonResp, nil
}

func (s *pdfService) isPermanentError(err error) bool {
	if e, ok := err.(*fiber.Error); ok {
		return e.Code == fiber.StatusBadRequest || e.Code == fiber.StatusTooManyRequests
	}
	return false
}

func (s *pdfService) setFailedStatus(c *fiber.Ctx, id string, errorMsg string) {
	s.DB.WithContext(c.Context()).Model(&model.PDF{}).Where("id = ?", id).Updates(map[string]interface{}{
		"summary_status": "failed",
		"summary_error":  errorMsg,
	})
}

func (s *pdfService) ViewPDF(c *fiber.Ctx, id string) error {
	pdf, err := s.GetPDFByID(c, id)
	if err != nil {
		return err
	}

	if _, err := os.Stat(pdf.FilePath); os.IsNotExist(err) {
		return fiber.NewError(fiber.StatusNotFound, "PDF file not found")
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", "inline; filename=\""+pdf.OriginalFilename+"\"")

	return c.SendFile(pdf.FilePath)
}

func (s *pdfService) CancelSummarization(c *fiber.Ctx, id string) error {
	_, err := s.GetPDFByID(c, id)
	if err != nil {
		return err
	}

	if err := s.DB.WithContext(c.Context()).Model(&model.PDF{}).Where("id = ?", id).Updates(map[string]interface{}{
		"summary_status": "pending",
		"summary_error":  nil,
	}).Error; err != nil {
		s.Log.Errorf("Failed to cancel summarization: %+v", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to cancel summarization")
	}

	s.Log.Infof("Summarization cancelled for PDF %s", id)
	return nil
}
