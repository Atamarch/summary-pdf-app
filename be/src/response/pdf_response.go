package response

import (
	"time"

	"github.com/google/uuid"
)

// PDFResponse for single PDF detail
type PDFResponse struct {
	ID               uuid.UUID `json:"id"`
	OriginalFilename string    `json:"original_filename"`
	FileSize         int64     `json:"file_size"`
	UploadDate       time.Time `json:"upload_date"`
}

// PDFListResponse for list PDFs with pagination
type PDFListResponse struct {
	Data       []PDFResponse `json:"data"`
	Total      int64         `json:"total"`
	Page       int           `json:"page"`
	Limit      int           `json:"limit"`
	TotalPages int           `json:"total_pages"`
}

// SummaryResponse for summarization result (not stored in DB)
type SummaryResponse struct {
	PDFID            uuid.UUID `json:"pdf_id"`
	OriginalFilename string    `json:"original_filename"`
	SummaryText      string    `json:"summary_text"`
	ProcessingTimeMs int       `json:"processing_time_ms"`
	GeneratedAt      time.Time `json:"generated_at"`
}

// UploadPDFResponse after successful upload
type UploadPDFResponse struct {
	ID               uuid.UUID `json:"id"`
	OriginalFilename string    `json:"original_filename"`
	FileSize         int64     `json:"file_size"`
	Message          string    `json:"message"`
}
