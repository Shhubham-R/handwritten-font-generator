# Handwritten Font Generator

Instead of using regular handwritting font that uses similar looking letter consistently,We Randomly pick one of 5 variants of same letter each time its used Apply randomness, scale, and Avoid repeating the same variant for the same letter twice in a row, Each character can look different, more like real handwriting not just font.

## Features

What makes this different from a normal font preview:
- it does not render the whole text with a single font file
- instead, it loads multiple handwriting variants and randomly picks one per character
- repeated letters are forced to use different variants when possible, so the same character does not look mechanically identical
- every keystroke can re-roll the character-to-font assignments, which makes the text feel more handwritten and less like a standard digital font
- each glyph also gets subtle seeded wobble, tilt, and scale variation for a more natural handwritten look

## Live site check out

https://shhubham-r.github.io/handwritten-font-generator/

## Create your own fonts

If you want to create your own handwritten fonts for use, then use this preview repo:
- https://github.com/Shhubham-R/handwritten-font-generator-Stochastic-text-rendering

Just upload your handwritten image and it will create your own font, by scanning each letters and words, it will mimic your handwrittings

![Preview UI](assets/preview.png)

## Tech

- plain static HTML/CSS/JavaScript
- HTML5 Canvas rendering
- FontFace API for loading TTF fonts in the browser
- no backend

