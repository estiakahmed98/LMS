const notificationDateFormatter = new Intl.DateTimeFormat("en-BD", {
  dateStyle: "medium",
  timeStyle: "short",
  hour12: true,
});

const notificationTimestampPattern =
  /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?\b/g;

function parseNotificationTimestamp(value: string) {
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
    ? value
    : `${value}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatNotificationDate(value: string) {
  const date = parseNotificationTimestamp(value);
  return date ? notificationDateFormatter.format(date) : value;
}

export function formatNotificationMessage(message: string) {
  return message.replace(notificationTimestampPattern, (timestamp) =>
    formatNotificationDate(timestamp),
  );
}

export function notificationEventDate(message: string, fallback: string) {
  const timestamp = message.match(notificationTimestampPattern)?.[0];
  return timestamp
    ? formatNotificationDate(timestamp)
    : formatNotificationDate(fallback);
}
