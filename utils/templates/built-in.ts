/**
 * Built-in Templates
 * Pre-defined templates for common writing tasks
 */
import { parsePlaceholders } from './parser';
import type { Template } from './types';

/**
 * Create a built-in template with auto-parsed placeholders
 */
function createBuiltInTemplate(
  data: Omit<
    Template,
    | 'id'
    | 'placeholders'
    | 'isBuiltIn'
    | 'isFavorite'
    | 'createdAt'
    | 'updatedAt'
  >,
): Template {
  const now = Date.now();
  return {
    ...data,
    id: `builtin-${data.category}-${data.name.toLowerCase().replace(/\s+/g, '-')}`,
    placeholders: parsePlaceholders(data.content),
    isBuiltIn: true,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    metadata: {
      source: 'built-in',
      author: 'LangFix',
      usageCount: 0,
    },
  };
}

// ============================================================================
// Email Templates
// ============================================================================

const professionalEmail = createBuiltInTemplate({
  name: 'Professional Email',
  description: 'Formal email for professional communication',
  category: 'email',
  tags: ['formal', 'business', 'professional'],
  content: `Subject: {{subject}}

Dear {{recipient_name}},

{{opening_line}}

{{main_body}}

{{closing_line}}

Best regards,
{{sender_name}}
{{sender_title}}`,
});

const followUpEmail = createBuiltInTemplate({
  name: 'Follow-up Email',
  description: 'Quick follow-up on previous communication',
  category: 'email',
  tags: ['follow-up', 'reminder', 'business'],
  content: `Subject: Following up on {{topic}}

Hi {{recipient_name}},

I wanted to follow up on {{previous_topic}} we discussed {{timeframe}}.

{{update_or_question}}

Looking forward to hearing from you.

Best,
{{sender_name}}`,
});

const meetingRequest = createBuiltInTemplate({
  name: 'Meeting Request',
  description: 'Request to schedule a meeting',
  category: 'email',
  tags: ['meeting', 'schedule', 'calendar'],
  content: `Subject: Meeting Request - {{topic}}

Hi {{recipient_name}},

I'd like to schedule a meeting to discuss {{topic}}.

Proposed times:
• {{time_option_1}}
• {{time_option_2}}
• {{time_option_3}}

Duration: {{duration}} minutes
Location: {{location_or_platform}}

Please let me know which works best for you.

Thanks,
{{sender_name}}`,
});

const thankYouEmail = createBuiltInTemplate({
  name: 'Thank You Email',
  description: 'Express gratitude for help or opportunity',
  category: 'email',
  tags: ['gratitude', 'thanks', 'appreciation'],
  content: `Subject: Thank you for {{reason}}

Dear {{recipient_name}},

I wanted to take a moment to thank you for {{specific_action}}.

{{additional_thoughts}}

I truly appreciate your {{quality_or_help}}.

Warm regards,
{{sender_name}}`,
});

const introductionEmail = createBuiltInTemplate({
  name: 'Introduction Email',
  description: 'Introduce yourself or someone else',
  category: 'email',
  tags: ['introduction', 'networking', 'connect'],
  content: `Subject: Introduction - {{purpose}}

Hi {{recipient_name}},

{{how_you_know_them_or_why_reaching_out}}

I'm {{sender_name}}, {{your_role_or_background}}.

{{reason_for_contact}}

{{call_to_action}}

Best,
{{sender_name}}`,
});

// ============================================================================
// Social Media Templates
// ============================================================================

const linkedInPost = createBuiltInTemplate({
  name: 'LinkedIn Post',
  description: 'Professional LinkedIn post with engagement hooks',
  category: 'social',
  tags: ['linkedin', 'professional', 'networking'],
  content: `{{hook_question_or_statement}}

{{main_insight_or_story}}

Key takeaways:
• {{point_1}}
• {{point_2}}
• {{point_3}}

{{call_to_action}}

#{{hashtag_1}} #{{hashtag_2}} #{{hashtag_3}}`,
});

const twitterThread = createBuiltInTemplate({
  name: 'Twitter/X Thread Starter',
  description: 'Start an engaging Twitter thread',
  category: 'social',
  tags: ['twitter', 'thread', 'engagement'],
  content: `🧵 {{thread_topic}}

{{opening_statement}}

Let me break this down 👇

1/ {{first_point}}`,
});

const instagramCaption = createBuiltInTemplate({
  name: 'Instagram Caption',
  description: 'Engaging Instagram post caption',
  category: 'social',
  tags: ['instagram', 'caption', 'engagement'],
  content: `{{engaging_opening}}

{{story_or_context}}

📸 {{photo_description}}

{{call_to_action}}

.
.
.
#{{hashtag_1}} #{{hashtag_2}} #{{hashtag_3}}`,
});

const productAnnouncement = createBuiltInTemplate({
  name: 'Product Announcement',
  description: 'Announce a new product or feature',
  category: 'social',
  tags: ['announcement', 'launch', 'product'],
  content: `🚀 Exciting news!

We're thrilled to announce {{product_or_feature}}.

{{what_it_does}}

Key highlights:
✨ {{highlight_1}}
✨ {{highlight_2}}
✨ {{highlight_3}}

{{availability_info}}

{{call_to_action}}`,
});

// ============================================================================
// Business Templates
// ============================================================================

const projectProposal = createBuiltInTemplate({
  name: 'Project Proposal',
  description: 'Formal project proposal outline',
  category: 'business',
  tags: ['proposal', 'project', 'plan'],
  content: `# {{project_name}}

## Executive Summary
{{brief_overview}}

## Problem Statement
{{problem_description}}

## Proposed Solution
{{solution_description}}

## Timeline
{{timeline}}

## Budget
{{budget_estimate}}

## Next Steps
{{next_steps}}`,
});

const statusReport = createBuiltInTemplate({
  name: 'Status Report',
  description: 'Weekly or periodic status update',
  category: 'business',
  tags: ['status', 'report', 'update'],
  content: `# Status Report: {{project_name}}
Date: {{date}}

## Progress Summary
{{progress_summary}}

## Completed This Period
• {{completed_item_1}}
• {{completed_item_2}}

## In Progress
• {{in_progress_item_1}}
• {{in_progress_item_2}}

## Blockers
{{blockers_or_none}}

## Next Steps
{{next_steps}}`,
});

const meetingNotes = createBuiltInTemplate({
  name: 'Meeting Notes',
  description: 'Document meeting discussions and action items',
  category: 'business',
  tags: ['meeting', 'notes', 'minutes'],
  content: `# Meeting Notes: {{meeting_topic}}

**Date:** {{date}}
**Attendees:** {{attendees}}

## Agenda
{{agenda_items}}

## Discussion
{{discussion_summary}}

## Decisions Made
• {{decision_1}}
• {{decision_2}}

## Action Items
- [ ] {{action_item_1}} - Owner: {{owner_1}}
- [ ] {{action_item_2}} - Owner: {{owner_2}}

## Next Meeting
{{next_meeting_date_or_topic}}`,
});

const jobDescription = createBuiltInTemplate({
  name: 'Job Description',
  description: 'Template for job posting',
  category: 'business',
  tags: ['hiring', 'job', 'recruitment'],
  content: `# {{job_title}}

**Company:** {{company_name}}
**Location:** {{location}}
**Employment Type:** {{employment_type}}

## About Us
{{company_description}}

## Role Overview
{{role_description}}

## Responsibilities
• {{responsibility_1}}
• {{responsibility_2}}
• {{responsibility_3}}

## Requirements
• {{requirement_1}}
• {{requirement_2}}
• {{requirement_3}}

## Nice to Have
• {{nice_to_have_1}}
• {{nice_to_have_2}}

## Benefits
{{benefits}}

## How to Apply
{{application_instructions}}`,
});

// ============================================================================
// Academic Templates
// ============================================================================

const essayOutline = createBuiltInTemplate({
  name: 'Essay Outline',
  description: 'Standard essay structure outline',
  category: 'academic',
  tags: ['essay', 'outline', 'academic'],
  content: `# {{essay_title}}

## Introduction
{{thesis_statement}}

## Body Paragraph 1
**Topic:** {{topic_1}}
{{argument_1}}

## Body Paragraph 2
**Topic:** {{topic_2}}
{{argument_2}}

## Body Paragraph 3
**Topic:** {{topic_3}}
{{argument_3}}

## Conclusion
{{summary_and_implications}}`,
});

const researchSummary = createBuiltInTemplate({
  name: 'Research Summary',
  description: 'Summarize an academic paper or research',
  category: 'academic',
  tags: ['research', 'summary', 'paper'],
  content: `# Research Summary: {{paper_title}}

**Authors:** {{authors}}
**Year:** {{year}}
**Source:** {{journal_or_conference}}

## Key Findings
{{main_findings}}

## Methodology
{{methodology_brief}}

## Relevance
{{why_relevant_to_your_work}}

## Questions/Notes
{{personal_notes}}`,
});

const lectureNotes = createBuiltInTemplate({
  name: 'Lecture Notes',
  description: 'Structure for taking lecture notes',
  category: 'academic',
  tags: ['notes', 'lecture', 'class'],
  content: `# {{course_name}} - Lecture Notes
**Date:** {{date}}
**Topic:** {{topic}}

## Key Concepts
{{key_concepts}}

## Main Points
1. {{main_point_1}}
2. {{main_point_2}}
3. {{main_point_3}}

## Examples/Case Studies
{{examples}}

## Questions to Follow Up
• {{question_1}}
• {{question_2}}

## Additional Resources
{{resources_mentioned}}`,
});

// ============================================================================
// Technical Templates
// ============================================================================

const bugReport = createBuiltInTemplate({
  name: 'Bug Report',
  description: 'Report a software bug with details',
  category: 'technical',
  tags: ['bug', 'issue', 'report'],
  content: `## Bug Report

**Title:** {{bug_title}}
**Severity:** {{severity}}
**Version:** {{version}}

### Description
{{bug_description}}

### Steps to Reproduce
1. {{step_1}}
2. {{step_2}}
3. {{step_3}}

### Expected Behavior
{{expected_behavior}}

### Actual Behavior
{{actual_behavior}}

### Environment
- OS: {{operating_system}}
- Browser/Platform: {{browser_or_platform}}

### Screenshots/Logs
{{screenshots_or_logs}}

### Additional Context
{{additional_context}}`,
});

const featureRequest = createBuiltInTemplate({
  name: 'Feature Request',
  description: 'Propose a new feature or enhancement',
  category: 'technical',
  tags: ['feature', 'request', 'enhancement'],
  content: `## Feature Request

**Feature Name:** {{feature_name}}
**Priority:** {{priority}}

### Problem Statement
{{problem_description}}

### Proposed Solution
{{solution_description}}

### Use Cases
1. {{use_case_1}}
2. {{use_case_2}}

### Benefits
{{expected_benefits}}

### Alternatives Considered
{{alternatives}}

### Additional Context
{{additional_context}}`,
});

const pullRequestDescription = createBuiltInTemplate({
  name: 'Pull Request Description',
  description: 'Template for PR/MR descriptions',
  category: 'technical',
  tags: ['pr', 'git', 'code-review'],
  content: `## Description
{{change_description}}

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #{{issue_number}}

## Changes Made
• {{change_1}}
• {{change_2}}
• {{change_3}}

## Testing
{{testing_done}}

## Screenshots
{{screenshots_if_applicable}}

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Self-reviewed the code`,
});

// ============================================================================
// Creative Templates
// ============================================================================

const blogPostOutline = createBuiltInTemplate({
  name: 'Blog Post Outline',
  description: 'Structure for a blog article',
  category: 'creative',
  tags: ['blog', 'writing', 'content'],
  content: `# {{blog_title}}

## Hook
{{attention_grabbing_opening}}

## Introduction
{{introduce_topic}}

## Main Content

### {{section_1_heading}}
{{section_1_content}}

### {{section_2_heading}}
{{section_2_content}}

### {{section_3_heading}}
{{section_3_content}}

## Key Takeaways
• {{takeaway_1}}
• {{takeaway_2}}

## Conclusion
{{closing_thoughts}}

## Call to Action
{{what_readers_should_do}}`,
});

const storyIdea = createBuiltInTemplate({
  name: 'Story Idea',
  description: 'Outline a creative story concept',
  category: 'creative',
  tags: ['story', 'fiction', 'creative-writing'],
  content: `# {{story_title}}

## Genre
{{genre}}

## Logline
{{one_sentence_summary}}

## Setting
{{time_and_place}}

## Main Character
**Name:** {{protagonist_name}}
**Description:** {{protagonist_description}}
**Goal:** {{protagonist_goal}}
**Flaw:** {{protagonist_flaw}}

## Antagonist
**Name:** {{antagonist_name}}
**Description:** {{antagonist_description}}

## Conflict
{{main_conflict}}

## Plot Points
1. Opening: {{opening}}
2. Inciting Incident: {{inciting_incident}}
3. Midpoint: {{midpoint}}
4. Climax: {{climax}}
5. Resolution: {{resolution}}

## Theme
{{underlying_message}}`,
});

// ============================================================================
// Export All Built-in Templates
// ============================================================================

export const BUILT_IN_TEMPLATES: Template[] = [
  // Email
  professionalEmail,
  followUpEmail,
  meetingRequest,
  thankYouEmail,
  introductionEmail,
  // Social Media
  linkedInPost,
  twitterThread,
  instagramCaption,
  productAnnouncement,
  // Business
  projectProposal,
  statusReport,
  meetingNotes,
  jobDescription,
  // Academic
  essayOutline,
  researchSummary,
  lectureNotes,
  // Technical
  bugReport,
  featureRequest,
  pullRequestDescription,
  // Creative
  blogPostOutline,
  storyIdea,
];

/**
 * Get built-in template by ID
 */
export function getBuiltInTemplate(id: string): Template | undefined {
  return BUILT_IN_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get built-in templates by category
 */
export function getBuiltInTemplatesByCategory(
  category: Template['category'],
): Template[] {
  return BUILT_IN_TEMPLATES.filter((t) => t.category === category);
}
