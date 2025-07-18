# Personal Website with Rails

This is George Baskerville's personal website built with Ruby on Rails.

## Article Metadata

Articles are stored as Markdown files in the `app/articles` directory. Each article should have a YAML front matter section at the top of the file, enclosed between `---` markers.

### Required Fields

- `title`: The article title
- `description`: A brief summary of the article
- `publishedAt`: Publication date (YYYY-MM-DD)

### Optional Fields for SEO and Social Sharing

- `updatedAt`: Last modification date (YYYY-MM-DD)
- `tags`: Array of keywords or topics
- `section`: Category/section the article belongs to (defaults to "Blog")
- `author`: Author name (defaults to "George Baskerville")

Note: The slug for each article is automatically generated from the filename, so name your article files with SEO-friendly names (e.g., `how-the-metaverse-will-kill-us-all.md`).

### Example Article Front Matter

```yaml
---
title: How the metaverse will kill us all
description: Why Zuck's right, and why that's a problem.
publishedAt: 2024-05-05
updatedAt: 2024-05-10
tags:
  - Metaverse
  - Social Media
  - Technology
  - Privacy
  - Digital Wellbeing
section: Technology
author: George Baskerville
---
```

## Development

To run this project locally:

1. Clone the repository
2. Run `bundle install`
3. Run `rails server`

## License

See the LICENSE file for details.
