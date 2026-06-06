import os
from pypdf import PdfReader
from docx import Document as DocxDocument
import csv

def chunk_text(text: str, page_number: int = 1, chunk_size: int = 1000, overlap: int = 200):
    chunks = []
    text_len = len(text)
    start = 0
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = text[start:end]
        if chunk.strip():
            chunks.append({
                "content": chunk.strip(),
                "page_number": page_number
            })
        start += (chunk_size - overlap)
        if start >= text_len or end == text_len:
            break
    return chunks

def extract_text_from_pdf(file_path: str):
    chunks = []
    try:
        reader = PdfReader(file_path)
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text and text.strip():
                chunks.extend(chunk_text(text, page_number=i+1))
    except Exception as e:
        print(f"Error parsing PDF file {file_path}: {e}")
    return chunks

def extract_text_from_docx(file_path: str):
    try:
        doc = DocxDocument(file_path)
        full_text = []
        for para in doc.paragraphs:
            if para.text:
                full_text.append(para.text)
        text = "\n".join(full_text)
        return chunk_text(text, page_number=1)
    except Exception as e:
        print(f"Error parsing docx file {file_path}: {e}")
        return []

def extract_text_from_csv(file_path: str):
    chunks = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f)
            headers = next(reader, None)
            row_num = 1
            for row in reader:
                if not row:
                    continue
                content = []
                if headers:
                    for h, val in zip(headers, row):
                        content.append(f"{h}: {val}")
                else:
                    content.append(", ".join(row))
                row_str = " | ".join(content)
                chunks.append({"content": f"Row {row_num}: {row_str}", "page_number": row_num})
                row_num += 1
    except Exception as e:
        print(f"Error parsing CSV file {file_path}: {e}")
    return chunks

def extract_text_from_txt(file_path: str):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        return chunk_text(text, page_number=1)
    except Exception as e:
        print(f"Error parsing TXT file {file_path}: {e}")
        return []

def parse_file(file_path: str, file_type: str):
    file_type = file_type.lower().strip(".")
    if file_type == "pdf":
        return extract_text_from_pdf(file_path)
    elif file_type in ["doc", "docx"]:
        return extract_text_from_docx(file_path)
    elif file_type == "csv":
        return extract_text_from_csv(file_path)
    else:
        return extract_text_from_txt(file_path)
