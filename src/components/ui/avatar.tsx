import { cn } from "@/lib/utils";
import { HTMLAttributes, ImgHTMLAttributes } from "react";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {}

export function Avatar({ className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  );
}

interface AvatarImageProps extends ImgHTMLAttributes<HTMLImageElement> {}

export function AvatarImage({ className, alt, ...props }: AvatarImageProps) {
  return (
    <img
      className={cn("aspect-square h-full w-full", className)}
      alt={alt}
      {...props}
    />
  );
}

interface AvatarFallbackProps extends HTMLAttributes<HTMLDivElement> {}

export function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-gray-600",
        className
      )}
      {...props}
    />
  );
} 