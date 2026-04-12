// generate_ppt.js
// Called by Flask: node generate_ppt.js slides.json output.pptx
// Reads slide data from JSON, generates a beautiful PPTX file

const pptxgen = require("pptxgenjs");
const fs      = require("fs");
const path    = require("path");

// ── Read args ─────────────────────────────────────────
const inputFile  = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error("Usage: node generate_ppt.js input.json output.pptx");
  process.exit(1);
}

// ── Load slide data ───────────────────────────────────
const data   = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
const slides = data.slides;
const topic  = data.topic  || "Presentation";
const theme  = data.theme  || "midnight";

// ── Color Themes ──────────────────────────────────────
const THEMES = {
  midnight: {
    bg:      "1E2761",
    accent:  "22D3EE",
    text:    "FFFFFF",
    subtext: "CADCFC",
    card:    "0F1A4A",
    dark:    "0A0F2E"
  },
  ocean: {
    bg:      "065A82",
    accent:  "02C39A",
    text:    "FFFFFF",
    subtext: "B8E0EF",
    card:    "04415F",
    dark:    "021A27"
  },
  coral: {
    bg:      "2F3C7E",
    accent:  "F96167",
    text:    "FFFFFF",
    subtext: "F9E795",
    card:    "1E2761",
    dark:    "111833"
  },
  forest: {
    bg:      "2C5F2D",
    accent:  "97BC62",
    text:    "FFFFFF",
    subtext: "D4E8B0",
    card:    "1A3D1B",
    dark:    "0F2410"
  }
};

const C = THEMES[theme] || THEMES.midnight;

// ── Create presentation ───────────────────────────────
let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title  = topic;

// ────────────────────────────────────────────────────────
// ── Slide builders
// ────────────────────────────────────────────────────────

function makeTitleSlide(slideData) {
  let slide = pres.addSlide();
  slide.background = { color: C.dark };

  // Left accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: C.accent }, line: { color: C.accent }
  });

  // Bottom bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 4.8, w: 10, h: 0.825,
    fill: { color: C.bg }, line: { color: C.bg }
  });

  // Main title
  slide.addText(slideData.title || topic, {
    x: 0.5, y: 1.2, w: 9, h: 1.6,
    fontSize: 44, fontFace: "Calibri",
    bold: true, color: C.text,
    align: "left", valign: "middle"
  });

  // Subtitle
  if (slideData.subtitle) {
    slide.addText(slideData.subtitle, {
      x: 0.5, y: 2.9, w: 8, h: 0.8,
      fontSize: 20, fontFace: "Calibri",
      color: C.subtext, align: "left",
      italic: true
    });
  }

  // Bottom label
  slide.addText(slideData.label || "Presentation", {
    x: 0.5, y: 4.9, w: 9, h: 0.5,
    fontSize: 12, fontFace: "Calibri",
    color: C.accent, align: "left"
  });
}

function makeContentSlide(slideData) {
  let slide = pres.addSlide();
  slide.background = { color: "F8FAFF" };

  // Top bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.0,
    fill: { color: C.bg }, line: { color: C.bg }
  });

  // Left accent bar on top
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.12, h: 1.0,
    fill: { color: C.accent }, line: { color: C.accent }
  });

  // Slide title
  slide.addText(slideData.title || "", {
    x: 0.3, y: 0.08, w: 9.4, h: 0.85,
    fontSize: 26, fontFace: "Calibri",
    bold: true, color: C.text,
    align: "left", valign: "middle",
    margin: 0
  });

  // Bullet points
  const bullets = slideData.bullets || [];
  if (bullets.length > 0) {
    const items = bullets.map((b, i) => ({
      text: b,
      options: {
        bullet: true,
        breakLine: i < bullets.length - 1,
        fontSize: 16,
        fontFace: "Calibri",
        color: "1E293B",
        paraSpaceAfter: 8
      }
    }));

    slide.addText(items, {
      x: 0.4, y: 1.15, w: 9.2, h: 4.2,
      valign: "top"
    });
  }

  // Optional note
  if (slideData.note) {
    slide.addText(slideData.note, {
      x: 0.4, y: 5.0, w: 9.2, h: 0.4,
      fontSize: 11, fontFace: "Calibri",
      color: "94A3B8", italic: true, align: "left"
    });
  }
}

function makeTwoColumnSlide(slideData) {
  let slide = pres.addSlide();
  slide.background = { color: "F8FAFF" };

  // Top bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.0,
    fill: { color: C.bg }, line: { color: C.bg }
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.12, h: 1.0,
    fill: { color: C.accent }, line: { color: C.accent }
  });

  slide.addText(slideData.title || "", {
    x: 0.3, y: 0.08, w: 9.4, h: 0.85,
    fontSize: 26, fontFace: "Calibri",
    bold: true, color: C.text,
    align: "left", valign: "middle", margin: 0
  });

  // Left column
  const left  = slideData.left  || [];
  const right = slideData.right || [];

  // Left header
  if (slideData.leftTitle) {
    slide.addText(slideData.leftTitle, {
      x: 0.3, y: 1.15, w: 4.5, h: 0.4,
      fontSize: 14, fontFace: "Calibri",
      bold: true, color: C.bg
    });
  }

  if (left.length > 0) {
    slide.addText(left.map((b, i) => ({
      text: b,
      options: { bullet: true, breakLine: i < left.length - 1, fontSize: 14, fontFace: "Calibri", color: "1E293B", paraSpaceAfter: 6 }
    })), { x: 0.3, y: slideData.leftTitle ? 1.55 : 1.2, w: 4.4, h: 3.8, valign: "top" });
  }

  // Divider
  slide.addShape(pres.shapes.LINE, {
    x: 5.0, y: 1.15, w: 0, h: 4.0,
    line: { color: C.accent, width: 1.5 }
  });

  // Right header
  if (slideData.rightTitle) {
    slide.addText(slideData.rightTitle, {
      x: 5.2, y: 1.15, w: 4.5, h: 0.4,
      fontSize: 14, fontFace: "Calibri",
      bold: true, color: C.bg
    });
  }

  if (right.length > 0) {
    slide.addText(right.map((b, i) => ({
      text: b,
      options: { bullet: true, breakLine: i < right.length - 1, fontSize: 14, fontFace: "Calibri", color: "1E293B", paraSpaceAfter: 6 }
    })), { x: 5.2, y: slideData.rightTitle ? 1.55 : 1.2, w: 4.4, h: 3.8, valign: "top" });
  }
}

function makeStatSlide(slideData) {
  let slide = pres.addSlide();
  slide.background = { color: C.dark };

  // Top bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.0,
    fill: { color: C.bg }, line: { color: C.bg }
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.12, h: 1.0,
    fill: { color: C.accent }, line: { color: C.accent }
  });

  slide.addText(slideData.title || "", {
    x: 0.3, y: 0.08, w: 9.4, h: 0.85,
    fontSize: 26, fontFace: "Calibri",
    bold: true, color: C.text,
    align: "left", valign: "middle", margin: 0
  });

  // Stats grid (up to 3 stats)
  const stats = (slideData.stats || []).slice(0, 3);
  const colW  = 10 / stats.length;

  stats.forEach((stat, i) => {
    const x = i * colW + 0.3;

    // Card bg
    slide.addShape(pres.shapes.RECTANGLE, {
      x: x, y: 1.3, w: colW - 0.6, h: 3.5,
      fill: { color: C.card }, line: { color: C.accent, width: 1 }
    });

    // Big number
    slide.addText(stat.value || "—", {
      x: x, y: 1.6, w: colW - 0.6, h: 1.4,
      fontSize: 52, fontFace: "Calibri",
      bold: true, color: C.accent,
      align: "center", valign: "middle"
    });

    // Label
    slide.addText(stat.label || "", {
      x: x, y: 3.0, w: colW - 0.6, h: 0.5,
      fontSize: 14, fontFace: "Calibri",
      color: C.subtext, align: "center"
    });

    // Description
    if (stat.desc) {
      slide.addText(stat.desc, {
        x: x, y: 3.5, w: colW - 0.6, h: 1.0,
        fontSize: 12, fontFace: "Calibri",
        color: "94A3B8", align: "center",
        italic: true
      });
    }
  });
}

function makeQuoteSlide(slideData) {
  let slide = pres.addSlide();
  slide.background = { color: C.bg };

  // Big quote mark
  slide.addText('"', {
    x: 0.3, y: 0.3, w: 2, h: 2,
    fontSize: 120, fontFace: "Georgia",
    color: C.accent, bold: true,
    align: "left", valign: "top"
  });

  // Quote text
  slide.addText(slideData.quote || "", {
    x: 0.8, y: 1.2, w: 8.5, h: 2.8,
    fontSize: 24, fontFace: "Georgia",
    color: C.text, italic: true,
    align: "center", valign: "middle"
  });

  // Attribution
  if (slideData.author) {
    slide.addText("— " + slideData.author, {
      x: 0.5, y: 4.2, w: 9, h: 0.6,
      fontSize: 16, fontFace: "Calibri",
      color: C.accent, align: "right", bold: true
    });
  }
}

function makeClosingSlide(slideData) {
  let slide = pres.addSlide();
  slide.background = { color: C.dark };

  // Accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: C.accent }, line: { color: C.accent }
  });

  // Bottom bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 4.8, w: 10, h: 0.825,
    fill: { color: C.bg }, line: { color: C.bg }
  });

  // Main text
  slide.addText(slideData.title || "Thank You", {
    x: 0.5, y: 1.4, w: 9, h: 1.4,
    fontSize: 48, fontFace: "Calibri",
    bold: true, color: C.text, align: "left"
  });

  if (slideData.subtitle) {
    slide.addText(slideData.subtitle, {
      x: 0.5, y: 3.0, w: 8.5, h: 0.8,
      fontSize: 20, fontFace: "Calibri",
      color: C.subtext, align: "left", italic: true
    });
  }

  slide.addText(slideData.label || topic, {
    x: 0.5, y: 4.9, w: 9, h: 0.5,
    fontSize: 12, fontFace: "Calibri",
    color: C.accent, align: "left"
  });
}

// ────────────────────────────────────────────────────────
// ── Build slides
// ────────────────────────────────────────────────────────

slides.forEach((slideData, index) => {
  const type = slideData.type || "content";

  switch (type) {
    case "title":   makeTitleSlide(slideData);     break;
    case "content": makeContentSlide(slideData);   break;
    case "two_col": makeTwoColumnSlide(slideData); break;
    case "stats":   makeStatSlide(slideData);      break;
    case "quote":   makeQuoteSlide(slideData);     break;
    case "closing": makeClosingSlide(slideData);   break;
    default:        makeContentSlide(slideData);   break;
  }
});

// ────────────────────────────────────────────────────────
// ── Save PPTX
// ────────────────────────────────────────────────────────

pres.writeFile({ fileName: outputFile })
  .then(() => {
    console.log("SUCCESS:" + outputFile);
    process.exit(0);
  })
  .catch(err => {
    console.error("ERROR:" + err.message);
    process.exit(1);
  });
