"""Build the exam .docx from docs/submission/submission.md.

Run from the repository root:
    uv run --with python-docx --with pillow python docs/submission/build_docx.py
"""

import re
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs/submission/submission.md"
OUT = ROOT / "MCA85_ai_assisted_development_exam_expense_tracker.docx"

INLINE = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?://\S+)")
IMAGE = re.compile(r"!\[(.*?)\]\((.*?)\)(?:\{width=([\d.]+)\})?")


def add_hyperlink(paragraph, text, url, size=None):
    rid = paragraph.part.relate_to(url, RT.HYPERLINK, is_external=True)
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), rid)
    run = OxmlElement("w:r")
    props = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "0563C1")
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    props.append(color)
    props.append(underline)
    if size:
        sz = OxmlElement("w:sz")
        sz.set(qn("w:val"), str(int(size * 2)))
        props.append(sz)
    run.append(props)
    t = OxmlElement("w:t")
    t.text = text
    t.set(qn("xml:space"), "preserve")
    run.append(t)
    link.append(run)
    paragraph._p.append(link)


def add_inline(paragraph, text, size=None):
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith("**"):
            run = paragraph.add_run(part[2:-2])
            run.bold = True
        elif part.startswith("`"):
            run = paragraph.add_run(part[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt((size or 11) - 1.5)
            continue
        elif part.startswith("["):
            label, url = re.match(r"\[([^\]]+)\]\(([^)]+)\)", part).groups()
            add_hyperlink(paragraph, label, url, size)
            continue
        elif part.startswith("http"):
            url = part.rstrip(".,;)")
            add_hyperlink(paragraph, url, url, size)
            paragraph.add_run(part[len(url):])
            continue
        else:
            run = paragraph.add_run(part)
        if size:
            run.font.size = Pt(size)


def add_image(container, caption, path, width_cm, size=9):
    file = ROOT / path
    if not file.exists():
        raise FileNotFoundError(path)
    pic = container.add_paragraph()
    pic.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pic.paragraph_format.space_after = Pt(0)
    pic.paragraph_format.keep_with_next = True
    pic.add_run().add_picture(str(file), width=Cm(width_cm))
    cap = container.add_paragraph()
    cap.paragraph_format.space_after = Pt(4)
    run = cap.add_run(caption)
    run.italic = True
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor(0x40, 0x40, 0x40)


def set_cell_borders_none(table):
    tbl_pr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "nil")
        borders.append(el)
    tbl_pr.append(borders)


def build_table(doc, rows):
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    header, body = cells[0], cells[2:]
    has_images = any("![" in c for r in body for c in r)
    table = doc.add_table(rows=0, cols=len(header))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    if has_images:
        set_cell_borders_none(table)
        for row in [header] + body if any(header) and "![" in "".join(header) else body:
            tr = table.add_row()
            for i, text in enumerate(row):
                m = IMAGE.match(text)
                cell = tr.cells[i]
                cell.paragraphs[0]._p.getparent().remove(cell.paragraphs[0]._p)
                add_image(cell, m.group(1), m.group(2), float(m.group(3) or 8), size=8)
        return
    table.style = "Table Grid"
    for r_i, row in enumerate([header] + body):
        tr = table.add_row()
        for i, text in enumerate(row):
            p = tr.cells[i].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            add_inline(p, text, size=9.5)
            if r_i == 0:
                for run in p.runs:
                    run.bold = True
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def main():
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21), Cm(29.7)
    for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(sec, side, Cm(2))
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal.paragraph_format.space_after = Pt(4)
    normal.paragraph_format.space_before = Pt(0)
    for name, size in (("Heading 1", 17), ("Heading 2", 14), ("Heading 3", 12)):
        style = doc.styles[name]
        style.font.name = "Calibri"
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
        style.paragraph_format.space_before = Pt(8)
        style.paragraph_format.space_after = Pt(3)
    for name in ("List Bullet", "List Bullet 2"):
        doc.styles[name].paragraph_format.space_after = Pt(1)

    lines = SRC.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
        elif line.startswith("#"):
            level = len(line) - len(line.lstrip("#"))
            text = line[level:].strip()
            doc.add_heading(text, level=min(level, 3))
            i += 1
        elif line.startswith("|"):
            block = []
            while i < len(lines) and lines[i].startswith("|"):
                block.append(lines[i])
                i += 1
            build_table(doc, block)
        elif line.startswith("!["):
            m = IMAGE.match(line)
            add_image(doc, m.group(1), m.group(2), float(m.group(3) or 16))
            i += 1
        elif re.match(r"\s*- ", line):
            indent = len(line) - len(line.lstrip())
            p = doc.add_paragraph(style="List Bullet 2" if indent else "List Bullet")
            add_inline(p, line.strip()[2:])
            i += 1
        else:
            p = doc.add_paragraph()
            add_inline(p, line.strip())
            i += 1

    doc.core_properties.title = "AI-Assisted Development Exam - AI-Driven Expense Tracker"
    doc.save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
