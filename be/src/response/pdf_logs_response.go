package response

import (
	"time"

	"github.com/google/uuid"
)

type PDFLogResponse struct {
	ID         uuid.UUID `json:"id"`
	PDFID      uuid.UUID `json:"pdf_id"`
	Summary    string    `json:"summary"`
	Language   string    `json:"language"`
	OutputType string    `json:"output_type"`
	CreatedAt  time.Time `json:"created_at"`
}
