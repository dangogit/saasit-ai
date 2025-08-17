import { test as base, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * Authentication fixture for managing Clerk authentication in tests
 */

export interface AuthUser {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  id?: string;
}

export interface AuthFixture {
  authenticatedPage: Page;
  testUser: AuthUser;
  mockAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const test = base.extend<AuthFixture>({
  testUser: async ({}, use) => {
    const user: AuthUser = {
      email: faker.internet.email().toLowerCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      password: 'TestPassword123!',
    };
    await use(user);
  },

  mockAuth: async ({ page }, use) => {
    const mockAuth = async () => {
      // Mock Clerk authentication
      await page.addInitScript(() => {
        // Mock the Clerk object
        (window as any).__clerk_loaded = true;
        (window as any).Clerk = {
          user: {
            id: 'test_user_id',
            emailAddresses: [{ emailAddress: 'test@example.com' }],
            firstName: 'Test',
            lastName: 'User',
            imageUrl: 'https://images.clerk.dev/test.jpg',
            publicMetadata: {},
            update: async (data: any) => ({ success: true })
          },
          session: {
            id: 'test_session_id',
            status: 'active',
            getToken: async () => 'mock_jwt_token_for_testing'
          },
          signOut: async () => ({ success: true }),
          loaded: true,
          isSignedIn: () => true
        };
        
        // Mock React Clerk hooks
        (window as any).__CLERK_MOCK_DATA = {
          isLoaded: true,
          isSignedIn: true,
          user: (window as any).Clerk.user,
          session: (window as any).Clerk.session
        };
      });
    };
    
    await use(mockAuth);
  },

  authenticatedPage: async ({ page, mockAuth, testUser }, use) => {
    // Set up authenticated state
    await mockAuth();
    
    // Navigate to sign-in page and mock successful authentication
    await page.goto('/sign-in');
    
    // Wait for Clerk to load and mock successful sign-in
    await page.evaluate((user) => {
      const clerkEvent = new CustomEvent('clerk:loaded', {
        detail: {
          user: {
            id: 'test_user_' + Math.random().toString(36).substr(2, 9),
            emailAddresses: [{ emailAddress: user.email }],
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: 'https://images.clerk.dev/test.jpg'
          }
        }
      });
      window.dispatchEvent(clerkEvent);
    }, testUser);
    
    // Wait for redirect to main app
    await page.waitForURL('**/', { timeout: 10000 });
    
    await use(page);
  },

  signOut: async ({ page }, use) => {
    const signOut = async () => {
      await page.evaluate(() => {
        if ((window as any).Clerk) {
          (window as any).Clerk.signOut();
        }
      });
      await page.goto('/');
    };
    
    await use(signOut);
  }
});

export { expect } from '@playwright/test';