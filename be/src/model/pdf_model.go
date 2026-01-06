package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PDF struct {
	ID               uuid.UUID `gorm:"primaryKey;not null" json:"id"`
	Filename         string    `gorm:"not null" json:"filename"`
	OriginalFilename string    `gorm:"not null" json:"original_filename"`
	FilePath         string    `gorm:"not null" json:"file_path"`
	FileSize         int64     `gorm:"not null" json:"file_size"`
	Summary          *string   `gorm:"type:text" json:"summary,omitempty"`
	Language         string    `gorm:"type:varchar(10);default:'auto'" json:"language"`
	OutputType       string    `gorm:"type:varchar(20);default:'paragraph'" json:"output_type"`
	UploadDate       time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"upload_date"`
	CreatedAt        time.Time `gorm:"not null" json:"created_at"`
	UpdatedAt        time.Time `gorm:"not null" json:"updated_at"`
}

func (pdf *PDF) BeforeCreate(_ *gorm.DB) error {
	pdf.ID = uuid.New()
	now := time.Now()
	pdf.CreatedAt = now
	pdf.UpdatedAt = now
	pdf.UploadDate = now
	return nil
}

func (pdf *PDF) BeforeUpdate(_ *gorm.DB) error {
	pdf.UpdatedAt = time.Now()
	return nil
}
