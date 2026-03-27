# Retro App

A modern, collaborative web application for sprint retrospectives designed for agile software development teams of 3-10 people.

## Overview

**Retro App** is a React-based retrospective facilitation tool that enables teams to conduct structured retro sessions with real-time collaboration, emoji/GIF reactions, voting systems, and action item tracking.

**Project Status**: Active (created ~14 days ago, latest update: March 25, 2026)

**Repository**: [tmoser/retro-app](https://github.com/tmoser/retro-app)

## Features

### Core Retrospective Flow
- **Q1: Sprint Vibe** - Capture the sprint's mood with emoji or GIF
- **Q2: Achievements** - Highlight standout accomplishments
- **Q3: Improvements** - Discuss what's working, what isn't, and what to try differently
- **Q4: Shout-outs** - Recognize contributions and provide additional feedback

### Collaborative Tools
- **Real-time Collaboration** - Multiple team members participating simultaneously
- **Anonymous Submissions** - Option for anonymous feedback
- **Emoji & GIF Support** - Q1 responses can use emoji picker or GIF search (Tenor/GIPHY)
- **Rich Text Editing** - Bold, italic, lists, and emoji support in text fields
- **Voting System** - Up/down voting on cards when voting is enabled
- **Reaction Bar** - Real-time emoji reactions to celebrate moments
- **Presence Tracking** - See who's currently in the session

### Session Management
- **Session Creation** - Facilitators can create and configure sessions
- **Password Protection** - Optional join password for secure sessions
- **Submission Cutoff** - Set deadline for submissions with countdown timer
- **Session History** - Track completed retrospectives with stats
- **Grouped Cards** - Organize similar feedback into thematic groups
- **Action Items** - Track follow-up items with ownership assignment

### Data Persistence
- **Hybrid Storage** - LocalStorage fallback with Supabase integration
- **Session Sharing** - Generate shareable URLs with encoded session config
- **Edit Links** - Allow participants to return and modify submissions
- **Data Reset Options** - Facilitators can reset board or entire database

## Tech Stack

- **Frontend**: React 18.3.1
- **Build Tool**: Vite 5.0.8
- **Backend/Database**: Supabase
- **Utilities**: DOMPurify (sanitization), crypto (UUID generation)
- **APIs**: Tenor & GIPHY (GIF search)
- **Styling**: Custom CSS with CSS variables

## Project Structure
