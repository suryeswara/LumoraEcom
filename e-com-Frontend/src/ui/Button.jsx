import { forwardRef } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg transition-[background-color,color,opacity,transform] duration-300 ease-brand active:scale-98 disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-fg text-page hover:opacity-85",
  secondary: "border border-line bg-raised text-fg hover:bg-hover",
  ghost: "text-muted hover:bg-hover hover:text-fg",
  danger: "border border-line bg-raised text-danger hover:bg-hover",
};

const sizes = {
  lg: "button-lg px-3 py-2",
  md: "button-md px-3 py-2",
  sm: "button-sm px-3 py-2",
  xs: "button-xsm px-3 py-2",
};

// Works as a <button> by default, or renders a router <Link> / <a> through the `as` prop.
const Button = forwardRef(function Button(
  { as: Component = "button", variant = "primary", size = "md", icon = false, className = "", type, ...props },
  ref
) {
  const typeProps = Component === "button" ? { type: type || "button" } : {};
  const shape = icon ? "size-10 shrink-0" : sizes[size];
  return (
    <Component
      ref={ref}
      className={`${base} ${variants[variant]} ${shape} ${className}`}
      {...typeProps}
      {...props}
    />
  );
});

export default Button;
