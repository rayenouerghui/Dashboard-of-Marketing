# AIESEC LC Operations Dashboard - Data Directory

This directory contains mock data files and data management utilities for the AIESEC LC Operations Dashboard.

## Structure

- `raw/` - Original CSV files from Google Forms/Sheets
- `parsed/` - Processed JSON data ready for use
- `services/` - Data access layer and API utilities

## Data Sources

### Physical Attraction Sign-Offs
Campus visits, information booths, and classroom presentations tracking.

### National OGX Responses  
Online applications and lead generation from social media and digital channels.

## Usage

Import data services from `src/data/services` to access parsed data in your components.
