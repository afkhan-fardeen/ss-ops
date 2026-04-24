"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  invalid?: boolean;
  rightSlot?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon, invalid, rightSlot, className = "", ...rest },
  ref,
) {
  return (
    <div
      className={[
        "group relative flex h-11 items-center rounded-card border bg-white transition",
        invalid
          ? "border-[#C25151]/50 focus-within:shadow-[0_0_0_3px_rgba(194,81,81,0.12)]"
          : "border-[#EBEBEB] focus-within:border-[#111111] focus-within:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]",
      ].join(" ")}
    >
      {icon ? (
        <span
          aria-hidden
          className="pointer-events-none inline-flex h-full items-center pl-3 text-[#999999] group-focus-within:text-[#111111]"
        >
          {icon}
        </span>
      ) : null}
      <input
        ref={ref}
        {...rest}
        className={[
          "h-full w-full bg-transparent text-[13.5px] text-[#111111] placeholder:text-[#999999]",
          "border-0 outline-none focus:ring-0",
          icon ? "pl-2" : "pl-3.5",
          rightSlot ? "pr-1" : "pr-3.5",
          className,
        ].join(" ")}
      />
      {rightSlot ? <div className="pr-1">{rightSlot}</div> : null}
    </div>
  );
});
