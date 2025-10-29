export const supabase = {
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'user1', email: 'me@example.com' }, access_token: 'fake' } },
      error: null,
    }),
    // ADD THIS:
    onAuthStateChange: jest.fn((_cb) => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: { path: 'path/file.txt' }, error: null }),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/path/file.txt' } })),
    })),
  },
};
