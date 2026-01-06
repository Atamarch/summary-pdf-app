CREATE TABLE pdf_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pdf_id UUID NOT NULL,
    summary TEXT NOT NULL,
    language VARCHAR(10) NOT NULL,
    output_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pdf_id) REFERENCES pdfs(id) ON DELETE CASCADE
);

CREATE INDEX idx_pdf_logs_pdf_id ON pdf_logs(pdf_id);
CREATE INDEX idx_pdf_logs_created_at ON pdf_logs(created_at DESC);
