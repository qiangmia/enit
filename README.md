# English for Information Technology — Lesson Plan System

## Overview

This is a responsive HTML lesson plan system for the 18-week "English for Information Technology" course at Yuan Ze University, Department of Information Management.

**Key features:**
- Responsive design (desktop, tablet, phone)
- Collapsible sections with Extract button for printing
- Interactive answer toggles
- Job role visual cards
- Audio player integration
- Topic-aligned Unsplash images

---

## File Structure

```
115 English for Info Tech/
├── templates/
│   └── lesson-plan-template.html    # Reusable HTML template
├── content-outline.json             # Content data for all weeks
├── generate-lesson.py               # Python generation script
├── Week 1/
│   └── Week1_Careers_and_Roles.html # Hand-crafted pilot
├── Wk2/
│   └── Week2_Hardware_and_Components.html
├── Wk3/
│   └── Week3_Operating_Systems.html
├── Wk4/
│   └── Week4_Networking_Basics.html
└── ...
```

---

## How to Generate a Lesson Plan

### 1. Edit the content file

Open `content-outline.json` and add or modify a week object:

```json
{
  "number": 5,
  "title": "Programming Basics",
  "title_short": "Programming",
  "subtitle": "Introduction to Programming Concepts",
  "duration": "2-hour Lesson",
  "header_image": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=400&fit=crop",
  "grammar_title": "Future Tense (will / going to)",
  "filename": "Programming_Basics",
  "learning_objectives": [
    "Identify at least <strong>5 programming languages</strong> and their uses.",
    "Use <strong>will/going to</strong> to describe future plans and predictions.",
    "Read and comprehend a short article about learning to code.",
    "Expand programming vocabulary including syntax, logic, and debugging terms."
  ],
  "warmup": { ... },
  "reading": { ... },
  "vocabulary": { ... },
  "grammar": { ... },
  "wrapup": { ... }
}
```

### 2. Run the generator

```bash
python generate-lesson.py
```

The script reads `content-outline.json` and generates HTML files in the appropriate week folders.

### 3. Verify the output

Open the generated HTML file in a browser to check:
- All sections render correctly
- Answer toggles work
- Responsive design on mobile
- Images load properly

---

## Content Structure

Each week object in `content-outline.json` has these fields:

| Field | Type | Description |
|---|---|---|
| `number` | integer | Week number (1-18) |
| `title` | string | Full title for header |
| `title_short` | string | Abbreviated title for page tab |
| `subtitle` | string | Subtitle below header |
| `duration` | string | Lesson duration (e.g., "2-hour Lesson") |
| `header_image` | string | Unsplash URL for header background |
| `grammar_title` | string | Grammar focus for the week |
| `filename` | string | Output filename (no extension) |
| `learning_objectives` | array | 4-5 objectives as HTML strings |
| `warmup` | object | Warm-up activity content |
| `reading` | object | Reading article and comprehension |
| `vocabulary` | object | 4 vocabulary categories with terms |
| `grammar` | object | Grammar explanation and activities |
| `wrapup` | object | Exit ticket and homework |

---

## Warm-up Object

```json
{
  "title": "Activity Title",
  "setup": "Instructions for setting up the activity.",
  "activity": "What students do during the activity.",
  "example": "Example sentence or response."
}
```

---

## Reading Object

```json
{
  "pre_read_words": [
    {"word": "term", "meaning": "definition"}
  ],
  "article_title": "Title of the Article",
  "article_subtitle": "Subtitle",
  "article_meta": {
    "name": "Character Name (中文)",
    "age": "25",
    "job": "Job Title",
    "company": "Company, Location",
    "education": "Degree"
  },
  "article_paragraphs": [
    {
      "time": "9:00 AM",
      "heading": "Section Title",
      "content": "Paragraph text..."
    }
  ],
  "article_quote": {
    "text": "Inspirational quote from the character.",
    "cite": "— Name, Title"
  },
  "comprehension_questions": [
    {
      "question": "Question text?",
      "options": ["a) Option 1", "b) Option 2", "c) Option 3", "d) Option 4"]
    }
  ],
  "discussion_questions": [
    "Open-ended question for class discussion."
  ]
}
```

---

## Vocabulary Object

```json
{
  "categories": [
    {
      "name": "Category Name",
      "icon": "🔧",
      "terms": [
        {
          "term": "English term",
          "chinese": "中文翻譯",
          "definition": "Short definition"
        }
      ]
    }
  ]
}
```

Each week has 4 vocabulary categories with 6-8 terms each.

---

## Grammar Object

```json
{
  "title": "Grammar Topic",
  "review_box": {
    "title": "Review Box Title",
    "content": "Review content with HTML.",
    "table": [
      {"subject": "Pattern", "example": "Example sentence."}
    ]
  },
  "key_rules": [
    "Rule 1 with example.",
    "Rule 2 with example."
  ],
  "common_mistakes": "Common mistake explanation for Chinese L1 speakers.",
  "activities": [
    {
      "title": "Activity A: Title",
      "description": "Instructions.",
      "exercises": [
        {"sentence": "Fill-in sentence.", "answer": "Correct answer"}
      ]
    },
    {
      "title": "Activity B: Title",
      "description": "Instructions.",
      "prompt": "Prompt text.",
      "example": "Example response."
    }
  ]
}
```

---

## Wrap-up Object

```json
{
  "exit_ticket": [
    "One new thing I learned: __________",
    "One thing I want to know more about: __________"
  ],
  "homework": [
    "Assignment 1.",
    "Assignment 2."
  ]
}
```

---

## Adding Audio

To add audio to a lesson plan:

1. Place the MP3 file in the week's folder
2. Edit the generated HTML file
3. Find the `<audio>` tag and update the `src` attribute:

```html
<audio controls src="your-audio-file.mp3">
```

---

## Customizing Images

Each week uses an Unsplash image for the header. To change it:

1. Find an image on [Unsplash](https://unsplash.com)
2. Copy the image URL
3. Update the `header_image` field in `content-outline.json`

Recommended search terms by week:

| Week | Topic | Search Term |
|---|---|---|
| 2 | Hardware | `computer hardware` or `circuit board` |
| 3 | Operating Systems | `code screen` or `terminal` |
| 4 | Networking | `server room` or `network cables` |
| 5 | Programming | `programming code` or `developer` |
| 6 | Web Development | `web design` or `html css` |
| 7 | Databases | `data center` or `database` |
| 8 | Cybersecurity | `cybersecurity` or `hacker` |
| 11 | Cloud Computing | `cloud computing` or `server` |
| 12 | AI | `artificial intelligence` or `robot` |
| 13 | Mobile Dev | `mobile app` or `smartphone` |
| 14 | Project Management | `team meeting` or `whiteboard` |

---

## Template Variables

The template uses these placeholders:

| Placeholder | Description |
|---|---|
| `{{WEEK_NUMBER}}` | Week number |
| `{{WEEK_TITLE}}` | Full title |
| `{{WEEK_TITLE_SHORT}}` | Short title for tab |
| `{{WEEK_SUBTITLE}}` | Subtitle |
| `{{WEEK_DURATION}}` | Duration text |
| `{{HEADER_IMAGE_URL}}` | Unsplash image URL |
| `{{GRAMMAR_TITLE}}` | Grammar topic name |
| `{{LEARNING_OBJECTIVES}}` | Generated HTML |
| `{{WARMUP_CONTENT}}` | Generated HTML |
| `{{READING_CONTENT}}` | Generated HTML |
| `{{VOCABULARY_CONTENT}}` | Generated HTML |
| `{{GRAMMAR_CONTENT}}` | Generated HTML |
| `{{WRAPUP_CONTENT}}` | Generated HTML |

---

## Troubleshooting

**Script won't run:**
- Ensure Python 3 is installed
- Run from the course root directory

**Images not loading:**
- Check the Unsplash URL is valid
- Ensure the URL ends with `?w=1200&h=400&fit=crop`

**Audio not playing:**
- Verify the MP3 file is in the correct folder
- Check the `src` path in the `<audio>` tag

**Layout broken on mobile:**
- Ensure the CSS is intact in the `<style>` tag
- Check for unclosed HTML tags in the content

---

## Course Outline (18 Weeks)

| Week | Topic | Grammar Focus |
|---|---|---|
| 1 | Working in IT: Careers & Roles | Modals of ability (can/could/be able to) |
| 2 | Hardware & Components | There is / There are |
| 3 | Operating Systems | Imperatives (instructions) |
| 4 | Networking Basics | Present continuous |
| 5 | Programming Intro | Future tense (will/going to) |
| 6 | Web Development | Modals of obligation |
| 7 | Database Fundamentals | Past simple |
| 8 | Cybersecurity | Modals of deduction |
| 9-10 | Midterm Review & Exam | Mixed review |
| 11 | Cloud Computing | Conditionals (1st) |
| 12 | AI & Machine Learning | Passive voice |
| 13 | Mobile Development | Present perfect |
| 14 | IT Project Management | Gerunds/infinitives |
| 15-17 | Final Project Work | Applied practice |
| 18 | Course Wrap-up | Final presentation |
