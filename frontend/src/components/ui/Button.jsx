import { Pressable } from '../motion/Pressable.jsx';
import { buttonClass } from './buttonStyles.js';
import { Spinner } from './Spinner.jsx';

/**
 * variant: plate (the one primary action per screen) | outline | text | onPlate.
 * Pass `to` for a router link or `href` for an in-page anchor. `loading` disables the button and shows a spinner.
 */
export const Button = ({
  variant = 'outline',
  wide = false,
  loading = false,
  disabled = false,
  to,
  href,
  type = 'button',
  className,
  children,
  ...props
}) => {
  const classes = buttonClass({ variant, wide, className });
  if (href) {
    return (
      <Pressable as="a" href={href} className={classes} {...props}>
        {children}
      </Pressable>
    );
  }
  if (to) {
    return (
      <Pressable as="link" to={to} className={classes} {...props}>
        {children}
      </Pressable>
    );
  }
  return (
    <Pressable
      as="button"
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </Pressable>
  );
};
