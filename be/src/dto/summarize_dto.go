package dto

// PythonSummarizeRequest - Data yang dikirim ke Python service
type PythonSummarizeRequest struct {
	FilePath string `json:"file_path"`
}

// PythonSummarizeResponse - Data yang diterima dari Python service
type PythonSummarizeResponse struct {
	SummaryText      string `json:"summary_text"`       // Hasil ringkasan
	ProcessingTimeMs int    `json:"processing_time_ms"` // Waktu proses (ms)
	Success          bool   `json:"success"`            // Status sukses/gagal
	Error            string `json:"error,omitempty"`    // Error message jika gagal
}