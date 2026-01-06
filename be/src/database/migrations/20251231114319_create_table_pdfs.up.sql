CREATE TABLE pdfs (
    id UUID PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    summary TEXT,
    language VARCHAR(10) DEFAULT 'auto',
    output_type VARCHAR(20) DEFAULT 'paragraph',
    upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE OR REPLACE FUNCTION log_pdf_summary_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.summary IS DISTINCT FROM NEW.summary AND OLD.summary IS NOT NULL THEN
        INSERT INTO pdf_logs (pdf_id, summary, language, output_type, created_at)
        VALUES (OLD.id, OLD.summary, OLD.language, OLD.output_type, OLD.updated_at);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_pdf_summary
BEFORE UPDATE ON pdfs
FOR EACH ROW
EXECUTE FUNCTION log_pdf_summary_changes();
