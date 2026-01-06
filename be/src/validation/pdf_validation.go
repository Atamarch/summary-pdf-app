package validation

type UploadPDF struct {
	File interface{} `json:"file" validate:"required" swaggertype:"file" example:"document.pdf"`
}

type QueryPDF struct {
	Page   int    `validate:"omitempty,number,max=50"`
	Limit  int    `validate:"omitempty,number,max=50"`
	Search string `validate:"omitempty,max=100"`
}

type SummarizePDF struct {
	PDFID string `json:"pdf_id" validate:"required,uuid" example:"550e8400-e29b-41d4-a716-446655440000"`
}

type SummarizeRequest struct {
	Language   string `json:"language" validate:"required,oneof=auto id en ja"`
	OutputType string `json:"output_type" validate:"required,oneof=paragraph bullet pointer"`
}
