package dto

type PythonSummarizeRequest struct {
	FilePath string `json:"file_path"`
}

type PythonSummarizeResponse struct {
	SummaryText      string `json:"summary_text"`      
	ProcessingTimeMs int    `json:"processing_time_ms"` 
	Success          bool   `json:"success"`           
	Error            string `json:"error,omitempty"` 
}
