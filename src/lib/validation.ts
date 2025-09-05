import { z } from 'zod';
import { FormErrors, FormValues } from '../types';

// Email regex pattern
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Password with minimum 8 characters, at least one uppercase, one lowercase, and one number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/;

// Login schema
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').regex(EMAIL_REGEX, 'Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Registration schema
const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').regex(EMAIL_REGEX, 'Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  fullName: z.string().min(1, 'Full name is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export function validateLoginForm(values: FormValues): FormErrors {
  try {
    loginSchema.parse(values);
    return {};
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors.reduce((acc: FormErrors, curr) => {
        const path = curr.path[0] as keyof FormErrors;
        acc[path] = curr.message;
        return acc;
      }, {});
    }
    return { form: 'Validation failed' };
  }
}

export function validateRegisterForm(values: FormValues): FormErrors {
  try {
    registerSchema.parse(values);
    return {};
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors.reduce((acc: FormErrors, curr) => {
        const path = curr.path[0] as keyof FormErrors;
        acc[path] = curr.message;
        return acc;
      }, {});
    }
    return { form: 'Validation failed' };
  }
}