// Application constants
export const APP_CONFIG = {
  name: "Science Club",
  description: "نظام إدارة وحجز القاعات التعليمية",
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  }
};

export const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager', 
  SPACE_MANAGER: 'space_manager',
  READ_ONLY: 'read_only'
} as const;



export const BOOKING_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
} as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' }
];

export const ROUTES = {
  HOME: '/',
  BOOKINGS: '/bookings',
  BOOKING: '/booking',
  HALLS: '/halls',
  TEACHERS: '/teachers',
  SUBJECTS: '/subjects',
  STAGES: '/stages',
  USERS: '/users',
  LOGIN: '/login',
  ADMIN_PRIVILEGES: '/admin-privileges'
} as const;