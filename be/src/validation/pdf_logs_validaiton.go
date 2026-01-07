package validation

type QueryPDFLog struct {
	Page       int    `json:"page" validate:"omitempty,min=1"`
	Limit      int    `json:"limit" validate:"omitempty,min=1,max=100"`
	Search     string `json:"search" validate:"omitempty,max=100"`
	Sort       string `json:"sort" validate:"omitempty,oneof=date_desc date_asc a_z z_a"`
	Language   string `json:"language" validate:"omitempty,oneof=auto id en ja"`
	OutputType string `json:"output_type" validate:"omitempty,oneof=paragraph bullet pointer"`
}

func (q *QueryPDFLog) SetDefaults() {
	if q.Page == 0 {
		q.Page = 1
	}
	if q.Limit == 0 {
		q.Limit = 10
	}
}