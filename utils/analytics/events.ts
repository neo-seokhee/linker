// Analytics Event Names
export const ANALYTICS_EVENTS = {
  // Link Events
  LINK_IMPRESSION: 'linker_link_impression',
  LINK_CLICK: 'linker_link_click',
  LINK_DWELL: 'linker_link_dwell',
  LINK_LIKE: 'linker_link_like',
  LINK_SAVE: 'linker_link_save',

  // Navigation Events
  SCROLL_MILESTONE: 'linker_scroll_milestone',
  CATEGORY_EXPAND: 'linker_category_expand',
  CATEGORY_COLLAPSE: 'linker_category_collapse',

  // User Events
  USER_SIGNUP: 'linker_user_signup',
  USER_LOGIN: 'linker_user_login',
  USER_LOGOUT: 'linker_user_logout',
} as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];
