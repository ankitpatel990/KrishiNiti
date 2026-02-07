/**
 * Card - Container card with variant support.
 *
 * Variants: default | bordered | elevated | flat
 * Optional header, footer, and hover-lift effect.
 */

import PropTypes from "prop-types";

const VARIANT_CLASSES = {
  default: "bg-white shadow-card border border-neutral-200",
  bordered: "bg-white border-2 border-neutral-300",
  elevated: "bg-white shadow-card-hover",
  flat: "bg-neutral-100",
};

function Card({
  children,
  variant = "default",
  header,
  footer,
  hoverable = false,
  padding = true,
  className = "",
  onClick,
  ...rest
}) {
  const isClickable = Boolean(onClick);

  const classes = [
    "rounded-xl overflow-hidden transition-shadow duration-200",
    VARIANT_CLASSES[variant] || VARIANT_CLASSES.default,
    hoverable || isClickable ? "hover:shadow-card-hover" : "",
    isClickable ? "cursor-pointer" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Tag = isClickable ? "button" : "div";

  return (
    <Tag
      className={classes}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      {...rest}
    >
      {header && (
        <div className="border-b border-neutral-200 px-5 py-4">{header}</div>
      )}
      <div className={padding ? "p-5" : ""}>{children}</div>
      {footer && (
        <div className="border-t border-neutral-200 px-5 py-3 bg-neutral-50">
          {footer}
        </div>
      )}
    </Tag>
  );
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["default", "bordered", "elevated", "flat"]),
  header: PropTypes.node,
  footer: PropTypes.node,
  hoverable: PropTypes.bool,
  padding: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export default Card;
