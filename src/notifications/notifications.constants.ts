/** Socket.io event name the frontend listens on for pushed notifications. */
export const NOTIFICATION_EVENT = 'notification';

/**
 * Default look-ahead window (hours) for the deadline-reminder cron when
 * `DEADLINE_REMINDER_WINDOW_HOURS` isn't set — a todo due within this many
 * hours gets one reminder.
 */
export const DEFAULT_REMINDER_WINDOW_HOURS = 24;

/** Milliseconds per hour, used to turn the reminder window into a cutoff date. */
export const MS_PER_HOUR = 60 * 60 * 1000;
