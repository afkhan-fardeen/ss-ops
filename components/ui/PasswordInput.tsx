"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Input } from "./Input";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  icon?: ReactNode;
  invalid?: boolean;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { icon, invalid, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      ref={ref}
      {...rest}
      type={visible ? "text" : "password"}
      icon={icon}
      invalid={invalid}
      rightSlot={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted md:h-8 md:w-8 transition hover:bg-canvas hover:text-ink"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      }
    />
  );
});
