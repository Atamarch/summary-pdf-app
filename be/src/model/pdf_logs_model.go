package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PDFLog struct {
	ID         uuid.UUID `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	PDFID      uuid.UUID `gorm:"not null;column:pdf_id;index" json:"pdf_id"`
	Summary    string    `gorm:"type:text;not null" json:"summary"`
	Language   string    `gorm:"type:varchar(10);not null" json:"language"`
	OutputType string    `gorm:"type:varchar(20);not null;column:output_type" json:"output_type"`
	CreatedAt  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP;index:idx_pdf_logs_created_at,sort:desc" json:"created_at"`
}

func (PDFLog) TableName() string {
	return "pdf_logs"
}

func (log *PDFLog) BeforeCreate(_ *gorm.DB) error {
	log.ID = uuid.New()
	log.CreatedAt = time.Now()
	return nil
}