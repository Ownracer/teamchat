from pathlib import Path

def extract_text_from_file(path: Path, mime_type: str | None = None) -> str:
    """
    Best-effort text extraction from a file.
    Supports: txt, pdf, docx (and falls back to plain text).
    """
    ext = path.suffix.lower()

    try:
        # Plain text-ish files
        if ext in {".txt", ".log", ".md"}:
            return path.read_text(errors="ignore")

        # PDF
        if ext == ".pdf":
            import pdfplumber
            text_parts = []
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    text_parts.append(page.extract_text() or "")
            return "\n".join(text_parts)

        # DOCX
        if ext == ".docx":
            from docx import Document
            doc = Document(str(path))
            return "\n".join(p.text for p in doc.paragraphs)

        # Fallback – try as plain text
        return path.read_text(errors="ignore")
    except Exception as e:
        print(f"[file_text_extractor] Failed to extract from {path}: {e}")
        return ""
