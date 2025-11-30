import React from 'react';
import { ExternalLink } from 'lucide-react';

// Helper function to format event time
export const formatEventTime = (event) => {
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;
  
  if (!start) return 'All day';
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (event.start?.date) {
    return 'All day';
  }
  
  return `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

// Helper function to format event date
export const formatEventDate = (event) => {
  const start = event.start?.dateTime || event.start?.date;
  if (!start) return '';
  
  const date = new Date(start);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

// Helper function to render clickable content (URLs, emails, etc.) - SECURITY FIXED
export const renderClickableContent = (text) => {
  if (!text) return null;
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  
  // Split text by URLs and emails to create safe React elements
  const parts = text.split(/(\bhttps?:\/\/[^\s]+\b|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
  
  return (
    <span>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {part}
            </a>
          );
        } else if (emailRegex.test(part)) {
          return (
            <a
              key={index}
              href={`mailto:${part}`}
              className="text-blue-600 underline"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
};

// Calendar helper functions for month view
export const getDaysInMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const getFirstDayOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

export const getMonthEvents = (events, date) => {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  return events.filter(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    return eventDate >= monthStart && eventDate <= monthEnd;
  });
};

export const getEventsForDay = (events, day, currentDate) => {
  const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
  
  return events.filter(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    return eventDate.toDateString() === targetDate.toDateString();
  });
};

// Calendar helper functions for week view
export const getWeekDates = (date) => {
  const week = [];
  const startDate = new Date(date);
  const day = startDate.getDay();
  const diff = startDate.getDate() - day; // Adjust for Sunday start
  
  for (let i = 0; i < 7; i++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(diff + i);
    week.push(weekDate);
  }
  
  return week;
};

export const getWeekEvents = (events, date) => {
  const weekDates = getWeekDates(date);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  
  return events.filter(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    return eventDate >= weekStart && eventDate <= new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000);
  });
};

export const getEventsForDate = (events, date) => {
  return events.filter(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    return eventDate.toDateString() === date.toDateString();
  });
};