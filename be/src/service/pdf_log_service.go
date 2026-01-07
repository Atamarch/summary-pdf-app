package service

import (
	"app/src/model"
	"app/src/utils"
	"app/src/validation"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type PDFLogService interface {
	GetAllLogs(c *fiber.Ctx, params *validation.QueryPDFLog) ([]model.PDFLog, int64, error)
	GetLogsByPDFID(c *fiber.Ctx, pdfID string, params *validation.QueryPDFLog) ([]model.PDFLog, int64, error)
}

type pdfLogService struct {
	Log      *logrus.Logger
	DB       *gorm.DB
	Validate *validator.Validate
}

func NewPDFLogService(db *gorm.DB, validate *validator.Validate) PDFLogService {
	return &pdfLogService{
		Log:      utils.Log,
		DB:       db,
		Validate: validate,
	}
}

func (s *pdfLogService) GetAllLogs(c *fiber.Ctx, params *validation.QueryPDFLog) ([]model.PDFLog, int64, error) {
	var logs []model.PDFLog
	var totalResults int64

	if err := s.Validate.Struct(params); err != nil {
		return nil, 0, fiber.NewError(fiber.StatusBadRequest, "Invalid query parameters")
	}

	offset := (params.Page - 1) * params.Limit
	query := s.DB.WithContext(c.Context()).Order("created_at desc")

	result := query.Model(&model.PDFLog{}).Count(&totalResults)
	if result.Error != nil {
		s.Log.Errorf("Failed to count all PDF logs: %+v", result.Error)
		return nil, 0, fiber.NewError(fiber.StatusInternalServerError, "Failed to count logs")
	}

	result = query.Limit(params.Limit).Offset(offset).Find(&logs)
	if result.Error != nil {
		s.Log.Errorf("Failed to get all PDF logs: %+v", result.Error)
		return nil, 0, fiber.NewError(fiber.StatusInternalServerError, "Failed to get logs")
	}

	return logs, totalResults, nil
}

func (s *pdfLogService) GetLogsByPDFID(c *fiber.Ctx, pdfID string, params *validation.QueryPDFLog) ([]model.PDFLog, int64, error) {
	var logs []model.PDFLog
	var totalResults int64

	if err := s.Validate.Struct(params); err != nil {
		return nil, 0, fiber.NewError(fiber.StatusBadRequest, "Invalid query parameters")
	}

	offset := (params.Page - 1) * params.Limit
	query := s.DB.WithContext(c.Context()).Where("pdf_id = ?", pdfID)

	// Filters
	if params.Language != "" {
		query = query.Where("language = ?", params.Language)
	}
	if params.OutputType != "" {
		query = query.Where("output_type = ?", params.OutputType)
	}
	if params.Search != "" {
		query = query.Where("summary LIKE ?", "%"+params.Search+"%")
	}

	// Sorting
	switch params.Sort {
	case "date_asc":
		query = query.Order("created_at asc")
	case "a_z":
		query = query.Order("summary asc")
	case "z_a":
		query = query.Order("summary desc")
	default: // date_desc
		query = query.Order("created_at desc")
	}

	result := query.Model(&model.PDFLog{}).Count(&totalResults)
	if result.Error != nil {
		s.Log.Errorf("Failed to count PDF logs for PDF %s: %+v", pdfID, result.Error)
		return nil, 0, fiber.NewError(fiber.StatusInternalServerError, "Failed to count logs")
	}

	result = query.Limit(params.Limit).Offset(offset).Find(&logs)
	if result.Error != nil {
		s.Log.Errorf("Failed to get PDF logs for PDF %s: %+v", pdfID, result.Error)
		return nil, 0, fiber.NewError(fiber.StatusInternalServerError, "Failed to get logs")
	}

	return logs, totalResults, nil
}
