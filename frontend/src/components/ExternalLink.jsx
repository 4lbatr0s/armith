import React from 'react';

/**
 * External URLs get target="_blank" + rel="noopener noreferrer".
 * Same-origin or relative hrefs render as a normal anchor.
 */
export function ExternalLink({ href, children, className, ...rest }) {
  const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      className={className}
      {...(isExternal ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}
