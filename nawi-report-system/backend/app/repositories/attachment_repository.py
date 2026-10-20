"""
Attachment repository — handles disk I/O, validation, sanitization, and magic bytes verification.
No filesystem access outside this repository.
"""

import os
import re
import uuid
from typing import Optional, Tuple

ATTACHMENTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage", "attachments"))

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def verify_magic_bytes(content: bytes, filename: str) -> Tuple[bool, str]:
    """
    Verifies that file content matches expected magic bytes for its extension.
    Returns (is_valid, detected_mime_or_reason).
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File extension '{ext}' is not permitted. Allowed: pdf, jpg, jpeg, png."

    if len(content) > MAX_FILE_SIZE_BYTES:
        return False, f"File exceeds maximum allowed size of 10 MB ({len(content)} bytes)."

    if len(content) < 4:
        return False, "File is too small or empty."

    # PDF: %PDF- (hex: 25 50 44 46)
    if ext == ".pdf":
        if content.startswith(b"%PDF"):
            return True, "application/pdf"
        return False, "Invalid PDF: magic bytes do not match %PDF signature."

    # JPEG: FF D8 FF
    if ext in (".jpg", ".jpeg"):
        if content.startswith(b"\xff\xd8\xff"):
            return True, "image/jpeg"
        return False, "Invalid JPEG: magic bytes do not match JFIF/EXIF signature."

    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if ext == ".png":
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            return True, "image/png"
        return False, "Invalid PNG: magic bytes do not match PNG signature."

    return False, "Unknown or unsupported file type."


def sanitize_filename(filename: str) -> str:
    """
    Strips directory traversals and unsafe characters.
    """
    base = os.path.basename(filename)
    # Strip any characters that are not alphanumeric, dot, dash, or underscore
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    if not clean or clean.startswith("."):
        clean = f"attachment_{uuid.uuid4().hex[:8]}" + os.path.splitext(base)[1]
    return clean


class AttachmentRepository:
    def __init__(self, storage_dir: str = ATTACHMENTS_DIR):
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)

    def save_attachment(self, original_filename: str, content: bytes) -> Tuple[str, str, int, str]:
        """
        Saves content to disk after sanitizing filename and prefixing with UUID.
        Returns (attachment_id, stored_filename, size, mime_type).
        """
        is_valid, mime_or_err = verify_magic_bytes(content, original_filename)
        if not is_valid:
            raise ValueError(mime_or_err)

        attachment_id = str(uuid.uuid4())
        clean_name = sanitize_filename(original_filename)
        stored_filename = f"{attachment_id}_{clean_name}"
        filepath = os.path.join(self.storage_dir, stored_filename)

        with open(filepath, "wb") as f:
            f.write(content)

        return attachment_id, stored_filename, len(content), mime_or_err

    def get_attachment_path(self, stored_filename: str) -> Optional[str]:
        """
        Returns absolute path of stored attachment if it exists.
        """
        clean_name = os.path.basename(stored_filename)
        filepath = os.path.join(self.storage_dir, clean_name)
        if os.path.isfile(filepath):
            return filepath
        return None

    def delete_attachment(self, stored_filename: str) -> bool:
        """
        Deletes stored attachment from disk.
        """
        clean_name = os.path.basename(stored_filename)
        filepath = os.path.join(self.storage_dir, clean_name)
        if os.path.isfile(filepath):
            try:
                os.remove(filepath)
                return True
            except OSError:
                return False
        return False


_attachment_repository = AttachmentRepository()


def get_attachment_repository() -> AttachmentRepository:
    return _attachment_repository
