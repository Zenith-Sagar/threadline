#!/usr/bin/env python3
"""Rewrite the exported demo PDF so its metadata is plain, readable text and carries the SI acknowledgment.

LibreOffice stores the document properties inside a compressed object stream. The Space Apps Submission Guide wants SI use
acknowledged "in descriptive text and metadata", so this step writes the Title, Author, Subject and Keywords as plain
entries (checked by tests/docs/demo.test.ts) and fails if the deck does not have exactly 7 pages (the official limit).

    python3 scripts/finish-demo-pdf.py docs/demo/threadline-demo-7slides.pdf
Needs  pypdf.
"""
import sys

from pypdf import PdfReader, PdfWriter

SI = "Built with SI assistance (Claude, Anthropic)"


def main(path: str) -> int:
    reader = PdfReader(path)
    n = len(reader.pages)
    if n != 7:
        print(f"{path} has {n} pages; the official limit is 7 slides including the title", file=sys.stderr)
        return 1
    writer = PdfWriter(clone_from=reader)
    writer.add_metadata(
        {
            "/Title": "Threadline: 7-slide project demo",
            "/Author": "Team Threadline (Sagar)",
            "/Subject": f"NASA Space Apps Challenge 2026 project demo. {SI}.",
            "/Keywords": f"NASA Space Apps 2026; Space Mission Design Game; SI-assisted; {SI}",
        }
    )
    with open(path, "wb") as fh:
        writer.write(fh)
    print(f"{path}: 7 pages, metadata written")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "docs/demo/threadline-demo-7slides.pdf"))
