# Capture Sheet Pipeline

## Why this pivot

Random handwriting-page OCR is too brittle for accurate personal handwriting dataset creation.

The new pipeline uses **structured printable sheets** so the system knows what each written region is expected to contain.

## Core idea

1. Generate printable capture sheets
2. User fills them by hand
3. Upload scanned/photo images
4. Align image to template
5. Crop predefined slots
6. Build a dataset for:
   - characters
   - ligatures
   - words
   - sentences (optional reference only)
7. Render typed text with word-aware and ligature-aware composition

## Sheet types

### 1. Character sheet
- lowercase letters
- uppercase letters
- digits
- punctuation
- 5–8 repetitions each

### 2. Ligature sheet
Common joins and digraphs:
- th, he, in, er, an, re, on, at, en, nd
- ch, sh, oo, ll, ss, tt
- ing, ion, ent, ou, ar

### 3. Word sheet
High-frequency words and user-selected vocabulary:
- the, and, you, that, for, with
- names, signatures, recurring phrases
- custom words like animal, hello, thanks

### 4. Sentence sheet
Reference sentences for rhythm, slant, spacing, and line behavior.

## Benefits

- eliminates label guessing for known slots
- preserves real word forms and joins
- allows better rendering than isolated glyph assembly
- turns manual correction into a manageable review step

## MVP deliverables

- printable SVG/HTML capture sheets
- backend template definitions
- sheet upload and slot extraction
- dataset manifest with chars + ligatures + words
- frontend flow for capture-sheet mode

## Future upgrades

- homography/perspective correction from phone photo
- anchor marker detection
- stroke skeleton extraction
- context-aware renderer using word-first fallback order
