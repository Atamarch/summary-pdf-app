package response

import (
	"time"

	"github.com/google/uuid"
)

type PDFResponse struct {
	ID               uuid.UUID `json:"id"`
	OriginalFilename string    `json:"original_filename"`
	FileSize         int64     `json:"file_size"`
	Summary          *string   `json:"summary,omitempty"`
	Language         string    `json:"language"`
	OutputType       string    `json:"output_type"`
	SummaryStatus    string    `json:"summary_status"`
	SummaryError     *string   `json:"summary_error,omitempty"`
	UploadDate       time.Time `json:"upload_date"`
}

type PDFListResponse struct {
	Data       []PDFResponse `json:"data"`
	Total      int64         `json:"total"`
	Page       int           `json:"page"`
	Limit      int           `json:"limit"`
	TotalPages int           `json:"total_pages"`
}

type SummaryResponse struct {
	PDFID            uuid.UUID `json:"pdf_id"`
	OriginalFilename string    `json:"original_filename"`
	SummaryText      string    `json:"summary_text"`
	Language         string    `json:"language"`
	OutputType       string    `json:"output_type"`
	ProcessingTimeMs int       `json:"processing_time_ms"`
	GeneratedAt      time.Time `json:"generated_at"`
}

type UploadPDFResponse struct {
	ID               uuid.UUID `json:"id"`
	OriginalFilename string    `json:"original_filename"`
	FileSize         int64     `json:"file_size"`
	UploadDate       time.Time `json:"upload_date"`
	Message          string    `json:"message"`
}
