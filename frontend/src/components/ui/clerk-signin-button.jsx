import React from 'react';
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';
import { Button } from './button';
import LoadingSpinner from './loading-spinner';

const ClerkSignInButton = ({ 
  mode = 'modal', // 'modal' or 'redirect'
  className,
  variant = "default",
  size = "default",
  showUserButton = true,
  afterSignInUrl = "/",
  afterSignUpUrl = "/",
  ...props 
}) => {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div className={className}>
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div className={className}>
          <SignInButton 
            mode={mode}
            afterSignInUrl={afterSignInUrl}
            afterSignUpUrl={afterSignUpUrl}
          >
            <Button variant={variant} size={size} {...props}>
              Sign In
            </Button>
          </SignInButton>
        </div>
      </SignedOut>
      
      <SignedIn>
        {showUserButton && (
          <div className={className}>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                  userButtonPopoverCard: "shadow-xl",
                  userButtonPopoverActionButton: "hover:bg-gray-100",
                }
              }}
            />
          </div>
        )}
      </SignedIn>
    </>
  );
};

// Separate component for sign up
export const ClerkSignUpButton = ({ 
  mode = 'modal',
  className,
  variant = "outline",
  size = "default",
  afterSignUpUrl = "/",
  ...props 
}) => {
  return (
    <SignedOut>
      <div className={className}>
        <SignUpButton 
          mode={mode}
          afterSignUpUrl={afterSignUpUrl}
        >
          <Button variant={variant} size={size} {...props}>
            Sign Up
          </Button>
        </SignUpButton>
      </div>
    </SignedOut>
  );
};

// Hook for using Clerk user data in other components
export const useClerkAuth = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  
  return {
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn,
    user: user ? {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
      username: user.username,
      createdAt: user.createdAt,
    } : null,
  };
};

export default ClerkSignInButton;