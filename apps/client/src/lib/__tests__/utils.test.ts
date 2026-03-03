import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('should merge class strings', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const result = cn('foo', false && 'bar', 'baz');
    expect(result).toBe('foo baz');
  });

  it('should handle undefined values', () => {
    const result = cn('foo', undefined, 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle null values', () => {
    const result = cn('foo', null, 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('should handle nested arrays', () => {
    const result = cn(['foo', ['bar', 'baz']]);
    expect(result).toBe('foo bar baz');
  });

  it('should handle objects with boolean values', () => {
    const result = cn({ foo: true, bar: false, baz: true });
    expect(result).toBe('foo baz');
  });

  it('should merge tailwind classes correctly', () => {
    // tailwind-merge should deduplicate conflicting classes
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('should merge responsive classes correctly', () => {
    const result = cn('text-sm', 'md:text-lg');
    expect(result).toBe('text-sm md:text-lg');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle all falsy values', () => {
    const result = cn(false, null, undefined, '');
    expect(result).toBe('');
  });

  it('should handle complex combinations', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      'btn',
      'btn-primary',
      isActive && 'active',
      isDisabled && 'disabled',
      { 'btn-lg': true, 'btn-sm': false }
    );
    expect(result).toBe('btn btn-primary active btn-lg');
  });
});
