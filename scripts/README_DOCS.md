# Phase 1 Word Export Helper

This folder contains a simple script to generate a Phase 1 design Word document.

## Dependencies

Install Python dependencies:

```bash
pip install python-docx
```

## Run the script

From the `CLAUDE` project root:

```bash
python scripts/generate_phase1_docs.py
```

You can also run it from the `scripts` folder:

```bash
python generate_phase1_docs.py
```

Output:
- `CLAUDE/EHS_Phase1_Design.docx`

## Add Mermaid diagrams to the Word document

1. Open each `*_PHASE1.md` file in `CLAUDE/docs/`.
2. Copy the Mermaid blocks into a Mermaid-compatible tool.
3. Export each diagram as PNG or SVG.
4. Open `EHS_Phase1_Design.docx` in Word.
5. Replace each placeholder line that says:
   - "Insert exported diagram from ... here."
6. Save the document with the embedded images.
