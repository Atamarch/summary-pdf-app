package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PDF struct {
	ID               uuid.UUID `gorm:"primaryKey;not null" json:"id"`
	Filename         string    `gorm:"not null" json:"filename"`                    // Nama file di storage (dengan UUID)
	OriginalFilename string    `gorm:"not null" json:"original_filename"`           // Nama file asli dari user
	FilePath         string    `gorm:"not null" json:"file_path"`                   // Path lengkap file di folder
	FileSize         int64     `gorm:"not null" json:"file_size"`                   // Ukuran file dalam bytes
	UploadDate       time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"upload_date"`
	CreatedAt        time.Time `gorm:"autoCreateTime:milli" json:"created_at"`
	UpdatedAt        time.Time `gorm:"autoCreateTime:milli;autoUpdateTime:milli" json:"updated_at"`
}

func (pdf *PDF) BeforeCreate(_ *gorm.DB) error {
	pdf.ID = uuid.New()
	return nil
}